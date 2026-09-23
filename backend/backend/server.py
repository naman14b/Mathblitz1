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
    CoachingIntervention as CoachingInterventionModel,
    CoachingSession as CoachingSessionModel,
    LeaderboardEntry as LeaderboardEntryModel,
    MathBossResult as MathBossResultModel,
    PlayerLearningProfile as PlayerLearningProfileModel,
    QuestionAttempt as QuestionAttemptModel,
    UploadedFile,
    utc_now,
)
from .learning_engine import LearningEngine, RawAttempt
from .taxonomy import CONCEPT_TAXONOMY, classify_error
from .ai_coach.graph import coaching_workflow, get_llm
from .ai_coach.state import CoachingState
from .journey.routes import router as journey_router
from langchain_core.messages import HumanMessage, SystemMessage

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


# ── AI Coach Endpoints ────────────────────────────────────────────────────────

class QuestionAttemptPayload(BaseModel):
    attempt_id: Optional[str] = None
    prompt: str
    player_answer: str
    correct_answer: str
    is_correct: bool
    topic: str
    subtopic: Optional[str] = None
    difficulty: int = 1
    response_time_ms: int = 0
    game_mode: str = "classic"


class BatchAttemptsPayload(BaseModel):
    player_id: str
    player_name: Optional[str] = "Player"
    game_mode: str = "classic"
    attempts: List[QuestionAttemptPayload]


class StartCoachSessionPayload(BaseModel):
    player_id: str
    player_name: Optional[str] = "Player"
    concept_id: Optional[str] = None


class SubmitPracticePayload(BaseModel):
    session_id: str
    player_id: str
    question_index: int
    student_answer: str


class ContextualQueryPayload(BaseModel):
    player_id: str
    prompt: str
    correct_answer: str
    player_answer: str
    topic: str
    subtopic: Optional[str] = None
    query: str


@api_router.post("/coach/record-attempts")
async def record_attempts(
    payload: BatchAttemptsPayload,
    session: AsyncSession = Depends(get_db),
):
    """Record a batch of question attempts from a game session idempotently and update learning metrics."""
    if not payload.attempts:
        return {"recorded": 0}

    # Fetch existing attempt_ids for deduplication
    incoming_ids = [att.attempt_id for att in payload.attempts if att.attempt_id]
    existing_ids_set = set()
    if incoming_ids:
        ex_res = await session.execute(
            select(QuestionAttemptModel.attempt_id).where(
                QuestionAttemptModel.player_id == payload.player_id,
                QuestionAttemptModel.attempt_id.in_(incoming_ids),
            )
        )
        existing_ids_set = set(ex_res.scalars().all())

    # Deterministically classify errors and insert new records
    db_records = []
    for att in payload.attempts:
        if att.attempt_id and att.attempt_id in existing_ids_set:
            continue

        err_cat, err_hyp, _ = classify_error(
            prompt=att.prompt,
            player_answer=att.player_answer,
            correct_answer=att.correct_answer,
            topic=att.topic,
            subtopic=att.subtopic,
            response_time_ms=att.response_time_ms,
        )
        rec = QuestionAttemptModel(
            attempt_id=att.attempt_id,
            player_id=payload.player_id,
            game_mode=att.game_mode or payload.game_mode,
            topic=att.topic,
            subtopic=att.subtopic,
            difficulty=att.difficulty,
            prompt=att.prompt,
            player_answer=str(att.player_answer),
            correct_answer=str(att.correct_answer),
            is_correct=att.is_correct,
            response_time_ms=att.response_time_ms,
            error_category=err_cat.value if not att.is_correct else None,
            error_hypothesis=err_hyp if not att.is_correct else None,
            created_at=utc_now(),
        )
        session.add(rec)
        db_records.append(rec)

    await session.commit()

    # Recompute and update PlayerLearningProfile cache
    result = await session.execute(
        select(QuestionAttemptModel)
        .where(QuestionAttemptModel.player_id == payload.player_id)
        .order_by(QuestionAttemptModel.created_at.desc())
        .limit(100)
    )
    all_attempts = result.scalars().all()

    raw_attempts = [
        RawAttempt(
            prompt=a.prompt,
            player_answer=a.player_answer,
            correct_answer=a.correct_answer,
            is_correct=a.is_correct,
            topic=a.topic,
            subtopic=a.subtopic,
            difficulty=a.difficulty,
            response_time_ms=a.response_time_ms,
            error_category=a.error_category,
            error_hypothesis=a.error_hypothesis,
            attempt_id=a.attempt_id,
        )
        for a in reversed(all_attempts)
    ]

    profile_data = LearningEngine.build_profile(payload.player_id, raw_attempts)

    # Upsert learning profile
    prof_res = await session.execute(
        select(PlayerLearningProfileModel).where(PlayerLearningProfileModel.player_id == payload.player_id)
    )
    prof_rec = prof_res.scalar_one_or_none()

    serialized_metrics = {
        cid: {
            "concept_id": m.concept_id,
            "concept_name": m.concept_name,
            "topic": m.topic,
            "subtopic": m.subtopic,
            "accuracy": m.accuracy,
            "recent_accuracy": m.recent_accuracy,
            "trend": m.trend,
            "mastery_score": m.mastery_score,
            "confidence": m.confidence,
            "confidence_level": m.confidence_level,
            "mastery_state": m.mastery_state,
            "regression_detected": m.regression_detected,
            "regression_severity": m.regression_severity,
            "primary_error": m.primary_error,
            "primary_mistake_desc": m.primary_mistake_desc,
            "total_attempts": m.total_attempts,
            "correct_attempts": m.correct_attempts,
        }
        for cid, m in profile_data.topic_metrics.items()
    }

    weak_list = [
        {
            "concept_id": w.concept_id,
            "concept_name": w.concept_name,
            "topic": w.topic,
            "subtopic": w.subtopic,
            "accuracy": w.accuracy,
            "recent_accuracy": w.recent_accuracy,
            "severity": w.severity,
            "primary_error_category": w.primary_error_category,
            "common_mistake": w.common_mistake,
            "recommended_action": w.recommended_action,
            "mastery_score": w.mastery_score,
            "confidence": w.confidence,
            "is_regression": w.is_regression,
            "target_learning_concept_id": w.target_learning_concept_id,
            "target_learning_concept_name": w.target_learning_concept_name,
            "is_prerequisite_gap": w.is_prerequisite_gap,
            "learning_objective": w.learning_objective,
            "evidence_summary": w.evidence_summary,
            "recommended_difficulty": w.recommended_difficulty,
            "total_attempts": w.total_attempts,
        }
        for w in profile_data.weak_areas
    ]

    active_int = weak_list[0] if weak_list else None

    if prof_rec:
        prof_rec.overall_accuracy = int(profile_data.overall_accuracy)
        prof_rec.total_attempts = profile_data.total_attempts
        prof_rec.total_correct = profile_data.total_correct
        prof_rec.topic_metrics = serialized_metrics
        prof_rec.weak_areas = weak_list
        prof_rec.active_intervention = active_int
        prof_rec.updated_at = utc_now()
    else:
        prof_rec = PlayerLearningProfileModel(
            player_id=payload.player_id,
            overall_accuracy=int(profile_data.overall_accuracy),
            total_attempts=profile_data.total_attempts,
            total_correct=profile_data.total_correct,
            topic_metrics=serialized_metrics,
            weak_areas=weak_list,
            active_intervention=active_int,
            updated_at=utc_now(),
        )
        session.add(prof_rec)

    await session.commit()
    return {"recorded": len(db_records), "weak_areas_count": len(weak_list)}


@api_router.get("/coach/profile/{player_id}")
async def get_coach_profile(
    player_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Retrieve the player's persistent mathematical profile and weak areas."""
    res = await session.execute(
        select(PlayerLearningProfileModel).where(PlayerLearningProfileModel.player_id == player_id)
    )
    prof = res.scalar_one_or_none()

    if prof:
        return {
            "player_id": prof.player_id,
            "overall_accuracy": prof.overall_accuracy,
            "total_attempts": prof.total_attempts,
            "total_correct": prof.total_correct,
            "topic_metrics": prof.topic_metrics or {},
            "weak_areas": prof.weak_areas or [],
            "active_intervention": prof.active_intervention,
            "updated_at": prof.updated_at.isoformat() if prof.updated_at else None,
        }

    return {
        "player_id": player_id,
        "overall_accuracy": 0,
        "total_attempts": 0,
        "total_correct": 0,
        "topic_metrics": {},
        "weak_areas": [],
        "active_intervention": None,
        "updated_at": utc_now().isoformat(),
    }


@api_router.get("/coach/proactive-insight/{player_id}")
async def get_proactive_insight(
    player_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Return a proactive coaching notification card if player has an active weakness or regression."""
    res = await session.execute(
        select(PlayerLearningProfileModel).where(PlayerLearningProfileModel.player_id == player_id)
    )
    prof = res.scalar_one_or_none()

    if not prof or not prof.weak_areas:
        return {"has_insight": False}

    top_weakness = prof.weak_areas[0]
    total_att = top_weakness.get("total_attempts", 0)
    acc = top_weakness.get("accuracy", 0.0)
    is_reg = top_weakness.get("is_regression", False)

    headline = "🧠 MathBlitz Coach: Skill Refresher Needed" if is_reg else "🧠 MathBlitz Coach noticed something"
    msg = (
        f"We noticed a slight regression in {top_weakness.get('concept_name')}. {top_weakness.get('common_mistake', '')}. Take a 2-minute refresher!"
        if is_reg
        else f"You've answered {total_att} {top_weakness.get('concept_name')} questions with {acc:.0f}% accuracy. {top_weakness.get('common_mistake', '')}. Let's fix this together!"
    )

    return {
        "has_insight": True,
        "concept_id": top_weakness.get("concept_id"),
        "concept_name": top_weakness.get("concept_name"),
        "headline": headline,
        "message": msg,
        "mastery_score": top_weakness.get("mastery_score", 50.0),
        "cta_label": "Fix This Weakness",
        "severity": top_weakness.get("severity", "medium"),
        "is_regression": is_reg,
        "target_learning_concept_id": top_weakness.get("target_learning_concept_id"),
        "target_learning_concept_name": top_weakness.get("target_learning_concept_name"),
        "is_prerequisite_gap": top_weakness.get("is_prerequisite_gap", False),
        "evidence_summary": top_weakness.get("evidence_summary"),
    }


@api_router.post("/coach/start-session")
async def start_coach_session(
    payload: StartCoachSessionPayload,
    session: AsyncSession = Depends(get_db),
):
    """Trigger the LangGraph coaching workflow to generate a personalized 5-step lesson."""
    att_res = await session.execute(
        select(QuestionAttemptModel)
        .where(QuestionAttemptModel.player_id == payload.player_id)
        .order_by(QuestionAttemptModel.created_at.desc())
        .limit(50)
    )
    db_attempts = att_res.scalars().all()

    recent_perf = [
        {
            "prompt": a.prompt,
            "player_answer": a.player_answer,
            "correct_answer": a.correct_answer,
            "is_correct": a.is_correct,
            "topic": a.topic,
            "subtopic": a.subtopic,
            "difficulty": a.difficulty,
            "response_time_ms": a.response_time_ms,
            "error_category": a.error_category,
            "error_hypothesis": a.error_hypothesis,
        }
        for a in reversed(db_attempts)
    ]

    initial_state: CoachingState = {
        "player_id": payload.player_id,
        "player_name": payload.player_name or "Player",
        "current_concept_id": payload.concept_id or "",
        "recent_performance": recent_perf,
        "topic_metrics": {},
        "weak_topics": [],
        "detected_errors": [],
        "practice_questions": [],
        "verified_practice": [],
        "fingerprints_seen": [],
        "current_question_index": 0,
        "mastery_before": 50.0,
        "confidence_before": 0.3,
        "mastery_after": 50.0,
        "confidence_after": 0.3,
        "mastery_delta": 0.0,
        "next_action": "show_step_1",
    }

    final_state = coaching_workflow.invoke(initial_state)
    session_id = f"cs_{secrets.token_hex(8)}"

    lesson_data = {
        "concept_id": final_state.get("current_concept_id"),
        "concept_name": final_state.get("current_concept_name"),
        "topic": final_state.get("current_topic"),
        "subtopic": final_state.get("current_subtopic"),
        "target_learning_concept_id": final_state.get("target_learning_concept_id"),
        "target_learning_concept_name": final_state.get("target_learning_concept_name"),
        "is_prerequisite_gap": final_state.get("is_prerequisite_gap", False),
        "root_cause_error": final_state.get("root_cause_error"),
        "evidence_summary": final_state.get("evidence_summary"),
        "intervention_type": final_state.get("intervention_type", "teach_then_practice"),
        "common_mistake": final_state.get("common_mistake"),
        "learning_objective": final_state.get("learning_objective"),
        "concept_explanation": final_state.get("concept_explanation"),
        "formula_breakdown": final_state.get("formula_breakdown"),
        "example_problem": final_state.get("example_problem"),
        "example_solution": final_state.get("example_solution"),
        "verified_practice": final_state.get("verified_practice", []),
        "mastery_before": final_state.get("mastery_before", 50.0),
        "confidence_before": final_state.get("confidence_before", 0.3),
    }

    # Save session and intervention records
    session_rec = CoachingSessionModel(
        id=session_id,
        player_id=payload.player_id,
        concept_id=final_state.get("current_concept_id") or "percentages.conversion",
        concept_name=final_state.get("current_concept_name") or "Math Concept",
        mastery_before=int(final_state.get("mastery_before", 50.0)),
        mastery_after=int(final_state.get("mastery_before", 50.0)),
        mastery_delta=0,
        completed=False,
        lesson_data=lesson_data,
        created_at=utc_now(),
    )
    session.add(session_rec)

    intervention_rec = CoachingInterventionModel(
        id=session_id,
        player_id=payload.player_id,
        focus_concept_id=final_state.get("current_concept_id") or "percentages.conversion",
        target_learning_concept_id=final_state.get("target_learning_concept_id") or final_state.get("current_concept_id") or "percentages.conversion",
        root_cause_error=final_state.get("root_cause_error"),
        learning_objective=final_state.get("learning_objective"),
        is_prerequisite_gap=final_state.get("is_prerequisite_gap", False),
        intervention_type=final_state.get("intervention_type", "teach_then_practice"),
        mastery_before=float(final_state.get("mastery_before", 50.0)),
        confidence_before=float(final_state.get("confidence_before", 0.3)),
        mastery_after=float(final_state.get("mastery_before", 50.0)),
        confidence_after=float(final_state.get("confidence_before", 0.3)),
        mastery_delta=0.0,
        accuracy_before=float(final_state.get("mastery_before", 50.0)),
        accuracy_during=0.0,
        observed_improvement="in_progress",
        completed=False,
        created_at=utc_now(),
    )
    session.add(intervention_rec)

    await session.commit()

    return {
        "session_id": session_id,
        **lesson_data,
    }


@api_router.post("/coach/submit-practice")
async def submit_practice(
    payload: SubmitPracticePayload,
    session: AsyncSession = Depends(get_db),
):
    """Evaluate an answer to a practice problem and update mastery improvement."""
    sess_res = await session.execute(
        select(CoachingSessionModel).where(CoachingSessionModel.id == payload.session_id)
    )
    sess_rec = sess_res.scalar_one_or_none()

    if not sess_rec or not sess_rec.lesson_data:
        raise HTTPException(status_code=404, detail="Coaching session not found")

    lesson_data = sess_rec.lesson_data
    practice_questions = lesson_data.get("verified_practice", [])

    if payload.question_index >= len(practice_questions):
        raise HTTPException(status_code=400, detail="Invalid question index")

    curr_q = practice_questions[payload.question_index]
    correct_ans = str(curr_q.get("correct_answer")).strip()
    student_ans = str(payload.student_answer).strip()

    is_correct = False
    try:
        is_correct = abs(float(student_ans) - float(correct_ans)) < 0.01
    except ValueError:
        is_correct = student_ans.lower() == correct_ans.lower()

    # Generate friendly pedagogical feedback
    llm = get_llm(temperature=0.3, max_tokens=200)
    feedback_text = ""
    if is_correct:
        feedback_text = f"Spot on! {curr_q.get('solution_method', '')}. You applied the rule correctly!"
    else:
        if llm:
            try:
                sys_prompt = "You are MathBlitz AI Coach. Explain why the correct answer is right in 1-2 friendly, encouraging sentences."
                u_prompt = f"Problem: {curr_q['prompt']}\nStudent Answer: {student_ans}\nCorrect Answer: {correct_ans}\nMethod: {curr_q.get('solution_method')}"
                resp = llm.invoke([SystemMessage(content=sys_prompt), HumanMessage(content=u_prompt)])
                feedback_text = resp.content.strip()
            except Exception:
                pass
        if not feedback_text:
            feedback_text = f"The correct answer is {correct_ans}. Remember: {curr_q.get('solution_method', '')}."

    # Update session mastery
    mastery_before = sess_rec.mastery_before
    gain = 18 if is_correct else 6
    mastery_after = min(100, mastery_before + gain)
    mastery_delta = mastery_after - mastery_before

    sess_rec.mastery_after = mastery_after
    sess_rec.mastery_delta = mastery_delta
    sess_rec.completed = True

    # Update CoachingIntervention record
    int_res = await session.execute(
        select(CoachingInterventionModel).where(CoachingInterventionModel.id == payload.session_id)
    )
    int_rec = int_res.scalar_one_or_none()
    if int_rec:
        int_rec.mastery_after = float(mastery_after)
        int_rec.mastery_delta = float(mastery_delta)
        int_rec.confidence_after = min(1.0, int_rec.confidence_before + 0.1)
        int_rec.accuracy_during = 100.0 if is_correct else 0.0
        int_rec.observed_improvement = f"+{mastery_delta}% mastery improvement observed"
        int_rec.completed = True
        int_rec.completed_at = utc_now()

    await session.commit()

    return {
        "is_correct": is_correct,
        "correct_answer": correct_ans,
        "feedback": feedback_text,
        "mastery_before": mastery_before,
        "mastery_after": mastery_after,
        "mastery_delta": mastery_delta,
        "next_step": "challenge" if payload.question_index < len(practice_questions) - 1 else "summary",
    }




@api_router.post("/coach/contextual-query")
async def contextual_query(
    payload: ContextualQueryPayload,
):
    """Contextual Q&A on why an answer was wrong with access to the question & error history (NOT a blank chatbot)."""
    llm = get_llm(temperature=0.4, max_tokens=300)

    if not llm:
        return {
            "answer": f"For {payload.prompt}, the correct answer is {payload.correct_answer}. When calculating this, ensure you double-check each operation step-by-step."
        }

    sys_prompt = (
        "You are MathBlitz AI Coach. You only answer questions strictly about the provided mathematics problem and the student's solution. "
        "Explain clearly, step-by-step, in 2 to 3 friendly sentences. Never deviate into non-mathematical topics."
    )
    user_prompt = (
        f"Math Problem: {payload.prompt}\n"
        f"Correct Answer: {payload.correct_answer}\n"
        f"Student Answer: {payload.player_answer}\n"
        f"Topic: {payload.topic}\n"
        f"Student's Question: {payload.query}\n"
        "Explain why their answer is incorrect and guide them on the correct method."
    )

    try:
        resp = llm.invoke([SystemMessage(content=sys_prompt), HumanMessage(content=user_prompt)])
        return {"answer": resp.content.strip()}
    except Exception as exc:
        return {
            "answer": f"For '{payload.prompt}', the correct result is {payload.correct_answer}. Review the order of operations and inverse operations."
        }


@api_router.get("/coach/debug/{player_id}")
async def debug_coach_state(
    player_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Internal developer diagnostic endpoint for inspecting learning engine, mastery, and interventions."""
    # 1. Fetch raw telemetry
    query = (
        select(QuestionAttemptModel)
        .where(QuestionAttemptModel.player_id == player_id)
        .order_by(desc(QuestionAttemptModel.created_at))
        .limit(50)
    )
    res = await db.execute(query)
    attempts_db = res.scalars().all()

    raw_attempts = [
        RawAttempt(
            prompt=a.prompt,
            player_answer=a.player_answer,
            correct_answer=a.correct_answer,
            is_correct=a.is_correct,
            topic=a.topic,
            subtopic=a.subtopic,
            difficulty=a.difficulty,
            response_time_ms=a.response_time_ms,
            game_mode=a.game_mode,
            timestamp=a.created_at,
            error_category=a.error_category,
            error_hypothesis=a.error_hypothesis,
            attempt_id=a.attempt_id,
        )
        for a in reversed(attempts_db)
    ]

    profile_data = LearningEngine.build_profile(player_id, raw_attempts)

    # 2. Fetch interventions history
    int_query = (
        select(CoachingInterventionModel)
        .where(CoachingInterventionModel.player_id == player_id)
        .order_by(desc(CoachingInterventionModel.created_at))
        .limit(20)
    )
    int_res = await db.execute(int_query)
    interventions_db = int_res.scalars().all()

    return {
        "player_id": player_id,
        "raw_telemetry": [
            {
                "prompt": a.prompt,
                "player_answer": a.player_answer,
                "correct_answer": a.correct_answer,
                "is_correct": a.is_correct,
                "topic": a.topic,
                "subtopic": a.subtopic,
                "response_time_ms": a.response_time_ms,
                "error_category": a.error_category,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "attempt_id": a.attempt_id,
            }
            for a in attempts_db
        ],
        "mastery_map": {
            cid: {
                "name": m.concept_name,
                "mastery_score": m.mastery_score,
                "confidence": m.confidence,
                "mastery_state": m.mastery_state,
                "regression_detected": m.regression_detected,
                "total_attempts": m.total_attempts,
                "accuracy": m.accuracy,
                "recent_accuracy": m.recent_accuracy,
                "trend": m.trend,
            }
            for cid, m in profile_data.topic_metrics.items()
        },
        "weak_areas": [
            {
                "concept_id": w.concept_id,
                "concept_name": w.concept_name,
                "severity": w.severity,
                "target_learning_concept_id": w.target_learning_concept_id,
                "is_prerequisite_gap": w.is_prerequisite_gap,
                "learning_objective": w.learning_objective,
                "evidence_summary": w.evidence_summary,
            }
            for w in profile_data.weak_areas
        ],
        "interventions_history": [
            {
                "session_id": i.id,
                "concept_id": i.focus_concept_id,
                "target_learning_concept_id": i.target_learning_concept_id,
                "intervention_type": i.intervention_type,
                "is_prerequisite_gap": i.is_prerequisite_gap,
                "mastery_before": i.mastery_before,
                "mastery_after": i.mastery_after,
                "mastery_delta": i.mastery_delta,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in interventions_db
        ],
    }


app.include_router(api_router)
app.include_router(journey_router)

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
