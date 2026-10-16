# Dictation content import

Dictation lessons need both playable media and timestamped English captions. The worker groups WebVTT cues into sentence rows; NestJS stores the lesson and its sentences together. YouTube playback uses the embedded player. The worker does not download a video, extract its audio, or scrape captions.

## Import a lesson from the website

1. Start PostgreSQL and apply the database migrations from `backend-api` with `npm run migration:run`.
2. Set the same non-empty `INTERNAL_API_KEY` in the backend and `ai-worker` environments. Set `AI_WORKER_URL` for the backend (for a local worker, `http://localhost:8000`).
3. Start the worker from `ai-worker` with `uvicorn main:app --host 0.0.0.0 --port 8000` and start the NestJS API.
4. Sign in, open **Luyện nghe dictation**, choose a media type, paste its HTTPS URL, and paste WebVTT captions with cue timestamps. Submit to create a private lesson and open it immediately.

Example caption input:

```vtt
WEBVTT

00:00:00.500 --> 00:00:03.200
Welcome to our English lesson.

00:00:03.500 --> 00:00:06.800
Today we are going to talk about daily habits.
```

The endpoint requires a signed-in account. It validates the request, asks the worker to parse the supplied VTT, then persists the lesson and all sentence timestamps in one database transaction. A user's imported lessons are visible only to that account; they are not automatically published to other students.

## Prepare preset lessons in a batch

1. Copy `ai-worker/preset_sources.example.json` to a new manifest and replace the sample fields. `captionsFile` paths are relative to the manifest and should point to WebVTT files you own or are authorized to use.
2. Start the worker and set `INTERNAL_API_KEY` for the command line environment.
3. Run `python ai-worker/generate_batch.py ai-worker/preset_sources.json`. The generated file is `backend-api/src/database/seed_lessons.json`.
4. From `backend-api`, run `npm run seed`. Batch seed rows are public presets and are skipped when the same source URL or title already exists.

The generator accepts multiple entries, so maintain the catalog by adding captioned, reviewed sources to the manifest. A video URL by itself cannot provide transcript or trustworthy word timestamps. If no caption file is available, obtain permission and prepare captions first. LibriVox publishes a catalog API at <https://librivox.org/api/info>; check the recording's reuse terms for the audience's jurisdiction before importing it.

## URL and playback notes

- `VIDEO` accepts YouTube URLs and plays through YouTube's embedded player at each sentence's timestamp.
- `AUDIO` and `PODCAST` accept direct HTTP(S) media URLs supported by the browser. The source must allow playback from the website.
- The WebVTT timestamps are used for sentence playback. Word-level timing is interpolated within each sentence for the existing scorer/review UI; it is not a forced-alignment result.
- Configure a reachable media URL and the matching VTT timestamps. The worker intentionally does not fetch arbitrary URLs, which also avoids server-side requests to private network addresses.
