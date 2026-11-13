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
