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
    from models.movie import Movie
    from models.user_movie import User_Movie
    from models import storage

    return {"Users": storage.count(User),
            "Movies": storage.count(Movie),
            "User_Movies": storage.count(User_Movie)
            }
