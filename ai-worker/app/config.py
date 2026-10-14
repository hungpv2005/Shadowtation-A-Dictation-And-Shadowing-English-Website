"""Environment configuration shared by the worker API and batch generator."""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
except ImportError:
    pass

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
AI_WORKER_URL = os.getenv("AI_WORKER_URL", "http://localhost:8000")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY", "")
