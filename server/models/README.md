# Data Models

This document provides an overview of the data models used in the application. These models are built using SQLAlchemy and inherit from a common BaseModel.

## Table of Contents

1. [BaseModel](#basemodel)
2. [User](#user)
3. [Movie](#movie)
4. [User_Movie](#user_movie)

## BaseModel

The BaseModel serves as the base class for all other models. It provides common attributes and methods that are inherited by other models.

### Attributes:
- `id`: String(60), primary key
- `created_at`: DateTime, default is current UTC time
- `updated_at`: DateTime, default is current UTC time

### Methods:
- `__init__(*args, **kwargs)`: Initializes the model
- `__str__()`: Returns a string representation of the model
- `__repr__()`: Returns a string representation of the model
- `save()`: Updates the `updated_at` attribute and saves the model
- `to_dict()`: Returns a dictionary representation of the model
- `delete()`: Deletes the current instance from storage

## User

The User model represents a user in the system.

### Attributes:
- Inherits `id`, `created_at`, and `updated_at` from BaseModel
- `email`: String(128), not nullable
- `password`: String(128), not nullable (stored as SHA-256 hash)
- `first_name`: String(128), not nullable
- `last_name`: String(128), not nullable
- `avatar`: String(256), nullable

### Relationships:
- `user_movies`: One-to-Many relationship with User_Movie

### Methods:
- `verify_password(plain_password, hashed_password)`: Static method to verify a password

## Movie

The Movie model represents a movie in the system.

### Attributes:
- Inherits `id`, `created_at`, and `updated_at` from BaseModel
- `tmdb_id`: Integer, not nullable
- `title`: String(128), not nullable
- `description`: String(2024), nullable
- `poster`: String(512), nullable
- `adult`: Boolean, nullable
- `popularity`: Float, nullable
- `year`: Integer, nullable
- `rating`: Float, nullable
- `language`: String(128), nullable

## User_Movie

The User_Movie model represents the relationship between users and movies, including save and like information.

### Attributes:
- Inherits `id`, `created_at`, and `updated_at` from BaseModel
- `user_id`: String(128), foreign key to User.id, not nullable
- `movie_id`: Integer, not nullable
- `save`: Boolean, nullable
- `like`: Boolean, nullable

### Relationships:
- `user`: Many-to-One relationship with User