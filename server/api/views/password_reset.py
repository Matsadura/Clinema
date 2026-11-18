#!/usr/bin/python3
"""Password reset by email.

Routes:
    - POST /password/forgot  {email}            Always 202 (no enumeration)
    - POST /password/reset   {token, password}  Set a new password

Reset links carry a signed, expiring token (no database table) bound to
the current password hash: it stops working once used, or as soon as the
password changes any other way. Changing the password also signs out
every existing session (see api.extensions).
"""
import hashlib
import html

from flask import current_app, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, \
    URLSafeTimedSerializer

from api.extensions import limiter
from api.services import mailer
from api.views import app_views
from api.views.auth import EMAIL_RE, MIN_PASSWORD
from api.views.helpers import error, json_body
from models import storage
from models.user import User, hash_password

SALT = "clinema-password-reset"
SENT = {"message": "If an account exists for that email, a reset link is "
                   "on its way. It expires in an hour."}


def password_fingerprint(user):
    """Changes whenever the password does (reset tokens, sessions)."""
    return hashlib.sha256(user.password.encode()).hexdigest()[:16]


def _serializer():
    return URLSafeTimedSerializer(current_app.config["JWT_SECRET_KEY"],
                                  salt=SALT)


def make_token(user):
    return _serializer().dumps({"u": user.id,
                                "p": password_fingerprint(user)})


def _user_for(token):
    """The user a valid token belongs to, or None."""
    try:
        data = _serializer().loads(
            token, max_age=current_app.config["PASSWORD_RESET_MAX_AGE"])
    except (SignatureExpired, BadSignature):
        return None
    if not isinstance(data, dict):
        return None
    user = storage.get(User, str(data.get("u")))
    if user is None or data.get("p") != password_fingerprint(user):
        return None  # already used, or the password changed since
    return user


def _reset_link(token):
    base = current_app.config.get("APP_URL") or request.url_root.rstrip("/")
    return f"{base}/reset-password?token={token}"


def _email(user, link):
    name = user.first_name or "there"
    text = (f"Hi {name},\n\n"
            "Someone (hopefully you) asked to reset your Clinema password. "
            f"Choose a new one here:\n\n{link}\n\n"
            "The link works once and expires in an hour. If you didn't ask "
            "for this, ignore this email; your password won't change.\n\n"
            "— Clinema")
    safe_link, safe_name = html.escape(link, quote=True), html.escape(name)
    html_body = (
        f"<p>Hi {safe_name},</p>"
        "<p>Someone (hopefully you) asked to reset your Clinema "
        "password.</p>"
        f'<p><a href="{safe_link}" style="display:inline-block;padding:10px '
        '18px;background:#E5A93C;color:#0D0E11;border-radius:6px;'
        'text-decoration:none;font-weight:600">Choose a new password</a></p>'
        "<p>The link works once and expires in an hour. If you didn't ask "
        "for this, ignore this email; your password won't change.</p>"
        "<p>— Clinema</p>")
    return text, html_body


@app_views.route('/password/forgot', methods=['POST'])
@limiter.limit("5 per hour")
def forgot_password():
    config = current_app.config
    if not mailer.configured(config):
        return error("Password reset by email isn't available on this "
                     "server", 503)
    data = json_body() or {}
    email = data.get('email')
    if not isinstance(email, str) or len(email) > 128 or \
            not EMAIL_RE.match(email.strip()):
        return error('Please enter a valid email address')
    user = storage.get_specific(User, 'email', email.strip().lower())
    if user is not None:
        text, html_body = _email(user, _reset_link(make_token(user)))
        mailer.send_async(config, mailer.build_message(
            config, user.email, "Reset your Clinema password", text,
            html_body))
    return jsonify(SENT), 202


@app_views.route('/password/reset', methods=['POST'])
@limiter.limit("10 per hour")
def reset_password():
    data = json_body() or {}
    token, password = data.get('token'), data.get('password')
    if not isinstance(token, str) or not isinstance(password, str):
        return error('Missing token or password')
    if len(password) < MIN_PASSWORD:
        return error(f'Password must be at least {MIN_PASSWORD} characters')
    if len(password) > 256:
        return error('Password is too long')
    user = _user_for(token[:1024])
    if user is None:
        return error('This reset link is invalid or has expired. '
                     'Request a new one.', 400)
    user.password = hash_password(password)
    storage.save()
    return jsonify({"message": "Password updated. You can sign in now."})
