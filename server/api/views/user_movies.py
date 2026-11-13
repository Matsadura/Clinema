#!/usr/bin/python3
"""
A user's movie library (liked / saved flags). All routes require a JWT whose
user matches ``<user_id>``.

Routes:
    - GET    /<user_id>/library                  All entries + movie details
    - PUT    /<user_id>/library/<tmdb_id>        Upsert {like?, save?}
    - GET    /<user_id>/user_movies              All raw entries
    - GET    /<user_id>/liked | /<user_id>/save  Filtered entries + details
    - POST   /<user_id>/liked | /<user_id>/save  Create entry (legacy)
    - PUT    /<user_id>/liked/<id> | save/<id>   Update entry (legacy)
    - DELETE /<user_id>/liked/<id> | save/<id>   Delete entry
"""
from flask import current_app, jsonify, request

from api.services import tmdb
from api.views import app_views
from api.views.helpers import (error, json_body, movies_by_tmdb_id,
                               owner_required, upsert_movies)
from models import storage
from models.user_movie import User_Movie

FLAGS = ('like', 'save')


def _with_movies(entries):
    """Serialise entries, embedding cached movie details (one query).

    Movies missing from the local cache (e.g. rows created by the original
    prototype) are fetched from TMDB once and stored.
    """
    movies = movies_by_tmdb_id({e.movie_id for e in entries})
    missing = [e.movie_id for e in entries if e.movie_id not in movies]
    if missing:
        key = current_app.config.get("TMDB_API_KEY")
        fetched = [m for m in (tmdb.details(i, key) for i in missing[:20])
                   if m]
        upsert_movies(fetched)
        movies.update({m["tmdb_id"]: m for m in fetched})
    result = []
    for entry in entries:
        data = entry.to_dict()
        data['movie'] = movies.get(entry.movie_id)
        result.append(data)
    return result


def _user_entries(user, flag=None):
    query = storage.session.query(User_Movie).filter(
        User_Movie.user_id == user.id)
    if flag:
        query = query.filter(getattr(User_Movie, flag).is_(True))
    return query.order_by(User_Movie.updated_at.desc()).all()


def _parse_flags(data):
    """Return {flag: bool} for flags present in ``data``; ValueError if
    a flag is not a boolean."""
    flags = {}
    for flag in FLAGS:
        if flag in data:
            if not isinstance(data[flag], bool):
                raise ValueError(f"'{flag}' must be a boolean")
            flags[flag] = data[flag]
    return flags


def _owned_entry(user, user_movie_id):
    entry = storage.get(User_Movie, user_movie_id)
    if entry is None or entry.user_id != user.id:
        return None
    return entry


@app_views.get('/<user_id>/library')
@owner_required
def library(user):
    """Every library entry with embedded movie details."""
    return jsonify(_with_movies(_user_entries(user)))


@app_views.put('/<user_id>/library/<int:tmdb_id>')
@owner_required
def set_library_flags(tmdb_id, user):
    """Create/update the like/save flags for a movie in one call."""
    data = json_body()
    if data is None:
        return error('Invalid data')
    try:
        flags = _parse_flags(data)
    except ValueError as exc:
        return error(str(exc))
    if not flags:
        return error('Provide like and/or save')

    entry = storage.get_specific_double(
        User_Movie, 'user_id', user.id, 'movie_id', tmdb_id)
    if entry is None:
        entry = User_Movie(user_id=user.id, movie_id=tmdb_id,
                           like=False, save=False)
        storage.new(entry)
    for flag, value in flags.items():
        setattr(entry, flag, value)

    if not entry.like and not entry.save:
        storage.delete(entry)
        storage.save()
        return jsonify({'movie_id': tmdb_id, 'like': False, 'save': False})
    storage.save()
    return jsonify(entry.to_dict())


@app_views.get('/<user_id>/user_movies')
@owner_required
def user_movies(user):
    """All of the user's raw library entries."""
    return jsonify([e.to_dict() for e in _user_entries(user)])


@app_views.get('/<user_id>/save')
@owner_required
def save_movies(user):
    """Saved movies with details."""
    return jsonify(_with_movies(_user_entries(user, 'save')))


@app_views.get('/<user_id>/liked')
@owner_required
def liked_movies(user):
    """Liked movies with details."""
    return jsonify(_with_movies(_user_entries(user, 'like')))


@app_views.post('/<user_id>/save')
@app_views.post('/<user_id>/liked')
@owner_required
def save_or_liked(user):
    """Create a library entry. Body: movie_id (TMDB id) + like/save."""
    data = json_body()
    if data is None:
        return error('Invalid data')
    try:
        movie_id = int(data.get('movie_id'))
        flags = _parse_flags(data)
    except (TypeError, ValueError):
        return error('A valid movie_id and boolean like/save are required')
    if not flags:
        return error('Missing required save or like boolean')

    if storage.get_specific_double(User_Movie, 'user_id', user.id,
                                   'movie_id', movie_id):
        return error('User Movie relation already exists', 409)

    entry = User_Movie(user_id=user.id, movie_id=movie_id, **flags)
    storage.new(entry)
    storage.save()
    return jsonify(entry.to_dict()), 201


@app_views.route('/<user_id>/liked/<user_movie_id>', methods=['DELETE', 'PUT'])
@app_views.route('/<user_id>/save/<user_movie_id>', methods=['DELETE', 'PUT'])
@owner_required
def user_movie_id(user_movie_id, user):
    """Update or delete one of the caller's own library entries."""
    entry = _owned_entry(user, user_movie_id)
    if entry is None:
        return error('User_movie not found', 404)

    if request.method == 'DELETE':
        storage.delete(entry)
        storage.save()
        return jsonify({})

    data = json_body()
    if data is None:
        return error('No data provided')
    try:
        flags = _parse_flags(data)
    except ValueError as exc:
        return error(str(exc))
    for flag, value in flags.items():
        setattr(entry, flag, value)
    storage.save()
    return jsonify(entry.to_dict()), 200
