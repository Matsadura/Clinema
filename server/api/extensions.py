#!/usr/bin/env python3
"""Flask extension singletons (initialised in the app factory)."""
from flask import jsonify
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from models import storage
from models.user import User

jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address, default_limits=[])


@jwt.user_identity_loader
def user_identity_lookup(user):
    """Store only the user id in the token's ``sub`` claim."""
    return user.id if isinstance(user, User) else str(user)


@jwt.additional_claims_loader
def add_password_claim(identity):
    """Stamp tokens with the password's fingerprint so changing the
    password (e.g. a reset) signs out every existing session."""
    if isinstance(identity, User):
        from api.views.password_reset import password_fingerprint
        return {"pwd": password_fingerprint(identity)}
    return {}


@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    """Resolve ``current_user`` from the token (None = rejected)."""
    user = storage.get(User, jwt_data["sub"])
    if user is not None and "pwd" in jwt_data:
        from api.views.password_reset import password_fingerprint
        if jwt_data["pwd"] != password_fingerprint(user):
            return None  # password changed since this token was issued
    return user


@jwt.user_lookup_error_loader
def user_lookup_error(_jwt_header, _jwt_data):
    return jsonify({"error": "Session expired, please sign in again"}), 401


@jwt.unauthorized_loader
def missing_token(reason):
    return jsonify({"error": "Authentication required"}), 401


@jwt.invalid_token_loader
def invalid_token(reason):
    return jsonify({"error": "Invalid token"}), 401


@jwt.expired_token_loader
def expired_token(_header, _payload):
    return jsonify({"error": "Session expired, please sign in again"}), 401
