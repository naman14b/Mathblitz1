"""SQLAlchemy declarative models for MathBlitz."""
from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AdminOTP(Base):
    __tablename__ = "admin_otps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), index=True, nullable=False)
    otp_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)


class AdminAccount(Base):
    __tablename__ = "admin_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AdminQuestion(Base):
    __tablename__ = "admin_questions"

    id = Column(String(64), primary_key=True)
    prompt = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # List of string choices
    answer = Column(String(255), nullable=False)
    image_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class ChallengeQuestion(Base):
    __tablename__ = "challenge_questions"

    id = Column(String(64), primary_key=True)
    tier = Column(String(32), index=True, nullable=False)
    prompt = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    answer = Column(String(255), nullable=False)
    image_url = Column(String(512), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AdminSetting(Base):
    __tablename__ = "admin_settings"

    key = Column(String(64), primary_key=True)
    data = Column(JSON, nullable=False)  # holds setting object (e.g. monetization)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), index=True, nullable=False)
    score = Column(Integer, index=True, nullable=False)
    age_group = Column(String(32), index=True, nullable=False)
    game_mode = Column(String(32), default="classic", index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)


class MathBossResult(Base):
    __tablename__ = "math_boss_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    level = Column(Integer, nullable=False)
    correct = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    won = Column(Boolean, nullable=False)
    player_name = Column(String(64), nullable=False)
    played_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class UploadedFile(Base):
    """Self-contained file store for uploaded challenge/admin images."""
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    path = Column(String(255), unique=True, index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
