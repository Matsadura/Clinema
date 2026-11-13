"""Shared pytest fixtures.

The app runs against in-memory SQLite. External HTTP APIs are mocked with
``responses`` and the LLM client is replaced with a fake, so the suite needs
no network access or real API keys.
"""
import os
import sys
from types import SimpleNamespace

import pytest
import responses as responses_lib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__),
                                                "..")))
os.environ.setdefault("APP_ENV", "development")
os.environ["DATABASE_URL"] = "sqlite://"

from api.app import create_app  # noqa: E402
from api.services import llm  # noqa: E402
from api.services.http import TTLMemo  # noqa: E402
from models import storage  # noqa: E402

TEST_CONFIG = {
    "DATABASE_URL": "sqlite://",
    "JWT_SECRET_KEY": "test-secret-key-that-is-long-enough-1234",
    "OPENWEATHER_API_KEY": "test-weather",
    "GROQ_API_KEY": "test-groq",
    "TMDB_API_KEY": "test-tmdb",
    "GROQ_MODEL": "test-model",
    "RATELIMIT_ENABLED": False,
    "CORS_ORIGINS": [],
}

WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
TMDB_SEARCH = "https://api.themoviedb.org/3/search/movie"
TMDB_DISCOVER = "https://api.themoviedb.org/3/discover/movie"


@pytest.fixture(scope="session")
def app():
    return create_app(TEST_CONFIG)


@pytest.fixture(autouse=True)
def clean_state(app):
    """Fresh database, caches and LLM state for every test."""
    with app.app_context():
        storage.drop_all()
    TTLMemo.clear_all()
    llm.reset_circuit()
    llm._client = None
    yield
    storage.close()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def mocked():
    with responses_lib.RequestsMock(assert_all_requests_are_fired=False) as r:
        yield r


class FakeLLM:
    """Stands in for the Groq client; records prompts."""

    def __init__(self, content='{"movies": []}', error=None):
        self.content = content
        self.error = error
        self.calls = []
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        message = SimpleNamespace(content=self.content)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.fixture
def fake_llm(monkeypatch):
    fake = FakeLLM()
    monkeypatch.setattr(llm, "_get_client", lambda *a, **k: fake)
    return fake


def weather_payload(**overrides):
    payload = {
        "name": "Paris",
        "sys": {"country": "FR"},
        "main": {"temp": 12.4, "feels_like": 10.6, "humidity": 80},
        "wind": {"speed": 3.0},
        "weather": [{"main": "Rain", "description": "light rain",
                     "icon": "10n"}],
    }
    payload.update(overrides)
    return payload


def tmdb_movie(id_, title, year=2000, poster="/p.jpg", **extra):
    movie = {"id": id_, "title": title, "overview": f"About {title}",
             "poster_path": poster, "backdrop_path": "/b.jpg",
             "release_date": f"{year}-01-01", "vote_average": 7.84,
             "popularity": 50.0, "original_language": "en",
             "adult": False}
    movie.update(extra)
    return movie


def register_and_login(client, email="ada@example.com",
                       password="password123"):
    client.post("/api/register", json={
        "email": email, "password": password,
        "first_name": "Ada", "last_name": "Lovelace"})
    res = client.post("/api/login", json={"email": email,
                                          "password": password})
    data = res.get_json()
    return data["user_id"], {"Authorization": f"Bearer {data['token']}"}
