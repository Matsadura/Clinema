# API Documentation

This document provides an overview of the API endpoints for Clinema.

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Movies](#movies)
4. [User Movies](#user-movies)
5. [Weather](#weather)
6. [Movie Suggestions](#movie-suggestions)

## Authentication

### Register a new user

- **URL**: `/register`
- **Method**: `POST`
- **Input**:
  - `email`: String (required)
  - `password`: String (required)
  - `first_name`: String (required)
  - `last_name`: String (required)
- **Success Response**: 
  - **Code**: 201
  - **Content**: `{ user_data }`
- **Error Response**: 
  - **Code**: 400
  - **Content**: `{ "error": "Missing required fields" }`

### Login

- **URL**: `/login`
- **Method**: `POST`
- **Input**:
  - `email`: String (required)
  - `password`: String (required)
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ "token": "JWT_TOKEN", "user_id": "USER_ID" }`
- **Error Response**: 
  - **Code**: 401
  - **Content**: `{ "error": "Invalid email or password" }`

### Validate User

- **URL**: `/auth_validate`
- **Method**: `GET`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ "first_name": "FIRST_NAME", "last_name": "LAST_NAME", "avatar": "AVATAR_URL" }`
- **Error Response**: 
  - **Code**: 401
  - **Content**: `{ "error": "Invalid token" }`

## Users

### Get User Profile

- **URL**: `/users/profile`
- **Method**: `GET`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ user_profile_data }`
- **Error Response**: 
  - **Code**: 404
  - **Content**: `{ "error": "User not found" }`

### Update User Profile

- **URL**: `/users/<user_id>/profile`
- **Method**: `PUT`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Input**:
  - `first_name`: String (optional)
  - `last_name`: String (optional)
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ updated_user_profile_data }`
- **Error Response**: 
  - **Code**: 403
  - **Content**: `{ "error": "Cannot update another user" }`

### Delete User Profile

- **URL**: `/users/<user_id>/profile`
- **Method**: `DELETE`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{}`
- **Error Response**: 
  - **Code**: 403
  - **Content**: `{ "error": "Cannot delete another user" }`

## Movies

### Get All Movies

- **URL**: `/movies`
- **Method**: `GET`
- **Success Response**: 
  - **Code**: 200
  - **Content**: `[{ movie_data }, ...]`

### Create a New Movie

- **URL**: `/movies`
- **Method**: `POST`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Input**:
  - `title`: String (required)
  - `tmdb_id`: Integer (required)
  - `description`: String (optional)
  - `poster`: String (optional)
  - `adult`: Boolean (optional)
  - `popularity`: Float (optional)
  - `year`: Integer (optional)
  - `rating`: Float (optional)
  - `language`: String (optional)
- **Success Response**: 
  - **Code**: 201
  - **Content**: `{ created_movie_data }`
- **Error Response**: 
  - **Code**: 409
  - **Content**: `{ "error": "Movie name already exists" }`

### Get Specific Movie

- **URL**: `/movies/<movie_id>`
- **Method**: `GET`
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ movie_data }`
- **Error Response**: 
  - **Code**: 404
  - **Content**: `{ "error": "Movie not found" }`

## User Movies

### Get All User Movies

- **URL**: `/<user_id>/user_movies`
- **Method**: `GET`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Success Response**: 
  - **Code**: 200
  - **Content**: `[{ user_movie_data }, ...]`
- **Error Response**: 
  - **Code**: 403
  - **Content**: `{ "error": "Unauthorized to access this data" }`

### Get Saved Movies

- **URL**: `/<user_id>/save`
- **Method**: `GET`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Success Response**: 
  - **Code**: 200
  - **Content**: `[{ saved_movie_data }, ...]`
- **Error Response**: 
  - **Code**: 403
  - **Content**: `{ "error": "Unauthorized to access this data" }`

### Get Liked Movies

- **URL**: `/<user_id>/liked`
- **Method**: `GET`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Success Response**: 
  - **Code**: 200
  - **Content**: `[{ liked_movie_data }, ...]`
- **Error Response**: 
  - **Code**: 403
  - **Content**: `{ "error": "Unauthorized to access this data" }`

### Save or Like a Movie

- **URL**: `/<user_id>/save` or `/<user_id>/liked`
- **Method**: `POST`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Input**:
  - `movie_id`: Integer (required)
  - `user_id`: String (required)
  - `save`: Boolean (required for save)
  - `like`: Boolean (required for like)
- **Success Response**: 
  - **Code**: 201
  - **Content**: `{ user_movie_relation_data }`
- **Error Response**: 
  - **Code**: 409
  - **Content**: `{ "error": "User Movie relation already exists" }`

### Delete User-Movie Relation

- **URL**: `/<user_id>/liked/<user_movie_id>` or `/<user_id>/save/<user_movie_id>`
- **Method**: `DELETE`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{}`
- **Error Response**: 
  - **Code**: 404
  - **Content**: `{ "error": "User_movie is not found" }`

### Update User-Movie Relation

- **URL**: `/<user_id>/liked/<user_movie_id>` or `/<user_id>/save/<user_movie_id>`
- **Method**: `PUT`
- **Headers**: 
  - `Authorization`: Bearer Token
- **Input**:
  - `save`: Boolean (optional)
  - `like`: Boolean (optional)
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ updated_user_movie_relation_data }`
- **Error Response**: 
  - **Code**: 404
  - **Content**: `{ "error": "User_movie not found" }`

## Weather

### Get Weather

- **URL**: `/weather`
- **Method**: `GET`
- **Query Parameters**:
  - `lat`: Float (required)
  - `lon`: Float (required)
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ weather_data }`
- **Error Response**: 
  - **Code**: 400
  - **Content**: `{ "error": "Missing latitude or longitude" }`

## Movie Suggestions

### Get Movie Suggestions by Mood and Weather

- **URL**: `/movies_by_mood_and_weather`
- **Method**: `POST`
- **Input**:
  - `mood`: String (required)
  - `latitude`: Float (required)
  - `longitude`: Float (required)
- **Success Response**: 
  - **Code**: 201
  - **Content**: `{ "suggestions": [movie_titles] }`
- **Error Response**: 
  - **Code**: 400
  - **Content**: `{ "error": "Mood, latitude, and longitude are required" }`

### Get Movie Suggestions by Mood Only

- **URL**: `/movies_by_mood`
- **Method**: `POST`
- **Input**:
  - `mood`: String (required)
- **Success Response**: 
  - **Code**: 201
  - **Content**: `{ "suggestions": [movie_titles] }`
- **Error Response**: 
  - **Code**: 400
  - **Content**: `{ "error": "Mood is required" }`

### Get Movie Suggestions by Weather Only

- **URL**: `/movies_by_weather`
- **Method**: `POST`
- **Input**:
  - `latitude`: Float (required)
  - `longitude`: Float (required)
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ "suggestions": [movie_titles] }`
- **Error Response**: 
  - **Code**: 400
  - **Content**: `{ "error": "Latitude and longitude are required" }`