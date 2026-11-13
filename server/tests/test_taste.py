"""Preference learning: interaction signals -> taste profile -> prompt."""
from datetime import timedelta

import pytest

from api.services import taste
from models import storage
from models.base_model import utcnow
from models.interaction import Interaction
from models.movie import Movie
from tests.conftest import register_and_login


def add_movie(tmdb_id, title, genres=(), director=None, year=2000,
              language="en", keywords=(), tones=()):
    movie = Movie(tmdb_id=tmdb_id, title=title, year=year, language=language)
    movie.set_features({"genres": list(genres), "director": director,
                        "keywords": list(keywords), "tones": list(tones)})
    storage.new(movie)
    storage.save()
    return movie


def scores(profile, side, kind):
    return dict(map(tuple, profile.get(side, {}).get(kind, [])))


@pytest.fixture
def user(client):
    user_id, headers = register_and_login(client)
    return user_id, headers


# -- aggregation (unit) ------------------------------------------------------
def test_like_and_dislike_weights(app, user):
    user_id, _ = user
    add_movie(1, "Spirited", ["Animation", "Fantasy"], "Miyazaki", 2001,
              "ja", tones=["whimsical"])
    add_movie(2, "Gore Fest", ["Horror"], "Someone", 2015)
    taste.record_event(user_id, 1, "like")
    taste.record_event(user_id, 2, "dislike")
    storage.save()

    profile = taste.build_profile(user_id)
    assert scores(profile, "likes", "genres") == {"Animation": 2.0,
                                                  "Fantasy": 2.0}
    assert scores(profile, "likes", "directors") == {"Miyazaki": 2.0}
    assert scores(profile, "likes", "eras") == {"2000s": 1.0}
    assert scores(profile, "likes", "languages") == {"Japanese": 1.2}
    assert scores(profile, "likes", "tones") == {"whimsical": 1.5}
    assert scores(profile, "dislikes", "genres") == {"Horror": -2.0}
    assert profile["interactions"] == 2


def test_views_are_weak_and_capped(app, user):
    user_id, _ = user
    add_movie(1, "Browsed", ["Drama"])
    for _ in range(10):
        taste.record_event(user_id, 1, "view")
    storage.save()
    weights, _ = taste.movie_weights(user_id)
    assert weights[1] == pytest.approx(taste.VIEW_CAP)  # not 10 * 0.5


def test_toggle_events_cancel(app, user):
    user_id, _ = user
    add_movie(1, "Fickle", ["Comedy"])
    taste.record_event(user_id, 1, "like")
    taste.record_event(user_id, 1, "unlike")
    storage.save()
    assert taste.movie_weights(user_id)[0] == {}
    assert not taste.has_signal(taste.build_profile(user_id))


def test_old_signals_decay(app, user):
    user_id, _ = user
    add_movie(1, "Old Love", ["Western"])
    storage.new(Interaction(user_id=user_id, movie_id=1, event="like",
                            weight=2.0))
    storage.save()
    later = utcnow() + timedelta(days=taste.HALF_LIFE_DAYS)
    weights, _ = taste.movie_weights(user_id, now=later)
    assert weights[1] == pytest.approx(1.0, rel=1e-3)


def test_summary_cold_start_and_personalised(app, user):
    user_id, _ = user
    cold = taste.summarize(taste.build_profile(user_id))
    assert "cold start" in cold

    add_movie(1, "Quiet Film", ["Drama"], "Ozu", 1953, "ja",
              keywords=["family"])
    taste.record_event(user_id, 1, "like")
    storage.save()
    warm = taste.summarize(taste.build_profile(user_id))
    assert "cold start" not in warm
    assert "Leans towards" in warm and "Drama" in warm and "Ozu" in warm
    assert len(warm) < 600  # stays token-efficient


def test_normalize_title():
    assert taste.normalize_title("The Spirit of the Beehive") == \
        taste.normalize_title("spirit of the beehive!")
    assert taste.normalize_title("Amélie") == "amelie"
    assert taste.normalize_title("Fast & Furious") == "fast and furious"


def test_ensure_features_fetches_tmdb_details(app, user, catalog):
    catalog.add(77, "Tokyo Story", 1953, ["Drama"], "Yasujirō Ozu",
                ["family", "ageing"], "ja")
    taste.ensure_features([77], "test-tmdb")
    storage.save()
    movie = storage.get_specific(Movie, "tmdb_id", 77)
    assert movie.director == "Yasujirō Ozu"
    assert movie.features()["genres"] == ["Drama"]
    assert movie.features()["keywords"] == ["family", "ageing"]


# -- endpoints (integration) -------------------------------------------------
def test_library_signals_update_profile(client, user, catalog):
    user_id, headers = user
    catalog.add(10, "Kiki", 1989, ["Animation", "Family"], "Miyazaki")
    catalog.add(11, "Slasher", 2010, ["Horror"], "Gorey")

    client.put(f"/api/{user_id}/library/10", headers=headers,
               json={"like": True})
    client.put(f"/api/{user_id}/library/11", headers=headers,
               json={"dislike": True})
    data = client.get(f"/api/{user_id}/taste", headers=headers).get_json()

    assert data["personalized"] is True
    assert scores(data["profile"], "likes", "genres")["Animation"] == 2.0
    assert scores(data["profile"], "dislikes", "genres") == {"Horror": -2.0}
    assert "Kiki (1989)" in data["profile"]["recent_likes"]
    assert "Steer away from" in data["summary"]


def test_like_clears_dislike_and_logs_events(client, user, app):
    user_id, headers = user
    client.put(f"/api/{user_id}/library/5", headers=headers,
               json={"dislike": True})
    res = client.put(f"/api/{user_id}/library/5", headers=headers,
                     json={"like": True})
    assert res.get_json()["like"] is True
    assert res.get_json()["dislike"] is False
    events = [e.event for e in storage.session.query(Interaction).order_by(
        Interaction.created_at)]
    assert events == ["dislike", "like", "undislike"] or \
        sorted(events) == ["dislike", "like", "undislike"]
    assert client.put(f"/api/{user_id}/library/5", headers=headers,
                      json={"like": True, "dislike": True}).status_code == 400


def test_view_endpoint(client, user, catalog):
    user_id, headers = user
    catalog.add(20, "Paterson", 2016, ["Drama"], "Jarmusch")
    res = client.post(f"/api/{user_id}/interactions", headers=headers,
                      json={"movie_id": 20})
    assert res.status_code == 201
    assert res.get_json()["interactions"] == 1
    profile = client.get(f"/api/{user_id}/taste",
                         headers=headers).get_json()["profile"]
    assert scores(profile, "likes", "directors") == {"Jarmusch": 0.5}

    bad = [{"movie_id": "x"}, {"movie_id": 0}, {"movie_id": True},
           {"movie_id": 1, "event": "like"}]
    for body in bad:
        assert client.post(f"/api/{user_id}/interactions", headers=headers,
                           json=body).status_code == 400


def test_taste_routes_are_private(client, user):
    _, headers = user
    other, _ = register_and_login(client, email="bob@example.com")
    assert client.get(f"/api/{other}/taste",
                      headers=headers).status_code == 403
    assert client.post(f"/api/{other}/interactions", headers=headers,
                       json={"movie_id": 1}).status_code == 403
