"""
User Authentication Module

Provides secure registration, login, and JWT-based session management.
Uses bcrypt for password hashing and PyJWT for token handling.
User data is persisted in a local SQLite database.
"""

import os
import re
import sqlite3
import datetime
from functools import wraps

import bcrypt
import jwt
from flask import request, jsonify, g

SECRET_KEY = os.environ.get("AUTH_SECRET_KEY", os.urandom(32).hex())
TOKEN_EXPIRY_HOURS = int(os.environ.get("TOKEN_EXPIRY_HOURS", "24"))
DB_PATH = os.environ.get("AUTH_DB_PATH", "users.db")

MIN_PASSWORD_LENGTH = 8
EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db(db_path=None):
    """Return a SQLite connection, creating the users table if needed."""
    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_email(email: str) -> str | None:
    """Return an error message if the email is invalid, else None."""
    if not email or not isinstance(email, str):
        return "Email is required."
    if not EMAIL_RE.match(email.strip()):
        return "Invalid email format."
    return None


def validate_password(password: str) -> str | None:
    """Return an error message if the password is too weak, else None."""
    if not password or not isinstance(password, str):
        return "Password is required."
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return "Password must contain at least one digit."
    return None


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_token(user_id: int, email: str, secret: str | None = None) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, secret or SECRET_KEY, algorithm="HS256")


def decode_token(token: str, secret: str | None = None) -> dict | None:
    """Decode and verify a JWT. Returns the payload dict or None."""
    try:
        return jwt.decode(token, secret or SECRET_KEY, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ---------------------------------------------------------------------------
# Core auth operations
# ---------------------------------------------------------------------------

def register_user(email: str, password: str, db_path: str | None = None) -> tuple[dict, int]:
    """
    Register a new user.
    Returns a (response_body, status_code) tuple.
    """
    email = (email or "").strip().lower()

    err = validate_email(email)
    if err:
        return {"success": False, "error": err}, 400

    err = validate_password(password)
    if err:
        return {"success": False, "error": err}, 400

    conn = get_db(db_path)
    try:
        cur = conn.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cur.fetchone():
            return {"success": False, "error": "Email already registered."}, 409

        pw_hash = hash_password(password)
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (email, pw_hash, now),
        )
        conn.commit()
        return {"success": True, "message": "User registered successfully."}, 201
    finally:
        conn.close()


def login_user(email: str, password: str, db_path: str | None = None) -> tuple[dict, int]:
    """
    Authenticate a user and return a JWT.
    Returns a (response_body, status_code) tuple.
    """
    email = (email or "").strip().lower()

    if not email or not password:
        return {"success": False, "error": "Email and password are required."}, 400

    conn = get_db(db_path)
    try:
        cur = conn.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?", (email,)
        )
        user = cur.fetchone()

        if not user or not verify_password(password, user["password_hash"]):
            return {"success": False, "error": "Invalid email or password."}, 401

        token = create_token(user["id"], user["email"])
        return {
            "success": True,
            "token": token,
            "email": user["email"],
        }, 200
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Flask route decorator
# ---------------------------------------------------------------------------

def login_required(f):
    """Decorator that protects a Flask route with JWT authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "error": "Missing or invalid Authorization header."}), 401

        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload is None:
            return jsonify({"success": False, "error": "Invalid or expired token."}), 401

        g.current_user = payload
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Flask route registration helper
# ---------------------------------------------------------------------------

def register_auth_routes(app):
    """Attach /api/auth/register and /api/auth/login routes to a Flask app."""

    @app.route("/api/auth/register", methods=["POST"])
    def api_register():
        data = request.get_json(silent=True) or {}
        body, status = register_user(data.get("email", ""), data.get("password", ""))
        return jsonify(body), status

    @app.route("/api/auth/login", methods=["POST"])
    def api_login():
        data = request.get_json(silent=True) or {}
        body, status = login_user(data.get("email", ""), data.get("password", ""))
        return jsonify(body), status

    @app.route("/api/auth/me", methods=["GET"])
    @login_required
    def api_me():
        return jsonify({"success": True, "user": g.current_user}), 200
