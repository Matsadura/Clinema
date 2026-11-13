#!/usr/bin/python3
"""AI movie suggestion routes.

``POST /api/suggestions`` is the primary endpoint; ``/movies_by_mood`` is
kept as an alias for older clients.
"""
import logging

from flask import current_app, g, jsonify

from api.extensions import limiter
from api.services import taste
from api.services.recommender import parse_moods, recommend
from api.views import app_views
from api.views.helpers import (error, json_body, optional_user,
                               request_keys, upsert_movies)
from models import storage

SUGGESTION_LIMIT = "20 per minute; 200 per day"
MAX_SEEN_IDS = 300
log = logging.getLogger(__name__)


def _parse_seen_ids(value):
    """Movie ids the client has already shown (anonymous de-duplication)."""
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError("seen_ids must be a list of movie ids")
    ids = []
    for item in value[-MAX_SEEN_IDS:]:
        if isinstance(item, bool) or not isinstance(item, int) or item <= 0:
            raise ValueError("seen_ids must be a list of movie ids")
        ids.append(item)
    return ids


def _run(data):
    """Validate input, run the pipeline and build the JSON response."""
    if data is None:
        return error("Request body must be a JSON object")
    try:
        moods = parse_moods(data.get('mood', data.get('moods')))
        seen_ids = _parse_seen_ids(data.get('seen_ids'))
    except ValueError as exc:
        return error(str(exc))
    if not moods:
        return error("Select at least one mood")

    user = optional_user()
    keys = request_keys(user)
    user_id = user.id if user else None
    result = recommend(moods, current_app.config, user_id=user_id,
                       seen_ids=seen_ids, keys=keys)
    upsert_movies(result["movies"])
    if user_id:
        try:
            taste.record_recommendations(user_id, result["movies"],
                                         {"moods": moods})
            storage.save()
        except Exception:  # noqa: BLE001 - history is best effort
            log.exception("Could not record recommendation history")
    return jsonify({
        "personalized": result["personalized"],
        "key_sources": g.key_sources,
        "excluded": result["excluded"],
        "movies": result["movies"],
        "suggestions": result["titles"],
        "source": result["source"],
        "moods": moods,
    })


@app_views.route('/suggestions', methods=['POST'])
@limiter.limit(SUGGESTION_LIMIT)
def suggestions():
    """Body: {"moods": ["Calm", ...], "seen_ids": [tmdb ids]?}"""
    return _run(json_body())


@app_views.route('/movies_by_mood', methods=['POST'])
@limiter.limit(SUGGESTION_LIMIT)
def movie_suggestion_mood_only():
    """Legacy alias. Body: {"mood": [...]}"""
    data = json_body()
    if data is not None:
        data = {"mood": data.get("mood")}
    return _run(data)
