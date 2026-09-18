from datetime import datetime, timezone
import hashlib
import logging
import os
import secrets
from pathlib import Path
from typing import Any, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="MathBlitz admin API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
admin_sessions: set[str] = set()


class AdminLogin(BaseModel):
    email: str
    password: str


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


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_admin(x_admin_token: Optional[str] = Header(default=None)) -> str:
    if not x_admin_token or x_admin_token not in admin_sessions:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session required")
    return x_admin_token


def valid_admin_credentials(email: str, password: str) -> bool:
    configured_email = os.getenv("ADMIN_EMAIL", "owner@mathblitz.app").strip().lower()
    configured_password = os.getenv("ADMIN_PASSWORD", "MathBlitzAdmin!2026")
    return secrets.compare_digest(email.strip().lower(), configured_email) and secrets.compare_digest(
        hashlib.sha256(password.encode()).hexdigest(), hashlib.sha256(configured_password.encode()).hexdigest()
    )


@api_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "MathBlitz API"}


@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin) -> dict[str, str]:
    if not valid_admin_credentials(payload.email, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    token = secrets.token_urlsafe(32)
    admin_sessions.add(token)
    return {"token": token}


@api_router.get("/admin/questions", response_model=List[AdminQuestion])
async def list_questions(_: str = Depends(require_admin)) -> List[AdminQuestion]:
    docs = await db.admin_questions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [AdminQuestion(**doc) for doc in docs]


@api_router.post("/admin/questions", response_model=AdminQuestion)
async def create_question(payload: AdminQuestion, _: str = Depends(require_admin)) -> AdminQuestion:
    doc = payload.model_dump()
    doc["created_at"] = utc_iso()
    await db.admin_questions.replace_one({"id": payload.id}, doc, upsert=True)
    return payload


@api_router.put("/admin/questions/{question_id}", response_model=AdminQuestion)
async def update_question(question_id: str, payload: AdminQuestion, _: str = Depends(require_admin)) -> AdminQuestion:
    if question_id != payload.id:
        raise HTTPException(status_code=400, detail="Question id mismatch")
    result = await db.admin_questions.replace_one({"id": question_id}, {**payload.model_dump(), "updated_at": utc_iso()}, upsert=True)
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
    await db.admin_challenges.replace_one({"id": payload.id}, {**payload.model_dump(), "created_at": utc_iso()}, upsert=True)
    return payload


@api_router.get("/admin/monetization", response_model=MonetizationSettings)
async def get_monetization(_: str = Depends(require_admin)) -> MonetizationSettings:
    doc = await db.admin_settings.find_one({"key": "monetization"}, {"_id": 0})
    return MonetizationSettings(**(doc or {}))


@api_router.put("/admin/monetization", response_model=MonetizationSettings)
async def update_monetization(payload: MonetizationSettings, _: str = Depends(require_admin)) -> MonetizationSettings:
    await db.admin_settings.replace_one(
        {"key": "monetization"}, {"key": "monetization", **payload.model_dump(), "updated_at": utc_iso()}, upsert=True
    )
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