#!/usr/bin/python3
"""Auth routes"""
import re

from flask import jsonify
from flask_jwt_extended import create_access_token, current_user, \
    jwt_required
from sqlalchemy.exc import IntegrityError

from api.extensions import limiter
from api.views import app_views
from api.views.helpers import error, json_body
from models import storage
from models.user import User

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD = 8


def public_user(user):
    """Fields safe to expose about the signed-in user."""
    return {"id": user.id, "first_name": user.first_name,
            "last_name": user.last_name, "email": user.email,
            "avatar": user.avatar}


@app_views.route("/auth_validate", methods=['GET'])
@jwt_required()
def validate_user():
    """Return the current user if the token is valid."""
    return jsonify(public_user(current_user))


@app_views.route('/register', methods=['POST'])
@limiter.limit("10 per hour")
def register_user():
    """Register a new user"""
    data = json_body()
    if not data:
        return error('No data provided')

    fields = {k: data.get(k) for k in
              ('email', 'password', 'first_name', 'last_name')}
    if not all(isinstance(v, str) and v.strip() for v in fields.values()):
        return error('Missing required fields')

    email = fields['email'].strip().lower()
    if len(email) > 128 or not EMAIL_RE.match(email):
        return error('Please enter a valid email address')
    if len(fields['password']) < MIN_PASSWORD:
        return error(f'Password must be at least {MIN_PASSWORD} characters')
    if len(fields['password']) > 256:
        return error('Password is too long')
    first, last = fields['first_name'].strip(), fields['last_name'].strip()
    if len(first) > 128 or len(last) > 128:
        return error('Name is too long')

    if storage.get_specific(User, 'email', email):
        return error('An account with this email already exists', 409)

    user = User(email=email, password=fields['password'],
                first_name=first, last_name=last)
    storage.new(user)
    try:
        storage.save()
    except IntegrityError:
        return error('An account with this email already exists', 409)
    return jsonify(public_user(user)), 201


@app_views.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """Sign in a user and return a JWT."""
    data = json_body()
    if not data or not data.get('email') or not data.get('password'):
        return error('Missing email or password')
    if not isinstance(data['email'], str) or \
            not isinstance(data['password'], str):
        return error('Missing email or password')

    user = storage.get_specific(User, 'email', data['email'].strip().lower())
    if not user or not user.check_password(data['password']):
        return error('Invalid email or password', 401)

    if user.needs_rehash():
        # Legacy SHA-256 hashes are upgraded inside check_password()
        storage.save()

    token = create_access_token(identity=user)
    return jsonify({'token': token, 'user_id': user.id,
                    'user': public_user(user)})
