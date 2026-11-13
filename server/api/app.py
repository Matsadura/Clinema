#!/usr/bin/env python3
"""Flask application factory.

Production:  gunicorn "api.app:create_app()"
Development: python3 -m api.app
"""
import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from api.config import build_config
from api.extensions import jwt, limiter
from api.services import ServiceError
from models import storage

log = logging.getLogger(__name__)


def create_app(overrides=None):
    """Create and configure the Flask application."""
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    app = Flask(__name__)
    app.config.update(build_config(overrides))
    app.url_map.strict_slashes = False

    if app.config["TRUSTED_PROXIES"]:
        hops = app.config["TRUSTED_PROXIES"]
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=hops, x_proto=hops,
                                x_host=hops)

    if app.config["CORS_ORIGINS"]:
        CORS(app, resources={r"/api/*": {
            "origins": app.config["CORS_ORIGINS"]}})

    jwt.init_app(app)
    limiter.init_app(app)

    storage.reload(app.config.get("DATABASE_URL"))

    from api.views import app_views
    app.register_blueprint(app_views)

    _register_error_handlers(app)

    @app.teardown_appcontext
    def teardown_db(exception):
        if exception is not None:
            storage.rollback()
        storage.close()

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy",
                                    "strict-origin-when-cross-origin")
        return response

    return app


def _register_error_handlers(app):
    @app.errorhandler(ServiceError)
    def service_error(err):
        return jsonify({"error": err.message}), err.status

    @app.errorhandler(429)
    def rate_limited(err):
        return jsonify({"error": "Too many requests, please slow down."}), 429

    @app.errorhandler(HTTPException)
    def http_error(err):
        messages = {404: "Not found", 405: "Method not allowed",
                    413: "Request too large"}
        return jsonify({"error": messages.get(err.code, err.name)}), err.code

    @app.errorhandler(Exception)
    def unhandled(err):
        log.exception("Unhandled error")
        storage.rollback()
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    create_app().run(host=os.getenv("MOVIE_API_HOST", "127.0.0.1"),
                     port=int(os.getenv("MOVIE_API_PORT", "5000")),
                     debug=os.getenv("FLASK_DEBUG") == "1")
