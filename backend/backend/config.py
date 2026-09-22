import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=PROJECT_ROOT / '.env')

# Root directory for the repo (used for finding .env, etc.)
ROOT_DIR = PROJECT_ROOT

# MongoDB configuration
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('MONGO_DBNAME', 'mathblitz')
