#!/usr/bin/python3
"""Health and metrics routes"""
from api.extensions import limiter
from api.views import app_views
from models import storage
from models.movie import Movie
from models.user import User
from models.user_movie import User_Movie


@app_views.route('/status')
@limiter.exempt
def status():
    """Liveness probe: the process is up."""
    return {"status": "OK"}, 200


@app_views.route('/health')
@limiter.exempt
def health():
    """Readiness probe: the API can reach its database."""
    if storage.ping():
        return {"status": "OK", "database": "up"}, 200
    return {"status": "degraded", "database": "down"}, 503


@app_views.route('/stats')
def stats():
    """Return the count of all classes"""
    return {"Users": storage.count(User),
            "Movies": storage.count(Movie),
            "User_Movies": storage.count(User_Movie)}
