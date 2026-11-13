#!/usr/bin/env python3
"""Application configuration, read from environment variables."""
import logging
import os
import secrets
from datetime import timedelta

from dotenv import find_dotenv, load_dotenv

log = logging.getLogger(__name__)

# Load the repository-level .env (searching upward from the CWD) for local
# development. In containers variables come from compose's env_file instead.
load_dotenv(find_dotenv(usecwd=True))


def _int(name, default):
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def build_config(overrides=None):
    """Return a Flask config mapping built from the environment."""
    env = os.getenv("APP_ENV", "development").lower()
    jwt_secret = os.getenv("JWT_SECRET_KEY", "")

    if len(jwt_secret) < 32:
        if env == "production":
            raise RuntimeError(
                "JWT_SECRET_KEY must be set to at least 32 characters in "
                "production. Generate one with: python3 -c \"import secrets;"
                " print(secrets.token_hex(32))\"")
        log.warning("JWT_SECRET_KEY missing/weak: using an ephemeral key "
                    "(tokens will not survive restarts)")
        jwt_secret = secrets.token_hex(32)

    origins = os.getenv("CORS_ORIGINS", "")
    if not origins and env != "production":
        origins = "http://localhost:5173,http://127.0.0.1:5173"

    config = {
        "APP_ENV": env,
        "DEBUG": False,
        "JSON_SORT_KEYS": False,
        "MAX_CONTENT_LENGTH": 64 * 1024,
        "JWT_SECRET_KEY": jwt_secret,
        "JWT_ACCESS_TOKEN_EXPIRES": timedelta(
            hours=_int("JWT_EXPIRES_HOURS", 24)),
        "CORS_ORIGINS": [o.strip() for o in origins.split(",") if o.strip()],
        "RATELIMIT_STORAGE_URI": os.getenv("RATELIMIT_STORAGE_URI",
                                           "memory://"),
        "RATELIMIT_HEADERS_ENABLED": True,
        "TRUSTED_PROXIES": _int("TRUSTED_PROXIES", 0),
        "DATABASE_URL": None,  # None -> derived from env by DBStorage
        "GROQ_API_KEY": os.getenv("GROQ_API_KEY", ""),
        "GROQ_MODEL": os.getenv("GROQ_MODEL", ""),  # "" -> llm.DEFAULT_MODELS
        "LLM_TIMEOUT": _int("LLM_TIMEOUT", 20),
        "TMDB_API_KEY": os.getenv("TMDB_API_KEY", ""),
    }
    config["KEY_ENCRYPTION_KEY"] = os.getenv("KEY_ENCRYPTION_KEY", "")
    if overrides:
        config.update(overrides)
    _check_encryption_key(config)

    for key in ("GROQ_API_KEY", "TMDB_API_KEY"):
        if not config[key]:
            log.warning("%s is not set; related features will be disabled",
                        key)
    return config


def _check_encryption_key(config):
    """Validate KEY_ENCRYPTION_KEY (encrypts users' own API keys)."""
    raw = config.get("KEY_ENCRYPTION_KEY") or ""
    if not raw.strip():
        log.warning("KEY_ENCRYPTION_KEY is not set: user API keys are "
                    "encrypted with a key derived from JWT_SECRET_KEY "
                    "(rotating the JWT secret will invalidate them)")
        return
    from cryptography.fernet import Fernet
    for key in (k.strip() for k in raw.split(",") if k.strip()):
        try:
            Fernet(key.encode())
        except ValueError:
            raise RuntimeError(
                "KEY_ENCRYPTION_KEY must be one or more comma-separated "
                "Fernet keys. Generate one with: python3 -c \"from "
                "cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())\"")
