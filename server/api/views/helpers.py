#!/usr/bin/env python3
"""Shared helpers for route handlers."""
from functools import wraps

from flask import jsonify, request
from flask_jwt_extended import current_user, jwt_required
from sqlalchemy.exc import IntegrityError

from models import storage
from models.movie import Movie


def error(message, status=400):
    """Return a JSON error response tuple."""
    return jsonify({"error": message}), status


def json_body():
    """Return the request JSON object, or None if absent/invalid."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


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


def upsert_movies(movies):
    """Store TMDB movies locally (needed for the user's library pages).

    Best effort: failures are rolled back and ignored.
    """
    if not movies:
        return
    ids = [m["tmdb_id"] for m in movies]
    try:
        existing = {m.tmdb_id for m in storage.session.query(Movie.tmdb_id)
                    .filter(Movie.tmdb_id.in_(ids))}
        for data in movies:
            if data["tmdb_id"] in existing:
                continue
            fields = {k: data.get(k) for k in Movie.FIELDS}
            fields["title"] = (fields["title"] or "")[:128]
            storage.new(Movie(**fields))
            existing.add(data["tmdb_id"])
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
