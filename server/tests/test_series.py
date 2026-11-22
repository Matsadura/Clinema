"""TV series: same pipeline and library as films, stored under negative
ids because TMDB's movie and TV ids overlap."""
import json
import re

import responses

from api.services import taste
from models import storage
from models.interaction import Interaction
from tests.conftest import register_and_login, tmdb_movie

TMDB = "https://api.themoviedb.org/3"


def series(id_, name, year=2010, **extra):
    raw = tmdb_movie(id_, name, year, **extra)
    raw["name"] = raw.pop("title")
    raw["first_air_date"] = raw.pop("release_date")
    return raw


def mock_tv_search(mocked, shows):
    def search(request):
        q = request.params.get("query", "").lower()
        hits = [s for s in shows if s["name"].lower() == q]
        return 200, {}, json.dumps({"results": hits})
    mocked.add_callback(responses.GET, f"{TMDB}/search/tv", callback=search)


def test_series_recommendations(client, mocked, fake_llm):
    shows = [series(100 + i, f"Show {i}", 2000 + i) for i in range(14)]
    mock_tv_search(mocked, shows)
    mocked.get(f"{TMDB}/discover/tv", json={"results": []})
    fake_llm.content = json.dumps({"movies": [
        {"title": s["name"], "year": 2000 + i} for i, s in enumerate(shows)]})

    res = client.post("/api/suggestions",
                      json={"moods": ["Calm"], "kind": "tv"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["kind"] == "tv"
    assert {m["kind"] for m in data["movies"]} == {"tv"}
    assert all(m["tmdb_id"] < 0 for m in data["movies"])
    prompt = fake_llm.calls[0]["messages"][1]["content"]
    assert prompt.startswith("Recommend") and "TV series (not films)" in prompt
    assert all("/search/tv" in c.request.url for c in mocked.calls)

    assert client.post("/api/suggestions", json={
        "moods": ["Calm"], "kind": "podcast"}).status_code == 400


def test_series_fallback_uses_tv_genres(client, mocked, fake_llm):
    fake_llm.error = RuntimeError("LLM down")
    mocked.get(f"{TMDB}/discover/tv", json={"results": [
        series(200 + i, f"Show {i}") for i in range(12)]})
    data = client.post("/api/suggestions", json={
        "moods": ["Excited"], "kind": "tv"}).get_json()
    assert data["source"] == "fallback" and len(data["movies"]) == 12
    # Excited -> Action (28) and Adventure (12) -> TV "Action & Adventure"
    params = mocked.calls[0].request.params
    assert params["with_genres"] == "10759"


def test_series_in_library_details_and_history(client, mocked):
    mocked.add(responses.GET, re.compile(rf"{TMDB}/tv/1399(\?.*)?$"),
               json=dict(series(1399, "Game of Thrones", 2011),
                         genres=[{"id": 18, "name": "Drama"}],
                         created_by=[{"name": "David Benioff"}]))
    uid, h = register_and_login(client)
    res = client.put(f"/api/{uid}/library/-1399", headers=h,
                     json={"save": True})
    assert res.status_code == 200 and res.get_json()["movie_id"] == -1399
    assert client.post(f"/api/{uid}/interactions", headers=h,
                       json={"movie_id": -1399}).status_code == 201

    lib = client.get(f"/api/{uid}/library", headers=h).get_json()
    movie = lib[0]["movie"]
    assert (movie["title"], movie["kind"], movie["year"]) == \
        ("Game of Thrones", "tv", 2011)
    assert movie["director"] == "David Benioff"  # creator stands in
    assert [e["movie_id"] for e in client.get(
        f"/api/{uid}/history", headers=h).get_json()] == [-1399]


def test_series_trailers_and_extras_use_tv_endpoints(client, mocked):
    mocked.get(f"{TMDB}/tv/1399/videos", json={"results": [
        {"key": "abcdefghijk", "site": "YouTube", "type": "Trailer",
         "official": True, "name": "Trailer"}]})
    mocked.get(f"{TMDB}/tv/1399", json=dict(
        series(1399, "Game of Thrones", 2011),
        credits={"cast": [{"id": 1, "name": "Emilia Clarke", "order": 0}]},
        recommendations={"results": [series(1400, "House of the Dragon")]},
        similar={"results": []},
        **{"watch/providers": {"results": {}}}))
    assert client.get("/api/movies/-1399/trailers").get_json()[0]["key"] \
        == "abcdefghijk"
    data = client.get("/api/movies/-1399/extras?region=US").get_json()
    assert [c["name"] for c in data["cast"]] == ["Emilia Clarke"]
    assert [(m["title"], m["tmdb_id"]) for m in data["similar"]] == [
        ("House of the Dragon", -1400)]


def test_exclusion_titles_stay_within_a_kind(app):
    """Liking the film "Fargo" mustn't block the series "Fargo"."""
    from models.movie import Movie
    from models.user import User
    with app.app_context():
        user = User(email="f@example.com", password="password123",
                    first_name="F", last_name="F")
        storage.new(user)
        storage.new(Movie(tmdb_id=275, title="Fargo", year=1996))
        storage.new(Movie(tmdb_id=-60622, title="Fargo", year=2014))
        storage.new(Interaction(user_id=user.id, movie_id=275,
                                event="like", weight=2))
        storage.save()
        for_tv = taste.build_exclusion(user.id, kind="tv")
        assert for_tv.blocks(275) and not for_tv.blocks(title="Fargo")
        assert for_tv.for_prompt() == []
        for_films = taste.build_exclusion(user.id, kind="movie")
        assert for_films.blocks(title="Fargo")
