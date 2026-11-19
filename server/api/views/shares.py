#!/usr/bin/python3
"""Shareable, read-only watchlists.

Routes:
    - GET /<user_id>/watchlist/share   Sharing status (owner only)
    - PUT /<user_id>/watchlist/share   {"enabled": bool, "rotate": bool}
    - GET /shared/<share_id>           Public: the owner's first name and
                                       watchlist (newest first)

The share id is 128 bits of randomness, so links can't be guessed or
enumerated. Turning sharing off (or rotating) kills old links at once.
"""
import re
import secrets

from flask import jsonify

from api.extensions import limiter
from api.views import app_views
from api.views.helpers import error, json_body, owner_required
from api.views.user_movies import _movies_with_backfill, _user_entries
from models import storage
from models.user import User

_SHARE_ID = re.compile(r"^[A-Za-z0-9_-]{16,32}$")
SHARED_LIMIT = 200


def _status(user):
    return {"enabled": bool(user.watchlist_share_id),
            "share_id": user.watchlist_share_id}


@app_views.route('/<user_id>/watchlist/share', methods=['GET'])
@owner_required
def get_share(user):
    return jsonify(_status(user))


@app_views.route('/<user_id>/watchlist/share', methods=['PUT'])
@owner_required
def set_share(user):
    data = json_body()
    if data is None:
        return error('Expected a JSON object')
    enabled = data.get('enabled')
    if not isinstance(enabled, bool):
        return error('"enabled" must be true or false')
    if not enabled:
        user.watchlist_share_id = None
    elif data.get('rotate') is True or not user.watchlist_share_id:
        user.watchlist_share_id = secrets.token_urlsafe(16)  # 22 chars
    storage.save()
    return jsonify(_status(user))


@app_views.route('/shared/<share_id>', methods=['GET'])
@limiter.limit("30 per minute")
def shared_watchlist(share_id):
    if not _SHARE_ID.match(share_id):
        return error('This list is private or no longer shared', 404)
    owner = storage.get_specific(User, 'watchlist_share_id', share_id)
    if owner is None:
        return error('This list is private or no longer shared', 404)
    entries = _user_entries(owner, 'save')[:SHARED_LIMIT]
    movies = _movies_with_backfill({e.movie_id for e in entries}, owner)
    return jsonify({
        "owner": owner.first_name,  # never the email or full name
        "movies": [movies[e.movie_id] for e in entries
                   if e.movie_id in movies],
    })
