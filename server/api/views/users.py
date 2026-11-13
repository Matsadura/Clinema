#!/usr/bin/python3
"""
User profile routes (JWT required).

Routes:
    - GET    /users/profile              The authenticated user's profile
    - PUT    /users/<user_id>/profile    Update first_name / last_name
    - DELETE /users/<user_id>/profile    Delete the account
"""
from flask import jsonify, request
from flask_jwt_extended import current_user, jwt_required

from api.views import app_views
from api.views.auth import public_user
from api.views.helpers import error, json_body
from models import storage

EDITABLE = ('first_name', 'last_name')


@app_views.route('/users/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get the current user's profile."""
    return jsonify(public_user(current_user))


@app_views.route('/users/<user_id>/profile', methods=['DELETE', 'PUT'])
@jwt_required()
def handle_user_id(user_id):
    """Update or delete the current user's own profile."""
    if current_user.id != user_id:
        verb = 'delete' if request.method == 'DELETE' else 'update'
        return error(f'Cannot {verb} another user', 403)

    if request.method == 'DELETE':
        storage.delete(current_user)
        storage.save()
        return jsonify({})

    data = json_body()
    if not data:
        return error('No data provided')
    for key, value in data.items():
        if key not in EDITABLE:
            return error(f'Invalid attribute {key}')
        if not isinstance(value, str) or not value.strip() or \
                len(value.strip()) > 128:
            return error(f'{key.replace("_", " ").capitalize()} must be '
                         '1-128 characters')
    for key, value in data.items():
        setattr(current_user, key, value.strip())
    storage.save()
    return jsonify(public_user(current_user)), 200
