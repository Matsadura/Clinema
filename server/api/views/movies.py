#!/usr/bin/python3
"""
Module containing routes for managing movies in the application.

This module provides routes for retrieving and creating movies.
It also includes error handling for various scenarios
related to movie operations.

Routes:
    - GET /movies: Retrieve all movies.
    - POST /movies: Create a new movie.

Exceptions:
    - Invalid token: Raised when the JWT token is invalid.
    - Invalid Request: Raised when the request is invalid.
    - Movie name is required: Raised when the movie name
        is missing in the request.
    - Movie name already exists: Raised when a movie
        with the same name already exists in the database.

Attributes:
    - storage: Object for interacting with the database storage.
    - Movie: Class representing a movie entity in the database.
"""
from api.views import app_views
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models import storage
from models.movie import Movie


@app_views.route('/movies', methods=['GET'])
def movies():
    """Get all movies"""
    movies = storage.all_list(Movie)
    if not movies:
        return jsonify([])
    return jsonify([movie.to_dict() for movie in movies])


@app_views.route('/movies', methods=['POST'])
def post_movies():
    try:
        verify_jwt_in_request()
        current_user = get_jwt_identity()
    except Exception as e:
        return jsonify({"error": "Invalid token"}), 401

    try:
        movie_data = request.get_json()
    except Exception as e:
        return jsonify({'error': 'Invalid Request'}), 400

    name = movie_data.get('name')
    if not name:
        return jsonify({'error': 'Movie name is required'}), 400

    existing_movie = storage.get_specific(Movie, 'name', name)
    if existing_movie:
        return jsonify({'error': 'Movie name already exists'}), 400

    valid_attributes = ['name', 'description', 'poster', 'adult',
                        'year', 'rating', 'popularity']
    movie_parsed = {}
    for k, v in movie_data.items():
        if k in valid_attributes:
            movie_parsed[k] = v

    new_movie = Movie(**movie_parsed)
    storage.new(new_movie)
    storage.save()
    return jsonify(new_movie.to_dict()), 201
