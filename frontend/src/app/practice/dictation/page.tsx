'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { compareDictation, hintPenalty, maskedHint, type DictationScore } from '@/lib/dictation';

type Lesson = { id: string; title: string; level: string; audioUrl: string; mediaType?: 'AUDIO' | 'VIDEO' | 'PODCAST'; sourceName?: string | null; sourceUrl?: string | null; durationSeconds?: number | null; isPremiumOnly: boolean; access: 'AVAILABLE' | 'LOCKED'; sentenceCount: number };
type Sentence = { id: string; startTime: number; endTime: number; textContent: string; wordsJson: { word: string; start: number; end: number }[] };
type Submission = { sentenceId: string; textInput: string; hintCount: number; usedTranscriptHint: boolean };

const DRAFT_KEY = 'shadowtation.dictation.draft';
const FAVORITES_KEY = 'shadowtation.dictation.favorites';
function youtubeId(value: string) { try { const url = new URL(value); if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''; if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0]; if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] || ''; } catch {} return ''; }
function youtubeEmbedUrl(value: string, start: number, end: number) { const id = youtubeId(value); return id ? `https://www.youtube-nocookie.com/embed/${id}?start=${Math.floor(start)}&end=${Math.ceil(end)}&rel=0` : ''; }
function formatTime(value: number) { const seconds = Math.max(0, Math.floor(value)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function hasLoginToken() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    useAuthStore.getState().accessToken ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken')
  );
}

export default function Home() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [mediaFilter, setMediaFilter] = useState('ALL');
  const [showFavorites, setShowFavorites] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [captionsVtt, setCaptionsVtt] = useState('');
  const [useYoutubeCaptions, setUseYoutubeCaptions] = useState(true);
  const [customMediaType, setCustomMediaType] = useState<'AUDIO' | 'VIDEO' | 'PODCAST'>('VIDEO');
  const [customLevel, setCustomLevel] = useState('BEGINNER');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lockedLesson, setLockedLesson] = useState<Lesson | null>(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<'FULL' | 'BLANKS'>('FULL');
  const [hintLevel, setHintLevel] = useState(0);
  const [hintCounts, setHintCounts] = useState<Record<string, number>>({});
  const [hintPenalties, setHintPenalties] = useState<number[]>([0, 5, 10, 20]);
  const [transcriptOn, setTranscriptOn] = useState(false);
  const [transcriptUsed, setTranscriptUsed] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, DictationScore>>({});
  const [debouncedAnswer, setDebouncedAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [fillReset, setFillReset] = useState(0);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const skipUrlLessonRef = useRef(false);

  function clearExpiredToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refresh_token');
    window.dispatchEvent(new Event('shadowtation:auth-change'));
  }

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')); } catch { localStorage.removeItem(FAVORITES_KEY); }
    apiFetch<{ items: Lesson[] }>('/practice/dictation/lessons')
      .then((data) => setLessons(data.items))
      .catch((e: Error) => setError(e.message || 'Không tải được danh sách bài học.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!lessons.length || lesson) return;
    if (skipUrlLessonRef.current) { skipUrlLessonRef.current = false; return; }
    const selectedId = new URLSearchParams(window.location.search).get('lesson');
    const selected = lessons.find((item) => item.id === selectedId);
    if (!selected) return;
    if (selected.access === 'LOCKED') setLockedLesson(selected);
    else setLesson(selected);
  }, [lessons, lesson]);

  function beginLesson(item: Lesson) {
    if (!hasLoginToken()) { setLoginPrompt(true); return; }
    if (item.access === 'LOCKED') { setLockedLesson(item); return; }
    router.push(`/practice/dictation?lesson=${encodeURIComponent(item.id)}`);
    setLesson(item);
    setError('');
  }

  useEffect(() => {
    if (!lesson) return;
    apiFetch<{ sentences: Sentence[]; hintPenalties?: number[] }>(`/lessons/${lesson.id}/sentences`)
      .then((data) => {
        setSentences(data.sentences);
        if (data.hintPenalties?.length === 4) setHintPenalties(data.hintPenalties);
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          try {
            const saved = JSON.parse(draft) as { lessonId: string; answers: Record<string, string>; current: number };
            if (saved.lessonId === lesson.id) { setAnswers(saved.answers); setCurrent(Math.min(saved.current, Math.max(0, data.sentences.length - 1))); }
          } catch { localStorage.removeItem(DRAFT_KEY); }
        }
      })
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) {
          clearExpiredToken();
          skipUrlLessonRef.current = true;
          setLesson(null);
          setLoginPrompt(true);
          router.replace('/practice/dictation');
          return;
        }
        setError(e.message || 'Không tải được nội dung bài.');
      });
  }, [lesson]);

  useEffect(() => {
    if (!lesson) return;
    const syncDraft = async () => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw) as { pendingSubmission?: { lessonId: string; answers: Submission[] } };
        if (draft.pendingSubmission?.lessonId !== lesson.id) return;
        await apiFetch('/practice/dictation/submit', { method: 'POST', body: JSON.stringify(draft.pendingSubmission) });
        localStorage.removeItem(DRAFT_KEY);
        setFinished(true);
      } catch { /* Giữ nguyên bản nháp để đồng bộ lại ở sự kiện online tiếp theo. */ }
    };
    window.addEventListener('online', syncDraft);
    void syncDraft();
    return () => window.removeEventListener('online', syncDraft);
  }, [lesson]);

  const visibleLessons = lessons.filter((item) => (!showFavorites || favorites.includes(item.id)) && (levelFilter === 'ALL' || item.level === levelFilter) && (mediaFilter === 'ALL' || (item.mediaType ?? 'AUDIO') === mediaFilter) && item.title.toLowerCase().includes(search.trim().toLowerCase()));
  const isYoutubeSource = customMediaType === 'VIDEO' && Boolean(youtubeId(youtubeUrl));
  function toggleFavorite(id: string) { setFavorites((old) => { const next = old.includes(id) ? old.filter((value) => value !== id) : [...old, id]; localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); return next; }); }
  async function createCustomLesson() {
    if (importing) return;
    if (!hasLoginToken()) { setLoginPrompt(true); return; }
    setImporting(true);
    setYoutubeError('');
    try {
      const response = await apiFetch<{ item: Lesson }>('/practice/dictation/custom', {
        method: 'POST',
        body: JSON.stringify({ mediaUrl: youtubeUrl.trim(), mediaType: customMediaType, title: youtubeTitle.trim(), level: customLevel, captionsVtt, useYouTubeCaptions: isYoutubeSource && useYoutubeCaptions }),
      });
      setLessons((currentLessons) => [response.item, ...currentLessons.filter((item) => item.id !== response.item.id)]);
      setYoutubeUrl('');
      setYoutubeTitle('');
      setCaptionsVtt('');
      setYoutubeError('');
      beginLesson(response.item);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearExpiredToken();
        setLoginPrompt(true);
        setYoutubeError('');
      } else {
        setYoutubeError((error as Error).message || 'Could not add the lesson. Check the URL, captions, and connection.');
      }
    } finally {
      setImporting(false);
    }
  }

  const sentence = sentences[current];
  const embedVideo = lesson?.mediaType === 'VIDEO' && sentence ? youtubeEmbedUrl(lesson.audioUrl, sentence.startTime, sentence.endTime) : '';
  const answer = sentence ? (answers[sentence.id] ?? '') : '';
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = sentence?.startTime ?? 0; }
    setAudioTime(sentence?.startTime ?? 0);
    setIsPlaying(false);
  }, [sentence?.id, sentence?.startTime]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedAnswer(answer), 150);
    return () => window.clearTimeout(timer);
  }, [answer, sentence?.id]);
  const liveScore = useMemo(() => sentence ? compareDictation(sentence.textContent, debouncedAnswer) : null, [sentence, debouncedAnswer]);
  const completedCount = Object.keys(scores).length;
  const average = completedCount ? Math.round(Object.values(scores).reduce((sum, score) => sum + score.accuracy, 0) / completedCount) : 0;

  function saveAnswer(value: string) {
    if (!sentence || !lesson) return;
    const next = { ...answers, [sentence.id]: value };
    setAnswers(next);
    setScores((old) => { if (!(sentence.id in old)) return old; const copy = { ...old }; delete copy[sentence.id]; return copy; });
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ lessonId: lesson.id, answers: next, current }));
  }

  function replay() {
    const audio = audioRef.current;
    if (!audio || !sentence) return;
    audio.currentTime = sentence.startTime;
    void audio.play();
    setIsPlaying(true);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { void audio.play(); setIsPlaying(true); }
    else { audio.pause(); setIsPlaying(false); }
  }

  function nextHint() {
    setHintLevel((level) => {
      const next = Math.min(3, level + 1);
      if (sentence) setHintCounts((old) => ({ ...old, [sentence.id]: next }));
      return next;
    });
  }

  function confirmSentence() {
    if (!sentence) return;
    const currentScore = compareDictation(sentence.textContent, answer);
    const penalty = hintPenalty(hintLevel, hintPenalties);
    setScores((old) => ({ ...old, [sentence.id]: { ...currentScore, accuracy: Math.max(0, currentScore.accuracy - penalty) } }));
  }

  function retrySentence() {
    if (!sentence) return;
    const next = { ...answers, [sentence.id]: '' };
    setAnswers(next);
    setScores((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setHintCounts((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setTranscriptUsed((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setTranscriptOn(false);
    setFillReset((version) => version + 1);
    setHintLevel(0);
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ lessonId: lesson?.id, answers: next, current }));
  }

  async function finishLesson() {
    if (!lesson || sending) return;
    setSending(true);
    setError('');
    try {
      if (sentences.some((item) => !scores[item.id])) throw new Error('Hãy xác nhận câu trả lời cho tất cả câu trước khi hoàn thành.');
      const submissions: Submission[] = sentences.map((item) => ({
        sentenceId: item.id,
        textInput: answers[item.id] ?? '',
        hintCount: hintCounts[item.id] ?? 0,
        usedTranscriptHint: Boolean(transcriptUsed[item.id]),
      }));
      const savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}');
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...savedDraft, pendingSubmission: { lessonId: lesson.id, answers: submissions } }));
      await apiFetch('/practice/dictation/submit', {
        method: 'POST',
        body: JSON.stringify({ lessonId: lesson.id, answers: submissions }),
      });
      localStorage.removeItem(DRAFT_KEY);
      setFinished(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearExpiredToken();
        setLoginPrompt(true);
      } else {
        setError(`Chưa đồng bộ được kết quả. Bản nháp sẽ tự đồng bộ khi có mạng. ${(e as Error).message}`);
      }
    } finally { setSending(false); }
  }

  function returnToLibrary() {
    skipUrlLessonRef.current = true;
    router.push('/practice/dictation');
    setLesson(null);
    setFinished(false);
    setSentences([]);
    setScores({});
    setAnswers({});
    setError('');
  }

  if (loading) return <main className="dictation-screen min-h-screen bg-slate-50 p-8 text-slate-600">Đang tải bài Dictation…</main>;
  if (!lesson) return (
    <main className="dictation-screen min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10"><Link href="/" className="dictation-home-link">← Về trang chủ</Link><p className="text-sm font-semibold uppercase tracking-[.2em] text-indigo-600">Shadowtation · Dictation</p><h1 className="mt-3 text-4xl font-bold">Chọn bài luyện nghe</h1><p className="mt-2 text-slate-500">Nghe từng câu, chép lại và nhận phản hồi tức thì.</p></header>
        {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
        <div className="dictation-library-tools">
          <div className="library-search" role="search"><Search aria-hidden="true" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bài nghe theo tên..." aria-label="Tìm bài nghe" />{search && <button type="button" className="search-clear" aria-label="Xóa nội dung tìm kiếm" onClick={() => setSearch('')}><X size={17} /></button>}</div>
          <select aria-label="Lọc trình độ" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="ALL">Mọi trình độ</option><option value="BEGINNER">A1–A2 · Cơ bản</option><option value="INTERMEDIATE">B1–B2 · Trung cấp</option><option value="ADVANCED">C1–C2 · Nâng cao</option></select>
          <select aria-label="Lọc loại nội dung" value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value)}><option value="ALL">Audio, video, podcast</option><option value="AUDIO">Audio</option><option value="VIDEO">Video</option><option value="PODCAST">Podcast</option></select>
          <button onClick={() => setShowFavorites((value) => !value)} className={showFavorites ? 'library-filter active' : 'library-filter'}>{showFavorites ? '♥ Đang xem yêu thích' : '♡ Yêu thích'}</button>
        </div>
        <h2 className="library-section-title">Bài học có sẵn <span>{visibleLessons.length}</span></h2>
        <div className="dictation-library-grid">
        {visibleLessons.map((item) => <article key={item.id} className="dictation-lesson-card"><button aria-label={favorites.includes(item.id) ? 'Bỏ yêu thích' : 'Thêm yêu thích'} title={favorites.includes(item.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} className="lesson-heart" onClick={() => toggleFavorite(item.id)}>{favorites.includes(item.id) ? '♥' : '♡'}</button><button onClick={() => beginLesson(item)} className="lesson-select">
            <div className="lesson-badges"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{item.level}</span><span className="media-type-badge">{item.mediaType ?? 'AUDIO'}</span>{item.access === 'LOCKED' ? <span className="premium-badge">🔒 Mở khóa Premium</span> : item.isPremiumOnly && <span className="premium-badge">✦ Premium</span>}</div>
            <h2 className="mt-5 text-xl font-bold">{item.title}</h2><p className="mt-2 text-sm text-slate-500">{item.sentenceCount} câu · Luyện nghe chép chính tả</p>
            <span className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Bắt đầu →</span>
          </button></article>)}
          {!visibleLessons.length && <div className="library-empty">{lessons.length ? 'Không có bài học phù hợp bộ lọc.' : 'Chưa có bài Dictation được xuất bản.'}</div>}
        </div>
        <section className="youtube-import">
          <div>
            <p className="library-kicker">NGUỒN CỦA BẠN</p>
            <h2>Thêm bài học của riêng bạn</h2>
            <p>Dán liên kết nội dung bạn muốn luyện. Với video YouTube, hệ thống có thể lấy phụ đề tiếng Anh công khai tự động; nguồn audio hoặc podcast khác cần phụ đề WebVTT có timestamp.</p>
            <div className="youtube-form mt-6 flex flex-col gap-4">
              <input aria-label="Tên bài học" value={youtubeTitle} onChange={(event) => setYoutubeTitle(event.target.value)} placeholder="Tên bài học (không bắt buộc)" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-indigo-500" />
              <input aria-label="URL media" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=... hoặc URL audio" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-indigo-500" />
              <div className="custom-lesson-options grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-semibold text-slate-700">Loại nguồn<select value={customMediaType} onChange={(event) => setCustomMediaType(event.target.value as 'AUDIO' | 'VIDEO' | 'PODCAST')} className="mt-1 rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-indigo-500"><option value="VIDEO">Video YouTube</option><option value="AUDIO">Audio</option><option value="PODCAST">Podcast</option></select></label>
                <label className="flex flex-col text-sm font-semibold text-slate-700">Trình độ<select value={customLevel} onChange={(event) => setCustomLevel(event.target.value)} className="mt-1 rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-indigo-500"><option value="BEGINNER">A1–A2 · Cơ bản</option><option value="INTERMEDIATE">B1–B2 · Trung cấp</option><option value="ADVANCED">C1–C2 · Nâng cao</option></select></label>
              </div>
              {isYoutubeSource && <div className="youtube-caption-toggle"><label htmlFor="youtube-auto-captions"><input id="youtube-auto-captions" type="checkbox" checked={useYoutubeCaptions} onChange={(event) => setUseYoutubeCaptions(event.target.checked)} /><span><strong>Tự lấy phụ đề tiếng Anh từ YouTube</strong><small>Nếu video có phụ đề công khai, bạn có thể bật transcript trong lúc luyện. Không tải video hay tách âm thanh.</small></span></label>{useYoutubeCaptions && <p>Không thấy phụ đề tự động? Tắt tùy chọn này để tải tệp WebVTT có timestamp.</p>}</div>}
              {(!isYoutubeSource || !useYoutubeCaptions) && <>
                <label htmlFor="custom-vtt-file" className="text-sm font-semibold text-slate-700">Chọn tệp phụ đề .vtt</label>
                <input id="custom-vtt-file" type="file" accept=".vtt,text/vtt" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setCaptionsVtt(await file.text()); }} className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100" />
                <label htmlFor="custom-captions" className="text-sm font-semibold text-slate-700">Hoặc dán phụ đề WebVTT có mốc thời gian</label>
                <textarea id="custom-captions" aria-label="Phụ đề WebVTT có timestamp" value={captionsVtt} onChange={(event) => setCaptionsVtt(event.target.value)} placeholder={'WEBVTT\n\n00:00:00.500 --> 00:00:03.200\nWelcome to our English lesson.\n\n00:00:03.500 --> 00:00:06.800\nToday we are going to talk about daily habits.'} rows={6} className="w-full rounded-xl border border-slate-300 p-3 font-mono text-sm outline-none focus:border-indigo-500" />
                <p className="caption-help text-xs text-slate-500">Cần phụ đề WebVTT có timestamp để chia câu và chấm Dictation. Chỉ tải phụ đề bạn sở hữu hoặc được phép sử dụng.</p>
              </>}
              <button onClick={createCustomLesson} disabled={importing} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">{importing ? 'Đang xử lý phụ đề…' : 'Thêm bài học / Tự học'}</button>
              {youtubeError && <p role="alert" className="text-sm text-rose-600">{youtubeError}</p>}
            </div>
          </div>
        </section>
      </div>
      {lockedLesson && <div role="dialog" aria-modal="true" aria-labelledby="premium-title" className="fixed inset-0 z-20 grid place-items-center bg-slate-950/50 p-5"><section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><p className="text-sm font-bold uppercase tracking-wider text-amber-700">Bài học Premium</p><h2 id="premium-title" className="mt-2 text-2xl font-bold">Mở khóa bài học</h2><p className="mt-3 text-slate-600">“{lockedLesson.title}” dành cho học viên Premium. Nâng cấp để tiếp tục luyện tập.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setLockedLesson(null)} className="rounded-lg border px-4 py-2 font-semibold">Để sau</button><button onClick={() => { window.location.href = '/subscription'; }} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Xem gói Premium</button></div></section></div>}
      {loginPrompt && <LoginRequiredDialog onClose={() => setLoginPrompt(false)} />}
    </main>
  );

  if (finished) return <main className="dictation-screen completion-screen grid min-h-screen place-items-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div><h1 className="mt-5 text-3xl font-bold">Hoàn thành bài luyện tập</h1><p className="mt-2 text-slate-500">{lesson.title}</p><p className="mt-8 text-6xl font-black text-indigo-600">{average}<span className="text-2xl">%</span></p><p className="mt-2 text-slate-500">Điểm trung bình {completedCount} câu đã xác nhận</p><button onClick={returnToLibrary} className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white">Chọn bài khác</button></section></main>;

  return (
    <main className="dictation-screen min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><div className="flex flex-wrap items-center gap-4"><Link href="/" className="dictation-home-link">← Về trang chủ</Link><button onClick={returnToLibrary} className="font-bold text-indigo-700">Danh sách bài</button></div><div className="text-right"><p className="font-bold">{lesson.title}</p><p className="text-xs text-slate-500">{lesson.level}</p></div></div></header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border bg-white p-5"><div className="flex justify-between text-sm"><span className="font-bold">Tiến độ</span><span>{completedCount}/{sentences.length} câu</span></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{ width: `${sentences.length ? completedCount / sentences.length * 100 : 0}%` }} /></div><nav className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-3">{sentences.map((item, i) => <button key={item.id} onClick={() => { setCurrent(i); setHintLevel(0); }} aria-label={`Câu ${i + 1}`} className={`h-10 rounded-lg text-sm font-bold ${current === i ? 'bg-indigo-600 text-white' : scores[item.id] ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</button>)}</nav><div className="mt-6 rounded-xl bg-indigo-50 p-4"><p className="text-xs font-semibold uppercase text-indigo-600">Điểm tạm tính</p><p className="mt-1 text-3xl font-black text-indigo-800">{average}%</p></div></aside>
        <section className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm md:p-8">
          {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
          {!sentence ? <p className="py-12 text-center text-slate-500">Đang tải nội dung bài học…</p> : <>
            <div className="practice-method-tabs" role="tablist" aria-label="Phương pháp luyện tập"><button role="tab" aria-selected="true" className="method-active">Dictation</button><Link role="tab" aria-selected="false" href="/features/uc-04">Shadowing <span className="method-soon">sắp ra mắt</span></Link></div>
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-indigo-600">CÂU {current + 1} / {sentences.length}</p><h1 className="mt-1 text-2xl font-bold">Nghe và nhập nội dung</h1></div><div className="flex rounded-xl bg-slate-100 p-1"><button onClick={() => setMode('FULL')} className={`rounded-lg px-3 py-2 text-sm ${mode === 'FULL' ? 'bg-white font-bold shadow-sm' : ''}`}>Chép cả câu</button><button onClick={() => setMode('BLANKS')} className={`rounded-lg px-3 py-2 text-sm ${mode === 'BLANKS' ? 'bg-white font-bold shadow-sm' : ''}`}>Điền từ khuyết</button></div></div>
            <audio ref={audioRef} src={lesson.mediaType === 'VIDEO' ? undefined : lesson.audioUrl} preload="metadata" onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => { setAudioTime(event.currentTarget.currentTime); if (sentence && event.currentTarget.currentTime >= sentence.endTime) { event.currentTarget.pause(); setIsPlaying(false); } }} onEnded={() => setIsPlaying(false)} onError={() => { if (lesson.mediaType !== 'VIDEO') setError('Audio không tải được. Hãy kiểm tra kết nối và thử tải lại trang.'); }} />
             {lesson.mediaType === 'VIDEO' ? <div className="lesson-video-panel">{embedVideo ? <iframe key={sentence.id} title={`YouTube lesson: ${lesson.title}, sentence ${current + 1}`} src={embedVideo} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <p>Video này cần URL YouTube hợp lệ.</p>}<p>YouTube · Câu {current + 1} · {sentence.startTime.toFixed(1)}s–{sentence.endTime.toFixed(1)}s. Nhấn phát trên video để nghe câu hiện tại.</p><div className="video-sentence-timeline"><div><strong>Timeline theo câu</strong><span>{formatTime(sentence.startTime)} – {formatTime(sentence.endTime)}</span></div><input aria-label="Tua đến câu" type="range" min={0} max={Math.max(sentences.length - 1, 0)} step={1} value={current} onChange={(event) => { setCurrent(Number(event.target.value)); setHintLevel(0); setTranscriptOn(false); }} /><div><span>0:00</span><span>{formatTime(sentences[sentences.length - 1]?.endTime ?? 0)}</span></div></div></div> : (
              <div className="mt-7 rounded-2xl bg-slate-900 p-5 text-white"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-slate-300">Đoạn audio của câu hiện tại</p><p className="mt-1 font-semibold">{sentence.startTime.toFixed(1)}s — {sentence.endTime.toFixed(1)}s</p></div><button onClick={togglePlayback} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-900">{isPlaying ? 'Ⅱ Tạm dừng' : '▶ Phát'}</button></div><div className="audio-seek"><span>{audioTime.toFixed(1)}s</span><input aria-label="Tua audio" type="range" min={sentence.startTime} max={Math.max(sentence.endTime, sentence.startTime + 0.1)} step="0.1" value={Math.min(Math.max(audioTime, sentence.startTime), sentence.endTime)} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setAudioTime(value); }} /><span>{sentence.endTime.toFixed(1)}s</span><span className="audio-duration">/{audioDuration ? `${audioDuration.toFixed(1)}s` : '—'}</span></div><div className="mt-4 flex items-center gap-3 text-sm"><span>Tốc độ</span><button onClick={() => { if (audioRef.current) audioRef.current.playbackRate = 0.75; }}>0.75×</button><button onClick={() => { if (audioRef.current) audioRef.current.playbackRate = 1; }}>1×</button><button onClick={replay}>↻ Nghe lại câu</button></div></div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3"><button onClick={nextHint} disabled={hintLevel >= 3} className="rounded-xl border border-indigo-200 px-4 py-2.5 font-semibold text-indigo-700 disabled:opacity-40">✦ Gợi ý {hintLevel ? `(${hintLevel}/3 · −${hintPenalty(hintLevel, hintPenalties)}đ)` : ''}</button><button onClick={() => { setTranscriptOn((value) => { if (!value && sentence) setTranscriptUsed((old) => ({ ...old, [sentence.id]: true })); return !value; }); }} className={`rounded-xl border px-4 py-2.5 font-semibold ${transcriptOn ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-700'}`}>{transcriptOn ? 'Ẩn transcript' : 'Hiện transcript'}</button><button onClick={retrySentence} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700">Thử lại câu</button><span className="text-xs text-slate-500">Dùng gợi ý sẽ giảm điểm câu.</span></div>
            {hintLevel > 0 && <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Gợi ý cấp {hintLevel}</p><p className="mt-1 font-mono text-lg text-indigo-950">{maskedHint(sentence.textContent, hintLevel)}</p></div>}
            {transcriptOn && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Transcript</p><p className="mt-1 text-amber-950">{sentence.textContent}</p></div>}
            <label htmlFor="dictation-answer" className="mt-7 block text-sm font-bold">Câu trả lời của bạn</label>
            {mode === 'FULL' ? <textarea id="dictation-answer" value={answer} onChange={(event) => saveAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); confirmSentence(); } }} placeholder="Nhập những gì bạn nghe được…" rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-4 text-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /> : <FillBlanks key={`${sentence.id}-${fillReset}`} text={sentence.textContent} value={answer} onChange={saveAnswer} />}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-slate-500">Đối chiếu trực tiếp · cập nhật ngay khi bạn nhập</span>{liveScore && <span className="font-bold text-indigo-700">Độ chính xác hiện tại: {liveScore.accuracy}%</span>}</div>
            {liveScore && <div aria-live="polite" className="mt-4 flex flex-wrap gap-x-2 gap-y-3 rounded-xl bg-slate-50 p-4">{liveScore.tokens.map((token, i) => <span key={`${i}-${token.reference}-${token.submitted}`} className={`rounded px-1.5 py-1 font-medium ${token.kind === 'correct' ? 'bg-emerald-100 text-emerald-800' : token.kind === 'insertion' ? 'bg-rose-200 text-rose-900 line-through' : 'bg-rose-100 text-rose-800'}`} title={token.kind}>{token.kind === 'omission' ? `−${token.reference}` : token.kind === 'insertion' ? `+${token.submitted}` : token.kind === 'substitution' ? `${token.submitted} → ${token.reference}` : token.submitted}</span>)}</div>}
            {scores[sentence.id] && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-900">Đã xác nhận câu · {scores[sentence.id].accuracy}% sau gợi ý</p><p className="mt-1 text-sm text-emerald-800">Điểm này được tính vào kết quả cuối cùng. Chọn “Thử lại câu” để thay bằng lượt mới.</p></div>}
            <div className="mt-6 flex flex-wrap justify-between gap-3"><button onClick={() => { setCurrent((i) => Math.max(0, i - 1)); setHintLevel(0); }} disabled={current === 0} className="rounded-xl border px-5 py-3 font-semibold disabled:opacity-40">← Câu trước</button><div className="flex gap-3"><button onClick={confirmSentence} className="rounded-xl border border-indigo-200 px-5 py-3 font-semibold text-indigo-700">Xác nhận câu</button>{current < sentences.length - 1 ? <button onClick={() => { setCurrent((i) => i + 1); setHintLevel(0); setTranscriptOn(false); }} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Câu tiếp →</button> : <button disabled={sending} onClick={finishLesson} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{sending ? 'Đang lưu…' : 'Hoàn thành bài'}</button>}</div></div>
          </>}
        </section>
      </div>
      {loginPrompt && <LoginRequiredDialog onClose={() => setLoginPrompt(false)} />}
    </main>
  );
}

function LoginRequiredDialog({ onClose }: { onClose: () => void }) {
  return <div role="dialog" aria-modal="true" aria-labelledby="login-required-title" className="fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-5"><section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><p className="text-sm font-bold uppercase tracking-wider text-indigo-700">Tài khoản học viên</p><h2 id="login-required-title" className="mt-2 text-2xl font-bold">Đăng nhập để sử dụng</h2><p className="mt-3 text-slate-600">Bạn cần phải đăng nhập để sử dụng chức năng này. Bạn vẫn có thể xem danh sách bài học trước khi đăng nhập.</p><div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-lg border px-4 py-2 font-semibold">Để sau</button><Link href="/login" className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Đăng nhập</Link></div></section></div>;
}

function FillBlanks({ text, value, onChange }: { text: string; value: string; onChange: (value: string) => void }) {
  const words = text.split(/\s+/);
  const slots = words.map((word, index) => index % 2 === 1);
  const existing = value ? value.split(/\s+/) : [];
  const [slotValues, setSlotValues] = useState<Record<number, string>>(() => Object.fromEntries(words.map((_, index) => [index, slots[index] ? existing[index] ?? '' : ''])));
  return <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 p-4">{words.map((word, index) => slots[index] ? <input key={index} aria-label={`Từ còn thiếu ${Math.floor(index / 2) + 1}`} value={slotValues[index] ?? ''} onChange={(event) => { const nextSlots = { ...slotValues, [index]: event.target.value }; setSlotValues(nextSlots); const complete = words.every((_, i) => !slots[i] || (nextSlots[i] ?? '').trim()); onChange(complete ? words.map((item, i) => slots[i] ? nextSlots[i] : item).join(' ') : ''); }} className="w-28 rounded border-b-2 border-indigo-400 bg-indigo-50 px-2 py-1 outline-none focus:border-indigo-700" /> : <span key={index}>{word}</span>)}</div>;
}
