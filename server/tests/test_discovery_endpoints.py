"""Search, trending, the 'seen' flag and activity history."""
import json

from models import storage
from models.interaction import Interaction
from tests.conftest import TMDB_SEARCH, register_and_login, tmdb_movie

TMDB_TRENDING = "https://api.themoviedb.org/3/trending/movie/week"


# -- search --------------------------------------------------------------
def test_search_returns_poster_results_by_popularity(client, mocked):
    mocked.get(TMDB_SEARCH, json={"results": [
        tmdb_movie(1, "Heat", 1995, popularity=10),
        tmdb_movie(2, "Heat 2", 2026, popularity=90),
        tmdb_movie(3, "No Poster", poster=None),
    ]})
    res = client.get("/api/movies/search?q=  Heat ")
    assert res.status_code == 200
    assert [m["title"] for m in res.get_json()] == ["Heat 2", "Heat"]
    assert mocked.calls[0].request.params["query"] == "heat"
    # Results are cached locally so the library can show them later
    assert client.get("/api/movies/2").get_json()["title"] == "Heat 2"


def test_search_validation_and_caching(client, mocked):
    assert client.get("/api/movies/search").status_code == 400
    assert client.get("/api/movies/search?q=a").status_code == 400
    assert client.get("/api/movies/search?q=" + "x" * 101).status_code == 400
    mocked.get(TMDB_SEARCH, json={"results": [tmdb_movie(1, "Up")]})
    client.get("/api/movies/search?q=Up")
    client.get("/api/movies/search?q=up")
    assert len(mocked.calls) == 1


# -- trending ------------------------------------------------------------
def test_trending_requires_posters_and_backdrops(client, mocked):
    mocked.get(TMDB_TRENDING, json={"results": [
        tmdb_movie(1, "Big One"),
        tmdb_movie(2, "No Backdrop", backdrop_path=None),
    ]})
    data = client.get("/api/movies/trending").get_json()
    assert [m["title"] for m in data] == ["Big One"]
    assert data[0]["backdrop"].endswith("/b.jpg")
    assert client.get("/api/movies/trending").get_json() == data
    assert len(mocked.calls) == 1  # cached


def test_trending_upstream_failure_is_empty(client, mocked):
    mocked.get(TMDB_TRENDING, status=500)
    res = client.get("/api/movies/trending")
    assert res.status_code == 200 and res.get_json() == []


# -- seen ----------------------------------------------------------------
def test_seen_flag_logs_event_and_excludes_film(client, mocked, fake_llm):
    uid, h = register_and_login(client)
    res = client.put(f"/api/{uid}/library/7", headers=h, json={"seen": True})
    assert res.status_code == 200 and res.get_json()["seen"] is True
    events = [e.event for e in storage.session.query(Interaction)]
    assert events == ["seen"]
    lib = client.get(f"/api/{uid}/library", headers=h).get_json()
    assert lib[0]["seen"] is True

    # Seen films are never recommended again
    mocked.get(TMDB_SEARCH, json={"results": [tmdb_movie(7, "Watched")]})
    mocked.get("https://api.themoviedb.org/3/discover/movie",
               json={"results": []})
    fake_llm.content = json.dumps(["Watched"])
    data = client.post("/api/suggestions", headers=h,
                       json={"moods": ["Calm"]}).get_json()
    assert 7 not in [m["tmdb_id"] for m in data.get("movies", [])]

    # Clearing the only flag removes the entry
    client.put(f"/api/{uid}/library/7", headers=h, json={"seen": False})
    assert client.get(f"/api/{uid}/library", headers=h).get_json() == []


# -- history -------------------------------------------------------------
def test_history_groups_activity_per_film(client, app):
    uid, h = register_and_login(client)
    for movie_id, event, context in [
        (1, "recommended", {"moods": ["Calm"]}),
        (2, "recommended", {"moods": ["Sad"]}),
        (1, "view", None),
        (1, "like", None),
    ]:
        storage.new(Interaction(user_id=uid, movie_id=movie_id, event=event,
                                weight=0,
                                context=json.dumps(context) if context
                                else None))
        storage.save()
    data = client.get(f"/api/{uid}/history", headers=h).get_json()
    assert [d["movie_id"] for d in data] == [1, 2]
    assert data[0]["last_event"] == "like"
    assert set(data[0]["events"]) == {"like", "view", "recommended"}
    assert data[0]["moods"] == ["Calm"]
    assert data[1]["moods"] == ["Sad"]

    assert len(client.get(f"/api/{uid}/history?limit=1",
                          headers=h).get_json()) == 1
    assert client.get(f"/api/{uid}/history?limit=x",
                      headers=h).status_code == 400


def test_history_is_private(client):
    _, h = register_and_login(client)
    other, _ = register_and_login(client, email="bob@example.com")
    assert client.get(f"/api/{other}/history", headers=h).status_code == 403
    assert client.get(f"/api/{other}/history").status_code == 401


def test_concurrent_duplicate_does_not_drop_the_batch(app, monkeypatch):
    """Regression: a film inserted by a racing request used to roll back
    every other film in the batch."""
    from api.views import helpers
    from models.movie import Movie

    with app.test_request_context():
        storage.new(Movie(tmdb_id=1, title="Already there"))
        storage.save()
        # Simulate the race: this request didn't see film 1 when it looked
        real_query = storage.session.query

        class Blind:
            def __init__(self, q):
                self.q = q

            def filter(self, *a, **k):
                return []

        monkeypatch.setattr(storage.session, "query",
                            lambda *a, **k: Blind(real_query(*a, **k)))
        helpers.upsert_movies([
            {"tmdb_id": 1, "title": "Already there"},
            {"tmdb_id": 2, "title": "New A"},
            {"tmdb_id": 3, "title": "New B"},
        ])
        monkeypatch.undo()
        titles = sorted(m.title for m in storage.session.query(Movie))
    assert titles == ["Already there", "New A", "New B"]


def test_history_backfills_films_missing_from_cache(client, catalog):
    uid, h = register_and_login(client)
    catalog.add(77, "Tokyo Story", 1953, ["Drama"], "Ozu")
    storage.new(Interaction(user_id=uid, movie_id=77, event="recommended",
                            weight=0))
    storage.save()
    data = client.get(f"/api/{uid}/history", headers=h).get_json()
    assert data[0]["movie"]["title"] == "Tokyo Story"


# -- trailers ------------------------------------------------------------
TMDB_VIDEOS = "https://api.themoviedb.org/3/movie/7/videos"


def _video(key, type_="Trailer", official=True, site="YouTube",
           published="2024-01-01T00:00:00.000Z", name=None):
    return {"key": key, "type": type_, "official": official, "site": site,
            "published_at": published, "name": name or key}


def test_trailers_rank_official_trailers_first(client, mocked):
    mocked.get(TMDB_VIDEOS, json={"results": [
        _video("teaser00001", "Teaser"),
        _video("fanmade0001", official=False),
        _video("older000001", published="2020-01-01T00:00:00.000Z"),
        _video("newer000001", published="2024-06-01T00:00:00.000Z"),
        _video("featurette1", "Featurette"),
        _video("vimeo000001", site="Vimeo"),
        _video("bad key<script>"),
    ]})
    res = client.get("/api/movies/7/trailers")
    assert res.status_code == 200
    assert [v["key"] for v in res.get_json()] == [
        "newer000001", "older000001", "teaser00001", "fanmade0001"]
    assert mocked.calls[0].request.params["include_video_language"] == "en,null"
    client.get("/api/movies/7/trailers")
    assert len(mocked.calls) == 1  # cached


def test_trailers_fall_back_to_any_language(client, mocked):
    mocked.get(TMDB_VIDEOS, json={"results": []})
    mocked.get(TMDB_VIDEOS, json={"results": [_video("original001")]})
    assert [v["key"] for v in client.get("/api/movies/7/trailers").get_json()] == ["original001"]
    assert "include_video_language" not in mocked.calls[1].request.params


def test_trailers_none_and_upstream_failure(client, mocked):
    mocked.get(TMDB_VIDEOS, json={"results": []})
    mocked.get(TMDB_VIDEOS, json={"results": []})
    assert client.get("/api/movies/7/trailers").get_json() == []
    mocked.get("https://api.themoviedb.org/3/movie/8/videos", status=500)
    assert client.get("/api/movies/8/trailers").status_code == 502
