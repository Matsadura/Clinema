"""Bring-your-own API keys.

Signed-in users may store their own Groq and TMDB keys. Keys
are validated with the provider before saving, encrypted at rest (Fernet,
with rotation via MultiFernet) and never returned in full.

For every request the effective keys are resolved as an ordered candidate
list per provider: the user's key first (if set and not known to be
rejected), then the server's key. Services try candidates in order, so a
missing, revoked or rate-limited user key transparently falls back to the
server key. Rejections are reported back and persisted so the user can see
that their key stopped working.
"""
import base64
import logging
import re
import threading

import requests
from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from flask import current_app, g, has_request_context

from api.services.http import DEFAULT_TIMEOUT, session
from models import storage
from models.api_key import UserApiKey
from models.base_model import utcnow

log = logging.getLogger(__name__)

PROVIDERS = {
    "groq": {
        "label": "Groq (AI recommendations)",
        "config_key": "GROQ_API_KEY",
        "docs_url": "https://console.groq.com/keys",
    },
    "tmdb": {
        "label": "TMDB (movie data & posters)",
        "config_key": "TMDB_API_KEY",
        "docs_url": "https://www.themoviedb.org/settings/api",
    },
}
_KEY_FORMAT = re.compile(r"^[A-Za-z0-9_\-.]{16,200}$")
_REDACT = re.compile(r"(api_key|appid|apikey|key)=[^&\s'\"]+", re.I)


class KeyRejected(Exception):
    """A provider answered 401/403 for this key."""

    def __init__(self, provider, key):
        super().__init__(f"{provider} rejected the API key")
        self.provider = provider
        self.key = key


class InvalidKey(Exception):
    """The key failed format checks or the provider rejected it."""


class VerificationUnavailable(Exception):
    """The provider couldn't be reached to verify the key."""


def redact(text):
    """Remove API keys from text (e.g. URLs inside exception messages)."""
    return _REDACT.sub(r"\1=***", str(text))


def mask(key):
    return key[-4:]


# -- encryption ----------------------------------------------------------
_fernet_cache = {}
_fernet_lock = threading.Lock()


def _derived_key(secret):
    hkdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
                info=b"clinema-user-api-keys")
    return base64.urlsafe_b64encode(hkdf.derive(secret.encode()))


def fernet(config=None):
    """MultiFernet from KEY_ENCRYPTION_KEY (comma-separated keys, newest
    first, for rotation) or, if unset, a key derived from the JWT secret."""
    config = config if config is not None else current_app.config
    raw = config.get("KEY_ENCRYPTION_KEY") or ""
    cache_key = (raw, config.get("JWT_SECRET_KEY"))
    with _fernet_lock:
        if cache_key not in _fernet_cache:
            keys = [k.strip().encode() for k in raw.split(",") if k.strip()]
            if not keys:
                keys = [_derived_key(config["JWT_SECRET_KEY"])]
            _fernet_cache[cache_key] = MultiFernet([Fernet(k) for k in keys])
        return _fernet_cache[cache_key]


def encrypt(plain, config=None):
    return fernet(config).encrypt(plain.encode()).decode()


def decrypt(token, config=None):
    """Plain key, or None if it can't be decrypted (e.g. the encryption key
    was changed without keeping the old one for rotation)."""
    try:
        return fernet(config).decrypt(token.encode()).decode()
    except (InvalidToken, ValueError):
        return None


# -- validation ------------------------------------------------------------
def _probe(provider, key):
    """Return the HTTP status of a cheap authenticated call."""
    if provider == "groq":
        response = session.get("https://api.groq.com/openai/v1/models",
                               headers={"Authorization": f"Bearer {key}"},
                               timeout=DEFAULT_TIMEOUT)
    else:
        response = session.get("https://api.themoviedb.org/3/configuration",
                               params={"api_key": key},
                               timeout=DEFAULT_TIMEOUT)
    return response.status_code


def validate(provider, key):
    """Check a key with its provider. Raises InvalidKey or
    VerificationUnavailable; returns the cleaned key."""
    key = (key or "").strip()
    if not _KEY_FORMAT.match(key):
        raise InvalidKey("That doesn't look like a valid API key.")
    try:
        status = _probe(provider, key)
    except requests.RequestException as exc:
        log.warning("Key verification for %s failed: %s", provider,
                    redact(exc))
        raise VerificationUnavailable(
            "Couldn't reach the provider to verify the key. Try again.")
    if status in (401, 403):
        raise InvalidKey(f"{PROVIDERS[provider]['label'].split(' (')[0]} "
                         "rejected this key.")
    if status == 429:
        return key  # valid but rate-limited right now
    if status >= 400:
        raise VerificationUnavailable(
            f"The provider returned an error (HTTP {status}). Try again.")
    return key


# -- storage -------------------------------------------------------------
def list_keys(user_id):
    rows = {k.provider: k for k in storage.session.query(UserApiKey).filter(
        UserApiKey.user_id == user_id)}
    out = []
    for provider, meta in PROVIDERS.items():
        row = rows.get(provider)
        out.append({
            "provider": provider,
            "label": meta["label"],
            "docs_url": meta["docs_url"],
            "configured": row is not None,
            "last4": row.last4 if row else None,
            "status": row.status if row else None,
            "validated_at": row.validated_at.isoformat() + "Z"
            if row and row.validated_at else None,
            "fallback_available": bool(
                current_app.config.get(meta["config_key"])),
        })
    return out


def save_key(user_id, provider, plain):
    row = storage.session.query(UserApiKey).filter_by(
        user_id=user_id, provider=provider).first()
    if row is None:
        row = UserApiKey(user_id=user_id, provider=provider, secret="",
                         last4="")
        storage.new(row)
    row.secret = encrypt(plain)
    row.last4 = mask(plain)
    row.status = "valid"
    row.validated_at = utcnow()
    storage.save()
    return row


def delete_key(user_id, provider):
    row = storage.session.query(UserApiKey).filter_by(
        user_id=user_id, provider=provider).first()
    if row is None:
        return False
    storage.delete(row)
    storage.save()
    return True


# -- per-request resolution ----------------------------------------------
def server_keys(config):
    """Candidate lists using only the server's keys."""
    return {p: [config[m["config_key"]]] if config.get(m["config_key"])
            else [] for p, m in PROVIDERS.items()}


def resolve(config, user_id=None):
    """Ordered candidate keys per provider for this user (user key first).

    Returns (keys, sources) where sources maps provider -> "user" when the
    user's key will be tried first, else "server".
    """
    keys = server_keys(config)
    sources = {p: "server" for p in PROVIDERS}
    if not user_id:
        return keys, sources
    rows = storage.session.query(UserApiKey).filter(
        UserApiKey.user_id == user_id, UserApiKey.status == "valid",
        UserApiKey.provider.in_(list(PROVIDERS)))
    for row in rows:
        plain = decrypt(row.secret, config)
        if not plain:
            log.warning("Stored %s key for a user could not be decrypted "
                        "(was KEY_ENCRYPTION_KEY changed?)", row.provider)
            continue
        keys[row.provider] = [plain] + [k for k in keys[row.provider]
                                        if k != plain]
        sources[row.provider] = "user"
    if has_request_context():
        g.user_keys = {p: k[0] for p, k in keys.items()
                       if sources[p] == "user"}
        g.key_user_id = user_id
    return keys, sources


def report_rejected(provider, key):
    """Called by services when a provider rejects ``key``."""
    if has_request_context():
        g.setdefault("rejected_keys", set()).add((provider, key))


def persist_rejections():
    """Mark the current user's keys that were rejected in this request as
    invalid, so they stop being tried and the user is told. Safe to call
    at the end of every request."""
    if not has_request_context():
        return
    rejected = g.get("rejected_keys") or set()
    user_keys = g.get("user_keys") or {}
    user_id = g.get("key_user_id")
    hits = [p for p, k in rejected if user_keys.get(p) == k]
    if not hits or not user_id:
        return
    try:
        storage.session.query(UserApiKey).filter(
            UserApiKey.user_id == user_id,
            UserApiKey.provider.in_(hits)).update(
            {UserApiKey.status: "invalid"}, synchronize_session=False)
        storage.save()
        log.info("Marked user API key(s) invalid after rejection: %s",
                 ", ".join(hits))
    except Exception:  # noqa: BLE001 - never fail the response for this
        storage.rollback()
        log.exception("Could not persist rejected API keys")


def as_list(keys):
    """Accept a single key or a candidate list."""
    if keys is None:
        return []
    if isinstance(keys, str):
        return [keys] if keys else []
    return [k for k in keys if k]
