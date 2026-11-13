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

    liked = client.get(f"/api/{uid}/liked", headers=h).get_json()
    saved = client.get(f"/api/{uid}/save", headers=h).get_json()
    assert [e["movie_id"] for e in liked] == [550]
    assert [e["movie_id"] for e in saved] == [550]


def test_clearing_both_flags_removes_entry(client):
    uid, h = register_and_login(client)
    client.put(f"/api/{uid}/library/1", headers=h, json={"like": True})
    res = client.put(f"/api/{uid}/library/1", headers=h,
                     json={"like": False})
    assert res.get_json() == {"movie_id": 1, "like": False, "save": False,
                              "dislike": False}
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
    for path in ("library", "liked", "save", "user_movies"):
        assert client.get(f"/api/{other}/{path}",
                          headers=h).status_code == 403
    assert client.get(f"/api/{other}/library").status_code == 401


def test_cannot_edit_another_users_entry_by_id(client):
    """Regression test for the IDOR in the original PUT/DELETE routes."""
    bob, bob_h = register_and_login(client, email="bob@example.com")
    entry = client.post(f"/api/{bob}/liked", headers=bob_h,
                        json={"movie_id": 7, "like": True}).get_json()

    mallory, mal_h = register_and_login(client, email="mal@example.com")
    for verb in (client.put, client.delete):
        res = verb(f"/api/{mallory}/liked/{entry['id']}", headers=mal_h,
                   json={"like": False})
        assert res.status_code == 404
    still = client.get(f"/api/{bob}/liked", headers=bob_h).get_json()
    assert still[0]["like"] is True


def test_legacy_create_update_delete(client):
    uid, h = register_and_login(client)
    res = client.post(f"/api/{uid}/save", headers=h,
                      json={"movie_id": 9, "save": True})
    assert res.status_code == 201
    entry_id = res.get_json()["id"]
    assert client.post(f"/api/{uid}/save", headers=h,
                       json={"movie_id": 9, "save": True}).status_code == 409
    assert client.post(f"/api/{uid}/save", headers=h,
                       json={"movie_id": 10}).status_code == 400

    res = client.put(f"/api/{uid}/save/{entry_id}", headers=h,
                     json={"like": True})
    assert res.get_json()["like"] is True
    assert client.delete(f"/api/{uid}/save/{entry_id}",
                         headers=h).status_code == 200
    assert client.get(f"/api/{uid}/user_movies", headers=h).get_json() == []
