import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend folder
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")
load_dotenv(dotenv_path=BACKEND_ROOT / ".env")
load_dotenv()

# Root directory for the repo
ROOT_DIR = PROJECT_ROOT

# Database Configuration (PostgreSQL / Neon with SQLite fallback)
DEFAULT_DATABASE_URL = "sqlite+aiosqlite:///./mathblitz.db"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip().strip("\"'")

def get_async_database_url(url: str = "") -> str:
    raw = (url or DATABASE_URL).strip().strip("\"'")
    if not raw:
        return DEFAULT_DATABASE_URL
    base_url = raw.split("?")[0]
    if base_url.startswith("postgres://"):
        return "postgresql+asyncpg://" + base_url[len("postgres://"):]
    elif base_url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + base_url[len("postgresql://"):]
    elif base_url.startswith("sqlite:///"):
        return "sqlite+aiosqlite:///" + base_url[len("sqlite:///"):]
    elif base_url.startswith("sqlite+aiosqlite://"):
        return base_url
    elif base_url.startswith("postgresql+asyncpg://"):
        return base_url
    return base_url

# OpenRouter AI Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "qwen/qwen3.8-27b:free").strip()
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip()


# Admin & Authentication Configuration
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "naman14b@gmail.com").strip().lower()
OTP_PEPPER = os.getenv("OTP_PEPPER", "mathblitz-development-pepper").strip()
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASS = os.getenv("SMTP_PASS", "").strip()
