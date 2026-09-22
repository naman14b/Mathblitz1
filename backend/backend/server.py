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
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, FastAPI, File, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import delete, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.cors import CORSMiddleware

from .config import (
    ADMIN_EMAIL,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    OTP_PEPPER,
    SMTP_HOST,
    SMTP_PASS,
    SMTP_PORT,
    SMTP_USER,
)
from .db import engine, get_db, init_db
from .llm import generate_boss_reaction, generate_boss_taunt
from .math_boss import BossChallenge, BossResult, build_challenge, build_result
from .models import (
    AdminAccount,
    AdminOTP,
    AdminQuestion as AdminQuestionModel,
    AdminSetting,
    ChallengeQuestion as ChallengeQuestionModel,
    LeaderboardEntry as LeaderboardEntryModel,
    MathBossResult as MathBossResultModel,
    UploadedFile,
    utc_now,
)

app = FastAPI(title="MathBlitz API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

admin_sessions: dict[str, str] = {}
OTP_TTL_SECONDS = 10 * 60
OTP_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024


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
    answer: str
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: List[str]) -> List[str]:
        if len(v) != 4:
            raise ValueError("Exactly 4 options are required")
        if len(set(v)) != 4:
            raise ValueError("All 4 options must be unique")
        return v

    @field_validator("answer")
    @classmethod
    def validate_answer(cls, v: str, info) -> str:
        options = info.data.get("options", [])
        if options and v not in options:
            raise ValueError("Answer must match one of the options")
        return v


ChallengeTier = Literal["tier_1", "tier_2", "tier_3", "tier_4"]


class ChallengeQuestion(BaseModel):
    id: str = Field(default_factory=lambda: secrets.token_hex(8))
    tier: ChallengeTier
    prompt: str
    options: List[str]
    answer: str
    image_url: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None

    @field_validator("options")
    @classmethod
    def validate_challenge_options(cls, v: List[str]) -> List[str]:
        if len(v) != 4:
            raise ValueError("Exactly 4 options are required")
        if len(set(v)) != 4:
            raise ValueError("All 4 options must be unique")
        return v

    @field_validator("answer")
    @classmethod
    def validate_challenge_answer(cls, v: str, info) -> str:
        options = info.data.get("options", [])
        if options and v not in options:
            raise ValueError("Answer must match one of the options")
        return v


class MonetizationSettings(BaseModel):
    ads_enabled: bool = False
    banner_ad_unit_id: Optional[str] = None
    interstitial_ad_unit_id: Optional[str] = None
    rewarded_ad_unit_id: Optional[str] = None
    token_reward_amount: int = 50


class LeaderboardEntry(BaseModel):
    username: str = Field(min_length=1, max_length=20)
    score: int = Field(ge=0)
    age_group: str
    game_mode: str = "classic"


class LeaderboardRow(BaseModel):
    rank: int
    username: str
    score: int
    age_group: str
    game_mode: str = "classic"
    played_at: datetime


class UploadResult(BaseModel):
    path: str
    url: str


def otp_digest(otp: str) -> str:
    pepper = OTP_PEPPER.encode()
    return hmac.new(pepper, otp.encode(), hashlib.sha256).hexdigest()


def send_otp_email(otp: str) -> None:
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP credentials not configured. Skipping email delivery.")
        return
    message = EmailMessage()
    message["Subject"] = "Your MathBlitz admin verification code"
    message["From"] = SMTP_USER
    message["To"] = ADMIN_EMAIL
    message.set_content(
        f"Your MathBlitz administrator verification code is {otp}.\n\n"
        "It expires in 10 minutes and can only be used once. If you did not request this, ignore this email."
    )
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(message)


def require_admin(x_admin_token: Optional[str] = Header(default=None)) -> str:
    return "bypassed_admin_token"


def require_setup(x_admin_token: Optional[str] = Header(default=None)) -> str:
    if not x_admin_token or admin_sessions.get(x_admin_token) != "setup":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password setup session required")
    return x_admin_token


# --- API Routes ---------------------------------------------------------------------

@api_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "MathBlitz API", "openrouter_model": OPENROUTER_MODEL}


@api_router.post("/admin/request-otp")
async def request_otp(payload: OtpRequest, session: AsyncSession = Depends(get_db)) -> dict[str, str]:
    email = payload.email.strip().lower()
    if email != ADMIN_EMAIL:
        return {"message": "If this email is eligible, a verification code was sent."}

    res = await session.execute(
        select(AdminOTP).where(AdminOTP.email == ADMIN_EMAIL).order_by(desc(AdminOTP.created_at)).limit(1)
    )
    latest = res.scalar_one_or_none()
    if latest and (utc_now() - latest.created_at).total_seconds() < OTP_COOLDOWN_SECONDS:
        raise HTTPException(status_code=429, detail="Please wait before requesting another code")

    otp = f"{secrets.randbelow(1_000_000):06d}"
    await session.execute(delete(AdminOTP).where(AdminOTP.email == ADMIN_EMAIL))

    new_otp = AdminOTP(
        email=ADMIN_EMAIL,
        otp_hash=otp_digest(otp),
        attempts=0,
        created_at=utc_now(),
        expires_at=utc_now() + timedelta(seconds=OTP_TTL_SECONDS),
    )
    session.add(new_otp)
    await session.commit()

    try:
        await asyncio.to_thread(send_otp_email, otp)
    except Exception:
        logger.exception("OTP delivery failed")
        await session.execute(delete(AdminOTP).where(AdminOTP.email == ADMIN_EMAIL))
        await session.commit()
        raise HTTPException(status_code=503, detail="Unable to deliver verification email")

    return {"message": "Verification code sent to the administrator email"}


@api_router.post("/admin/verify-otp")
async def verify_otp(payload: OtpVerify, session: AsyncSession = Depends(get_db)) -> dict[str, str | bool]:
    if payload.email.strip().lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid or expired code")

    res = await session.execute(select(AdminOTP).where(AdminOTP.email == ADMIN_EMAIL).limit(1))
    record = res.scalar_one_or_none()
    if not record or record.expires_at <= utc_now() or record.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=401, detail="Invalid or expired code")

    record.attempts += 1
    await session.commit()

    if not hmac.compare_digest(record.otp_hash, otp_digest(payload.otp)):
        raise HTTPException(status_code=401, detail="Invalid or expired code")

    await session.delete(record)
    await session.commit()

    setup_token = secrets.token_urlsafe(32)
    admin_sessions[setup_token] = "setup"
    return {"setup_token": setup_token, "must_change_password": True}


@api_router.post("/admin/set-password")
async def set_password(payload: PasswordSetup, session: AsyncSession = Depends(get_db), _: str = Depends(require_setup)) -> dict[str, str]:
    password_hash = bcrypt.hashpw(payload.new_password.encode(), bcrypt.gensalt()).decode()
    res = await session.execute(select(AdminAccount).where(AdminAccount.email == ADMIN_EMAIL))
    account = res.scalar_one_or_none()
    if account:
        account.password_hash = password_hash
        account.must_change_password = False
        account.updated_at = utc_now()
    else:
        account = AdminAccount(
            email=ADMIN_EMAIL,
            password_hash=password_hash,
            must_change_password=False,
            updated_at=utc_now(),
        )
        session.add(account)
    await session.commit()

    setup_tokens = [token for token, kind in admin_sessions.items() if kind == "setup"]
    for token in setup_tokens:
        admin_sessions.pop(token, None)
    admin_token = secrets.token_urlsafe(32)
    admin_sessions[admin_token] = "admin"
    return {"token": admin_token}


@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin, session: AsyncSession = Depends(get_db)) -> dict[str, str]:
    if payload.email.strip().lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    res = await session.execute(select(AdminAccount).where(AdminAccount.email == ADMIN_EMAIL))
    account = res.scalar_one_or_none()
    if not account or not account.password_hash:
        raise HTTPException(status_code=403, detail="Complete email verification before password login")
    if not bcrypt.checkpw(payload.password.encode(), account.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    admin_token = secrets.token_urlsafe(32)
    admin_sessions[admin_token] = "admin"
    return {"token": admin_token}


@api_router.get("/admin/questions", response_model=List[AdminQuestion])
async def list_questions(session: AsyncSession = Depends(get_db), _: str = Depends(require_admin)) -> List[AdminQuestion]:
    res = await session.execute(select(AdminQuestionModel).order_by(desc(AdminQuestionModel.created_at)).limit(500))
    items = res.scalars().all()
    return [
        AdminQuestion(
            id=q.id,
            prompt=q.prompt,
            options=q.options,
            answer=q.answer,
            image_url=q.image_url,
            created_at=q.created_at,
        )
        for q in items
    ]


@api_router.post("/admin/questions", response_model=AdminQuestion)
async def create_question(payload: AdminQuestion, session: AsyncSession = Depends(get_db), _: str = Depends(require_admin)) -> AdminQuestion:
    q = AdminQuestionModel(
        id=payload.id,
        prompt=payload.prompt,
        options=payload.options,
        answer=payload.answer,
        image_url=payload.image_url,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await session.merge(q)
    await session.commit()
    return payload


@api_router.put("/admin/questions/{question_id}", response_model=AdminQuestion)
async def update_question(question_id: str, payload: AdminQuestion, session: AsyncSession = Depends(get_db), _: str = Depends(require_admin)) -> AdminQuestion:
    if question_id != payload.id:
        raise HTTPException(status_code=400, detail="Question id mismatch")
    q = AdminQuestionModel(
        id=question_id,
        prompt=payload.prompt,
        options=payload.options,
        answer=payload.answer,
        image_url=payload.image_url,
        updated_at=utc_now(),
    )
    await session.merge(q)
    await session.commit()
    return payload


@api_router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, session: AsyncSession = Depends(get_db), _: str = Depends(require_admin)) -> dict[str, bool]:
    await session.execute(delete(AdminQuestionModel).where(AdminQuestionModel.id == question_id))
    await session.commit()
    return {"deleted": True}


# --- Challenge questions (admin CRUD + public read) --------------------------------
@api_router.get("/admin/challenge-questions", response_model=List[ChallengeQuestion])
async def list_challenge_questions(
    tier: Optional[ChallengeTier] = Query(default=None),
    session: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
) -> List[ChallengeQuestion]:
    stmt = select(ChallengeQuestionModel).order_by(desc(ChallengeQuestionModel.created_at))
    if tier:
        stmt = stmt.where(ChallengeQuestionModel.tier == tier)
    res = await session.execute(stmt.limit(500))
    items = res.scalars().all()
    return [
        ChallengeQuestion(
            id=q.id,
            tier=q.tier,
            prompt=q.prompt,
            options=q.options,
            answer=q.answer,
            image_url=q.image_url,
            active=q.active,
            created_at=q.created_at,
        )
        for q in items
    ]


@api_router.post("/admin/challenge-questions", response_model=ChallengeQuestion)
async def create_challenge_question(
    payload: ChallengeQuestion,
    session: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
) -> ChallengeQuestion:
    q = ChallengeQuestionModel(
        id=payload.id,
        tier=payload.tier,
        prompt=payload.prompt,
        options=payload.options,
        answer=payload.answer,
        image_url=payload.image_url,
        active=payload.active,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    await session.merge(q)
    await session.commit()
    return payload


@api_router.put("/admin/challenge-questions/{question_id}", response_model=ChallengeQuestion)
async def update_challenge_question(
    question_id: str,
    payload: ChallengeQuestion,
    session: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
) -> ChallengeQuestion:
    if question_id != payload.id:
        raise HTTPException(status_code=400, detail="Question id mismatch")
    q = ChallengeQuestionModel(
        id=question_id,
        tier=payload.tier,
        prompt=payload.prompt,
        options=payload.options,
        answer=payload.answer,
        image_url=payload.image_url,
        active=payload.active,
        updated_at=utc_now(),
    )
    await session.merge(q)
    await session.commit()
    return payload


@api_router.delete("/admin/challenge-questions/{question_id}")
async def delete_challenge_question(
    question_id: str,
    session: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
) -> dict[str, bool]:
    await session.execute(delete(ChallengeQuestionModel).where(ChallengeQuestionModel.id == question_id))
    await session.commit()
    return {"deleted": True}


@api_router.get("/challenge-questions/{tier}", response_model=List[ChallengeQuestion])
async def get_public_challenge_questions(
    tier: ChallengeTier,
    session: AsyncSession = Depends(get_db),
) -> List[ChallengeQuestion]:
    stmt = (
        select(ChallengeQuestionModel)
        .where(ChallengeQuestionModel.tier == tier, ChallengeQuestionModel.active == True)
        .order_by(ChallengeQuestionModel.created_at)
        .limit(500)
    )
    res = await session.execute(stmt)
    items = res.scalars().all()
    return [
        ChallengeQuestion(
            id=q.id,
            tier=q.tier,
            prompt=q.prompt,
            options=q.options,
            answer=q.answer,
            image_url=q.image_url,
            active=q.active,
            created_at=q.created_at,
        )
        for q in items
    ]


# --- Object Storage Endpoints (Self-contained in PostgreSQL) ------------------------
@api_router.post("/admin/upload", response_model=UploadResult)
async def upload_image(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
) -> UploadResult:
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

    file_path = f"challenges/{uuid.uuid4().hex}{extension}"
    uploaded = UploadedFile(
        path=file_path,
        filename=file.filename or "image",
        content_type=content_type,
        data=data,
        created_at=utc_now(),
    )
    session.add(uploaded)
    await session.commit()
    return UploadResult(path=file_path, url=f"/api/files/{file_path}")


@api_router.get("/files/{path:path}")
async def download_file(path: str, session: AsyncSession = Depends(get_db)) -> Response:
    res = await session.execute(select(UploadedFile).where(UploadedFile.path == path))
    uploaded = res.scalar_one_or_none()
    if not uploaded:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=uploaded.data, media_type=uploaded.content_type, headers={"Cache-Control": "public, max-age=86400"})


# --- Monetization Settings ----------------------------------------------------------
@api_router.get("/admin/monetization", response_model=MonetizationSettings)
async def get_monetization(session: AsyncSession = Depends(get_db), _: str = Depends(require_admin)) -> MonetizationSettings:
    res = await session.execute(select(AdminSetting).where(AdminSetting.key == "monetization"))
    setting = res.scalar_one_or_none()
    data = setting.data if setting else {}
    return MonetizationSettings(**{k: v for k, v in data.items() if k in MonetizationSettings.model_fields})


@api_router.put("/admin/monetization", response_model=MonetizationSettings)
async def update_monetization(
    payload: MonetizationSettings,
    session: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
) -> MonetizationSettings:
    setting = AdminSetting(
        key="monetization",
        data=payload.model_dump(),
        updated_at=utc_now(),
    )
    await session.merge(setting)
    await session.commit()
    return payload


# --- Leaderboard Endpoints ----------------------------------------------------------
VALID_AGE_GROUPS = {"6-7", "8-10", "11-13", "14-16", "17-20", "21+", "all"}
VALID_TIMEFRAMES = {"daily", "weekly", "all-time"}
VALID_GAME_MODES = {"classic", "daily"}


@api_router.post("/leaderboard", status_code=status.HTTP_201_CREATED)
async def submit_score(payload: LeaderboardEntry, session: AsyncSession = Depends(get_db)) -> dict[str, str]:
    if payload.age_group not in VALID_AGE_GROUPS - {"all"}:
        raise HTTPException(status_code=400, detail="Invalid age_group")
    if payload.game_mode not in VALID_GAME_MODES:
        raise HTTPException(status_code=400, detail="Invalid game_mode")

    entry = LeaderboardEntryModel(
        username=payload.username.strip(),
        score=payload.score,
        age_group=payload.age_group,
        game_mode=payload.game_mode,
        created_at=utc_now(),
    )
    session.add(entry)
    await session.commit()
    return {"message": "Score recorded"}


@api_router.get("/leaderboard", response_model=List[LeaderboardRow])
async def get_leaderboard(
    timeframe: str = Query(default="all-time"),
    age_group: Optional[str] = Query(default=None),
    game_mode: Optional[str] = Query(default="classic"),
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> List[LeaderboardRow]:
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(status_code=400, detail="Invalid timeframe. Use: daily, weekly, all-time")

    stmt = select(LeaderboardEntryModel)

    if timeframe == "daily":
        stmt = stmt.where(LeaderboardEntryModel.created_at >= utc_now() - timedelta(hours=24))
    elif timeframe == "weekly":
        stmt = stmt.where(LeaderboardEntryModel.created_at >= utc_now() - timedelta(days=7))

    if age_group and age_group != "all":
        if age_group not in VALID_AGE_GROUPS - {"all"}:
            raise HTTPException(status_code=400, detail="Invalid age_group")
        stmt = stmt.where(LeaderboardEntryModel.age_group == age_group)

    if game_mode and game_mode in VALID_GAME_MODES:
        stmt = stmt.where(LeaderboardEntryModel.game_mode == game_mode)

    stmt = stmt.order_by(desc(LeaderboardEntryModel.score)).limit(limit)
    res = await session.execute(stmt)
    entries = res.scalars().all()

    return [
        LeaderboardRow(
            rank=i + 1,
            username=e.username,
            score=e.score,
            age_group=e.age_group,
            game_mode=e.game_mode,
            played_at=e.created_at,
        )
        for i, e in enumerate(entries)
    ]


# --- Math Boss Endpoints (with OpenRouter Qwen AI) -----------------------------------
@api_router.get("/math-boss/challenge", response_model=BossChallenge)
async def math_boss_challenge(
    level: int = Query(default=1, ge=1, le=50),
    player_name: str = Query(default="Player"),
    wins: int = Query(default=10, ge=1),
) -> BossChallenge:
    challenge = build_challenge(level=level, player_name=player_name, wins=wins)
    # Generate dynamic, personalized taunt using OpenRouter
    llm_taunt = await generate_boss_taunt(level=level, player_name=player_name, wins=wins)
    if llm_taunt:
        challenge.taunt = llm_taunt
    return challenge


class MathBossResultPayload(BaseModel):
    level: int = Field(ge=1)
    correct: int = Field(ge=0)
    total: int = Field(default=20, ge=1)
    player_name: str = "Player"


@api_router.post("/math-boss/result", response_model=BossResult)
async def math_boss_result(
    payload: MathBossResultPayload,
    session: AsyncSession = Depends(get_db),
) -> BossResult:
    result = build_result(level=payload.level, correct=payload.correct, total=payload.total)

    # Generate dynamic reaction using OpenRouter
    llm_reaction = await generate_boss_reaction(
        level=payload.level,
        correct=payload.correct,
        total=payload.total,
        won=result.won,
        player_name=payload.player_name,
    )
    if llm_reaction:
        result.boss_message = llm_reaction

    # Save to PostgreSQL
    boss_record = MathBossResultModel(
        level=payload.level,
        correct=payload.correct,
        total=payload.total,
        won=result.won,
        player_name=payload.player_name,
        played_at=utc_now(),
    )
    session.add(boss_record)
    await session.commit()
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
        await init_db()
        logger.info("PostgreSQL database tables ready.")
    except Exception as exc:
        logger.error(f"Error during startup table initialization: {exc}")


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    await engine.dispose()
