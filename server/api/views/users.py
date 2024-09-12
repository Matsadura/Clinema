#!/usr/bin/python3
"""Users related routes"""
from api.views import app_views
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models.user import User
from models import storage


@app_views.route('/users/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get user profile"""
    try:
        current_user = get_jwt_identity()
    except Exception as e:
        return jsonify({"error": "Invalid token"}), 401

    user_profile = storage.get_specific(User, 'id', current_user)
    if not user_profile:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user_profile.to_dict())
