"""Bring-your-own API keys: storage, validation, resolution and fallback."""
import json
import logging
from types import SimpleNamespace

import pytest
import requests
import responses
from cryptography.fernet import Fernet

from api.config import build_config
from api.services import credentials, llm
from models import storage
from models.api_key import UserApiKey
from models.interaction import Interaction
from tests.conftest import TMDB_SEARCH, register_and_login, tmdb_movie

GROQ_MODELS = "https://api.groq.com/openai/v1/models"
TMDB_CONFIG = "https://api.themoviedb.org/3/configuration"
USER_GROQ = "gsk_user_" + "u" * 30
USER_TMDB = "tmdbuserkey" + "1" * 21
SERVER = {"groq": "test-groq", "tmdb": "test-tmdb"}


def save(client, uid, headers, provider, key, mocked=None, status=200):
    if mocked is not None:
        url = {"groq": GROQ_MODELS, "tmdb": TMDB_CONFIG}[provider]
        mocked.get(url, status=status, json={})
    return client.put(f"/api/{uid}/api-keys/{provider}", headers=headers,
                      json={"key": key})


@pytest.fixture
def user(client):
    return register_and_login(client)


# -- encryption ----------------------------------------------------------
def test_encrypt_roundtrip_and_ciphertext_hides_key():
    config = {"JWT_SECRET_KEY": "x" * 40, "KEY_ENCRYPTION_KEY": ""}
    token = credentials.encrypt(USER_GROQ, config)
    assert USER_GROQ not in token
    assert credentials.decrypt(token, config) == USER_GROQ


def test_key_rotation_keeps_old_ciphertexts_readable():
    old, new = Fernet.generate_key().decode(), Fernet.generate_key().decode()
    token = credentials.encrypt("secret-value-123456",
                                {"KEY_ENCRYPTION_KEY": old,
                                 "JWT_SECRET_KEY": "j" * 40})
    rotated = {"KEY_ENCRYPTION_KEY": f"{new},{old}",
               "JWT_SECRET_KEY": "j" * 40}
    assert credentials.decrypt(token, rotated) == "secret-value-123456"
    wrong = {"KEY_ENCRYPTION_KEY": new, "JWT_SECRET_KEY": "j" * 40}
    assert credentials.decrypt(token, wrong) is None


def test_invalid_encryption_key_fails_fast():
    with pytest.raises(RuntimeError, match="Fernet"):
        build_config({"KEY_ENCRYPTION_KEY": "not-a-fernet-key",
                      "JWT_SECRET_KEY": "j" * 40})


def test_redact_removes_keys_from_messages():
    text = ("Max retries exceeded with url: /3/search/movie?api_key=SECRET1"
            "&query=Heat and /other?lat=1&appid=SECRET2")
    cleaned = credentials.redact(text)
    assert "SECRET1" not in cleaned and "SECRET2" not in cleaned
    assert "api_key=***" in cleaned and "appid=***" in cleaned


# -- endpoints -------------------------------------------------------------
def test_list_shows_server_fallback_by_default(client, user):
    uid, headers = user
    keys = client.get(f"/api/{uid}/api-keys", headers=headers).get_json()
    assert [k["provider"] for k in keys] == ["groq", "tmdb"]
    assert all(not k["configured"] and k["fallback_available"]
               for k in keys)


def test_save_validates_encrypts_and_masks(app, client, user, mocked):
    uid, headers = user
    res = save(client, uid, headers, "groq", f"  {USER_GROQ}  ", mocked)
    assert res.status_code == 200
    body = res.get_json()
    assert body["configured"] and body["status"] == "valid"
    assert body["last4"] == USER_GROQ[-4:]
    assert mocked.calls[-1].request.headers["Authorization"] == \
        f"Bearer {USER_GROQ}"

    listing = client.get(f"/api/{uid}/api-keys", headers=headers)
    assert USER_GROQ not in listing.get_data(as_text=True)
    row = storage.session.query(UserApiKey).one()
    assert row.secret != USER_GROQ and USER_GROQ not in row.secret
    assert credentials.decrypt(row.secret, app.config) == USER_GROQ


def test_rejected_key_is_not_saved(client, user, mocked):
    uid, headers = user
    res = save(client, uid, headers, "groq", USER_GROQ, mocked, status=401)
    assert res.status_code == 400
    assert "rejected" in res.get_json()["error"]
    assert storage.session.query(UserApiKey).count() == 0


def test_unreachable_provider_returns_502(client, user, mocked):
    uid, headers = user
    mocked.get(TMDB_CONFIG, body=requests.ConnectionError("down"))
    res = client.put(f"/api/{uid}/api-keys/tmdb", headers=headers,
                     json={"key": USER_TMDB})
    assert res.status_code == 502
    assert storage.session.query(UserApiKey).count() == 0


def test_format_and_provider_validation(client, user, mocked):
    uid, headers = user
    for body in ({"key": "short"}, {"key": "has spaces inside it!!"},
                 {"key": 123}, {}):
        assert client.put(f"/api/{uid}/api-keys/groq", headers=headers,
                          json=body).status_code == 400
    assert not mocked.calls  # rejected before any network call
    assert client.put(f"/api/{uid}/api-keys/openai", headers=headers,
                      json={"key": USER_GROQ}).status_code == 404


def test_replace_and_delete(client, user, mocked):
    uid, headers = user
    save(client, uid, headers, "tmdb", USER_TMDB, mocked)
    newer = "tmdbnewerkey" + "9" * 20
    assert save(client, uid, headers, "tmdb", newer).get_json()[
        "last4"] == "9999"
    assert storage.session.query(UserApiKey).count() == 1
    assert client.delete(f"/api/{uid}/api-keys/tmdb",
                         headers=headers).status_code == 200
    assert client.delete(f"/api/{uid}/api-keys/tmdb",
                         headers=headers).status_code == 404


def test_keys_are_private(client, user, mocked):
    _, headers = user
    other, other_h = register_and_login(client, email="bob@example.com")
    save(client, other, other_h, "groq", USER_GROQ, mocked)
    assert client.get(f"/api/{other}/api-keys",
                      headers=headers).status_code == 403
    assert client.delete(f"/api/{other}/api-keys/groq",
                         headers=headers).status_code == 403
    assert client.get(f"/api/{other}/api-keys").status_code == 401


def test_account_deletion_removes_keys_and_history(client, user, mocked):
    uid, headers = user
    save(client, uid, headers, "groq", USER_GROQ, mocked)
    client.post(f"/api/{uid}/interactions", headers=headers,
                json={"movie_id": 1})
    client.delete(f"/api/users/{uid}/profile", headers=headers)
    assert storage.session.query(UserApiKey).count() == 0
    assert storage.session.query(Interaction).count() == 0


# -- resolution & fallback ---------------------------------------------------
class KeyedLLM:
    """Fake Groq: per-key behaviour, records which key served each call."""

    def __init__(self, reject=(), fail=()):
        self.reject, self.fail, self.used = set(reject), set(fail), []

    def client_for(self, api_key, _timeout):
        def create(**kwargs):
            self.used.append(api_key)
            if api_key in self.reject:
                raise _Status(401)
            if api_key in self.fail:
                raise _Status(500)
            content = json.dumps({"movies": [
                {"title": f"Film {i}", "year": 2000} for i in range(1, 17)]})
            msg = SimpleNamespace(content=content)
            return SimpleNamespace(choices=[SimpleNamespace(message=msg)])
        return SimpleNamespace(chat=SimpleNamespace(
            completions=SimpleNamespace(create=create)))


class _Status(Exception):
    def __init__(self, status):
        super().__init__(f"HTTP {status}")
        self.status_code = status


@pytest.fixture
def films(catalog):
    for i in range(1, 17):
        catalog.add(i, f"Film {i}", 2000, ["Drama"], f"Director {i}")
    return catalog


def install(monkeypatch, fake):
    monkeypatch.setattr(llm, "_get_client", fake.client_for)


def test_user_key_is_used_first(client, user, mocked, films, monkeypatch):
    uid, headers = user
    save(client, uid, headers, "groq", USER_GROQ, mocked)
    fake = KeyedLLM()
    install(monkeypatch, fake)
    data = client.post("/api/suggestions", headers=headers,
                       json={"moods": ["Calm"]}).get_json()
    assert fake.used == [USER_GROQ]
    assert data["key_sources"]["groq"] == "user"
    assert data["key_sources"]["tmdb"] == "server"


def test_anonymous_and_keyless_users_use_server_key(client, user, films,
                                                    monkeypatch):
    uid, headers = user
    fake = KeyedLLM()
    install(monkeypatch, fake)
    client.post("/api/suggestions", json={"moods": ["Calm"]})
    client.post("/api/suggestions", headers=headers,
                json={"moods": ["Calm"]})
    assert fake.used == [SERVER["groq"], SERVER["groq"]]


def test_rejected_user_key_falls_back_and_is_marked_invalid(
        client, user, mocked, films, monkeypatch):
    uid, headers = user
    save(client, uid, headers, "groq", USER_GROQ, mocked)
    fake = KeyedLLM(reject={USER_GROQ})
    install(monkeypatch, fake)

    data = client.post("/api/suggestions", headers=headers,
                       json={"moods": ["Calm"]}).get_json()
    assert fake.used == [USER_GROQ, SERVER["groq"]]
    assert data["source"] == "ai" and len(data["movies"]) >= 11

    entry = client.get(f"/api/{uid}/api-keys",
                       headers=headers).get_json()[0]
    assert entry["status"] == "invalid"

    # Next request skips the rejected key entirely
    data = client.post("/api/suggestions", headers=headers,
                       json={"moods": ["Sad"]}).get_json()
    assert fake.used[-1] == SERVER["groq"]
    assert data["key_sources"]["groq"] == "server"


def test_failing_user_key_does_not_disable_ai_for_others(
        client, user, mocked, films, monkeypatch):
    uid, headers = user
    save(client, uid, headers, "groq", USER_GROQ, mocked)
    fake = KeyedLLM(fail={USER_GROQ})
    install(monkeypatch, fake)
    first = client.post("/api/suggestions", headers=headers,
                        json={"moods": ["Calm"]}).get_json()
    assert first["source"] == "ai"  # fell back to the server key
    other = client.post("/api/suggestions",
                        json={"moods": ["Joyful"]}).get_json()
    assert other["source"] == "ai"
    assert fake.used.count(SERVER["groq"]) == 2


def test_tmdb_falls_back_from_rejected_user_key(client, user, mocked,
                                                fake_llm):
    uid, headers = user
    save(client, uid, headers, "tmdb", USER_TMDB, mocked)

    def search(request):
        if request.params.get("api_key") == USER_TMDB:
            return 401, {}, "{}"
        title = request.params["query"]
        movie_id = int(title.split()[-1])
        return 200, {}, json.dumps({"results": [tmdb_movie(movie_id,
                                                           title)]})

    mocked.add_callback(responses.GET, TMDB_SEARCH, callback=search)
    fake_llm.content = json.dumps({"movies": [
        {"title": f"Gem {i}", "year": 2000} for i in range(1, 17)]})
    data = client.post("/api/suggestions", headers=headers,
                       json={"moods": ["Calm"]}).get_json()
    assert data["source"] == "ai" and len(data["movies"]) >= 11
    assert data["key_sources"]["tmdb"] == "user"
    statuses = {k["provider"]: k["status"] for k in client.get(
        f"/api/{uid}/api-keys", headers=headers).get_json()}
    assert statuses["tmdb"] == "invalid"


def test_undecryptable_key_falls_back_to_server(client, user, mocked,
                                                films, monkeypatch):
    uid, headers = user
    save(client, uid, headers, "groq", USER_GROQ, mocked)
    row = storage.session.query(UserApiKey).one()
    row.secret = Fernet(Fernet.generate_key()).encrypt(b"x").decode()
    storage.save()
    fake = KeyedLLM()
    install(monkeypatch, fake)
    data = client.post("/api/suggestions", headers=headers,
                       json={"moods": ["Calm"]}).get_json()
    assert fake.used == [SERVER["groq"]]
    assert data["key_sources"]["groq"] == "server"


def test_keys_never_reach_logs(client, user, mocked, fake_llm, caplog):
    uid, headers = user
    save(client, uid, headers, "tmdb", USER_TMDB, mocked)
    mocked.get(TMDB_SEARCH, body=requests.ConnectionError(
        f"Max retries exceeded with url: /3/search/movie?api_key={USER_TMDB}"
        "&query=Up"))
    fake_llm.content = json.dumps(["Up"])
    with caplog.at_level(logging.DEBUG):
        client.post("/api/suggestions", headers=headers,
                    json={"moods": ["Calm"]})
    assert "api_key=***" in caplog.text
    assert USER_TMDB not in caplog.text
    assert SERVER["tmdb"] not in caplog.text


def test_unsupported_provider_and_legacy_openweather_rows(client, user,
                                                          mocked, films,
                                                          monkeypatch):
    """OpenWeather keys are no longer accepted, and any leftover row is
    ignored rather than breaking key resolution."""
    uid, headers = user
    assert client.put(f"/api/{uid}/api-keys/openweather", headers=headers,
                      json={"key": "o" * 32}).status_code == 404
    storage.new(UserApiKey(user_id=uid, provider="openweather",
                           secret=credentials.encrypt(
                               "o" * 32, client.application.config),
                           last4="oooo", status="valid"))
    storage.save()
    fake = KeyedLLM()
    install(monkeypatch, fake)
    res = client.post("/api/suggestions", headers=headers,
                      json={"moods": ["Calm"]})
    assert res.status_code == 200
    assert set(res.get_json()["key_sources"]) == {"groq", "tmdb"}
    providers = [k["provider"] for k in client.get(
        f"/api/{uid}/api-keys", headers=headers).get_json()]
    assert providers == ["groq", "tmdb"]
