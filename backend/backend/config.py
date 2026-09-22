import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend folder
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=PROJECT_ROOT / '.env')
load_dotenv(dotenv_path=BACKEND_ROOT / '.env')
load_dotenv()

# Root directory for the repo (used for finding .env, etc.)
ROOT_DIR = PROJECT_ROOT

# LLM / AI Configuration
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
EMERGENT_LLM_KEY = os.getenv('EMERGENT_LLM_KEY', '')

# MongoDB configuration
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('MONGO_DBNAME', 'mathblitz')
