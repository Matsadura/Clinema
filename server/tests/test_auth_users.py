"""Registration, login, password storage and profile routes."""
import hashlib

from models import storage
from models.user import User
from tests.conftest import register_and_login


def register(client, **overrides):
    body = {"email": "ada@example.com", "password": "password123",
            "first_name": "Ada", "last_name": "Lovelace"}
    body.update(overrides)
    return client.post("/api/register", json=body)


def test_register_success_hides_password(client):
    res = register(client, email="  Ada@Example.COM ")
    assert res.status_code == 201
    data = res.get_json()
    assert data["email"] == "ada@example.com"
    assert "password" not in data


def test_register_ignores_mass_assignment(client, app):
    res = register(client, id="attacker-chosen", avatar="x", is_admin=True)
    assert res.status_code == 201
    assert res.get_json()["id"] != "attacker-chosen"


def test_passwords_are_salted(client, app):
    register(client)
    register(client, email="bob@example.com")
    with app.app_context():
        a = storage.get_specific(User, "email", "ada@example.com").password
        b = storage.get_specific(User, "email", "bob@example.com").password
    assert a.startswith("pbkdf2:sha256:")
    assert a != b  # same password, different salt


def test_register_validation(client):
    assert register(client, email="nope").status_code == 400
    assert register(client, password="short").status_code == 400
    assert register(client, first_name="").status_code == 400
    assert register(client, first_name=123).status_code == 400
    assert client.post("/api/register", data="x").status_code == 400


def test_register_duplicate_email(client):
    register(client)
    res = register(client, email="ADA@example.com")
    assert res.status_code == 409


def test_login_and_validate(client):
    user_id, headers = register_and_login(client)
    res = client.get("/api/auth_validate", headers=headers)
    assert res.status_code == 200
    assert res.get_json()["id"] == user_id


def test_login_wrong_password(client):
    register(client)
    res = client.post("/api/login", json={"email": "ada@example.com",
                                          "password": "wrong-password"})
    assert res.status_code == 401
    assert res.get_json() == {"error": "Invalid email or password"}


def test_login_missing_fields(client):
    assert client.post("/api/login", json={}).status_code == 400
    assert client.post("/api/login",
                       json={"email": ["x"], "password": 1}).status_code == 400


def test_legacy_sha256_hash_is_upgraded_on_login(client, app):
    with app.app_context():
        user = User(email="old@example.com", password="placeholder",
                    first_name="Old", last_name="User")
        user.password = hashlib.sha256(b"legacy-pass").hexdigest()
        storage.new(user)
        storage.save()

    res = client.post("/api/login", json={"email": "old@example.com",
                                          "password": "legacy-pass"})
    assert res.status_code == 200
    with app.app_context():
        stored = storage.get_specific(User, "email", "old@example.com")
        assert stored.password.startswith("pbkdf2:sha256:")
        assert stored.check_password("legacy-pass")


def test_protected_routes_require_token(client):
    for path in ("/api/auth_validate", "/api/users/profile"):
        res = client.get(path)
        assert res.status_code == 401
        assert "error" in res.get_json()
    bad = {"Authorization": "Bearer not-a-jwt"}
    assert client.get("/api/users/profile", headers=bad).status_code == 401


def test_update_profile(client):
    user_id, headers = register_and_login(client)
    res = client.put(f"/api/users/{user_id}/profile", headers=headers,
                     json={"first_name": "  Augusta "})
    assert res.status_code == 200
    assert res.get_json()["first_name"] == "Augusta"
    res = client.put(f"/api/users/{user_id}/profile", headers=headers,
                     json={"email": "x@y.z"})
    assert res.status_code == 400
    res = client.put(f"/api/users/{user_id}/profile", headers=headers,
                     json={"first_name": ""})
    assert res.status_code == 400


def test_cannot_modify_other_users(client):
    _, headers = register_and_login(client)
    other_id, _ = register_and_login(client, email="bob@example.com")
    assert client.put(f"/api/users/{other_id}/profile", headers=headers,
                      json={"first_name": "x"}).status_code == 403
    assert client.delete(f"/api/users/{other_id}/profile",
                         headers=headers).status_code == 403


def test_delete_account(client):
    user_id, headers = register_and_login(client)
    assert client.delete(f"/api/users/{user_id}/profile",
                         headers=headers).status_code == 200
    assert client.get("/api/auth_validate",
                      headers=headers).status_code == 401
