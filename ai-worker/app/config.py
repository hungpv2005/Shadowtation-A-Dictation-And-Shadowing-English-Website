"""Đọc cấu hình từ .env (ưu tiên ai-worker/.env, sau đó .env ở thư mục gốc dự án)."""
import os
from pathlib import Path

from dotenv import load_dotenv

_WORKER_DIR = Path(__file__).resolve().parents[1]
_ROOT_DIR = _WORKER_DIR.parent

# load_dotenv không ghi đè biến đã có, nên file nạp trước có ưu tiên cao hơn
load_dotenv(_WORKER_DIR / ".env")
load_dotenv(_ROOT_DIR / ".env")

REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
CORE_API_INTERNAL_URL: str = os.getenv("CORE_API_INTERNAL_URL", "http://localhost:4000")
INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "")
AZURE_SPEECH_KEY: str = os.getenv("AZURE_SPEECH_KEY", "")
AZURE_SPEECH_REGION: str = os.getenv("AZURE_SPEECH_REGION", "")
