#!/usr/bin/python3
"""Metrics Routes"""
from api.views import app_views


@app_views.route('/status')
def status():
    """Return the API status all wrapped in a json object"""
    return {"status": "OK"}, 200


@app_views.route('stats')
def stats():
    """Return the count of all classes"""
    from models.user import User
    from models.mood import Mood
    from models.recommendation import Recommendation
    from models import storage

    return {"Users": storage.count(User),
            "Moods": storage.count(Mood),
            "Recommendations": storage.count(Recommendation)
            }
