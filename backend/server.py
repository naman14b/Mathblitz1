import asyncio
import bcrypt
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import hashlib
import hmac
import logging
import os
import secrets
import smtplib
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url, tz_aware=True)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="MathBlitz admin API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
admin_sessions: dict[str, str] = {}
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "naman14b@gmail.com").strip().lower()
OTP_TTL_SECONDS = 10 * 60
OTP_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5


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


class AdminChallenge(BaseModel):
    id: str = Field(default_factory=lambda: secrets.token_hex(8))
    days: int
    title: str
    description: str
    reward_xp: int = 100
    active: bool = True


class MonetizationSettings(BaseModel):
    rewarded_ads_enabled: bool = False
    interstitial_frequency: int = 0
    remove_ads_price: str = ""


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
    if not x_admin_token or admin_sessions.get(x_admin_token) != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session required")
    return x_admin_token


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


@api_router.get("/admin/challenges", response_model=List[AdminChallenge])
async def list_challenges(_: str = Depends(require_admin)) -> List[AdminChallenge]:
    docs = await db.admin_challenges.find({}, {"_id": 0}).sort("days", 1).to_list(100)
    return [AdminChallenge(**doc) for doc in docs]


@api_router.post("/admin/challenges", response_model=AdminChallenge)
async def create_challenge(payload: AdminChallenge, _: str = Depends(require_admin)) -> AdminChallenge:
    await db.admin_challenges.replace_one({"id": payload.id}, {**payload.model_dump(), "created_at": utc_now()}, upsert=True)
    return payload


@api_router.get("/admin/monetization", response_model=MonetizationSettings)
async def get_monetization(_: str = Depends(require_admin)) -> MonetizationSettings:
    doc = await db.admin_settings.find_one({"key": "monetization"}, {"_id": 0})
    return MonetizationSettings(**(doc or {}))


@api_router.put("/admin/monetization", response_model=MonetizationSettings)
async def update_monetization(payload: MonetizationSettings, _: str = Depends(require_admin)) -> MonetizationSettings:
    await db.admin_settings.replace_one({"key": "monetization"}, {"key": "monetization", **payload.model_dump(), "updated_at": utc_now()}, upsert=True)
    return payload


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()