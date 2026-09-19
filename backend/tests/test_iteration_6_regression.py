"""Phase 1 regression: admin login, admin GETs, public challenge GETs, upload/download.

No new backend endpoints in this phase; this file verifies that all endpoints that
back the new client-side token flow are still healthy.
"""

import base64
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "naman14b@gmail.com"
ADMIN_PASSWORD = "NewOwnerPass2026!"

# 1x1 transparent PNG
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


# --- shared fixtures ------------------------------------------------------


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    body = r.json()
    assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 8
    return body["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"X-Admin-Token": admin_token}


# --- admin login ----------------------------------------------------------


class TestAdminAuth:
    def test_admin_login_ok(self, admin_token):
        # fixture asserts, this test just ensures fixture ran
        assert admin_token

    def test_admin_login_wrong_password(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": "wrong-password"},
            timeout=10,
        )
        assert r.status_code == 401


# --- admin protected GETs -------------------------------------------------


class TestAdminReads:
    def test_admin_questions(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/questions", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for row in data:
            assert "_id" not in row

    def test_admin_challenge_questions(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/challenge-questions", headers=admin_headers, timeout=15
        )
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for row in data:
            assert "_id" not in row

    def test_admin_monetization(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/monetization", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (dict, list))

    def test_admin_questions_requires_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/questions", timeout=10)
        assert r.status_code == 401


# --- public challenge tier reads ------------------------------------------


class TestPublicChallenges:
    @pytest.mark.parametrize("tier", ["3-day", "7-day"])
    def test_public_challenge_tier(self, tier):
        r = requests.get(f"{BASE_URL}/api/challenge-questions/{tier}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for row in data:
            assert row.get("tier") == tier
            assert "_id" not in row


# --- upload / download ----------------------------------------------------


class TestUploadDownload:
    def test_upload_and_serve_png(self, admin_headers):
        files = {"file": (f"test_{uuid.uuid4().hex[:8]}.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/admin/upload",
            headers=admin_headers,
            files=files,
            timeout=30,
        )
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
        body = r.json()
        assert "path" in body and "url" in body
        # Fetch through /api/files/{path}
        get = requests.get(f"{BASE_URL}/api/files/{body['path']}", timeout=15)
        assert get.status_code == 200
        assert get.headers.get("content-type", "").startswith("image/png")
        assert get.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_upload_requires_admin_token(self):
        files = {"file": ("nope.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files, timeout=15)
        assert r.status_code == 401
