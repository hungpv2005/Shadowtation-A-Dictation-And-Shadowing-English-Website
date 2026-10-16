"""Shadowtation AI Worker health checks and timestamped caption preparation.

It never downloads media. Captions can be user-supplied WebVTT or publicly
available English captions for a user-submitted YouTube URL.
"""
from datetime import datetime, timezone
import html
import ipaddress
import re
from urllib.parse import parse_qs, urlsplit

import redis
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app import config

app = FastAPI(title="Shadowtation AI Worker", version="0.1.0")

_TIMESTAMP = re.compile(
    r"^(?P<start>(?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+"
    r"(?P<end>(?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})(?:\s+.*)?$"
)
_SENTENCE_END = re.compile(r"[.!?][\"'”’)]*$")


class PrepareDictationRequest(BaseModel):
    mediaUrl: str = Field(min_length=8, max_length=500)
    mediaType: str = Field(min_length=5, max_length=7)
    title: str | None = Field(default=None, max_length=255)
    captionsVtt: str | None = Field(default=None, max_length=1_000_000)
    useYouTubeCaptions: bool = False


def _validate_media_url(value: str, media_type: str) -> str:
    parts = urlsplit(value.strip())
    if parts.scheme not in {"https", "http"} or not parts.hostname or parts.username or parts.password:
        raise HTTPException(status_code=422, detail="Media URL must be a valid HTTP(S) link.")
    hostname = parts.hostname.lower().rstrip(".")
    if hostname in {"localhost", "localhost.localdomain"} or hostname.endswith((".local", ".internal")):
        raise HTTPException(status_code=422, detail="Internal media addresses are not allowed.")
    try:
        if not ipaddress.ip_address(hostname).is_global:
            raise HTTPException(status_code=422, detail="Internal media addresses are not allowed.")
    except ValueError:
        pass
    youtube_hosts = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"}
    if media_type == "VIDEO" and hostname not in youtube_hosts:
        raise HTTPException(status_code=422, detail="Video lessons must use a YouTube URL for embedded playback.")
    return value.strip()


def _youtube_video_id(value: str) -> str | None:
    parts = urlsplit(value)
    hostname = (parts.hostname or "").lower()
    video_id = ""
    if hostname == "youtu.be":
        video_id = parts.path.strip("/").split("/")[0]
    elif hostname in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
        video_id = parse_qs(parts.query).get("v", [""])[0]
        if not video_id:
            match = re.match(r"^/(?:embed|shorts)/([^/?]+)", parts.path)
            video_id = match.group(1) if match else ""
    elif hostname in {"youtube-nocookie.com", "www.youtube-nocookie.com"}:
        match = re.match(r"^/embed/([^/?]+)", parts.path)
        video_id = match.group(1) if match else ""
    return video_id if re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id) else None


def _youtube_vtt(media_url: str) -> str:
    video_id = _youtube_video_id(media_url)
    if not video_id:
        raise HTTPException(status_code=422, detail="Không tìm thấy mã video YouTube hợp lệ trong URL.")
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=["en"])
        snippets = getattr(transcript, "snippets", transcript)
        rows = ["WEBVTT", ""]
        for snippet in snippets:
            if isinstance(snippet, dict):
                start, duration, text = snippet.get("start"), snippet.get("duration"), snippet.get("text", "")
            else:
                start, duration, text = snippet.start, snippet.duration, snippet.text
            if not isinstance(start, (int, float)) or not isinstance(duration, (int, float)):
                continue
            end = start + duration
            rows.extend([f"{_vtt_time(start)} --> {_vtt_time(end)}", str(text).replace("\n", " "), ""])
        result = "\n".join(rows)
        if result == "WEBVTT\n":
            raise ValueError("No caption cues")
        return result
    except HTTPException:
        raise
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail="AI Worker chưa cài youtube-transcript-api. Hãy chạy pip install -r requirements.txt rồi khởi động lại worker.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail="Video không có phụ đề tiếng Anh công khai để lấy tự động. Hãy tắt tùy chọn này và tải/dán WebVTT có timestamp.",
        ) from error


def _vtt_time(value: float) -> str:
    milliseconds = max(0, round(value * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02}.{millis:03}"


def _seconds(value: str) -> float:
    pieces = value.replace(",", ".").split(":")
    if len(pieces) == 2:
        hours = 0
        minutes, seconds = pieces
    elif len(pieces) == 3:
        hours, minutes, seconds = pieces
    else:
        raise ValueError("Invalid VTT timestamp")
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def _append_sentence(sentences: list[dict], fragments: list[str], start: float, end: float) -> None:
    text = re.sub(r"\s+", " ", " ".join(fragments)).strip()
    if text:
        sentences.append({
            "orderIndex": len(sentences) + 1,
            "startTime": round(start, 3),
            "endTime": round(end, 3),
            "text": text,
        })


def _parse_vtt(value: str) -> list[dict]:
    lines = value.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    cues: list[dict] = []
    index = 0
    while index < len(lines):
        match = _TIMESTAMP.match(lines[index].strip())
        if not match:
            index += 1
            continue
        start, end = _seconds(match.group("start")), _seconds(match.group("end"))
        index += 1
        text_lines: list[str] = []
        while index < len(lines) and lines[index].strip():
            text_lines.append(lines[index].strip())
            index += 1
        text = html.unescape(re.sub(r"<[^>]*>", "", " ".join(text_lines)))
        text = re.sub(r"\s+", " ", text).strip()
        if text and 0 <= start < end and end <= 86_400:
            cues.append({"start": start, "end": end, "text": text})
        if len(cues) > 5_000:
            raise HTTPException(status_code=422, detail="VTT contains more than 5,000 cues.")
    if not cues:
        raise HTTPException(status_code=422, detail="No timestamped captions found. Supply a WebVTT (.vtt) file.")

    sentences: list[dict] = []
    current_text: list[str] = []
    current_start = 0.0
    current_end = 0.0
    for cue in cues:
        if current_text and cue["start"] - current_end > 1.8:
            _append_sentence(sentences, current_text, current_start, current_end)
            current_text = []
        if not current_text:
            current_start = cue["start"]
        current_text.append(cue["text"])
        current_end = cue["end"]
        combined = " ".join(current_text)
        if _SENTENCE_END.search(combined) or len(combined) >= 500:
            _append_sentence(sentences, current_text, current_start, current_end)
            current_text = []
    if current_text:
        _append_sentence(sentences, current_text, current_start, current_end)
    return sentences


@app.post("/internal/dictation/prepare")
def prepare_dictation(
    payload: PrepareDictationRequest,
    x_internal_api_key: str | None = Header(default=None),
) -> dict:
    if not config.INTERNAL_API_KEY or x_internal_api_key != config.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if payload.mediaType not in {"AUDIO", "VIDEO", "PODCAST"}:
        raise HTTPException(status_code=422, detail="mediaType must be AUDIO, VIDEO, or PODCAST.")
    media_url = _validate_media_url(payload.mediaUrl, payload.mediaType)
    captions_vtt = (payload.captionsVtt or "").strip()
    if not captions_vtt and payload.useYouTubeCaptions:
        if payload.mediaType != "VIDEO":
            raise HTTPException(status_code=422, detail="Automatic captions are available for YouTube video sources only.")
        captions_vtt = _youtube_vtt(media_url)
    if not captions_vtt:
        raise HTTPException(status_code=422, detail="No timestamped captions found. Supply a WebVTT (.vtt) file.")
    sentences = _parse_vtt(captions_vtt)
    if len(sentences) > 1_000:
        raise HTTPException(status_code=422, detail="Lesson contains more than 1,000 sentences.")
    title = (payload.title or "").strip() or urlsplit(media_url).hostname or "Dictation lesson"
    return {
        "title": title[:255],
        "mediaUrl": media_url,
        "mediaType": payload.mediaType,
        "duration": max(sentence["endTime"] for sentence in sentences),
        "sentences": sentences,
    }


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
