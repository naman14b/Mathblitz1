"""Backend tests for MathBlitz admin OTP + password reset flow.

Covers bug-fix verification for admin `Save new password` flow.
"""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

# Load backend env for MONGO_URL / DB_NAME / OTP_PEPPER
BACKEND_ENV = Path("/app/backend/.env")
load_dotenv(BACKEND_ENV)

BASE_URL = "http://localhost:8001"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "naman14b@gmail.com").strip().lower()
OTP_PEPPER = os.environ["OTP_PEPPER"]
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_OTP = "999888"
TEST_NEW_PASSWORD = "NewOwnerPass2026!"


def utc_now():
    return datetime.now(timezone.utc)


def otp_digest(otp: str) -> str:
    return hmac.new(OTP_PEPPER.encode(), otp.encode(), hashlib.sha256).hexdigest()


@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def seed_otp(mongo, otp: str = TEST_OTP):
    mongo.admin_otps.delete_many({"email": ADMIN_EMAIL})
    mongo.admin_otps.insert_one({
        "email": ADMIN_EMAIL,
        "digest": otp_digest(otp),
        "attempts": 0,
        "created_at": utc_now(),
        "expires_at": utc_now() + timedelta(minutes=10),
    })


# ---------- (a) request-otp ----------
def test_a_request_otp_returns_200(api):
    r = api.post(f"{BASE_URL}/api/admin/request-otp", json={"email": ADMIN_EMAIL})
    # 429 possible if cooldown from a previous run, treat as acceptable-but-flag
    assert r.status_code in (200, 429), r.text
    if r.status_code == 429:
        pytest.skip("Cooldown active from prior run; SMTP path already exercised")
    body = r.json()
    assert "message" in body


# ---------- (b) verify-otp with seeded OTP -> setup_token ----------
def test_b_verify_otp_with_seeded_otp(api, mongo):
    seed_otp(mongo, TEST_OTP)
    r = api.post(
        f"{BASE_URL}/api/admin/verify-otp",
        json={"email": ADMIN_EMAIL, "otp": TEST_OTP},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body.get("setup_token"), str) and len(body["setup_token"]) > 20
    assert body.get("must_change_password") is True


# ---------- (c) set-password with setup token ----------
def test_c_set_password_returns_admin_token(api, mongo):
    seed_otp(mongo, TEST_OTP)
    v = api.post(f"{BASE_URL}/api/admin/verify-otp", json={"email": ADMIN_EMAIL, "otp": TEST_OTP})
    assert v.status_code == 200
    setup_token = v.json()["setup_token"]

    r = api.post(
        f"{BASE_URL}/api/admin/set-password",
        json={"new_password": TEST_NEW_PASSWORD},
        headers={"X-Admin-Token": setup_token},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body.get("token"), str) and len(body["token"]) > 20
    # store on module for follow-up test
    pytest.admin_token = body["token"]


# ---------- (d) GET questions with admin token ----------
def test_d_admin_questions_with_token(api):
    token = getattr(pytest, "admin_token", None)
    assert token, "Depends on test_c producing admin token"
    r = api.get(f"{BASE_URL}/api/admin/questions", headers={"X-Admin-Token": token})
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


# ---------- (e) login with password ----------
def test_e_admin_login_with_new_password(api):
    r = api.post(
        f"{BASE_URL}/api/admin/login",
        json={"email": ADMIN_EMAIL, "password": TEST_NEW_PASSWORD},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body.get("token"), str) and len(body["token"]) > 20

    # Verify token actually works
    q = api.get(f"{BASE_URL}/api/admin/questions", headers={"X-Admin-Token": body["token"]})
    assert q.status_code == 200


# ---------- (f) invalid setup token -> 401 with proper detail ----------
def test_f_invalid_setup_token_401(api):
    r = api.post(
        f"{BASE_URL}/api/admin/set-password",
        json={"new_password": "AnotherValid2026!"},
        headers={"X-Admin-Token": "bogus-token-does-not-exist"},
    )
    assert r.status_code == 401, r.text
    assert r.json().get("detail") == "Password setup session required"


# ---------- (g) short password -> 422 ----------
def test_g_short_password_returns_422(api, mongo):
    seed_otp(mongo, TEST_OTP)
    v = api.post(f"{BASE_URL}/api/admin/verify-otp", json={"email": ADMIN_EMAIL, "otp": TEST_OTP})
    assert v.status_code == 200
    setup_token = v.json()["setup_token"]

    r = api.post(
        f"{BASE_URL}/api/admin/set-password",
        json={"new_password": "short"},
        headers={"X-Admin-Token": setup_token},
    )
    assert r.status_code == 422, r.text
