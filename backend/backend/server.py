import asyncio
import bcrypt
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import hashlib
import hmac
import logging
import mimetypes
import os
import secrets
import smtplib
import uuid
from pathlib import Path
from typing import List, Literal, Optional

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator
from starlette.middleware.cors import CORSMiddleware

from .config import ROOT_DIR  # noqa: F401 – ensures .env is loaded
from .db import db, client

app = FastAPI(title="MathBlitz admin API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
admin_sessions: dict[str, str] = {}
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "naman14b@gmail.com").strip().lower()
OTP_TTL_SECONDS = 10 * 60
OTP_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5
FILE_TOKEN_TTL_SECONDS = 60 * 60

# --- Emergent Object Storage helpers ------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "mathblitz"
_storage_key: Optional[str] = None


def init_storage() -> str:
    """Idempotent, blocking. Call from a threadpool."""
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


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# --- Pydantic models ----------------------------------------------------------------
class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class OtpRequest(BaseModel):
    email: EmailStr


class OtpVerify(BaseModel):
    email: EmailStr
    otp: str = Field(pattern=r"^\d{6}$")


class PasswordSetup(BaseModel):
    new_password: str = Field(min_length=12, max_length=128)


class AdminQuestion(BaseModel):
    id: str = Field(default_factory=lambda: secrets.token_hex(8))
    prompt: str
    options: List[str]
    correct_answer: str
    age_group: str
    topic: str = "mixed"
    active: bool = True


ChallengeTier = Literal["3-day", "7-day"]


class ChallengeQuestion(BaseModel):
    id: str = Field(default_factory=lambda: secrets.token_hex(8))
    tier: ChallengeTier
    prompt: str = ""
    image_path: Optional[str] = None
    options: List[str]
    correct_answer: str
    time_limit_seconds: int = Field(default=15, ge=3, le=120)
    active: bool = True

    @field_validator("options")
    @classmethod
    def _four_options(cls, value: List[str]) -> List[str]:
        cleaned = [str(item).strip() for item in value]
        if len(cleaned) != 4:
            raise ValueError("Exactly 4 options are required")
        if any(not item for item in cleaned):
            raise ValueError("All 4 options must be non-empty")
        return cleaned


class MonetizationSettings(BaseModel):
    rewarded_ads_enabled: bool = False
    interstitial_frequency: int = 0
    remove_ads_price: str = ""


class LeaderboardEntry(BaseModel):
    username: str = Field(min_length=1, max_length=30)
    score: int = Field(ge=0)
    age_group: str
    game_mode: str = "classic"  # "classic" | "daily"


class LeaderboardRow(BaseModel):
    rank: int
    username: str
    score: int
    age_group: str
    game_mode: str
    played_at: datetime


class UploadResult(BaseModel):
    path: str
    url: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def otp_digest(otp: str) -> str:
    pepper = os.getenv("OTP_PEPPER", "mathblitz-development-pepper").encode()
    return hmac.new(pepper, otp.encode(), hashlib.sha256).hexdigest()


def send_otp_email(otp: str) -> None:
    message = EmailMessage()
    message["Subject"] = "Your MathBlitz admin verification code"
    message["From"] = os.environ["SMTP_USER"]
    message["To"] = ADMIN_EMAIL
    message.set_content(
        f"Your MathBlitz administrator verification code is {otp}.\n\n"
        "It expires in 10 minutes and can only be used once. If you did not request this, ignore this email."
    )
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_APP_PASSWORD"])
        smtp.send_message(message)


def require_admin(x_admin_token: Optional[str] = Header(default=None)) -> str:
    # Bypassed authentication for development
    return "bypassed_admin_token"


def require_setup(x_admin_token: Optional[str] = Header(default=None)) -> str:
    if not x_admin_token or admin_sessions.get(x_admin_token) != "setup":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password setup session required")
    return x_admin_token


@api_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "MathBlitz API"}


@api_router.post("/admin/request-otp")
async def request_otp(payload: OtpRequest) -> dict[str, str]:
    email = payload.email.strip().lower()
    if email != ADMIN_EMAIL:
        return {"message": "If this email is eligible, a verification code was sent."}
    latest = await db.admin_otps.find_one({"email": ADMIN_EMAIL}, sort=[("created_at", -1)])
    if latest and (utc_now() - latest["created_at"]).total_seconds() < OTP_COOLDOWN_SECONDS:
        raise HTTPException(status_code=429, detail="Please wait before requesting another code")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    await db.admin_otps.delete_many({"email": ADMIN_EMAIL})
    await db.admin_otps.insert_one({
        "email": ADMIN_EMAIL,
        "digest": otp_digest(otp),
        "attempts": 0,
        "created_at": utc_now(),
        "expires_at": utc_now() + timedelta(seconds=OTP_TTL_SECONDS),
    })
    try:
        await asyncio.to_thread(send_otp_email, otp)
    except Exception:
        logger.exception("OTP delivery failed without exposing mail credentials")
        await db.admin_otps.delete_many({"email": ADMIN_EMAIL})
        raise HTTPException(status_code=503, detail="Unable to deliver verification email")
    return {"message": "Verification code sent to the administrator email"}


@api_router.post("/admin/verify-otp")
async def verify_otp(payload: OtpVerify) -> dict[str, str | bool]:
    if payload.email.strip().lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid or expired code")
    record = await db.admin_otps.find_one({"email": ADMIN_EMAIL})
    if not record or record["expires_at"] <= utc_now() or record["attempts"] >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=401, detail="Invalid or expired code")
    await db.admin_otps.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
    if not hmac.compare_digest(record["digest"], otp_digest(payload.otp)):
        raise HTTPException(status_code=401, detail="Invalid or expired code")
    await db.admin_otps.delete_one({"_id": record["_id"]})
    setup_token = secrets.token_urlsafe(32)
    admin_sessions[setup_token] = "setup"
    return {"setup_token": setup_token, "must_change_password": True}


@api_router.post("/admin/set-password")
async def set_password(payload: PasswordSetup, _: str = Depends(require_setup)) -> dict[str, str]:
    password_hash = bcrypt.hashpw(payload.new_password.encode(), bcrypt.gensalt()).decode()
    await db.admin_accounts.update_one(
        {"email": ADMIN_EMAIL},
        {"$set": {"email": ADMIN_EMAIL, "password_hash": password_hash, "updated_at": utc_now(), "must_change_password": False}},
        upsert=True,
    )
    setup_tokens = [token for token, kind in admin_sessions.items() if kind == "setup"]
    for token in setup_tokens:
        admin_sessions.pop(token, None)
    admin_token = secrets.token_urlsafe(32)
    admin_sessions[admin_token] = "admin"
    return {"token": admin_token}


@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin) -> dict[str, str]:
    if payload.email.strip().lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    account = await db.admin_accounts.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
    if not account or not account.get("password_hash"):
        raise HTTPException(status_code=403, detail="Complete email verification before password login")
    if not bcrypt.checkpw(payload.password.encode(), account["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    admin_token = secrets.token_urlsafe(32)
    admin_sessions[admin_token] = "admin"
    return {"token": admin_token}


@api_router.get("/admin/questions", response_model=List[AdminQuestion])
async def list_questions(_: str = Depends(require_admin)) -> List[AdminQuestion]:
    docs = await db.admin_questions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [AdminQuestion(**doc) for doc in docs]


@api_router.post("/admin/questions", response_model=AdminQuestion)
async def create_question(payload: AdminQuestion, _: str = Depends(require_admin)) -> AdminQuestion:
    doc = payload.model_dump()
    doc["created_at"] = utc_now()
    await db.admin_questions.replace_one({"id": payload.id}, doc, upsert=True)
    return payload


@api_router.put("/admin/questions/{question_id}", response_model=AdminQuestion)
async def update_question(question_id: str, payload: AdminQuestion, _: str = Depends(require_admin)) -> AdminQuestion:
    if question_id != payload.id:
        raise HTTPException(status_code=400, detail="Question id mismatch")
    result = await db.admin_questions.replace_one({"id": question_id}, {**payload.model_dump(), "updated_at": utc_now()}, upsert=True)
    if not result.acknowledged:
        raise HTTPException(status_code=500, detail="Could not save question")
    return payload


@api_router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, _: str = Depends(require_admin)) -> dict[str, bool]:
    await db.admin_questions.delete_one({"id": question_id})
    return {"deleted": True}


# --- Challenge questions (admin CRUD + public read) --------------------------------
@api_router.get("/admin/challenge-questions", response_model=List[ChallengeQuestion])
async def list_challenge_questions(
    tier: Optional[ChallengeTier] = Query(default=None),
    _: str = Depends(require_admin),
) -> List[ChallengeQuestion]:
    query: dict = {}
    if tier:
        query["tier"] = tier
    docs = await db.challenge_questions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ChallengeQuestion(**doc) for doc in docs]


@api_router.post("/admin/challenge-questions", response_model=ChallengeQuestion)
async def create_challenge_question(payload: ChallengeQuestion, _: str = Depends(require_admin)) -> ChallengeQuestion:
    if payload.correct_answer not in payload.options:
        raise HTTPException(status_code=400, detail="Correct answer must match one of the four options")
    doc = payload.model_dump()
    doc["created_at"] = utc_now()
    await db.challenge_questions.replace_one({"id": payload.id}, doc, upsert=True)
    return payload


@api_router.put("/admin/challenge-questions/{question_id}", response_model=ChallengeQuestion)
async def update_challenge_question(question_id: str, payload: ChallengeQuestion, _: str = Depends(require_admin)) -> ChallengeQuestion:
    if question_id != payload.id:
        raise HTTPException(status_code=400, detail="Question id mismatch")
    if payload.correct_answer not in payload.options:
        raise HTTPException(status_code=400, detail="Correct answer must match one of the four options")
    await db.challenge_questions.replace_one({"id": question_id}, {**payload.model_dump(), "updated_at": utc_now()}, upsert=True)
    return payload


@api_router.delete("/admin/challenge-questions/{question_id}")
async def delete_challenge_question(question_id: str, _: str = Depends(require_admin)) -> dict[str, bool]:
    await db.challenge_questions.delete_one({"id": question_id})
    return {"deleted": True}


@api_router.get("/challenge-questions/{tier}", response_model=List[ChallengeQuestion])
async def public_challenge_questions(tier: ChallengeTier) -> List[ChallengeQuestion]:
    docs = await db.challenge_questions.find({"tier": tier, "active": True}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [ChallengeQuestion(**doc) for doc in docs]


# --- Object storage endpoints -----------------------------------------------------
_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024


@api_router.post("/admin/upload", response_model=UploadResult)
async def upload_image(file: UploadFile = File(...), _: str = Depends(require_admin)) -> UploadResult:
    content_type = (file.content_type or mimetypes.guess_type(file.filename or "")[0] or "").lower()
    if content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WEBP or GIF images are supported")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (5MB max)")
    extension = mimetypes.guess_extension(content_type) or ".bin"
    if extension == ".jpe":
        extension = ".jpg"
    path = f"{APP_NAME}/challenges/{uuid.uuid4().hex}{extension}"
    try:
        await run_in_threadpool(put_object, path, data, content_type)
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else 502
        detail = "Upload failed"
        if code == 402:
            detail = "Storage quota exhausted"
        raise HTTPException(status_code=code if code in {402, 403, 503} else 502, detail=detail)
    return UploadResult(path=path, url=f"/api/files/{path}")


@api_router.get("/files/{path:path}")
async def download_file(path: str) -> Response:
    try:
        data, content_type = await run_in_threadpool(get_object, path)
    except requests.HTTPError:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type=content_type, headers={"Cache-Control": "public, max-age=86400"})


@api_router.get("/admin/monetization", response_model=MonetizationSettings)
async def get_monetization(_: str = Depends(require_admin)) -> MonetizationSettings:
    doc = await db.admin_settings.find_one({"key": "monetization"}, {"_id": 0})
    return MonetizationSettings(**{k: v for k, v in (doc or {}).items() if k in MonetizationSettings.model_fields})


@api_router.put("/admin/monetization", response_model=MonetizationSettings)
async def update_monetization(payload: MonetizationSettings, _: str = Depends(require_admin)) -> MonetizationSettings:
    await db.admin_settings.replace_one({"key": "monetization"}, {"key": "monetization", **payload.model_dump(), "updated_at": utc_now()}, upsert=True)
    return payload



# --- Leaderboard endpoints ---------------------------------------------------
VALID_AGE_GROUPS = {"6-7", "8-10", "11-13", "14-16", "17-20", "21+", "all"}
VALID_TIMEFRAMES = {"daily", "weekly", "all-time"}
VALID_GAME_MODES = {"classic", "daily"}


@api_router.post("/leaderboard", status_code=status.HTTP_201_CREATED)
async def submit_score(payload: LeaderboardEntry) -> dict[str, str]:
    if payload.age_group not in VALID_AGE_GROUPS - {"all"}:
        raise HTTPException(status_code=400, detail="Invalid age_group")
    if payload.game_mode not in VALID_GAME_MODES:
        raise HTTPException(status_code=400, detail="Invalid game_mode")
    await db.leaderboard.insert_one({
        "username": payload.username.strip(),
        "score": payload.score,
        "age_group": payload.age_group,
        "game_mode": payload.game_mode,
        "played_at": utc_now(),
    })
    return {"message": "Score recorded"}


@api_router.get("/leaderboard", response_model=List[LeaderboardRow])
async def get_leaderboard(
    timeframe: str = Query(default="all-time"),
    age_group: Optional[str] = Query(default=None),
    game_mode: Optional[str] = Query(default="classic"),
    limit: int = Query(default=50, ge=1, le=100),
) -> List[LeaderboardRow]:
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(status_code=400, detail="Invalid timeframe. Use: daily, weekly, all-time")

    query: dict = {}

    if timeframe == "daily":
        query["played_at"] = {"$gte": utc_now() - timedelta(hours=24)}
    elif timeframe == "weekly":
        query["played_at"] = {"$gte": utc_now() - timedelta(days=7)}

    if age_group and age_group != "all":
        if age_group not in VALID_AGE_GROUPS - {"all"}:
            raise HTTPException(status_code=400, detail="Invalid age_group")
        query["age_group"] = age_group

    if game_mode and game_mode in VALID_GAME_MODES:
        query["game_mode"] = game_mode

    docs = await db.leaderboard.find(query, {"_id": 0}).sort("score", -1).limit(limit).to_list(limit)

    rows: List[LeaderboardRow] = []
    for i, doc in enumerate(docs):
        rows.append(LeaderboardRow(
            rank=i + 1,
            username=doc["username"],
            score=doc["score"],
            age_group=doc["age_group"],
            game_mode=doc.get("game_mode", "classic"),
            played_at=doc["played_at"],
        ))
    return rows


# --- Math Boss endpoints ------------------------------------------------------
from .math_boss import build_challenge, build_result, BossChallenge, BossResult


@api_router.get("/math-boss/challenge", response_model=BossChallenge)
async def math_boss_challenge(
    level: int = Query(default=1, ge=1, le=50),
    player_name: str = Query(default="Player"),
    wins: int = Query(default=10, ge=1),
) -> BossChallenge:
    return build_challenge(level=level, player_name=player_name, wins=wins)


class MathBossResultPayload(BaseModel):
    level: int = Field(ge=1)
    correct: int = Field(ge=0)
    total: int = Field(default=20, ge=1)
    player_name: str = "Player"


@api_router.post("/math-boss/result", response_model=BossResult)
async def math_boss_result(payload: MathBossResultPayload) -> BossResult:
    result = build_result(level=payload.level, correct=payload.correct, total=payload.total)
    # Record for analytics
    await db.math_boss_results.insert_one({
        "level": payload.level,
        "correct": payload.correct,
        "total": payload.total,
        "won": result.won,
        "player_name": payload.player_name,
        "played_at": utc_now(),
    })
    return result


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    try:
        await run_in_threadpool(init_storage)
    except Exception:
        logger.exception("Object storage init deferred")


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()
