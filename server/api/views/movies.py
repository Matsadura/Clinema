#!/usr/bin/python3
"""
Movies related routes
"""
from api.views import app_views
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import storage
from models.movie import Movie


@app_views.get('/movies')
def movies():
    """Get all movies"""
    movies = storage.all_list(Movie)
    if not movies:
        return jsonify([])
    return jsonify([movie.to_dict() for movie in movies])


@app_views.post('/movies')
@jwt_required
def post_movies():
    try:
        get_jwt_identity()
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

    valid_attributes = ['name', 'description', 'poster']
    movie_parsed = {}
    for k, v in movie_data.items():
        if k in valid_attributes:
            movie_parsed[k] = v

    new_movie = Movie(**movie_parsed)
    storage.new(new_movie)
    storage.save()
    return jsonify(new_movie.to_dict()), 201
