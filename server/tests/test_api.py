"""Suggestion, movie and health endpoints (pipeline end to end)."""
import json

import responses

from tests.conftest import TMDB_DISCOVER, TMDB_SEARCH, tmdb_movie


def mock_tmdb_search(mocked, titles):
    for i, title in enumerate(titles):
        mocked.get(TMDB_SEARCH, json={"results": [tmdb_movie(i + 1, title)]},
                   match=[responses.matchers.query_param_matcher(
                       {"query": title}, strict_match=False)])


# -- health & errors -------------------------------------------------------
def test_status_and_health(client):
    assert client.get("/api/status").get_json() == {"status": "OK"}
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["database"] == "up"


def test_json_404_and_405(client):
    res = client.get("/api/does-not-exist/at/all")
    assert res.status_code == 404
    assert res.get_json() == {"error": "Not found"}
    assert client.delete("/api/status").status_code == 405


def test_security_headers(client):
    res = client.get("/api/status")
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"


def test_debug_route_removed(client):
    assert client.get("/volumes").status_code == 404


# -- suggestions -------------------------------------------------------------
def test_suggestions_by_mood(client, mocked, fake_llm):
    titles = ["Still Walking", "Paterson", "Up", "Big"]
    fake_llm.content = json.dumps(titles)
    mock_tmdb_search(mocked, titles)
    mocked.get(TMDB_DISCOVER, json={"results": []})

    res = client.post("/api/suggestions", json={"moods": ["Calm"]})
    assert res.status_code == 200
    data = res.get_json()
    assert data["source"] == "ai"
    assert data["moods"] == ["Calm"]
    assert "weather" not in data and "warning" not in data
    assert [m["title"] for m in data["movies"]] == titles
    assert all(m["source"] == "ai" for m in data["movies"])
    prompt = fake_llm.calls[0]["messages"][1]["content"]
    assert "Calm" in prompt and "weather" not in prompt.lower()

    # Suggested movies are cached locally for the library
    assert client.get("/api/movies/1").get_json()["title"] == "Still Walking"


def test_location_is_ignored_and_never_fetched(client, mocked, fake_llm):
    """The weather feature is gone: coordinates are ignored, no weather
    service is contacted, and a location alone isn't a valid request."""
    fake_llm.content = json.dumps(["Up"])
    mock_tmdb_search(mocked, ["Up"])
    mocked.get(TMDB_DISCOVER, json={"results": []})
    res = client.post("/api/suggestions", json={
        "moods": ["Joyful"], "latitude": 48.85, "longitude": 2.35})
    assert res.status_code == 200
    assert not any("openweathermap" in c.request.url for c in mocked.calls)
    assert client.post("/api/suggestions", json={
        "latitude": 48.85, "longitude": 2.35}).status_code == 400


def test_weather_routes_removed(client):
    assert client.get("/api/weather?lat=1&lon=1").status_code == 404
    for path in ("/api/movies_by_weather", "/api/movies_by_mood_and_weather"):
        assert client.post(path, json={"mood": ["Sad"], "latitude": 1,
                                       "longitude": 1}).status_code == 404


def test_suggestions_fallback_when_llm_down(client, mocked, fake_llm):
    fake_llm.error = RuntimeError("groq down")
    mocked.get(TMDB_DISCOVER, json={"results": [
        tmdb_movie(i, f"Film {i}") for i in range(1, 9)]})
    res = client.post("/api/movies_by_mood", json={"mood": ["Sad"]})
    assert res.status_code == 200
    assert res.get_json()["source"] == "fallback"
    assert len(res.get_json()["movies"]) == 8


def test_suggestions_validation(client):
    assert client.post("/api/suggestions", json={}).status_code == 400
    assert client.post("/api/suggestions", data="nope",
                       content_type="text/plain").status_code == 400
    res = client.post("/api/suggestions",
                      json={"moods": ["drop table users;"]})
    assert res.status_code == 400
    assert client.post("/api/movies_by_mood",
                       json={}).status_code == 400


# -- movies --------------------------------------------------------------
def test_movies_crud(client, mocked):
    from tests.conftest import register_and_login
    _, headers = register_and_login(client)
    body = {"title": "Heat", "tmdb_id": 949, "rating": 7.9}
    assert client.post("/api/movies", json=body).status_code == 401
    assert client.post("/api/movies", json=body,
                       headers=headers).status_code == 201
    assert client.post("/api/movies", json=body,
                       headers=headers).status_code == 409
    assert client.get("/api/movies").get_json()[0]["title"] == "Heat"
    assert client.get("/api/movies?limit=abc").status_code == 400

    mocked.get("https://api.themoviedb.org/3/movie/12345", status=404)
    assert client.get("/api/movies/12345").status_code == 404
