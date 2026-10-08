"""Khung AI Worker (GĐ1): chỉ có endpoint kiểm tra sức khỏe và kết nối Redis.

Phần nhận job từ hàng đợi BullMQ, chuẩn hóa audio bằng FFmpeg và gọi Azure sẽ làm ở GĐ6.
"""
from datetime import datetime, timezone

import redis
from fastapi import FastAPI

from app import config

app = FastAPI(title="Shadowtation AI Worker", version="0.1.0")


@app.get("/health")
def health() -> dict:
    try:
        client = redis.Redis.from_url(config.REDIS_URL, socket_connect_timeout=2)
        redis_ok = bool(client.ping())
    except redis.RedisError:
        redis_ok = False
    return {
        "status": "ok" if redis_ok else "degraded",
        "redis": "up" if redis_ok else "down",
        "azure_key_configured": bool(config.AZURE_SPEECH_KEY),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
