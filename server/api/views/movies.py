#!/usr/bin/python3
"""Routes for the locally cached movie catalogue.

Routes:
    - GET  /movies             List cached movies (?limit=&offset=)
    - POST /movies             Cache a movie (auth required)
    - GET  /movies/<tmdb_id>   Get one movie by TMDB id
"""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from api.services import tmdb
from api.views import app_views
from api.views.helpers import error, json_body, request_keys, upsert_movies
from models import storage
from models.movie import Movie


@app_views.route('/movies', methods=['GET'])
def movies():
    """List cached movies, most recent first (paginated)."""
    try:
        limit = min(max(int(request.args.get('limit', 50)), 1), 200)
        offset = max(int(request.args.get('offset', 0)), 0)
    except ValueError:
        return error('limit and offset must be integers')
    rows = storage.session.query(Movie).order_by(
        Movie.created_at.desc()).offset(offset).limit(limit).all()
    return jsonify([m.to_dict() for m in rows])


@app_views.route('/movies', methods=['POST'])
@jwt_required()
def post_movies():
    """Cache a movie. Body: title, tmdb_id (required) + optional fields."""
    data = json_body()
    if not data:
        return error('Invalid Request')
    if not data.get('title'):
        return error('Movie name is required')
    try:
        tmdb_id = int(data.get('tmdb_id'))
    except (TypeError, ValueError):
        return error('tmdb_id is required')

    if storage.get_specific(Movie, 'tmdb_id', tmdb_id):
        return error('Movie already exists', 409)

    fields = {k: data.get(k) for k in Movie.FIELDS}
    fields['tmdb_id'] = tmdb_id
    movie = Movie(**fields)
    storage.new(movie)
    storage.save()
    return jsonify(movie.to_dict()), 201


@app_views.route('/movies/<int:tmdb_id>', methods=['GET'])
def get_movie(tmdb_id):
    """Get a movie by TMDB id, fetching it from TMDB if not cached."""
    movie = storage.get_specific(Movie, 'tmdb_id', tmdb_id)
    if movie:
        return jsonify(movie.to_dict())
    data = tmdb.details(tmdb_id, request_keys()["tmdb"])
    if not data:
        return error('Movie not found', 404)
    upsert_movies([data])
    return jsonify(data)
