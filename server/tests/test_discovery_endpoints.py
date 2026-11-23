"""Search, trending, the 'seen' flag and activity history."""
import json

from models import storage
from models.interaction import Interaction
from tests.conftest import (TMDB_SEARCH, cached_title, register_and_login,
                            tmdb_movie)

TMDB_TRENDING = "https://api.themoviedb.org/3/trending/movie/week"
TMDB_MULTI = "https://api.themoviedb.org/3/search/multi"


def tmdb_series(id_, name, year=2010, **extra):
    """A TMDB TV result (name/first_air_date instead of title/release)."""
    raw = tmdb_movie(id_, name, year, **extra)
    raw["name"] = raw.pop("title")
    raw["first_air_date"] = raw.pop("release_date")
    return raw


# -- search --------------------------------------------------------------
def test_search_finds_films_and_series_by_popularity(app, client, mocked):
    mocked.get(TMDB_MULTI, json={"results": [
        dict(tmdb_movie(1, "Heat", 1995, popularity=10), media_type="movie"),
        dict(tmdb_movie(2, "Heat 2", 2026, popularity=90),
             media_type="movie"),
        dict(tmdb_series(2, "Heat Wave", 2014, popularity=50),
             media_type="tv"),
        dict(tmdb_movie(3, "No Poster", poster=None), media_type="movie"),
        {"id": 9, "name": "Al Heat", "media_type": "person",
         "profile_path": "/x.jpg", "poster_path": "/x.jpg"},
    ]})
    res = client.get("/api/movies/search?q=  Heat ")
    assert res.status_code == 200
    found = [(m["title"], m["tmdb_id"], m["kind"], m["year"])
             for m in res.get_json()]
    # A series shares TMDB id 2 with a film: it's stored as -2
    assert found == [("Heat 2", 2, "movie", 2026),
                     ("Heat Wave", -2, "tv", 2014),
                     ("Heat", 1, "movie", 1995)]
    assert mocked.calls[0].request.params["query"] == "heat"
    # Results are cached locally so the library can show them later
    assert cached_title(app, 2) == "Heat 2"
    assert cached_title(app, -2) == "Heat Wave"


def test_search_validation_and_caching(client, mocked):
    assert client.get("/api/movies/search").status_code == 400
    assert client.get("/api/movies/search?q=a").status_code == 400
    assert client.get("/api/movies/search?q=" + "x" * 101).status_code == 400
    mocked.get(TMDB_MULTI, json={"results": [
        dict(tmdb_movie(1, "Up"), media_type="movie")]})
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


def test_trending_series(client, mocked):
    mocked.get("https://api.themoviedb.org/3/trending/tv/week",
               json={"results": [tmdb_series(7, "Slow Horses", 2022)]})
    data = client.get("/api/movies/trending?kind=tv").get_json()
    assert [(m["title"], m["tmdb_id"], m["kind"]) for m in data] == [
        ("Slow Horses", -7, "tv")]
    assert client.get("/api/movies/trending?kind=book").status_code == 400


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


def test_history_pages_through_films(client):
    uid, h = register_and_login(client)
    for movie_id in (1, 2, 3):
        for event in ("recommended", "view"):
            storage.new(Interaction(user_id=uid, movie_id=movie_id,
                                    event=event, weight=0))
            storage.save()

    def page(query):
        return [d["movie_id"] for d in client.get(
            f"/api/{uid}/history?{query}", headers=h).get_json()]

    # Each film appears once, on exactly one page, newest first
    assert page("limit=2") + page("limit=2&offset=2") == [3, 2, 1]
    assert page("limit=2&offset=3") == []
    assert client.get(f"/api/{uid}/history?offset=x",
                      headers=h).status_code == 400


def test_history_is_private(client):
    _, h = register_and_login(client)
    other, _ = register_and_login(client, email="bob@example.com")
    assert client.get(f"/api/{other}/history", headers=h).status_code == 403
    assert client.get(f"/api/{other}/history").status_code == 401


def test_concurrent_duplicate_does_not_drop_the_batch(app, monkeypatch):
    """Regression: a film inserted by a racing request used to roll back
    every other film in the batch."""
    from models import movie as movie_model
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
        movie_model.upsert_movies([
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
    params = mocked.calls[0].request.params
    assert params["include_video_language"] == "en,null"
    client.get("/api/movies/7/trailers")
    assert len(mocked.calls) == 1  # cached


def test_trailers_fall_back_to_any_language(client, mocked):
    mocked.get(TMDB_VIDEOS, json={"results": []})
    mocked.get(TMDB_VIDEOS, json={"results": [_video("original001")]})
    data = client.get("/api/movies/7/trailers").get_json()
    assert [v["key"] for v in data] == ["original001"]
    assert "include_video_language" not in mocked.calls[1].request.params


def test_trailers_none_and_upstream_failure(client, mocked):
    mocked.get(TMDB_VIDEOS, json={"results": []})
    mocked.get(TMDB_VIDEOS, json={"results": []})
    assert client.get("/api/movies/7/trailers").get_json() == []
    mocked.get("https://api.themoviedb.org/3/movie/8/videos", status=500)
    assert client.get("/api/movies/8/trailers").status_code == 502


# -- extras: where to watch, cast, similar --------------------------------
TMDB_MOVIE_7 = "https://api.themoviedb.org/3/movie/7"


def _extras_body(**over):
    body = tmdb_movie(7, "Heat", 1995)
    body.update({
        "credits": {"cast": [
            {"id": 2, "name": "Robert De Niro", "character": "Neil",
             "order": 1, "profile_path": "/dn.jpg"},
            {"id": 1, "name": "Al Pacino", "character": "Vincent",
             "order": 0, "profile_path": None},
        ]},
        "recommendations": {"results": [
            tmdb_movie(20, "Thief", 1981), tmdb_movie(21, "No Poster",
                                                      poster=None)]},
        "similar": {"results": [tmdb_movie(20, "Thief", 1981),
                                tmdb_movie(22, "Ronin", 1998)]},
        "watch/providers": {"results": {
            "MA": {"link":
                   "https://www.themoviedb.org/movie/7/watch?locale=MA",
                   "flatrate": [{"provider_id": 8, "provider_name": "Netflix",
                                 "logo_path": "/n.jpg",
                                 "display_priority": 2}],
                   "free": [{"provider_id": 8, "provider_name": "Netflix",
                             "logo_path": "/n.jpg"}],
                   "rent": [{"provider_id": 2, "provider_name": "Apple TV",
                             "logo_path": "/a.jpg"}]},
            "US": {"link": "javascript:alert(1)"}}},
    })
    body.update(over)
    return body


def test_extras_for_region(app, client, mocked):
    mocked.get(TMDB_MOVIE_7, json=_extras_body())
    res = client.get("/api/movies/7/extras?region=ma")
    assert res.status_code == 200
    data = res.get_json()
    prov = data["providers"]
    assert prov["region"] == "MA" and prov["link"].endswith("locale=MA")
    assert [p["name"] for p in prov["stream"]] == ["Netflix"]  # de-duped
    assert prov["stream"][0]["logo"].endswith("/w92/n.jpg")
    assert [p["name"] for p in prov["rent"]] == ["Apple TV"]
    assert prov["buy"] == []
    assert [c["name"] for c in data["cast"]] == ["Al Pacino",
                                                 "Robert De Niro"]
    assert data["cast"][0]["photo"] is None
    # Thin recommendations are padded from "similar", without duplicates
    assert [m["title"] for m in data["similar"]] == ["Thief", "Ronin"]
    params = mocked.calls[0].request.params
    assert "watch/providers" in params["append_to_response"]
    # Similar films are cached locally for the library
    assert cached_title(app, 22) == "Ronin"


def test_extras_unsafe_link_and_missing_region(client, mocked):
    mocked.get(TMDB_MOVIE_7, json=_extras_body())
    prov = client.get("/api/movies/7/extras?region=US") \
        .get_json()["providers"]
    assert prov["link"] is None and prov["stream"] == []
    prov = client.get("/api/movies/7/extras?region=FR") \
        .get_json()["providers"]
    assert prov == {"region": "FR", "link": None, "stream": [], "rent": [],
                    "buy": []}


def test_extras_validation_and_upstream_failure(client, mocked):
    assert client.get("/api/movies/7/extras?region=USA").status_code == 400
    assert client.get("/api/movies/7/extras?region=1x").status_code == 400
    mocked.get(TMDB_MOVIE_7, status=500)
    assert client.get("/api/movies/7/extras").status_code == 502


def test_person_lists_films_and_series_with_roles(client, mocked):
    def film(*a, **k):
        return dict(tmdb_movie(*a, **k), media_type="movie")

    def show(*a, **k):
        return dict(tmdb_series(*a, **k), media_type="tv")

    mocked.get("https://api.themoviedb.org/3/person/5", json={
        "id": 5, "name": "Michael Mann", "profile_path": "/mm.jpg",
        "known_for_department": "Directing", "biography": "Director.",
        "combined_credits": {
            "cast": [
                film(30, "Cameo", 2000, popularity=1, character="Himself"),
                show(7, "Crime Story", 1986, popularity=20,
                     character="Narrator"),
                show(40, "Late Show", 2015, popularity=99, character="Self",
                     genre_ids=[10767]),  # a talk-show appearance
            ],
            "crew": [film(7, "Heat", 1995, popularity=80, job="Director"),
                     film(31, "Produced", 2001, job="Producer"),
                     film(32, "Unposterd", job="Director", poster=None)],
        }})
    data = client.get("/api/people/5").get_json()
    assert data["name"] == "Michael Mann" and data["photo"].endswith("mm.jpg")
    # Film 7 and series 7 are different works; the talk show is dropped
    assert [(m["title"], m["tmdb_id"], m["role"]) for m in data["movies"]] \
        == [("Heat", 7, "Director"), ("Crime Story", -7, "Narrator"),
            ("Cameo", 30, "Himself")]


def test_person_not_found(client, mocked):
    mocked.get("https://api.themoviedb.org/3/person/6", status=404)
    assert client.get("/api/people/6").status_code == 404
