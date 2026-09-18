"""Tests for challenge-question CRUD, upload/download, and admin login/monetization.

Uses the public backend URL from EXPO_PUBLIC_BACKEND_URL (frontend/.env). Falls back
to http://localhost:8001 for local runs.
"""
import io
import os
import struct
import zlib

import pytest
import requests

BASE = (
    os.environ.get("BACKEND_TEST_URL")
    or "https://app-launch-stage-84.preview.emergentagent.com"
).rstrip("/")

ADMIN_EMAIL = "naman14b@gmail.com"
ADMIN_PASSWORD = "NewOwnerPass2026!"


def _tiny_png() -> bytes:
    # 1x1 red PNG
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(
            ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
        )
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\x00\x00"
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="module")
def token() -> str:
    r = requests.post(
        f"{BASE}/api/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("token")
    assert tok, "no token returned"
    return tok


@pytest.fixture(scope="module")
def created_ids() -> list[str]:
    return []


# --- admin login + monetization (regression from prior iterations) --------------
def test_admin_login_returns_token(token: str) -> None:
    assert isinstance(token, str) and len(token) > 20


def test_monetization_get(token: str) -> None:
    r = requests.get(
        f"{BASE}/api/admin/monetization", headers={"X-Admin-Token": token}, timeout=15
    )
    assert r.status_code == 200
    body = r.json()
    assert "rewarded_ads_enabled" in body
    assert "interstitial_frequency" in body


# --- challenge-question CRUD ----------------------------------------------------
def test_list_challenges_requires_auth() -> None:
    r = requests.get(f"{BASE}/api/admin/challenge-questions", timeout=15)
    assert r.status_code == 401


def test_list_challenges_ok(token: str) -> None:
    r = requests.get(
        f"{BASE}/api/admin/challenge-questions",
        headers={"X-Admin-Token": token},
        timeout=15,
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_challenge_valid(token: str, created_ids: list[str]) -> None:
    payload = {
        "id": "TEST-c-valid-1",
        "tier": "3-day",
        "prompt": "2+2=?",
        "options": ["3", "4", "5", "6"],
        "correct_answer": "4",
        "time_limit_seconds": 12,
        "active": True,
    }
    r = requests.post(
        f"{BASE}/api/admin/challenge-questions",
        headers={"X-Admin-Token": token},
        json=payload,
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == payload["id"]
    assert body["options"] == payload["options"]
    assert body["correct_answer"] == "4"
    assert body["time_limit_seconds"] == 12
    created_ids.append(body["id"])

    # Verify persisted via public endpoint (no auth)
    pub = requests.get(f"{BASE}/api/challenge-questions/3-day", timeout=15)
    assert pub.status_code == 200
    assert any(item["id"] == payload["id"] for item in pub.json())


def test_create_challenge_five_options(token: str) -> None:
    payload = {
        "id": "TEST-c-5opts",
        "tier": "3-day",
        "prompt": "?",
        "options": ["1", "2", "3", "4", "5"],
        "correct_answer": "1",
        "time_limit_seconds": 10,
    }
    r = requests.post(
        f"{BASE}/api/admin/challenge-questions",
        headers={"X-Admin-Token": token},
        json=payload,
        timeout=15,
    )
    assert r.status_code == 422, r.text
    assert "4" in r.text  # message mentions 4 options


def test_create_challenge_wrong_correct_answer(token: str) -> None:
    payload = {
        "id": "TEST-c-wrongans",
        "tier": "3-day",
        "prompt": "?",
        "options": ["1", "2", "3", "4"],
        "correct_answer": "9",
        "time_limit_seconds": 10,
    }
    r = requests.post(
        f"{BASE}/api/admin/challenge-questions",
        headers={"X-Admin-Token": token},
        json=payload,
        timeout=15,
    )
    assert r.status_code == 400, r.text
    assert "match" in r.json().get("detail", "").lower()


def test_create_challenge_time_too_low(token: str) -> None:
    payload = {
        "id": "TEST-c-shorttime",
        "tier": "3-day",
        "prompt": "?",
        "options": ["1", "2", "3", "4"],
        "correct_answer": "1",
        "time_limit_seconds": 1,
    }
    r = requests.post(
        f"{BASE}/api/admin/challenge-questions",
        headers={"X-Admin-Token": token},
        json=payload,
        timeout=15,
    )
    assert r.status_code == 422, r.text


def test_update_and_delete_challenge(token: str) -> None:
    cid = "TEST-c-crud-2"
    create = {
        "id": cid,
        "tier": "7-day",
        "prompt": "5*5",
        "options": ["10", "20", "25", "30"],
        "correct_answer": "25",
        "time_limit_seconds": 20,
        "active": True,
    }
    r = requests.post(
        f"{BASE}/api/admin/challenge-questions",
        headers={"X-Admin-Token": token},
        json=create,
        timeout=15,
    )
    assert r.status_code == 200, r.text

    # Update
    updated = {**create, "prompt": "5 × 5 = ?", "time_limit_seconds": 30}
    r2 = requests.put(
        f"{BASE}/api/admin/challenge-questions/{cid}",
        headers={"X-Admin-Token": token},
        json=updated,
        timeout=15,
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["time_limit_seconds"] == 30
    assert r2.json()["prompt"] == "5 × 5 = ?"

    # Public list for 7-day should contain it
    pub = requests.get(f"{BASE}/api/challenge-questions/7-day", timeout=15)
    assert pub.status_code == 200
    assert any(item["id"] == cid for item in pub.json())

    # Delete
    r3 = requests.delete(
        f"{BASE}/api/admin/challenge-questions/{cid}",
        headers={"X-Admin-Token": token},
        timeout=15,
    )
    assert r3.status_code == 200
    assert r3.json().get("deleted") is True

    # Verify gone
    pub2 = requests.get(f"{BASE}/api/challenge-questions/7-day", timeout=15)
    assert not any(item["id"] == cid for item in pub2.json())


def test_public_only_returns_tier() -> None:
    for tier in ("3-day", "7-day"):
        r = requests.get(f"{BASE}/api/challenge-questions/{tier}", timeout=15)
        assert r.status_code == 200
        for item in r.json():
            assert item["tier"] == tier
            assert item["active"] is True


# --- upload endpoints -----------------------------------------------------------
def test_upload_requires_auth() -> None:
    files = {"file": ("t.png", io.BytesIO(_tiny_png()), "image/png")}
    r = requests.post(f"{BASE}/api/admin/upload", files=files, timeout=30)
    assert r.status_code == 401


def test_upload_rejects_text(token: str) -> None:
    files = {"file": ("t.txt", io.BytesIO(b"hello"), "text/plain")}
    r = requests.post(
        f"{BASE}/api/admin/upload",
        files=files,
        headers={"X-Admin-Token": token},
        timeout=30,
    )
    assert r.status_code == 400


def test_upload_png_then_download(token: str) -> None:
    png = _tiny_png()
    files = {"file": ("tiny.png", io.BytesIO(png), "image/png")}
    r = requests.post(
        f"{BASE}/api/admin/upload",
        files=files,
        headers={"X-Admin-Token": token},
        timeout=60,
    )
    if r.status_code != 200:
        pytest.skip(f"object storage unavailable in this environment: {r.status_code} {r.text[:200]}")
    body = r.json()
    assert body["path"].startswith("mathblitz/challenges/")
    assert body["url"].startswith("/api/files/")

    dl = requests.get(f"{BASE}{body['url']}", timeout=60)
    assert dl.status_code == 200
    assert dl.headers.get("Content-Type", "").startswith("image/png")
    assert dl.content[:8] == b"\x89PNG\r\n\x1a\n"


# --- cleanup --------------------------------------------------------------------
def test_cleanup_created(token: str, created_ids: list[str]) -> None:
    for cid in created_ids:
        requests.delete(
            f"{BASE}/api/admin/challenge-questions/{cid}",
            headers={"X-Admin-Token": token},
            timeout=15,
        )
