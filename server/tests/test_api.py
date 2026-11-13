"""Suggestion, weather, movie and health endpoints (pipeline end to end)."""
import responses

from tests.conftest import (TMDB_DISCOVER, TMDB_SEARCH, WEATHER_URL,
                            tmdb_movie, weather_payload)


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


# -- weather -----------------------------------------------------------------
def test_weather_endpoint(client, mocked):
    mocked.get(WEATHER_URL, json=weather_payload())
    res = client.get("/api/weather?lat=48.85&lon=2.35")
    assert res.status_code == 200
    assert res.get_json()["city"] == "Paris"


def test_weather_endpoint_errors(client, mocked):
    assert client.get("/api/weather").status_code == 400
    assert client.get("/api/weather?lat=x&lon=1").status_code == 400
    mocked.get(WEATHER_URL, status=500)
    res = client.get("/api/weather?lat=1&lon=1")
    assert res.status_code == 503
    assert "unavailable" in res.get_json()["error"]


# -- suggestions -------------------------------------------------------------
def test_suggestions_mood_and_weather(client, mocked, fake_llm):
    mocked.get(WEATHER_URL, json=weather_payload())
    fake_llm.content = '["Amelie", "Before Sunrise", "Up", "Big"]'
    mock_tmdb_search(mocked, ["Amelie", "Before Sunrise", "Up", "Big"])

    res = client.post("/api/suggestions", json={
        "moods": ["Calm"], "latitude": 48.85, "longitude": 2.35})
    assert res.status_code == 200
    data = res.get_json()
    assert data["source"] == "ai"
    assert data["moods"] == ["Calm"]
    assert data["weather"]["condition"] == "Rain"
    assert [m["title"] for m in data["movies"]][:2] == ["Amelie",
                                                        "Before Sunrise"]
    prompt = fake_llm.calls[0]["messages"][1]["content"]
    assert "Calm" in prompt and "light rain" in prompt

    # Suggested movies are cached locally for the library
    assert client.get("/api/movies/1").get_json()["title"] == "Amelie"


def test_suggestions_degrade_when_weather_fails(client, mocked, fake_llm):
    mocked.get(WEATHER_URL, status=503)
    fake_llm.content = '["Up", "Big", "Heat", "Alien"]'
    mock_tmdb_search(mocked, ["Up", "Big", "Heat", "Alien"])
    res = client.post("/api/suggestions", json={
        "moods": ["Joyful"], "latitude": 1, "longitude": 1})
    assert res.status_code == 200
    data = res.get_json()
    assert data["weather"] is None
    assert data["warning"]


def test_weather_only_fails_cleanly_when_weather_down(client, mocked):
    mocked.get(WEATHER_URL, status=503)
    res = client.post("/api/movies_by_weather",
                      json={"latitude": 1, "longitude": 1})
    assert res.status_code == 503


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
    assert client.post("/api/suggestions", json={
        "latitude": 999, "longitude": 0}).status_code == 400
    assert client.post("/api/movies_by_mood",
                       json={}).status_code == 400
    assert client.post("/api/movies_by_mood_and_weather",
                       json={"mood": ["Sad"]}).status_code == 400


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
