#!/usr/bin/python3
"""Auth routes"""
from api.views import app_views
from flask import jsonify, request
from models import storage
from models.user import User


@app_views.route('/register', methods=['POST'])
def register_user():
    """Register a new user"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name')
    last_name = data.get('last_name')

    if not email or not password or not first_name or not last_name:
        return jsonify({'error': 'Missing required fields'}), 400

    if storage.get_specific(User, 'email', email):
        return jsonify({'error': 'User already exists'}), 400

    new_user = User(**data)

    storage.new(new_user)
    storage.save()

    return jsonify(new_user.to_dict()), 201
