#!/usr/bin/python3
"""Health and metrics routes"""
from api.extensions import limiter
from api.views import app_views
from models import storage


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


@app_views.route('/features')
@limiter.exempt
def features():
    """Optional features this server has configured (for the UI)."""
    from flask import current_app

    from api.services import mailer
    return {"password_reset": mailer.configured(current_app.config)}
