"""Anti-repetition and personalisation of the recommendation pipeline.

Covers the three required guarantees:
1. excluded / seen / disliked movies never appear in final results;
2. repeated identical requests produce diverse (non-repeating) sets;
3. likes and dislikes measurably shift the LLM prompt context.
"""
import json
import random

import pytest

from api.services import llm
from api.services.recommender import recommend
from models import storage
from models.interaction import Interaction
from models.movie import Movie
from tests.conftest import TEST_CONFIG, register_and_login


def titles_payload(titles, **extra):
    return json.dumps({"movies": [dict({"title": t, "year": 2000}, **extra)
                                  for t in titles]})


def user_prompts(fake):
    return [c["messages"][1]["content"] for c in fake.calls]


@pytest.fixture
def pool(catalog):
    """30 distinct, resolvable films with distinct directors."""
    for i in range(1, 31):
        catalog.add(i, f"Film {i}", 1950 + i, ["Drama"], f"Director {i}")
    return [f"Film {i}" for i in range(1, 31)]


# -- 1. exclusions -----------------------------------------------------------
def test_seen_liked_disliked_and_recommended_never_returned(
        client, catalog, pool, fake_llm):
    user_id, headers = register_and_login(client)
    client.put(f"/api/{user_id}/library/1", headers=headers,
               json={"like": True})
    client.put(f"/api/{user_id}/library/2", headers=headers,
               json={"dislike": True})
    client.put(f"/api/{user_id}/library/3", headers=headers,
               json={"save": True})
    client.post(f"/api/{user_id}/interactions", headers=headers,
                json={"movie_id": 4})
    # Shown earlier (recommended movies are always cached locally)
    storage.new(Movie(tmdb_id=5, title="Film 5", year=1955))
    storage.new(Interaction(user_id=user_id, movie_id=5,
                            event="recommended", weight=0))
    storage.save()

    # A stubborn model that keeps proposing exactly those films first
    fake_llm.content = titles_payload(pool[:20])
    data = client.post("/api/suggestions", headers=headers,
                       json={"moods": ["Calm"]}).get_json()
    ids = {m["tmdb_id"] for m in data["movies"]}
    assert ids.isdisjoint({1, 2, 3, 4, 5})
    assert len(ids) >= 11  # one round is "enough" at target - 1
    assert data["excluded"] == 5
    # ...and the model was told about them up front
    prompt = user_prompts(fake_llm)[0]
    for title in ("Film 1", "Film 2", "Film 3", "Film 4", "Film 5"):
        assert title in prompt


def test_excluded_film_under_another_title_is_caught_by_tmdb_id(
        client, catalog, fake_llm):
    catalog.add(1, "Heat", 1995, ["Crime"], "Michael Mann",
                aliases=["heat (1995)"])
    for i in range(2, 15):
        catalog.add(i, f"Other {i}", 2000, ["Drama"], f"D{i}")
    fake_llm.content = titles_payload(
        ["Heat (1995)"] + [f"Other {i}" for i in range(2, 15)])
    data = client.post("/api/suggestions",
                       json={"moods": ["Angry"], "seen_ids": [1]}).get_json()
    assert 1 not in {m["tmdb_id"] for m in data["movies"]}


def test_retry_when_model_ignores_exclusions(app, catalog, pool, fake_llm):
    replies = iter([titles_payload(pool[:16]), titles_payload(pool[16:30])])

    def create(**kwargs):
        fake_llm.calls.append(kwargs)
        fake_llm.content = next(replies)
        return llm_reply(fake_llm.content)

    fake_llm.chat.completions.create = create
    result = recommend(["Calm"], TEST_CONFIG,
                       seen_ids=list(range(1, 17)))
    assert len(fake_llm.calls) == 2  # first round was entirely excluded
    assert {m["tmdb_id"] for m in result["movies"]}.isdisjoint(
        range(1, 17))
    assert "Film 1" in user_prompts(fake_llm)[1]
    assert all(m["source"] == "ai" for m in result["movies"])


def llm_reply(content):
    from types import SimpleNamespace
    msg = SimpleNamespace(content=content)
    return SimpleNamespace(choices=[SimpleNamespace(message=msg)])


def test_discover_backfill_respects_exclusions(app, catalog, pool,
                                               fake_llm):
    fake_llm.error = RuntimeError("LLM down")
    catalog.discover_ids = list(range(1, 31))
    result = recommend(["Sad"], TEST_CONFIG,
                       seen_ids=list(range(1, 11)))
    ids = {m["tmdb_id"] for m in result["movies"]}
    assert result["source"] == "fallback"
    assert ids and ids.isdisjoint(range(1, 11))


def test_disliked_genres_are_removed_from_fallback(app, client, catalog,
                                                   mocked, fake_llm):
    user_id, headers = register_and_login(client)
    catalog.add(99, "Scream Again", 2000, ["Horror"], "X")
    client.put(f"/api/{user_id}/library/99", headers=headers,
               json={"dislike": True})
    catalog.add(98, "Twisty", 2001, ["Mystery"], "Y")
    fake_llm.error = RuntimeError("LLM down")
    catalog.discover_ids = [99, 98]
    result = recommend(["Surprised"], TEST_CONFIG, user_id=user_id)
    assert [m["tmdb_id"] for m in result["movies"]] == [98]
    discover_calls = [c.request for c in mocked.calls
                      if "discover" in c.request.url]
    assert discover_calls
    assert all(r.params.get("without_genres") == "27"
               for r in discover_calls)


# -- 2. diversity -----------------------------------------------------------
def test_repeated_requests_for_a_user_never_repeat(client, catalog, pool,
                                                   fake_llm):
    """Even if the model returns the same list every time: repeats are
    filtered and the gap is backfilled from TMDB discovery."""
    user_id, headers = register_and_login(client)
    fake_llm.content = titles_payload(pool)
    catalog.discover_ids = list(range(17, 31))
    seen = set()
    for _ in range(2):
        data = client.post("/api/suggestions", headers=headers,
                           json={"moods": ["Calm"]}).get_json()
        ids = {m["tmdb_id"] for m in data["movies"]}
        assert len(ids) == 12
        assert ids.isdisjoint(seen)
        seen |= ids
    recorded = storage.session.query(Interaction).filter_by(
        user_id=user_id, event="recommended").count()
    assert recorded == 24


def test_repeated_anonymous_requests_use_seen_ids(client, catalog, pool,
                                                  fake_llm):
    fake_llm.content = titles_payload(pool)
    first = client.post("/api/suggestions",
                        json={"moods": ["Calm"]}).get_json()
    seen = [m["tmdb_id"] for m in first["movies"]]
    second = client.post("/api/suggestions",
                         json={"moods": ["Calm"],
                               "seen_ids": seen}).get_json()
    assert {m["tmdb_id"] for m in second["movies"]}.isdisjoint(seen)
    assert client.post("/api/suggestions", json={
        "moods": ["Calm"], "seen_ids": ["x"]}).status_code == 400


def test_prompts_vary_between_identical_requests(app, catalog, pool,
                                                 fake_llm, monkeypatch):
    fake_llm.content = titles_payload(pool[:16])
    monkeypatch.setattr(llm, "random", random.Random(7))
    recommend(["Calm"], TEST_CONFIG)
    recommend(["Calm"], TEST_CONFIG)
    first, second = user_prompts(fake_llm)
    focus = [p.split("Diversity focus for this list:")[1].split("\n")[0]
             for p in (first, second)]
    assert focus[0] != focus[1]
    assert fake_llm.calls[0]["temperature"] == pytest.approx(0.85)
    assert fake_llm.calls[0]["frequency_penalty"] > 0


def test_at_most_one_overexposed_staple_and_unique_directors(
        app, catalog, fake_llm):
    catalog.add(1, "Inception", 2010, ["Science Fiction"], "Nolan")
    catalog.add(2, "Interstellar", 2014, ["Science Fiction"], "Nolan")
    catalog.add(3, "The Shawshank Redemption", 1994, ["Drama"], "Darabont")
    for i in range(4, 20):
        catalog.add(i, f"Gem {i}", 1970 + i, ["Drama"], f"Auteur {i}")
    items = [{"title": "Inception", "director": "Christopher Nolan"},
             {"title": "Interstellar", "director": "Christopher Nolan"},
             {"title": "The Shawshank Redemption", "director": "Darabont"},
             {"title": "Gem 4", "director": "Auteur 4"},
             {"title": "Gem 5", "director": "Auteur 4"}]
    items += [{"title": f"Gem {i}", "director": f"Auteur {i}"}
              for i in range(6, 20)]
    fake_llm.content = json.dumps({"movies": items})
    result = recommend(["Excited"], TEST_CONFIG)
    titles = [m["title"] for m in result["movies"]]
    staples = {"Inception", "Interstellar", "The Shawshank Redemption"}
    assert len(staples & set(titles)) == 1
    assert not ({"Gem 4", "Gem 5"} <= set(titles))  # same director


def test_structured_fields_reach_the_client(client, catalog, fake_llm):
    catalog.add(1, "Still Walking", 2008, ["Drama"], "Kore-eda")
    for i in range(2, 14):
        catalog.add(i, f"Film {i}", 2000, ["Drama"], f"D{i}")
    fake_llm.content = json.dumps({"movies": [{
        "title": "Still Walking", "year": 2008, "genres": ["Drama"],
        "director": "Hirokazu Kore-eda", "country": "Japan",
        "tone": "gentle, wistful",
        "mood_fit": "A slow summer day for a reflective mood.",
        "personalized_reason": "You love quiet family dramas."}] + [
        {"title": f"Film {i}", "year": 2000} for i in range(2, 14)]})
    movie = client.post("/api/suggestions", json={
        "moods": ["Reflective"]}).get_json()["movies"][0]
    assert movie["why"] == "You love quiet family dramas."
    assert movie["fit"].startswith("A slow summer day")
    assert movie["tone"] == "gentle, wistful"


# -- 3. learning shifts the prompt -------------------------------------------
def test_likes_and_dislikes_shift_prompt_context(client, catalog, pool,
                                                 fake_llm):
    user_id, headers = register_and_login(client)
    catalog.add(101, "Porco Rosso", 1992, ["Animation", "Adventure"],
                "Hayao Miyazaki", ["aviation"], "ja")
    catalog.add(102, "Bloodbath", 2012, ["Horror"], "Gore Master")
    fake_llm.content = titles_payload(pool)
    catalog.discover_ids = list(range(1, 31))

    def prompt_after_request():
        client.post("/api/suggestions", headers=headers,
                    json={"moods": ["Joyful"]})
        return user_prompts(fake_llm)[-1]

    before = prompt_after_request()
    assert "cold start" in before
    assert "Miyazaki" not in before

    client.put(f"/api/{user_id}/library/101", headers=headers,
               json={"like": True})
    client.put(f"/api/{user_id}/library/102", headers=headers,
               json={"dislike": True})
    after = prompt_after_request()

    assert "cold start" not in after
    assert "Leans towards" in after
    assert "Animation" in after and "Hayao Miyazaki" in after
    assert "Japanese" in after
    assert "Steer away from" in after and "Horror" in after
    assert "Recently liked: Porco Rosso (1992)" in after
    assert "Recently disliked: Bloodbath (2012)" in after
    assert client.post("/api/suggestions", headers=headers, json={
        "moods": ["Joyful"]}).get_json()["personalized"] is True


def test_anonymous_requests_get_cold_start_context(client, catalog, pool,
                                                   fake_llm):
    fake_llm.content = titles_payload(pool)
    data = client.post("/api/suggestions",
                       json={"moods": ["Joyful"]}).get_json()
    assert data["personalized"] is False
    assert "cold start" in user_prompts(fake_llm)[0]
