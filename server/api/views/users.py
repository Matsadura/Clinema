#!/usr/bin/python3
"""Users related routes"""
from api.views import app_views
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models.user import User
from models import storage
from datetime import datetime


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


@app_views.route('/users/<user_id>/profile', methods=['DELETE', 'PUT'])
@jwt_required()
def handle_user_id(user_id):
    """Handle user_id related requests"""
    try:
        current_user = get_jwt_identity()
    except Exception as e:
        return jsonify({"error": "Invalid token"}), 401

    current_user_profile = storage.get_specific(User, 'id', current_user)
    if not current_user_profile:
        return jsonify({"error": "User not found"}), 404
    current_id = current_user_profile.id

    if request.method == 'DELETE':  # Delete the current user
        if user_id == current_id:
            storage.delete(current_user_profile)
            storage.save()
            return jsonify({})
        return jsonify({'error': 'Cannot delete another user'}), 403

    if request.method == 'PUT':   # Update current user profile
        try:
            data = request.get_json()
        except Exception as e:
            return jsonify({"error": "No data provided"}), 400

        if user_id == current_id:
            valid_attributes = ['first_name', 'last_name']
            for k, v in data.items():
                if k in valid_attributes:
                    setattr(current_user_profile, k, v)
                else:
                    return jsonify({"error": f"Invalid attribute {k}"}), 400
            setattr(current_user_profile, 'updated_at', datetime.utcnow())
            storage.save()
            return jsonify(current_user_profile.to_dict()), 200
        return jsonify({'error': 'Cannot update another user'}), 403
