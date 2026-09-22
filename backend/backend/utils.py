"""Utility functions and helpers for MathBlitz backend."""
import hashlib
import hmac
from datetime import datetime, timezone
import os

from .config import ADMIN_EMAIL, OTP_PEPPER


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def otp_digest(otp: str) -> str:
    pepper = OTP_PEPPER.encode()
    return hmac.new(pepper, otp.encode(), hashlib.sha256).hexdigest()
