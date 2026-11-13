#!/usr/bin/python3
"""
Bring-your-own API keys (JWT required; ``<user_id>`` must be the caller).

Routes:
    - GET    /<user_id>/api-keys               Status per provider (masked)
    - PUT    /<user_id>/api-keys/<provider>    Validate + save {"key": "..."}
    - DELETE /<user_id>/api-keys/<provider>    Remove (fall back to server)

Providers: groq, tmdb. Keys are verified with the provider
before saving, stored encrypted, and never returned (only the last four
characters).
"""
from flask import jsonify

from api.extensions import limiter
from api.services import credentials
from api.views import app_views
from api.views.helpers import error, json_body, owner_required


def _provider_or_404(provider):
    return provider if provider in credentials.PROVIDERS else None


@app_views.get('/<user_id>/api-keys')
@owner_required
def list_api_keys(user):
    """Which providers use the user's own key, and their status."""
    return jsonify(credentials.list_keys(user.id))


@app_views.put('/<user_id>/api-keys/<provider>')
@owner_required
@limiter.limit("10 per hour")
def save_api_key(provider, user):
    """Verify a key with the provider, then store it encrypted."""
    if not _provider_or_404(provider):
        return error('Unknown provider', 404)
    data = json_body()
    if not data or not isinstance(data.get('key'), str):
        return error('Provide the API key as {"key": "..."}')
    try:
        key = credentials.validate(provider, data['key'])
    except credentials.InvalidKey as exc:
        return error(str(exc), 400)
    except credentials.VerificationUnavailable as exc:
        return error(str(exc), 502)
    credentials.save_key(user.id, provider, key)
    entry = next(k for k in credentials.list_keys(user.id)
                 if k['provider'] == provider)
    return jsonify(entry), 200


@app_views.delete('/<user_id>/api-keys/<provider>')
@owner_required
def delete_api_key(provider, user):
    """Remove the user's key; requests fall back to the server key."""
    if not _provider_or_404(provider):
        return error('Unknown provider', 404)
    if not credentials.delete_key(user.id, provider):
        return error('No key saved for this provider', 404)
    return jsonify({'provider': provider, 'configured': False})
