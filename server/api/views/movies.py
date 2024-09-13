#!/usr/bin/python3
"""
Movies related routes
"""
from api.views import app_views
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity # later
from models import storage
from models.movie import Movie


@app_views.route('/movies', methods=['GET', 'POST'])
def movies():
    """Get all movies"""
    if request.method == 'GET':
        movies = storage.all(Movie)
        return jsonify([movie.to_dict() for movie in movies])

    if request.method == 'POST':
        movie_data = request.get_json(silent=True)
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
    



# @app_views.route('/movies/<movie_id>', methods=['DELETE'])
# def movie_id():
#     """Handles movie_id related requests"""
#     if request.method == 'DELETE':
