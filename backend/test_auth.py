"""
Unit tests for the auth module.

Covers: registration, login, password validation, email validation,
JWT creation/verification, the login_required decorator,
password reset flow, and edge cases.
"""

import os
import tempfile
import datetime

import pytest
import jwt as pyjwt
from flask import Flask

import auth


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TEST_SECRET = "test-secret-key-that-is-at-least-32-bytes-long!"


@pytest.fixture(autouse=True)
def _fixed_secret(monkeypatch):
    """Pin SECRET_KEY so tokens are deterministic across tests."""
    monkeypatch.setattr(auth, "SECRET_KEY", TEST_SECRET)


@pytest.fixture()
def db_path(tmp_path):
    """Provide a fresh temporary SQLite database for each test."""
    return str(tmp_path / "test_users.db")


@pytest.fixture()
def app():
    """Minimal Flask app with auth routes registered."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    auth.register_auth_routes(app)
    return app


@pytest.fixture()
def client(app):
    return app.test_client()


VALID_EMAIL = "user@example.com"
VALID_PASSWORD = "Str0ngPass!"


# ---------------------------------------------------------------------------
# Email validation
# ---------------------------------------------------------------------------

class TestEmailValidation:
    def test_valid_email(self):
        assert auth.validate_email("user@example.com") is None

    def test_missing_email(self):
        assert auth.validate_email("") is not None
        assert auth.validate_email(None) is not None

    def test_invalid_format(self):
        assert auth.validate_email("not-an-email") is not None
        assert auth.validate_email("@no-local.com") is not None
        assert auth.validate_email("missing@.com") is not None

    def test_non_string(self):
        assert auth.validate_email(123) is not None


# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

class TestPasswordValidation:
    def test_valid_password(self):
        assert auth.validate_password(VALID_PASSWORD) is None

    def test_too_short(self):
        assert auth.validate_password("Ab1") is not None

    def test_missing_uppercase(self):
        assert auth.validate_password("alllower1") is not None

    def test_missing_lowercase(self):
        assert auth.validate_password("ALLUPPER1") is not None

    def test_missing_digit(self):
        assert auth.validate_password("NoDigitsHere") is not None

    def test_empty(self):
        assert auth.validate_password("") is not None
        assert auth.validate_password(None) is not None


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

class TestPasswordHashing:
    def test_hash_and_verify(self):
        pw = "TestPass1"
        hashed = auth.hash_password(pw)
        assert hashed != pw
        assert auth.verify_password(pw, hashed)

    def test_wrong_password_fails(self):
        hashed = auth.hash_password("Correct1")
        assert not auth.verify_password("Wrong1xxx", hashed)

    def test_hash_is_unique_per_call(self):
        h1 = auth.hash_password("Same1Pass")
        h2 = auth.hash_password("Same1Pass")
        assert h1 != h2  # different salts


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------

class TestJWT:
    SIGN_KEY = "a-jwt-signing-key-with-enough-length-for-hs256!"
    OTHER_KEY = "a-different-key-also-long-enough-for-hs256!!!!!"

    def test_create_and_decode(self):
        token = auth.create_token(1, "a@b.com", secret=self.SIGN_KEY)
        payload = auth.decode_token(token, secret=self.SIGN_KEY)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["email"] == "a@b.com"

    def test_expired_token_returns_none(self):
        payload = {
            "sub": 1,
            "email": "a@b.com",
            "iat": datetime.datetime.now(datetime.timezone.utc),
            "exp": datetime.datetime.now(datetime.timezone.utc)
            - datetime.timedelta(seconds=1),
        }
        token = pyjwt.encode(payload, self.SIGN_KEY, algorithm="HS256")
        assert auth.decode_token(token, secret=self.SIGN_KEY) is None

    def test_tampered_token_returns_none(self):
        token = auth.create_token(1, "a@b.com", secret=self.SIGN_KEY)
        tampered = token[:-4] + "XXXX"
        assert auth.decode_token(tampered, secret=self.SIGN_KEY) is None

    def test_wrong_secret_returns_none(self):
        token = auth.create_token(1, "a@b.com", secret=self.SIGN_KEY)
        assert auth.decode_token(token, secret=self.OTHER_KEY) is None


# ---------------------------------------------------------------------------
# Registration (unit-level)
# ---------------------------------------------------------------------------

class TestRegisterUser:
    def test_success(self, db_path):
        body, status = auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        assert status == 201
        assert body["success"] is True

    def test_duplicate_email(self, db_path):
        auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        body, status = auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        assert status == 409
        assert "already registered" in body["error"]

    def test_invalid_email_rejected(self, db_path):
        body, status = auth.register_user("bad", VALID_PASSWORD, db_path)
        assert status == 400

    def test_weak_password_rejected(self, db_path):
        body, status = auth.register_user(VALID_EMAIL, "short", db_path)
        assert status == 400

    def test_email_stored_lowercase(self, db_path):
        auth.register_user("User@EXAMPLE.com", VALID_PASSWORD, db_path)
        conn = auth.get_db(db_path)
        row = conn.execute("SELECT email FROM users").fetchone()
        conn.close()
        assert row["email"] == "user@example.com"


# ---------------------------------------------------------------------------
# Login (unit-level)
# ---------------------------------------------------------------------------

class TestLoginUser:
    def test_success(self, db_path):
        auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        body, status = auth.login_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        assert status == 200
        assert body["success"] is True
        assert "token" in body

    def test_wrong_password(self, db_path):
        auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        body, status = auth.login_user(VALID_EMAIL, "WrongPass1", db_path)
        assert status == 401

    def test_nonexistent_email(self, db_path):
        body, status = auth.login_user("ghost@nowhere.com", VALID_PASSWORD, db_path)
        assert status == 401

    def test_empty_credentials(self, db_path):
        body, status = auth.login_user("", "", db_path)
        assert status == 400

    def test_login_returns_valid_token(self, db_path):
        auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        body, _ = auth.login_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        payload = auth.decode_token(body["token"])
        assert payload is not None
        assert payload["email"] == VALID_EMAIL


# ---------------------------------------------------------------------------
# Flask route integration
# ---------------------------------------------------------------------------

class TestRoutes:
    def test_register_endpoint(self, client, db_path, monkeypatch):
        monkeypatch.setattr(auth, "DB_PATH", db_path)
        resp = client.post("/api/auth/register", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        })
        assert resp.status_code == 201
        assert resp.get_json()["success"] is True

    def test_login_endpoint(self, client, db_path, monkeypatch):
        monkeypatch.setattr(auth, "DB_PATH", db_path)
        client.post("/api/auth/register", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        })
        resp = client.post("/api/auth/login", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        })
        assert resp.status_code == 200
        assert "token" in resp.get_json()

    def test_me_without_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_valid_token(self, client, db_path, monkeypatch):
        monkeypatch.setattr(auth, "DB_PATH", db_path)
        client.post("/api/auth/register", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        })
        login_resp = client.post("/api/auth/login", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        })
        token = login_resp.get_json()["token"]
        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
        })
        assert resp.status_code == 200
        assert resp.get_json()["user"]["email"] == VALID_EMAIL

    def test_me_with_invalid_token(self, client):
        resp = client.get("/api/auth/me", headers={
            "Authorization": "Bearer garbage.token.value",
        })
        assert resp.status_code == 401

    def test_register_no_json_body(self, client):
        resp = client.post("/api/auth/register", data="not json")
        assert resp.status_code == 400

    def test_login_no_json_body(self, client, db_path, monkeypatch):
        monkeypatch.setattr(auth, "DB_PATH", db_path)
        resp = client.post("/api/auth/login", data="not json")
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# login_required decorator edge cases
# ---------------------------------------------------------------------------

class TestLoginRequiredDecorator:
    def test_no_auth_header(self, app):
        @app.route("/protected")
        @auth.login_required
        def protected():
            return "ok"

        with app.test_client() as c:
            resp = c.get("/protected")
            assert resp.status_code == 401

    def test_malformed_auth_header(self, app):
        @app.route("/protected2")
        @auth.login_required
        def protected2():
            return "ok"

        with app.test_client() as c:
            resp = c.get("/protected2", headers={"Authorization": "Token abc"})
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Password reset — request (unit-level)
# ---------------------------------------------------------------------------

class TestRequestPasswordReset:
    def test_returns_200_for_existing_email(self, db_path):
        auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        body, status = auth.request_password_reset(VALID_EMAIL, db_path)
        assert status == 200
        assert body["success"] is True

    def test_returns_200_for_unknown_email(self, db_path):
        body, status = auth.request_password_reset("nobody@example.com", db_path)
        assert status == 200
        assert body["success"] is True

    def test_returns_200_for_empty_email(self, db_path):
        body, status = auth.request_password_reset("", db_path)
        assert status == 200

    def test_creates_token_in_db(self, db_path):
        auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        auth.request_password_reset(VALID_EMAIL, db_path)
        conn = auth.get_db(db_path)
        row = conn.execute("SELECT token FROM password_reset_tokens").fetchone()
        conn.close()
        assert row is not None
        assert len(row["token"]) > 20


# ---------------------------------------------------------------------------
# Password reset — reset (unit-level)
# ---------------------------------------------------------------------------

class TestResetPassword:
    def _get_reset_token(self, db_path):
        auth.register_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        auth.request_password_reset(VALID_EMAIL, db_path)
        conn = auth.get_db(db_path)
        row = conn.execute("SELECT token FROM password_reset_tokens").fetchone()
        conn.close()
        return row["token"]

    def test_success(self, db_path):
        token = self._get_reset_token(db_path)
        new_pw = "NewStr0ng!"
        body, status = auth.reset_password(token, new_pw, db_path)
        assert status == 200
        assert body["success"] is True
        # Can login with new password
        body, status = auth.login_user(VALID_EMAIL, new_pw, db_path)
        assert status == 200

    def test_old_password_no_longer_works(self, db_path):
        token = self._get_reset_token(db_path)
        auth.reset_password(token, "NewStr0ng!", db_path)
        body, status = auth.login_user(VALID_EMAIL, VALID_PASSWORD, db_path)
        assert status == 401

    def test_token_cannot_be_reused(self, db_path):
        token = self._get_reset_token(db_path)
        auth.reset_password(token, "NewStr0ng!", db_path)
        body, status = auth.reset_password(token, "Another1Pass", db_path)
        assert status == 400
        assert "already-used" in body["error"]

    def test_invalid_token(self, db_path):
        body, status = auth.reset_password("bogus-token", "NewStr0ng!", db_path)
        assert status == 400

    def test_expired_token(self, db_path, monkeypatch):
        monkeypatch.setattr(auth, "RESET_TOKEN_EXPIRY_MINUTES", 0)
        token = self._get_reset_token(db_path)
        body, status = auth.reset_password(token, "NewStr0ng!", db_path)
        assert status == 400
        assert "expired" in body["error"]

    def test_weak_new_password_rejected(self, db_path):
        token = self._get_reset_token(db_path)
        body, status = auth.reset_password(token, "weak", db_path)
        assert status == 400

    def test_empty_token_rejected(self, db_path):
        body, status = auth.reset_password("", "NewStr0ng!", db_path)
        assert status == 400


# ---------------------------------------------------------------------------
# Password reset — route integration
# ---------------------------------------------------------------------------

class TestResetRoutes:
    def test_forgot_password_endpoint(self, client, db_path, monkeypatch):
        monkeypatch.setattr(auth, "DB_PATH", db_path)
        client.post("/api/auth/register", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        })
        resp = client.post("/api/auth/forgot-password", json={
            "email": VALID_EMAIL,
        })
        assert resp.status_code == 200
        assert resp.get_json()["success"] is True

    def test_reset_password_endpoint(self, client, db_path, monkeypatch):
        monkeypatch.setattr(auth, "DB_PATH", db_path)
        client.post("/api/auth/register", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        })
        client.post("/api/auth/forgot-password", json={
            "email": VALID_EMAIL,
        })
        conn = auth.get_db(db_path)
        row = conn.execute("SELECT token FROM password_reset_tokens").fetchone()
        conn.close()

        new_pw = "ResetPass1!"
        resp = client.post("/api/auth/reset-password", json={
            "token": row["token"],
            "password": new_pw,
        })
        assert resp.status_code == 200

        login_resp = client.post("/api/auth/login", json={
            "email": VALID_EMAIL,
            "password": new_pw,
        })
        assert login_resp.status_code == 200

    def test_forgot_password_no_json(self, client):
        resp = client.post("/api/auth/forgot-password", data="not json")
        assert resp.status_code == 200  # never leak email existence
