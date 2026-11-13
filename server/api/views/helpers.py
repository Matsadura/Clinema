#!/usr/bin/env python3
"""Shared helpers for route handlers."""
from functools import wraps

from flask import current_app, g, jsonify, request
from flask_jwt_extended import (current_user, get_current_user, jwt_required,
                                verify_jwt_in_request)
from sqlalchemy.exc import IntegrityError

from api.services import credentials
from models import storage
from models.movie import Movie


def error(message, status=400):
    """Return a JSON error response tuple."""
    return jsonify({"error": message}), status


def json_body():
    """Return the request JSON object, or None if absent/invalid."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def optional_user():
    """The signed-in user if a valid token was sent, else None."""
    try:
        verify_jwt_in_request(optional=True)
        return get_current_user()
    except Exception:  # noqa: BLE001 - bad/expired token -> anonymous
        return None


def request_keys(user=None):
    """Candidate API keys per provider for this request: the caller's own
    key first (if they saved one), then the server's. Cached on ``g``."""
    if "api_keys" not in g:
        if user is None:
            user = optional_user()
        g.api_keys, g.key_sources = credentials.resolve(
            current_app.config, user.id if user else None)
    return g.api_keys


def owner_required(view):
    """Require a valid JWT whose user matches the ``user_id`` URL argument.

    The authenticated User is passed to the view as ``user``.
    """
    @wraps(view)
    @jwt_required()
    def wrapper(user_id, *args, **kwargs):
        if current_user is None:
            return error("User not found", 404)
        if current_user.id != user_id:
            return error("Unauthorized to access this data", 403)
        return view(*args, user=current_user, **kwargs)
    return wrapper


BASE_FIELDS = ('tmdb_id', 'title', 'description', 'poster', 'adult',
               'popularity', 'year', 'rating', 'language')


def upsert_movies(movies):
    """Store TMDB movies locally (needed for the library, history and taste
    learning), filling in missing taste features on existing rows.

    Each new film is inserted in its own savepoint: when two requests race
    to insert the same film, only that row is skipped (the other request
    stored it) instead of rolling back the whole batch.
    """
    if not movies:
        return
    ids = [m["tmdb_id"] for m in movies]
    existing = {m.tmdb_id: m for m in storage.session.query(Movie)
                .filter(Movie.tmdb_id.in_(ids))}
    for data in movies:
        features = {**data, "tones": [data["tone"]] if data.get("tone")
                    else None}
        movie = existing.get(data["tmdb_id"])
        if movie is not None:
            movie.set_features(features)
            continue
        fields = {k: data.get(k) for k in BASE_FIELDS}
        fields["title"] = (fields["title"] or "")[:128]
        movie = Movie(**fields)
        movie.set_features(features)
        try:
            with storage.session.begin_nested():
                storage.new(movie)
        except IntegrityError:
            continue  # inserted concurrently by another request
        existing[data["tmdb_id"]] = movie
    try:
        storage.save()
    except IntegrityError:
        storage.rollback()


def movies_by_tmdb_id(tmdb_ids):
    """Return {tmdb_id: movie_dict} for the given ids in one query."""
    if not tmdb_ids:
        return {}
    rows = storage.session.query(Movie).filter(
        Movie.tmdb_id.in_(list(tmdb_ids))).all()
    return {m.tmdb_id: m.to_dict() for m in rows}
