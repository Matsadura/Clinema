#!/usr/bin/python3
"""
user_movies related routes

This module contains routes for managing user-movie relationships, including
seen and liked movies. These routes require JWT authentication
for access control.

Routes:
    - /<user_id>/user_movies:
        - GET: Retrieve all user-movie relationships for a specific user.

    - /<user_id>/seen:
        - GET: Retrieve all seen movies for a specific user.

    - /<user_id>/liked:
        - GET: Retrieve all liked movies for a specific user.

    - /<user_id>/seen:
    - /<user_id>/liked:
        - POST: Add a new liked or seen movie for a specific user.

    - /<user_id>/liked/<user_movie_id>:
    - /<user_id>/seen/<user_movie_id>:
        - DELETE: Delete a specific user-movie relationship.
        - PUT: Update a specific user-movie relationship.

Attributes:
    - User_Movie: Class representing the relationship between
        a user and a movie.
    - storage: Object for interacting with the database storage.

Exceptions:
    - Invalid token: Raised when the JWT token is invalid.
    - User not found: Raised when the user is not found in the database.
    - Unauthorized: Raised when the user is not authorized to access
        or modify the data.
    - Invalid data: Raised when the request data is invalid or missing.

Returns:
    - JSON response containing the user-movie relationship data
        or appropriate error messages.
"""
from api.views import app_views
from datetime import datetime
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import storage
from models.movie import Movie
from models.user import User
from models.user_movie import User_Movie


@app_views.get('/<user_id>/user_movies')
@jwt_required()
def user_movies(user_id):
    try:
        current_user = get_jwt_identity()
    except Exception as e:
        return jsonify({"error": "Invalid token"}), 401

    current_user_profile = storage.get_specific(User, 'id', current_user)
    if not current_user_profile:
        return jsonify({"error": "User not found"}), 404
    current_id = current_user_profile.id

    if current_id != user_id:
        return jsonify({'error': 'Unauthorized to access this data'}), 403

    all_um = storage.all_list_specific(User_Movie, 'user_id', user_id)
    if not all_um:
        return jsonify([])
    return jsonify([um.to_dict() for um in all_um])


@app_views.get('/<user_id>/seen')
@jwt_required()
def seen_movies(user_id):
    try:
        current_user = get_jwt_identity()
    except Exception as e:
        return jsonify({"error": "Invalid token"}), 401

    current_user_profile = storage.get_specific(User, 'id', current_user)
    if not current_user_profile:
        return jsonify({"error": "User not found"}), 404
    current_id = current_user_profile.id

    if current_id != user_id:
        return jsonify({'error': 'Unauthorized to access this data'}), 403

    all_user_movies = storage.all(User_Movie).values()
    seen_movies = [
        um.movie.to_dict() for um in all_user_movies
        if um.user_id == current_id and um.seen
    ]
    return jsonify(seen_movies)


@app_views.get('/<user_id>/liked')
@jwt_required()
def liked_movies(user_id):
    try:
        current_user = get_jwt_identity()
    except Exception as e:
        return jsonify({"error": "Invalid token"}), 401

    current_user_profile = storage.get_specific(User, 'id', current_user)
    if not current_user_profile:
        return jsonify({"error": "User not found"}), 404
    current_id = current_user_profile.id

    if current_id != user_id:
        return jsonify({'error': 'Unauthorized to access this data'}), 403

    if request.method == 'GET':  # Get liked movies
        all_user_movies = storage.all(User_Movie).values()
        liked_movies = [
            um.movie.to_dict() for um in all_user_movies
            if um.user_id == current_id and um.like
        ]
        return jsonify(liked_movies)


# TO ADD - Check if an object already exists with same request json data
@app_views.post('/<user_id>/seen')
@app_views.post('/<user_id>/liked')
@jwt_required()
def seen_or_liked(user_id):
    try:
        current_user = get_jwt_identity()
    except Exception as e:
        return jsonify({"error": "Invalid token"}), 401

    current_user_profile = storage.get_specific(User, 'id', current_user)
    if not current_user_profile:
        return jsonify({"error": "User not found"}), 404
    current_id = current_user_profile.id

    if current_id != user_id:
        return jsonify({'error': 'Unauthorized to add this data'}), 403

    try:
        data = request.get_json()
    except Exception as e:
        return jsonify({'error': 'Invalid data'}), 400

    if not data['user_id'] or not data['movie_id']:
        return jsonify({'error': 'Missing required user_id or movie_id'}), 400

    if data['seen'] is None and data['like'] is None:
        return jsonify({'error': 'Missing required seen or like boolean'}), 400

    existing_user = storage.get(User, data['user_id'])
    if not existing_user:
        return jsonify({'error': 'User does not exist'}), 404

    existing_movie = storage.get(Movie, id=data['movie_id'])
    if not existing_movie:
        return jsonify({'error': 'Movie does not exist'}), 404

    valid_attribute = ['user_id', 'movie_id', 'seen', 'like']
    new_like = {}
    for k, v in data.items():
        if k in valid_attribute:
            new_like[k] = v

    new_user_movie_like = User_Movie(**new_like)
    storage.new(new_user_movie_like)
    storage.save()

    return jsonify(new_user_movie_like.to_dict()), 201


@app_views.route('/<user_id>/liked/<user_movie_id>', methods=['DELETE', 'PUT'])
@app_views.route('/<user_id>/seen/<user_movie_id>', methods=['DELETE', 'PUT'])
@jwt_required()
def user_movie_id(user_id, user_movie_id):
    try:
        current_user = get_jwt_identity()
    except Exception as e:
        return jsonify({"error": "Invalid token"}), 401

    current_user_profile = storage.get_specific(User, 'id', current_user)
    if not current_user_profile:
        return jsonify({"error": "User not found"}), 404
    current_id = current_user_profile.id

    if current_id != user_id:
        return jsonify({'error': 'Unauthorized to DEL OR PUT this data'}), 403

    if request.method == 'DELETE':
        um = storage.get_specific(User_Movie, 'id', user_movie_id)
        if not um:
            return jsonify({'error': 'User_movie is not found'}), 404
        storage.delete(um)
        storage.save()
        return jsonify({})

    if request.method == 'PUT':
        try:
            data = request.get_json()
        except Exception as e:
            return jsonify({"error": "No data provided"}), 400

        current_user_movie = storage.get_specific(
            User_Movie, 'id', user_movie_id)
        if not current_user_movie:
            return jsonify({"error": "User_movie not found"}), 404

        valid_attributes = ['seen', 'like']
        for k, v in data.items():
            if k in valid_attributes:
                setattr(current_user_movie, k, v)
        setattr(current_user_movie, 'updated_at', datetime.utcnow())
        storage.save()
        return jsonify(current_user_movie.to_dict()), 200
