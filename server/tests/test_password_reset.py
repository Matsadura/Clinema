"""Password reset by email, and signing out sessions on password change."""
import re

import pytest

from api.services import mailer
from api.views import password_reset
from tests.conftest import register_and_login

MAIL = {"SMTP_HOST": "smtp.example.com",
        "MAIL_FROM": "Clinema <no-reply@example.com>",
        "APP_URL": "https://clinema.example.org"}


@pytest.fixture
def outbox(app, monkeypatch):
    sent = []
    monkeypatch.setattr(mailer, "send_async",
                        lambda config, msg: sent.append(msg))
    saved = {k: app.config.get(k) for k in MAIL}
    app.config.update(MAIL)
    yield sent
    app.config.update(saved)


def _link(msg):
    text = msg.get_body(("plain",)).get_content()
    return re.search(r"https://\S+", text).group(0)


def _token(msg):
    return _link(msg).split("token=", 1)[1]


def test_full_reset_flow_signs_out_old_sessions(client, outbox):
    uid, old_headers = register_and_login(client)
    assert client.get("/api/auth_validate", headers=old_headers) \
        .status_code == 200

    res = client.post("/api/password/forgot",
                      json={"email": " ADA@example.com "})
    assert res.status_code == 202
    assert len(outbox) == 1 and outbox[0]["To"] == "ada@example.com"
    assert _link(outbox[0]).startswith(
        "https://clinema.example.org/reset-password?token=")
    assert 'href="https://clinema.example.org/reset-password?token=' in \
        outbox[0].get_body(("html",)).get_content()

    token = _token(outbox[0])
    res = client.post("/api/password/reset",
                      json={"token": token, "password": "brand-new-pass"})
    assert res.status_code == 200

    # The old password and old sessions no longer work; the new one does
    assert client.post("/api/login", json={
        "email": "ada@example.com", "password": "password123"}) \
        .status_code == 401
    assert client.get("/api/auth_validate", headers=old_headers) \
        .status_code == 401
    _, new_headers = register_and_login(client, password="brand-new-pass")
    assert client.get("/api/auth_validate", headers=new_headers) \
        .status_code == 200

    # The link is single use
    res = client.post("/api/password/reset",
                      json={"token": token, "password": "another-pass-1"})
    assert res.status_code == 400


def test_unknown_email_looks_the_same(client, outbox):
    register_and_login(client)
    known = client.post("/api/password/forgot",
                        json={"email": "ada@example.com"})
    unknown = client.post("/api/password/forgot",
                          json={"email": "nobody@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.get_json() == unknown.get_json()
    assert len(outbox) == 1


def test_bad_tokens_and_passwords(client, outbox, app):
    register_and_login(client)
    client.post("/api/password/forgot", json={"email": "ada@example.com"})
    token = _token(outbox[0])

    def post(body):
        return client.post("/api/password/reset", json=body)

    assert post({"token": token, "password": "short"}).status_code == 400
    assert post({"token": token[:-2] + "xx",
                 "password": "long-enough-1"}).status_code == 400
    assert post({"token": "nonsense",
                 "password": "long-enough-1"}).status_code == 400
    assert post({}).status_code == 400

    app.config["PASSWORD_RESET_MAX_AGE"] = -1  # every token is expired
    try:
        assert post({"token": token,
                     "password": "long-enough-1"}).status_code == 400
    finally:
        app.config["PASSWORD_RESET_MAX_AGE"] = 3600


def test_forgot_validation_and_unconfigured_server(client, outbox, app):
    assert client.post("/api/password/forgot",
                       json={"email": "not-an-email"}).status_code == 400
    assert client.get("/api/features").get_json() == \
        {"password_reset": True}
    app.config["SMTP_HOST"] = ""
    assert client.post("/api/password/forgot",
                       json={"email": "ada@example.com"}).status_code == 503
    assert client.get("/api/features").get_json() == \
        {"password_reset": False}


def test_reset_link_ignores_a_forged_host(client, outbox, app):
    register_and_login(client)
    client.post("/api/password/forgot", json={"email": "ada@example.com"},
                headers={"Host": "evil.example"})
    assert _link(outbox[0]).startswith("https://clinema.example.org/")

    # Without APP_URL there is no safe base for links: reset stays off
    app.config["APP_URL"] = ""
    assert client.post("/api/password/forgot",
                       json={"email": "ada@example.com"}).status_code == 503
    assert len(outbox) == 1


def test_tokens_without_password_claim_still_work(client, app):
    """Sessions issued before this feature keep working."""
    from flask_jwt_extended import create_access_token
    uid, _ = register_and_login(client)
    with app.app_context():
        legacy = create_access_token(identity=uid)  # a str: no "pwd" claim
    res = client.get("/api/auth_validate",
                     headers={"Authorization": f"Bearer {legacy}"})
    assert res.status_code == 200


def test_deliver_uses_starttls_and_login(monkeypatch):
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.append(("connect", host, port))

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            calls.append(("quit",))

        def starttls(self, context):
            calls.append(("starttls",))

        def login(self, user, password):
            calls.append(("login", user))

        def send_message(self, msg):
            calls.append(("send", msg["To"]))

    monkeypatch.setattr(mailer.smtplib, "SMTP", FakeSMTP)
    config = dict(MAIL, SMTP_PORT=587, SMTP_USERNAME="u", SMTP_PASSWORD="p",
                  SMTP_SECURITY="starttls")
    msg = mailer.build_message(config, "a@example.com", "Hi", "Body")
    thread = mailer.send_async(config, msg)
    thread.join(timeout=5)
    assert calls == [("connect", "smtp.example.com", 587), ("starttls",),
                     ("login", "u"), ("send", "a@example.com"), ("quit",)]


def test_delivery_failure_is_logged_not_raised(monkeypatch, caplog):
    def boom(*a, **k):
        raise OSError("unreachable")

    monkeypatch.setattr(mailer.smtplib, "SMTP", boom)
    config = dict(MAIL, SMTP_PORT=587, SMTP_SECURITY="starttls")
    msg = mailer.build_message(config, "a@example.com", "Hi", "Body")
    mailer.send_async(config, msg).join(timeout=5)
    assert "Email delivery failed" in caplog.text
    assert "unreachable" not in caplog.text  # no server details leaked


def test_fingerprint_changes_with_password(app):
    from models.user import User
    user = User(email="x@example.com", password="password123",
                first_name="X", last_name="Y")
    before = password_reset.password_fingerprint(user)
    user.password = "different-hash"
    assert password_reset.password_fingerprint(user) != before
