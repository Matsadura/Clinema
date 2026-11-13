#!/usr/bin/python3
"""AI movie suggestion routes.

``POST /api/suggestions`` is the primary endpoint. The original
``/movies_by_*`` routes are kept for backwards compatibility.
"""
import logging

from flask import current_app, g, jsonify

from api.extensions import limiter
from api.services import ServiceError, taste
from api.services.recommender import parse_moods, recommend
from api.services.weather import get_weather
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


def _run(data, need_mood=False, need_location=False):
    """Validate input, run the pipeline and build the JSON response."""
    if data is None:
        return error("Request body must be a JSON object")
    try:
        moods = parse_moods(data.get('mood', data.get('moods')))
        seen_ids = _parse_seen_ids(data.get('seen_ids'))
    except ValueError as exc:
        return error(str(exc))

    lat, lon = data.get('latitude'), data.get('longitude')
    has_location = lat not in (None, "") and lon not in (None, "")

    if need_mood and not moods:
        return error("Select at least one mood")
    if need_location and not has_location:
        return error("Latitude and longitude are required")
    if not moods and not has_location:
        return error("Provide a mood, a location, or both")

    config = current_app.config
    user = optional_user()
    keys = request_keys(user)
    weather, weather_error = None, None
    if has_location:
        try:
            weather = get_weather(lat, lon, keys["openweather"])
        except ValueError as exc:
            return error(str(exc))
        except ServiceError as exc:
            if need_location and not moods:
                raise
            weather_error = exc.message  # degrade to mood-only

    user_id = user.id if user else None
    result = recommend(moods, weather, config, user_id=user_id,
                       seen_ids=seen_ids, keys=keys)
    upsert_movies(result["movies"])
    if user_id:
        context = {"moods": moods,
                   "weather": weather["condition"] if weather else None}
        try:
            taste.record_recommendations(user_id, result["movies"], context)
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
        "weather": weather,
        "warning": weather_error,
    })


@app_views.route('/suggestions', methods=['POST'])
@limiter.limit(SUGGESTION_LIMIT)
def suggestions():
    """Body: {"moods": [..]?, "latitude": n?, "longitude": n?}"""
    return _run(json_body())


@app_views.route('/movies_by_mood_and_weather', methods=['POST'])
@limiter.limit(SUGGESTION_LIMIT)
def movie_suggestion_mood_weather():
    """Get movie suggestions based on mood and weather"""
    return _run(json_body(), need_mood=True, need_location=True)


@app_views.route('/movies_by_mood', methods=['POST'])
@limiter.limit(SUGGESTION_LIMIT)
def movie_suggestion_mood_only():
    """Get movie suggestions based on mood only"""
    data = json_body()
    if data is not None:
        data = {"mood": data.get("mood")}
    return _run(data, need_mood=True)


@app_views.route('/movies_by_weather', methods=['POST'])
@limiter.limit(SUGGESTION_LIMIT)
def movie_suggestion_weather_only():
    """Get movie suggestions based on weather only"""
    data = json_body()
    if data is not None:
        data = {"latitude": data.get("latitude"),
                "longitude": data.get("longitude")}
    return _run(data, need_location=True)
