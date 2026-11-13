#!/usr/bin/python3
"""
A user's movie library (like / save / dislike flags) and preference-learning
signals. All routes require a JWT whose user matches ``<user_id>``.

Every flag change and every viewed movie is logged as a weighted
interaction and immediately folded into the user's taste profile.

Routes:
    - GET    /<user_id>/library                  All entries + movie details
    - PUT    /<user_id>/library/<tmdb_id>        Upsert like/save/dislike/seen
    - GET    /<user_id>/history                  Recent activity per movie
    - POST   /<user_id>/interactions             Log a view {movie_id}
    - GET    /<user_id>/taste                    Learned taste profile
    - GET    /<user_id>/user_movies              All raw entries
    - GET    /<user_id>/liked | /<user_id>/save  Filtered entries + details
    - POST   /<user_id>/liked | /<user_id>/save  Create entry (legacy)
    - PUT    /<user_id>/liked/<id> | save/<id>   Update entry (legacy)
    - DELETE /<user_id>/liked/<id> | save/<id>   Delete entry
"""
from flask import current_app, jsonify, request

from api.services import taste, tmdb
from api.views import app_views
from api.views.helpers import (error, json_body, movies_by_tmdb_id,
                               owner_required, request_keys, upsert_movies)
from models import storage
from models.interaction import Interaction
from models.user_movie import User_Movie

FLAGS = ('like', 'save', 'dislike', 'seen')
# flag -> (event when set, event when cleared)
FLAG_EVENTS = {'like': ('like', 'unlike'), 'dislike': ('dislike', 'undislike'),
               'save': ('save', 'unsave'), 'seen': ('seen', 'unseen')}


def _movies_with_backfill(tmdb_ids, user=None, limit=20):
    """{tmdb_id: movie_dict} from the local cache; films missing from it
    (e.g. rows from the original prototype) are fetched from TMDB once and
    stored."""
    movies = movies_by_tmdb_id(tmdb_ids)
    missing = [i for i in tmdb_ids if i not in movies][:limit]
    if missing:
        keys = request_keys(user)["tmdb"]
        fetched = [m for m in (tmdb.details(i, keys) for i in missing) if m]
        upsert_movies(fetched)
        movies.update({m["tmdb_id"]: m for m in fetched})
    return movies


def _with_movies(entries, user=None):
    """Serialise entries, embedding movie details (one query, plus a TMDB
    backfill for anything not cached)."""
    movies = _movies_with_backfill({e.movie_id for e in entries}, user)
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
    return jsonify(_with_movies(_user_entries(user), user))


def _learn(user, tmdb_ids):
    """Enrich the movies' taste features and rebuild the user's profile."""
    try:
        taste.ensure_features(tmdb_ids, request_keys(user)["tmdb"])
        profile = taste.refresh_profile(user.id)
        storage.save()
        return profile
    except Exception:  # noqa: BLE001 - learning must never break the UI
        current_app.logger.exception("Taste profile update failed")
        storage.rollback()
        return None


@app_views.put('/<user_id>/library/<int:tmdb_id>')
@owner_required
def set_library_flags(tmdb_id, user):
    """Create/update the like/save/dislike flags for a movie in one call.

    Like and dislike are mutually exclusive. Each change is logged as a
    weighted interaction and the taste profile is refreshed.
    """
    data = json_body()
    if data is None:
        return error('Invalid data')
    try:
        flags = _parse_flags(data)
    except ValueError as exc:
        return error(str(exc))
    if not flags:
        return error('Provide like, save, dislike and/or seen')
    if flags.get('like') and flags.get('dislike'):
        return error('A movie cannot be both liked and disliked')
    if flags.get('like'):
        flags.setdefault('dislike', False)
    if flags.get('dislike'):
        flags.setdefault('like', False)

    entry = storage.get_specific_double(
        User_Movie, 'user_id', user.id, 'movie_id', tmdb_id)
    if entry is None:
        entry = User_Movie(user_id=user.id, movie_id=tmdb_id, like=False,
                           save=False, dislike=False, seen=False)
        storage.new(entry)
    for flag, value in flags.items():
        if bool(getattr(entry, flag)) != value:
            taste.record_event(user.id, tmdb_id,
                               FLAG_EVENTS[flag][0 if value else 1])
        setattr(entry, flag, value)

    if not any(getattr(entry, flag) for flag in FLAGS):
        storage.delete(entry)
        result = {'movie_id': tmdb_id, **{flag: False for flag in FLAGS}}
    else:
        result = entry.to_dict()
    storage.save()
    _learn(user, [tmdb_id])
    return jsonify(result)


@app_views.post('/<user_id>/interactions')
@owner_required
def log_interaction(user):
    """Record a browsing signal. Body: {"movie_id": int, "event": "view"}.

    Like/dislike/save are recorded through the library endpoint.
    """
    data = json_body()
    if data is None:
        return error('Invalid data')
    movie_id = data.get('movie_id')
    if isinstance(movie_id, bool) or not isinstance(movie_id, int) or \
            movie_id <= 0:
        return error('movie_id must be a positive integer')
    event = data.get('event', 'view')
    if event != 'view':
        return error("Only 'view' events can be logged here")
    taste.record_event(user.id, movie_id, 'view')
    storage.save()
    profile = _learn(user, [movie_id])
    return jsonify({'recorded': True,
                    'interactions': (profile or {}).get('interactions')}), 201


HISTORY_EVENTS = ('recommended', 'view', 'like', 'dislike', 'save', 'seen')


@app_views.get('/<user_id>/history')
@owner_required
def history(user):
    """Recent activity, one entry per film (newest first).

    Each entry: {movie_id, movie, last_event, last_at, events: [...],
    moods: [...]} where ``moods`` are those the film was recommended for.
    Query: ?limit=1..100 (default 60).
    """
    import json

    try:
        limit = min(max(int(request.args.get('limit', 60)), 1), 100)
    except ValueError:
        return error('limit must be an integer')
    rows = storage.session.query(Interaction).filter(
        Interaction.user_id == user.id,
        Interaction.event.in_(HISTORY_EVENTS),
    ).order_by(Interaction.created_at.desc()).limit(1000).all()

    grouped = {}
    for row in rows:
        entry = grouped.get(row.movie_id)
        if entry is None:
            if len(grouped) >= limit:
                continue
            entry = grouped[row.movie_id] = {
                'movie_id': row.movie_id, 'last_event': row.event,
                'last_at': row.created_at.isoformat() + 'Z',
                'events': [], 'moods': []}
        if row.event not in entry['events']:
            entry['events'].append(row.event)
        if row.event == 'recommended' and row.context and not entry['moods']:
            try:
                entry['moods'] = json.loads(row.context).get('moods') or []
            except ValueError:
                pass
    movies = _movies_with_backfill(set(grouped), user)
    for movie_id, entry in grouped.items():
        entry['movie'] = movies.get(movie_id)
    return jsonify(list(grouped.values()))


@app_views.get('/<user_id>/taste')
@owner_required
def get_taste(user):
    """The learned taste profile and the summary injected into prompts."""
    profile = taste.get_profile(user.id)
    return jsonify({'profile': profile,
                    'summary': taste.summarize(profile),
                    'personalized': taste.has_signal(profile)})


@app_views.get('/<user_id>/user_movies')
@owner_required
def user_movies(user):
    """All of the user's raw library entries."""
    return jsonify([e.to_dict() for e in _user_entries(user)])


@app_views.get('/<user_id>/save')
@owner_required
def save_movies(user):
    """Saved movies with details."""
    return jsonify(_with_movies(_user_entries(user, 'save'), user))


@app_views.get('/<user_id>/liked')
@owner_required
def liked_movies(user):
    """Liked movies with details."""
    return jsonify(_with_movies(_user_entries(user, 'like'), user))


@app_views.get('/<user_id>/disliked')
@owner_required
def disliked_movies(user):
    """Disliked movies with details."""
    return jsonify(_with_movies(_user_entries(user, 'dislike'), user))


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
