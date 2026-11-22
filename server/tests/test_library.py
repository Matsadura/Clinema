"""User library (like/save) routes, including authorisation checks."""
from models import storage
from models.movie import Movie
from tests.conftest import register_and_login


def add_movie(app, tmdb_id=550, title="Fight Club"):
    with app.app_context():
        storage.new(Movie(tmdb_id=tmdb_id, title=title))
        storage.save()


def test_library_upsert_and_listing(client, app):
    add_movie(app)
    uid, h = register_and_login(client)

    res = client.put(f"/api/{uid}/library/550", headers=h,
                     json={"like": True})
    assert res.status_code == 200
    assert res.get_json()["like"] is True

    client.put(f"/api/{uid}/library/550", headers=h, json={"save": True})
    lib = client.get(f"/api/{uid}/library", headers=h).get_json()
    assert len(lib) == 1
    assert lib[0]["like"] and lib[0]["save"]
    assert lib[0]["movie"]["title"] == "Fight Club"


def test_clearing_both_flags_removes_entry(client):
    uid, h = register_and_login(client)
    client.put(f"/api/{uid}/library/1", headers=h, json={"like": True})
    res = client.put(f"/api/{uid}/library/1", headers=h,
                     json={"like": False})
    assert res.get_json() == {"movie_id": 1, "like": False, "save": False,
                              "dislike": False, "seen": False}
    assert client.get(f"/api/{uid}/library", headers=h).get_json() == []


def test_library_validates_flags(client):
    uid, h = register_and_login(client)
    assert client.put(f"/api/{uid}/library/1", headers=h,
                      json={"like": "yes"}).status_code == 400
    assert client.put(f"/api/{uid}/library/1", headers=h,
                      json={}).status_code == 400
    assert client.put(f"/api/{uid}/library/abc", headers=h,
                      json={"like": True}).status_code == 404


def test_cannot_read_another_users_library(client):
    _, h = register_and_login(client)
    other, _ = register_and_login(client, email="bob@example.com")
    for path in ("library", "history", "taste", "watchlist/share"):
        assert client.get(f"/api/{other}/{path}",
                          headers=h).status_code == 403
    assert client.get(f"/api/{other}/library").status_code == 401


def test_legacy_library_routes_are_gone(client):
    """The prototype's /liked and /save routes skipped taste learning."""
    uid, h = register_and_login(client)
    for path in ("liked", "save", "disliked", "user_movies"):
        assert client.get(f"/api/{uid}/{path}",
                          headers=h).status_code == 404
    assert client.post(f"/api/{uid}/liked", headers=h,
                       json={"movie_id": 7, "like": True}).status_code == 404


def test_concurrent_first_write_updates_the_same_row(client, monkeypatch):
    """Like then Watchlist on a new film sends two requests at once; both
    may see no row. The second insert must merge into the first row."""
    import importlib
    user_movies = importlib.import_module("api.views.user_movies")
    uid, h = register_and_login(client)
    client.put(f"/api/{uid}/library/550", headers=h, json={"like": True})

    real = user_movies._entry
    calls = {"n": 0}

    def racing(user, tmdb_id):
        calls["n"] += 1
        return None if calls["n"] == 1 else real(user, tmdb_id)

    monkeypatch.setattr(user_movies, "_entry", racing)
    res = client.put(f"/api/{uid}/library/550", headers=h,
                     json={"save": True})
    assert res.status_code == 200
    monkeypatch.undo()

    lib = client.get(f"/api/{uid}/library", headers=h).get_json()
    assert len(lib) == 1 and lib[0]["like"] and lib[0]["save"]
    client.put(f"/api/{uid}/library/550", headers=h, json={"like": False})
    lib = client.get(f"/api/{uid}/library", headers=h).get_json()
    assert lib[0]["like"] is False and lib[0]["save"] is True
