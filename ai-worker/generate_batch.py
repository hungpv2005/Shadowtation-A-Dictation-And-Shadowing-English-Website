"""Build a seed JSON file from caption files you are authorized to use.

The script sends VTT text to the local AI Worker for timestamp-aware sentence
grouping. It never downloads a media file or fetches captions from YouTube.
"""
import argparse
import json
import os
from pathlib import Path

import httpx
from app import config


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path, help="JSON list containing media metadata and local captionsFile paths")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "backend-api/src/database/seed_lessons.json",
        help="Destination JSON consumed by the NestJS database seed",
    )
    parser.add_argument("--worker", default=os.getenv("AI_WORKER_URL", config.AI_WORKER_URL))
    args = parser.parse_args()

    api_key = os.getenv("INTERNAL_API_KEY", config.INTERNAL_API_KEY)
    if not api_key:
        raise SystemExit("Set INTERNAL_API_KEY to the same value used by the AI Worker.")
    manifest_path = args.manifest.resolve()
    sources = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(sources, list):
        raise SystemExit("The manifest must be a JSON array.")

    lessons = []
    with httpx.Client(timeout=40) as client:
        for source in sources:
            captions_path = (manifest_path.parent / source["captionsFile"]).resolve()
            captions_vtt = captions_path.read_text(encoding="utf-8-sig")
            payload = {
                "title": source.get("title"),
                "mediaUrl": source["mediaUrl"],
                "mediaType": source["mediaType"],
                "captionsVtt": captions_vtt,
            }
            response = client.post(
                f"{args.worker.rstrip('/')}/internal/dictation/prepare",
                headers={"X-Internal-Api-Key": api_key},
                json=payload,
            )
            response.raise_for_status()
            lesson = response.json()
            lesson["level"] = source.get("level", "BEGINNER")
            lessons.append(lesson)
            print(f"Prepared {lesson['title']} ({len(lesson['sentences'])} sentences)")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(lessons, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(lessons)} lessons to {args.output}")


if __name__ == "__main__":
    main()
