"""Utility functions and helpers for MathBlitz backend.

This module extracts common logic from the original `server.py` to keep the
routers focused on request handling.
"""
import os
import secrets
import hashlib
import hmac
import logging
import mimetypes
import uuid
import requests
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from .config import ROOT_DIR

logger = logging.getLogger(__name__)

# Load environment variables (already done in config but keep for safety)
# from dotenv import load_dotenv
# load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Storage helpers (Emergent Object Store)
# ---------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "mathblitz"
_storage_key: Optional[str] = None

def init_storage() -> str:
    """Idempotent, blocking. Initialise storage and cache the key.
    """
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 503:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> Tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------------------------------------------------------------------------
# OTP helpers
# ---------------------------------------------------------------------------
def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def otp_digest(otp: str) -> str:
    pepper = os.getenv("OTP_PEPPER", "mathblitz-development-pepper").encode()
    return hmac.new(pepper, otp.encode(), hashlib.sha256).hexdigest()

# ---------------------------------------------------------------------------
# Email helper (kept simple – real implementation uses smtplib)
# ---------------------------------------------------------------------------
def send_otp_email(otp: str) -> None:
    # Placeholder implementation – in production this uses smtplib.
    logger.info(f"Sending OTP {otp} to admin email (placeholder).")
    # Actual sending logic is retained in the original server for reference.

# ---------------------------------------------------------------------------
# Misc constants used across routers
# ---------------------------------------------------------------------------
OTP_TTL_SECONDS = 10 * 60
OTP_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5
FILE_TOKEN_TTL_SECONDS = 60 * 60

_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024

# In‑memory admin session tracking (for dev convenience)
admin_sessions: dict[str, str] = {}
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "naman14b@gmail.com").strip().lower()
