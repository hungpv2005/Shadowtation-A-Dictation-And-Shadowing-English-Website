'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { compareDictation, hintPenalty, maskedHint, type DictationScore } from '@/lib/dictation';
import { MediaDictationPlayer } from './media-dictation-player';

type Lesson = { id: string; title: string; level: string; audioUrl?: string | null; mediaType?: 'AUDIO' | 'VIDEO' | 'PODCAST'; sourceName?: string | null; sourceUrl?: string | null; durationSeconds?: number | null; isPremiumOnly: boolean; access: 'AVAILABLE' | 'LOCKED'; sentenceCount: number };
type Sentence = { id: string; startTime: number; endTime: number; textContent: string; wordsJson: { word: string; start: number; end: number }[] };
type Submission = { sentenceId: string; textInput: string; hintCount: number; usedTranscriptHint: boolean };
type LessonDraft = {
  lessonId: string; answers: Record<string, string>; current: number;
  hintCounts: Record<string, number>; transcriptUsed: Record<string, boolean>;
  scores: Record<string, DictationScore>; mode: 'FULL' | 'BLANKS'; savedAt: string;
  isCompleted?: boolean; totalScore?: number | null;
};
type RecentLesson = { lessonId: string; lastOpenedAt: string; status: 'IN_PROGRESS' | 'COMPLETED' };

const DRAFT_KEY = 'shadowtation.dictation.draft';
const PENDING_KEY = 'shadowtation.dictation.pending';
const FAVORITES_KEY = 'shadowtation.dictation.favorites';
const RECENT_KEY = 'shadowtation.dictation.recent';
const lessonDraftKey = (lessonId: string) => `${DRAFT_KEY}:${lessonId}`;
function readLessonDraft(lessonId: string): LessonDraft | null {
  try {
    const raw = localStorage.getItem(lessonDraftKey(lessonId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<LessonDraft>;
    if (draft.lessonId !== lessonId || !draft.answers || !Number.isFinite(draft.current)) return null;
    return {
      lessonId,
      answers: draft.answers,
      current: draft.current!,
      hintCounts: draft.hintCounts ?? {},
      transcriptUsed: draft.transcriptUsed ?? {},
      scores: draft.scores ?? {},
      mode: draft.mode === 'BLANKS' ? 'BLANKS' : 'FULL',
      savedAt: draft.savedAt ?? new Date(0).toISOString(),
      isCompleted: draft.isCompleted === true,
      totalScore: Number.isFinite(draft.totalScore) ? draft.totalScore! : null,
    };
  } catch { return null; }
}
function readLessonDrafts(): LessonDraft[] {
  const drafts: LessonDraft[] = [];
  const prefix = `${DRAFT_KEY}:`;
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const draft = readLessonDraft(key.slice(prefix.length));
      if (draft) drafts.push(draft);
    }
  } catch { return drafts; }
  return drafts.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
function readRecentLessons(): RecentLesson[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentLesson[];
    return Array.isArray(value) ? value.filter((item) => item?.lessonId && item?.lastOpenedAt) : [];
  } catch { return []; }
}
function youtubeId(value: string) { try { const url = new URL(value); if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''; if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0]; if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] || ''; } catch {} return ''; }
function formatDuration(seconds?: number | null) { if (!seconds || seconds < 1) return 'Chưa rõ thời lượng'; const total = Math.floor(seconds); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`; }
function mediaTypeLabel(type?: Lesson['mediaType']) { if (type === 'VIDEO') return '▶ Video YouTube'; if (type === 'PODCAST') return '◉ Podcast'; return '♫ Audio'; }
function hasLoginToken() { return typeof window !== 'undefined' && Boolean(localStorage.getItem('access_token') ?? localStorage.getItem('accessToken')); }

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLessonId = searchParams.get('lesson');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<LessonDraft[]>([]);
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
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
  const [hasCompleted, setHasCompleted] = useState(false);
  const [completionScore, setCompletionScore] = useState<number | null>(null);
  const [completionSyncPending, setCompletionSyncPending] = useState(false);
  const [debouncedAnswer, setDebouncedAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [resumeSelection, setResumeSelection] = useState<{ lesson: Lesson; fromLibrary: boolean; draft: LessonDraft } | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [fillReset, setFillReset] = useState(0);
  const openedFromLibraryRef = useRef(false);
  const isLeavingLessonRef = useRef(false);
  const activeLessonIdRef = useRef<string | null>(null);
  const latestDraftRef = useRef<LessonDraft | null>(null);
  const beginLessonRef = useRef<(item: Lesson, fromLibrary?: boolean) => void>(() => {});

  useEffect(() => {
    return () => { activeLessonIdRef.current = null; };
  }, []);

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')); } catch { localStorage.removeItem(FAVORITES_KEY); }
    setSavedDrafts(readLessonDrafts());
    setRecentLessons(readRecentLessons());
    apiFetch<{ items: Lesson[] }>('/practice/dictation/lessons')
      .then((data) => setLessons(data.items))
      .catch((e: Error) => setError(e.message || 'Không tải được danh sách bài học.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!lessons.length || lesson || !selectedLessonId || isLeavingLessonRef.current || resumeSelection?.lesson.id === selectedLessonId) return;
    const selected = lessons.find((item) => item.id === selectedLessonId);
    if (!selected) return;
    if (selected.access === 'LOCKED') setLockedLesson(selected);
    else beginLessonRef.current(selected, false);
  }, [lessons, lesson, selectedLessonId, resumeSelection]);

  function beginLesson(item: Lesson, fromLibrary = true) {
    if (!hasLoginToken()) { setLoginPrompt(true); return; }
    if (item.access === 'LOCKED') { setLockedLesson(item); return; }
    const savedDraft = readLessonDraft(item.id);
    if (savedDraft) {
      setResumeSelection({ lesson: item, fromLibrary, draft: savedDraft });
      return;
    }
    startLesson(item, fromLibrary);
  }

  function resumeSavedLesson() {
    if (!resumeSelection) return;
    const { lesson: selected, fromLibrary } = resumeSelection;
    setResumeSelection(null);
    startLesson(selected, fromLibrary);
  }

  function restartSavedLesson() {
    if (!resumeSelection) return;
    const { lesson: selected, fromLibrary } = resumeSelection;
    localStorage.removeItem(lessonDraftKey(selected.id));
    const pendingRaw = localStorage.getItem(PENDING_KEY);
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as { lessonId?: string };
        if (pending.lessonId === selected.id) localStorage.removeItem(PENDING_KEY);
      } catch { localStorage.removeItem(PENDING_KEY); }
    }
    const legacyRaw = localStorage.getItem(DRAFT_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as { lessonId?: string };
        if (legacy.lessonId === selected.id) localStorage.removeItem(DRAFT_KEY);
      } catch { localStorage.removeItem(DRAFT_KEY); }
    }
    setSavedDrafts(readLessonDrafts());
    setResumeSelection(null);
    startLesson(selected, fromLibrary);
  }

  function startLesson(item: Lesson, fromLibrary: boolean) {
    openedFromLibraryRef.current = fromLibrary;
    isLeavingLessonRef.current = false;
    activeLessonIdRef.current = item.id;
    if (fromLibrary) router.push(`/practice/dictation?lesson=${encodeURIComponent(item.id)}`);
    setDraftReady(false);
    setSentences([]);
    setAnswers({});
    setCurrent(0);
    setHintLevel(0);
    setHintCounts({});
    setTranscriptOn(false);
    setTranscriptUsed({});
    setScores({});
    setHasCompleted(false);
    setCompletionScore(null);
    setCompletionSyncPending(false);
    setMode('FULL');
    setFinished(false);
    setLesson(item);
    setError('');
    setRecentLesson(item.id, 'IN_PROGRESS');
  }

  beginLessonRef.current = beginLesson;

  function setRecentLesson(lessonId: string, status: RecentLesson['status']) {
    const next: RecentLesson[] = [{ lessonId, lastOpenedAt: new Date().toISOString(), status }, ...readRecentLessons().filter((item) => item.lessonId !== lessonId)].slice(0, 12);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* Keep the active lesson usable if storage is full. */ }
    setRecentLessons(next);
  }

  useEffect(() => {
    if (!lesson) { setDraftReady(false); return; }
    let cancelled = false;
    setDraftReady(false);
    apiFetch<{ sentences: Sentence[]; hintPenalties?: number[] }>(`/lessons/${lesson.id}/sentences`)
      .then((data) => {
        if (cancelled) return;
        if (!data.sentences.length || data.sentences.some((item) => !item.textContent?.trim() || !Number.isFinite(item.startTime) || !Number.isFinite(item.endTime) || item.endTime <= item.startTime)) {
          throw new Error('Bài học chưa có transcript hoặc mốc thời gian hợp lệ. Quay lại danh sách để chọn bài khác.');
        }
        setSentences(data.sentences);
        if (data.hintPenalties?.length === 4) setHintPenalties(data.hintPenalties);
        const legacyRaw = localStorage.getItem(DRAFT_KEY);
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw) as { lessonId?: string; answers?: Record<string, string>; current?: number; pendingSubmission?: { lessonId?: string; answers?: Submission[] } };
            if (legacy.pendingSubmission?.lessonId === lesson.id) localStorage.setItem(PENDING_KEY, JSON.stringify(legacy.pendingSubmission));
            if (legacy.lessonId === lesson.id && !localStorage.getItem(lessonDraftKey(lesson.id))) {
              localStorage.setItem(lessonDraftKey(lesson.id), JSON.stringify(legacy));
            }
            if (legacy.lessonId === lesson.id || legacy.pendingSubmission?.lessonId === lesson.id) localStorage.removeItem(DRAFT_KEY);
          } catch { localStorage.removeItem(DRAFT_KEY); }
        }
        const saved = readLessonDraft(lesson.id);
        if (saved) {
          const savedCurrent = Math.min(saved.current, Math.max(0, data.sentences.length - 1));
          setAnswers(saved.answers);
          setCurrent(savedCurrent);
          setHintCounts(saved.hintCounts);
          setTranscriptUsed(saved.transcriptUsed);
          setScores(saved.scores);
          setMode(saved.mode);
          setHasCompleted(saved.isCompleted === true);
          setCompletionScore(saved.isCompleted === true && Number.isFinite(saved.totalScore)
            ? saved.totalScore!
            : saved.isCompleted === true
              ? Math.round(Object.values(saved.scores).reduce((sum, score) => sum + score.accuracy, 0) / Math.max(Object.keys(saved.scores).length, 1))
              : null);
          setHintLevel(saved.hintCounts[data.sentences[savedCurrent]?.id] ?? 0);
        }
        setDraftReady(true);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          isLeavingLessonRef.current = true;
          openedFromLibraryRef.current = false;
          activeLessonIdRef.current = null;
          setLesson(null);
          setLoginPrompt(true);
          router.replace('/practice/dictation');
          return;
        }
        setError(e.message || 'Không tải được nội dung bài.');
      });
    return () => { cancelled = true; };
  }, [lesson, router]);

  useEffect(() => {
    if (!lesson) return;
    const syncDraft = async () => {
      try {
        const legacyRaw = localStorage.getItem(DRAFT_KEY);
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw) as { pendingSubmission?: { lessonId?: string; answers?: Submission[] } };
            if (legacy.pendingSubmission?.lessonId === lesson.id) {
              localStorage.setItem(PENDING_KEY, JSON.stringify(legacy.pendingSubmission));
              localStorage.removeItem(DRAFT_KEY);
            }
          } catch { localStorage.removeItem(DRAFT_KEY); }
        }
        const raw = localStorage.getItem(PENDING_KEY);
        if (!raw) return;
        const pending = JSON.parse(raw) as { lessonId: string; answers: Submission[] };
        if (pending.lessonId !== lesson.id) return;
        const result = await apiFetch<{ overallScore?: number; results?: Array<{ sentenceId: string; accuracyScore: number; wer: number; diff: Array<{ reference: string; submitted: string; operation: string }> }> }>('/practice/dictation/submit', { method: 'POST', body: JSON.stringify(pending) });
        if (localStorage.getItem(PENDING_KEY) !== raw) return;
        const totalScore = Number.isFinite(result.overallScore) ? result.overallScore! : 0;
        const previous = readLessonDraft(lesson.id) ?? latestDraftRef.current;
        const resultScores = Object.fromEntries((result.results ?? []).map((item) => [item.sentenceId, {
          accuracy: item.accuracyScore,
          wer: item.wer,
          tokens: item.diff.map((token) => ({
            reference: token.reference,
            submitted: token.submitted,
            kind: token.operation === 'MATCH' ? 'correct' : token.operation.toLowerCase() as DictationScore['tokens'][number]['kind'],
          })),
        }]));
        const completedDraft: LessonDraft = previous ? {
          ...previous, scores: Object.keys(resultScores).length ? resultScores : previous.scores,
          isCompleted: true, totalScore, savedAt: new Date().toISOString(),
        } : {
          lessonId: lesson.id,
          answers: Object.fromEntries(pending.answers.map((item) => [item.sentenceId, item.textInput])),
          current: 0,
          hintCounts: Object.fromEntries(pending.answers.map((item) => [item.sentenceId, item.hintCount])),
          transcriptUsed: Object.fromEntries(pending.answers.map((item) => [item.sentenceId, item.usedTranscriptHint])),
          scores: resultScores,
          mode: 'FULL', savedAt: new Date().toISOString(), isCompleted: true, totalScore,
        };
        localStorage.removeItem(PENDING_KEY);
        localStorage.setItem(lessonDraftKey(lesson.id), JSON.stringify(completedDraft));
        setSavedDrafts(readLessonDrafts());
        setRecentLesson(lesson.id, 'COMPLETED');
        if (!isLeavingLessonRef.current && activeLessonIdRef.current === lesson.id) {
          latestDraftRef.current = completedDraft;
          setHasCompleted(true);
          setCompletionScore(totalScore);
          setCompletionSyncPending(false);
        }
      } catch { /* Giữ nguyên bản nháp để đồng bộ lại ở sự kiện online tiếp theo. */ }
    };
    window.addEventListener('online', syncDraft);
    void syncDraft();
    return () => window.removeEventListener('online', syncDraft);
  }, [lesson]);

  const visibleLessons = lessons.filter((item) => (!showFavorites || favorites.includes(item.id)) && (levelFilter === 'ALL' || item.level === levelFilter) && (mediaFilter === 'ALL' || (item.mediaType ?? 'AUDIO') === mediaFilter) && item.title.toLowerCase().includes(search.trim().toLowerCase()));
  const recentLibraryItems = useMemo(() => {
    const recentById = new Map<string, RecentLesson>();
    recentLessons.forEach((item) => recentById.set(item.lessonId, item));
    savedDrafts.forEach((draft) => recentById.set(draft.lessonId, { lessonId: draft.lessonId, lastOpenedAt: draft.savedAt, status: draft.isCompleted ? 'COMPLETED' : 'IN_PROGRESS' }));
    return Array.from(recentById.values())
      .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
      .flatMap((recent) => {
        const item = lessons.find((candidate) => candidate.id === recent.lessonId);
        if (!item) return [];
        return [{ recent, lesson: item, draft: savedDrafts.find((candidate) => candidate.lessonId === item.id) ?? null }];
      });
  }, [lessons, recentLessons, savedDrafts]);
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
  const answer = sentence ? (answers[sentence.id] ?? '') : '';
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedAnswer(answer), 150);
    return () => window.clearTimeout(timer);
  }, [answer, sentence?.id]);
  const liveScore = useMemo(() => sentence?.textContent?.trim() ? compareDictation(sentence.textContent, debouncedAnswer) : null, [sentence, debouncedAnswer]);
  const completedCount = Object.keys(scores).length;
  const average = completedCount ? Math.round(Object.values(scores).reduce((sum, score) => sum + score.accuracy, 0) / completedCount) : 0;
  const activeDraft = useMemo<LessonDraft | null>(() => lesson && sentences.length && draftReady && !finished ? {
    lessonId: lesson.id, answers, current, hintCounts, transcriptUsed, scores, mode, savedAt: new Date().toISOString(),
    isCompleted: hasCompleted, totalScore: hasCompleted ? completionScore : null,
  } : null, [lesson, sentences.length, draftReady, finished, answers, current, hintCounts, transcriptUsed, scores, mode, hasCompleted, completionScore]);
  latestDraftRef.current = activeDraft;

  useEffect(() => {
    if (!activeDraft) return;
    try {
      localStorage.setItem(lessonDraftKey(activeDraft.lessonId), JSON.stringify(activeDraft));
      setSavedDrafts(readLessonDrafts());
    } catch { setError('Không thể tự lưu tiến trình trên thiết bị này. Hãy kiểm tra dung lượng lưu trữ trình duyệt.'); }
  }, [activeDraft]);

  useEffect(() => {
    const persistOnPageExit = () => {
      const draft = latestDraftRef.current;
      if (!draft) return;
      try { localStorage.setItem(lessonDraftKey(draft.lessonId), JSON.stringify(draft)); } catch { /* The regular autosave already reported storage errors. */ }
    };
    window.addEventListener('pagehide', persistOnPageExit);
    window.addEventListener('beforeunload', persistOnPageExit);
    return () => {
      persistOnPageExit();
      window.removeEventListener('pagehide', persistOnPageExit);
      window.removeEventListener('beforeunload', persistOnPageExit);
    };
  }, []);

  function saveAnswer(value: string) {
    if (!sentence || !lesson || sending) return;
    invalidateCompletedResult();
    const next = { ...answers, [sentence.id]: value };
    setAnswers(next);
    setError('');
    setScores((old) => { if (!(sentence.id in old)) return old; const copy = { ...old }; delete copy[sentence.id]; return copy; });
  }

  function nextHint() {
    if (!sentence || hintLevel >= 3 || scores[sentence.id]) return;
    setHintLevel((level) => {
      const next = Math.min(3, level + 1);
      if (sentence) setHintCounts((old) => ({ ...old, [sentence.id]: next }));
      return next;
    });
  }

  function toggleTranscript() {
    if (!sentence || (!transcriptOn && scores[sentence.id])) return;
    setTranscriptOn((visible) => {
      if (!visible) setTranscriptUsed((old) => ({ ...old, [sentence.id]: true }));
      return !visible;
    });
  }

  function confirmSentence() {
    if (!sentence || sending) return;
    if (!answer.trim()) { setError('Nhập câu trả lời trước khi xác nhận câu này.'); return; }
    invalidateCompletedResult();
    const currentScore = compareDictation(sentence.textContent, answer);
    const penalty = hintPenalty(hintLevel, hintPenalties);
    setScores((old) => ({ ...old, [sentence.id]: { ...currentScore, accuracy: Math.max(0, currentScore.accuracy - penalty) } }));
    setError('');
  }

  function retrySentence() {
    if (!sentence || sending) return;
    invalidateCompletedResult();
    const next = { ...answers, [sentence.id]: '' };
    setAnswers(next);
    setScores((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setHintCounts((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setTranscriptUsed((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setTranscriptOn(false);
    setFillReset((version) => version + 1);
    setHintLevel(0);
  }

  function invalidateCompletedResult() {
    if (!hasCompleted) return;
    setHasCompleted(false);
    setCompletionScore(null);
    setCompletionSyncPending(false);
    if (!lesson) return;
    const pendingRaw = localStorage.getItem(PENDING_KEY);
    if (!pendingRaw) return;
    try {
      const pending = JSON.parse(pendingRaw) as { lessonId?: string };
      if (pending.lessonId === lesson.id) localStorage.removeItem(PENDING_KEY);
    } catch { localStorage.removeItem(PENDING_KEY); }
  }

  function persistCompletedResult(totalScore: number) {
    if (!lesson) return;
    const completedDraft: LessonDraft = {
      lessonId: lesson.id, answers, current, hintCounts, transcriptUsed, scores, mode,
      savedAt: new Date().toISOString(), isCompleted: true, totalScore,
    };
    latestDraftRef.current = completedDraft;
    setHasCompleted(true);
    setCompletionScore(totalScore);
    setRecentLesson(lesson.id, 'COMPLETED');
    try {
      localStorage.setItem(lessonDraftKey(lesson.id), JSON.stringify(completedDraft));
      setSavedDrafts(readLessonDrafts());
    } catch {
      setError('Điểm đã tính nhưng không thể lưu vào trình duyệt. Hãy kiểm tra dung lượng lưu trữ.');
    }
  }

  function updateStoredCompletedScore(lessonId: string, totalScore: number) {
    const previous = readLessonDraft(lessonId);
    if (!previous) return;
    const completedDraft = { ...previous, isCompleted: true, totalScore, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(lessonDraftKey(lessonId), JSON.stringify(completedDraft));
      setSavedDrafts(readLessonDrafts());
    } catch { /* The local score was already saved before the request. */ }
  }

  async function finishLesson() {
    if (!lesson || sending) return;
    const firstUnconfirmed = sentences.findIndex((item) => !scores[item.id]);
    if (firstUnconfirmed >= 0) {
      setCurrent(firstUnconfirmed);
      setHintLevel(hintCounts[sentences[firstUnconfirmed]?.id] ?? 0);
      setError(`Còn ${sentences.filter((item) => !scores[item.id]).length} câu chưa được xác nhận. Hãy kiểm tra và xác nhận từng câu trước khi nhận điểm tổng.`);
      return;
    }
    setSending(true);
    setError('');
    const submittedLessonId = lesson.id;
    try {
      const submissions: Submission[] = sentences.map((item) => ({
        sentenceId: item.id,
        textInput: answers[item.id] ?? '',
        hintCount: hintCounts[item.id] ?? 0,
        usedTranscriptHint: Boolean(transcriptUsed[item.id]),
      }));
      const localTotalScore = average;
      localStorage.setItem(PENDING_KEY, JSON.stringify({ lessonId: lesson.id, answers: submissions }));
      persistCompletedResult(localTotalScore);
      const result = await apiFetch<{ overallScore?: number }>('/practice/dictation/submit', {
        method: 'POST',
        body: JSON.stringify({ lessonId: lesson.id, answers: submissions }),
      });
      const pendingRaw = localStorage.getItem(PENDING_KEY);
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw) as { lessonId?: string };
          if (pending.lessonId === submittedLessonId) localStorage.removeItem(PENDING_KEY);
        } catch { localStorage.removeItem(PENDING_KEY); }
      }
      const finalScore = Number.isFinite(result.overallScore) ? result.overallScore! : localTotalScore;
      if (!isLeavingLessonRef.current && activeLessonIdRef.current === submittedLessonId) {
        persistCompletedResult(finalScore);
        setCompletionSyncPending(false);
        setFinished(true);
      } else {
        updateStoredCompletedScore(submittedLessonId, finalScore);
      }
    } catch (e) {
      if (!isLeavingLessonRef.current && activeLessonIdRef.current === submittedLessonId) {
        if (e instanceof ApiError && e.status === 401) setLoginPrompt(true);
        setCompletionSyncPending(true);
        setError(`Điểm tạm thời đã lưu trên thiết bị; kết quả sẽ tự đồng bộ khi kết nối được máy chủ. ${(e as Error).message}`);
        setFinished(true);
      }
    } finally { setSending(false); }
  }

  function persistLatestDraft() {
    const draft = latestDraftRef.current;
    if (!draft) return;
    try {
      localStorage.setItem(lessonDraftKey(draft.lessonId), JSON.stringify(draft));
      setSavedDrafts(readLessonDrafts());
    } catch {
      setError('Không thể tự lưu tiến trình trên thiết bị này. Hãy kiểm tra dung lượng lưu trữ trình duyệt.');
    }
  }

  function clearActiveLesson() {
    activeLessonIdRef.current = null;
    setLesson(null);
    setFinished(false);
    setHasCompleted(false);
    setCompletionScore(null);
    setCompletionSyncPending(false);
    setSentences([]);
    setScores({});
    setAnswers({});
    setHintCounts({});
    setTranscriptUsed({});
    setCurrent(0);
    setHintLevel(0);
    setDraftReady(false);
  }

  function returnToLibrary() {
    persistLatestDraft();
    openedFromLibraryRef.current = false;
    isLeavingLessonRef.current = true;
    setResumeSelection(null);
    router.replace('/practice/dictation');
    clearActiveLesson();
  }

  function restartCurrentLesson() {
    if (!lesson) return;
    localStorage.removeItem(lessonDraftKey(lesson.id));
    const pendingRaw = localStorage.getItem(PENDING_KEY);
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as { lessonId?: string };
        if (pending.lessonId === lesson.id) localStorage.removeItem(PENDING_KEY);
      } catch { localStorage.removeItem(PENDING_KEY); }
    }
    setAnswers({});
    setCurrent(0);
    setHintLevel(0);
    setHintCounts({});
    setTranscriptOn(false);
    setTranscriptUsed({});
    setScores({});
    setMode('FULL');
    setHasCompleted(false);
    setCompletionScore(null);
    setCompletionSyncPending(false);
    setDraftReady(true);
    setFinished(false);
    setRecentLesson(lesson.id, 'IN_PROGRESS');
    setSavedDrafts(readLessonDrafts());
  }

  function selectSentence(index: number) {
    setCurrent(index);
    setHintLevel(hintCounts[sentences[index]?.id] ?? 0);
    setTranscriptOn(false);
    setError('');
  }

  function seekToTimeAndSelectSentence(time: number) {
    if (!sentences.length) return time;
    let index = sentences.findIndex((item) => time >= item.startTime && time < item.endTime);
    let targetTime = time;
    if (index < 0) {
      const nextIndex = sentences.findIndex((item) => item.startTime > time);
      if (nextIndex >= 0) {
        index = nextIndex;
        targetTime = sentences[nextIndex].startTime;
      } else {
        index = sentences.length - 1;
        targetTime = Math.max(sentences[index].startTime, sentences[index].endTime - 0.05);
      }
    }
    if (index !== current) selectSentence(index);
    return targetTime;
  }

  function goBackFromLibrary() {
    router.replace('/');
  }

  useEffect(() => {
    if (!lesson) return;
    const handleBackNavigation = () => {
      if (isLeavingLessonRef.current) return;
      persistLatestDraft();
      isLeavingLessonRef.current = true;
      openedFromLibraryRef.current = false;
      clearActiveLesson();
    };
    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, [lesson]);

  useEffect(() => {
    if (!lesson || finished) return;
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const isTyping = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
      const isControl = Boolean(target?.closest('button, a, [role="button"]'));
      if (event.repeat) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        returnToLibrary();
        return;
      }
      if (isTyping || isControl || event.metaKey || event.ctrlKey) return;
      if (event.altKey) {
        const shortcut = event.key.toLowerCase();
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          selectSentence(Math.max(0, Math.min(sentences.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))));
        } else if (shortcut === 'm') {
          event.preventDefault();
          document.querySelector<HTMLButtonElement>('.media-play-button')?.click();
        } else if (shortcut === 'r') {
          event.preventDefault();
          document.querySelector<HTMLButtonElement>('.media-replay-button')?.click();
        } else if (shortcut === 't') {
          event.preventDefault();
          retrySentence();
        } else if (shortcut === 'g') {
          event.preventDefault();
          nextHint();
        } else if (shortcut === 'p') {
          event.preventDefault();
          toggleTranscript();
        } else return;
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmSentence();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [lesson, finished, current, sentences, answers, scores, hintLevel, hintCounts, transcriptUsed, transcriptOn]);

  if (loading) return <main className="dictation-screen min-h-screen bg-slate-50 p-8 text-slate-600">Đang tải bài Dictation…</main>;
  if (!lesson) return (
    <main className="dictation-screen min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10"><button type="button" onClick={goBackFromLibrary} className="dictation-back-link">← Quay lại</button><p className="text-sm font-semibold uppercase tracking-[.2em] text-indigo-600">Shadowtation · Dictation</p><h1 className="mt-3 text-4xl font-bold">Chọn bài luyện nghe</h1><p className="mt-2 text-slate-500">Nghe từng câu, chép lại và nhận phản hồi tức thì.</p></header>
        {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
        <div className="dictation-library-tools">
          <div className="library-search" role="search"><Search aria-hidden="true" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bài nghe theo tên..." aria-label="Tìm bài nghe" />{search && <button type="button" className="search-clear" aria-label="Xóa nội dung tìm kiếm" onClick={() => setSearch('')}><X size={17} /></button>}</div>
          <select aria-label="Lọc trình độ" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="ALL">Mọi trình độ</option><option value="BEGINNER">A1–A2 · Cơ bản</option><option value="INTERMEDIATE">B1–B2 · Trung cấp</option><option value="ADVANCED">C1–C2 · Nâng cao</option></select>
          <select aria-label="Lọc loại nội dung" value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value)}><option value="ALL">Audio, video, podcast</option><option value="AUDIO">Audio</option><option value="VIDEO">Video</option><option value="PODCAST">Podcast</option></select>
          <button onClick={() => setShowFavorites((value) => !value)} className={showFavorites ? 'library-filter active' : 'library-filter'}>{showFavorites ? '♥ Đang xem yêu thích' : '♡ Yêu thích'}</button>
        </div>
        {recentLibraryItems.length > 0 && <section className="dictation-recent-section" aria-labelledby="recent-lessons-title">
          <h2 id="recent-lessons-title" className="library-section-title">Bài đang luyện dở &amp; học gần đây <span>{recentLibraryItems.length}</span></h2>
          <p className="mb-4 text-sm text-slate-600">Tiến trình mới nhất được tự lưu trên thiết bị này. Chọn bài để tiếp tục hoặc làm lại từ đầu.</p>
          <div className="dictation-library-grid">
            {recentLibraryItems.map(({ lesson: item, recent, draft }) => <article key={`recent-${item.id}`} className="dictation-lesson-card recent-lesson-card">
              <button onClick={() => beginLesson(item)} className="lesson-select">
                <div className="lesson-badges"><span className={`recent-status-badge ${draft?.isCompleted || recent.status === 'COMPLETED' ? 'completed' : draft ? 'in-progress' : ''}`}>{draft?.isCompleted || recent.status === 'COMPLETED' ? 'Đã hoàn thành' : draft ? 'Đang luyện dở' : 'Đã mở gần đây'}</span><span className={`media-type-badge media-type-${(item.mediaType ?? 'AUDIO').toLowerCase()}`}>{mediaTypeLabel(item.mediaType)}</span></div>
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{draft ? `${Object.keys(draft.scores).length}/${item.sentenceCount} câu đã xác nhận · ${item.sentenceCount ? Math.round(Object.keys(draft.scores).length / item.sentenceCount * 100) : 0}% hoàn thành` : `${formatDuration(item.durationSeconds)} · ${item.sentenceCount} câu`}</p>
                {draft?.isCompleted && typeof draft.totalScore === 'number' && <p className="mt-2 text-sm font-bold text-indigo-700">Điểm tổng: {draft.totalScore}/100</p>}
                <span className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">{draft ? 'Mở tiến trình →' : 'Luyện lại →'}</span>
              </button>
            </article>)}
          </div>
        </section>}
        <h2 className="library-section-title">Bài học có sẵn <span>{visibleLessons.length}</span></h2>
        <div className="dictation-library-grid">
        {visibleLessons.map((item) => <article key={item.id} className="dictation-lesson-card"><button aria-label={favorites.includes(item.id) ? 'Bỏ yêu thích' : 'Thêm yêu thích'} title={favorites.includes(item.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} className="lesson-heart" onClick={() => toggleFavorite(item.id)}>{favorites.includes(item.id) ? '♥' : '♡'}</button><button onClick={() => beginLesson(item)} className="lesson-select">
            <div className="lesson-badges"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{item.level}</span><span className={`media-type-badge media-type-${(item.mediaType ?? 'AUDIO').toLowerCase()}`}>{mediaTypeLabel(item.mediaType)}</span>{item.access === 'LOCKED' ? <span className="premium-badge">🔒 Mở khóa Premium</span> : item.isPremiumOnly && <span className="premium-badge">✦ Premium</span>}</div>
            <h2 className="mt-5 text-xl font-bold">{item.title}</h2><p className="mt-2 text-sm text-slate-500">{formatDuration(item.durationSeconds)} · {item.sentenceCount} câu · Có transcript tiếng Anh</p><p className="lesson-source-name">Nguồn: {item.sourceName || 'Bài học có sẵn'}</p>
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
      {resumeSelection && <ResumeLessonDialog lessonTitle={resumeSelection.lesson.title} savedAt={resumeSelection.draft.savedAt} confirmedCount={Object.keys(resumeSelection.draft.scores).length} totalScore={resumeSelection.draft.isCompleted ? resumeSelection.draft.totalScore : null} onContinue={resumeSavedLesson} onRestart={restartSavedLesson} />}
      {lockedLesson && <PremiumRequiredDialog lessonTitle={lockedLesson.title} onClose={() => setLockedLesson(null)} />}
      {loginPrompt && <LoginRequiredDialog onClose={() => setLoginPrompt(false)} />}
    </main>
  );

  if (finished) return <main className="dictation-screen completion-screen grid min-h-screen place-items-center bg-slate-50 p-6"><section className="completion-card w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl md:p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div><h1 className="mt-5 text-3xl font-bold">Hoàn thành bài luyện tập</h1><p className="mt-2 text-slate-500">{lesson.title}</p><p className="mt-8 text-6xl font-black text-indigo-600">{completionScore ?? average}<span className="text-2xl">/100</span></p><p className="mt-2 text-slate-500">Điểm tổng · {completedCount}/{sentences.length} câu đã xác nhận</p><div className="completion-progress" role="progressbar" aria-label="Tiến độ hoàn thành" aria-valuenow={sentences.length ? Math.round(completedCount / sentences.length * 100) : 0} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${sentences.length ? completedCount / sentences.length * 100 : 0}%` }} /></div>{completionSyncPending && <p role="status" className="completion-sync-note">Điểm và tiến trình đã lưu trên thiết bị; sẽ đồng bộ với máy chủ khi kết nối được khôi phục.</p>}{error && <p role="alert" className="completion-sync-note">{error}</p>}<div className="completion-actions"><button type="button" onClick={restartCurrentLesson}>1. Làm lại từ đầu</button><button type="button" onClick={returnToLibrary}>2. Chọn bài luyện khác</button><button type="button" onClick={() => setFinished(false)}>3. Tiếp tục làm và chỉnh sửa tiến trình</button></div>{loginPrompt && <LoginRequiredDialog onClose={() => setLoginPrompt(false)} />}</section></main>;

  return (
    <main className="dictation-screen min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={returnToLibrary} className="dictation-back-link">← Danh sách bài</button><button type="button" onClick={returnToLibrary} className="dictation-exit-button">Thoát bài</button></div><div className="text-right"><p className="font-bold">{lesson.title}</p><p className="text-xs text-slate-500">{lesson.level}</p></div></div></header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border bg-white p-5"><div className="flex justify-between text-sm"><span className="font-bold">Tiến độ</span><span>{completedCount}/{sentences.length} câu</span></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{ width: `${sentences.length ? completedCount / sentences.length * 100 : 0}%` }} /></div><nav className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-3">{sentences.map((item, i) => <button key={item.id} onClick={() => selectSentence(i)} aria-label={`Câu ${i + 1}`} className={`h-10 rounded-lg text-sm font-bold ${current === i ? 'bg-indigo-600 text-white' : scores[item.id] ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</button>)}</nav>{hasCompleted && typeof completionScore === 'number' && <div className="mt-6 rounded-xl bg-indigo-50 p-4"><p className="text-xs font-semibold uppercase text-indigo-600">Điểm tổng đã lưu</p><p className="mt-1 text-3xl font-black text-indigo-800">{completionScore}/100</p></div>}</aside>
        <section className="dictation-workbench min-w-0 rounded-2xl border bg-white p-5 shadow-sm md:p-8">
          {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
          {!sentence ? <div className="py-12 text-center text-slate-600">{error ? <><p>{error}</p><button type="button" onClick={returnToLibrary} className="dictation-back-link mt-5">← Danh sách bài học</button></> : 'Đang tải nội dung bài học…'}</div> : <>
            <div className="practice-method-tabs" role="tablist" aria-label="Phương pháp luyện tập"><button role="tab" aria-selected="true" className="method-active">Dictation</button><Link role="tab" aria-selected="false" href="/features/uc-04">Shadowing <span className="method-soon">sắp ra mắt</span></Link></div>
            <div className="dictation-practice-heading"><div><p className="text-sm font-semibold text-indigo-600">CÂU {current + 1} / {sentences.length}</p><h1>Nghe và nhập nội dung</h1></div><div className="dictation-mode-switch"><button onClick={() => setMode('FULL')} aria-pressed={mode === 'FULL'} className={mode === 'FULL' ? 'active' : ''}>Chép cả câu</button><button onClick={() => setMode('BLANKS')} aria-pressed={mode === 'BLANKS'} className={mode === 'BLANKS' ? 'active' : ''}>Điền từ khuyết</button></div></div>
            <div className="dictation-shortcuts" aria-label="Phím tắt Dictation"><strong>Phím tắt</strong><span><kbd>Alt</kbd>+<kbd>M</kbd> phát / tạm dừng</span><span><kbd>Alt</kbd>+<kbd>R</kbd> nghe lại</span><span><kbd>Alt</kbd>+<kbd>T</kbd> thử lại câu</span><span><kbd>Alt</kbd>+<kbd>G</kbd> gợi ý</span><span><kbd>Alt</kbd>+<kbd>P</kbd> transcript</span><span><kbd>Alt</kbd>+<kbd>←</kbd>/<kbd>→</kbd> đổi câu</span>{lesson.mediaType !== 'VIDEO' && <><span><kbd>←</kbd>/<kbd>→</kbd> tua lùi / tới 5 giây</span><span><kbd>M</kbd> tắt / bật tiếng</span></>}<span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> xác nhận khi đang nhập · <kbd>Enter</kbd> khi không gõ</span><span><kbd>Esc</kbd> về danh sách · tự lưu</span><small>Các phím tắt không kích hoạt trong ô trả lời; Space luôn dùng để nhập khoảng trắng.</small></div>
            <MediaDictationPlayer key={lesson.id} mediaType={lesson.mediaType ?? 'AUDIO'} mediaUrl={lesson.mediaType === 'VIDEO' ? (lesson.sourceUrl ?? lesson.audioUrl) : lesson.audioUrl} title={lesson.title} startTime={sentence.startTime} endTime={sentence.endTime} onSeekToTime={lesson.mediaType === 'VIDEO' ? undefined : seekToTimeAndSelectSentence} />
            <div className="dictation-controls"><button onClick={nextHint} disabled={hintLevel >= 3 || Boolean(scores[sentence.id])} className="hint-action">✦ Gợi ý {hintLevel ? `(${hintLevel}/3 · −${hintPenalty(hintLevel, hintPenalties)}đ)` : ''}</button><button disabled={!transcriptOn && Boolean(scores[sentence.id])} onClick={toggleTranscript} className={`transcript-action ${transcriptOn ? 'active' : ''}`}>{transcriptOn ? 'Ẩn transcript' : 'Hiện transcript'}</button><button onClick={retrySentence}>Thử lại câu</button><span>Dùng gợi ý sẽ giảm điểm câu.</span></div>
            {hintLevel > 0 && <div className="dictation-hint-card"><p>Gợi ý cấp {hintLevel} · Cấp cao hơn mở thêm manh mối</p><p>{maskedHint(sentence.textContent, hintLevel)}</p></div>}
            {transcriptOn && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Transcript</p><p className="mt-1 text-amber-950">{sentence.textContent}</p></div>}
            <label htmlFor="dictation-answer" className="dictation-answer-label">Câu trả lời của bạn</label>
            {mode === 'FULL' ? <textarea id="dictation-answer" value={answer} onChange={(event) => saveAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); confirmSentence(); } }} placeholder="Nhập những gì bạn nghe được…" rows={4} className="dictation-answer-input" /> : <FillBlanks key={`${sentence.id}-${fillReset}`} text={sentence.textContent} value={answer} onChange={saveAnswer} onConfirm={confirmSentence} />}
            <div className="dictation-live-feedback"><span>Đối chiếu trực tiếp · cập nhật ngay khi bạn nhập</span>{liveScore && <span className="live-accuracy">Độ chính xác hiện tại: {liveScore.accuracy}%</span>}</div>
            {scores[sentence.id] && <div className="dictation-confirmed-result"><p>Đã xác nhận câu · {scores[sentence.id].accuracy}% sau gợi ý</p><span>Điểm này được tính vào kết quả cuối cùng. Chọn “Thử lại câu” để thay bằng lượt mới.</span></div>}
            <div className="dictation-navigation"><button onClick={() => selectSentence(current - 1)} disabled={current === 0}>← Câu trước</button><div><button onClick={confirmSentence} className="confirm-answer-button">Xác nhận câu</button>{current < sentences.length - 1 ? <button onClick={() => selectSentence(current + 1)} className="next-sentence-button">Câu tiếp →</button> : <button disabled={sending} onClick={finishLesson} className="finish-lesson-button">{sending ? 'Đang lưu…' : 'Hoàn thành bài'}</button>}</div></div>
          </>}
        </section>
      </div>
      {loginPrompt && <LoginRequiredDialog onClose={() => setLoginPrompt(false)} />}
    </main>
  );
}

function LoginRequiredDialog({ onClose }: { onClose: () => void }) {
  return <div role="presentation" className="dictation-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="login-required-title" className="dictation-modal"><div className="dictation-modal-icon login-icon" aria-hidden="true">↗</div><p className="dictation-modal-eyebrow">Tài khoản học viên</p><h2 id="login-required-title">Đăng nhập để tiếp tục</h2><p className="dictation-modal-copy">Đăng nhập để bắt đầu bài học, lưu tiến độ và thêm nguồn nghe của riêng bạn.</p><div className="dictation-modal-actions"><button type="button" onClick={onClose} className="dictation-secondary-button">Để sau</button><Link href="/features/uc-01" className="dictation-primary-button">Đăng nhập</Link></div></section></div>;
}

function ResumeLessonDialog({ lessonTitle, savedAt, confirmedCount, totalScore, onContinue, onRestart }: { lessonTitle: string; savedAt: string; confirmedCount: number; totalScore: number | null | undefined; onContinue: () => void; onRestart: () => void }) {
  return <div role="presentation" className="dictation-modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="resume-lesson-title" className="dictation-modal resume-lesson-modal"><div className="dictation-modal-icon" aria-hidden="true">↻</div><p className="dictation-modal-eyebrow">Đã tìm thấy tiến trình</p><h2 id="resume-lesson-title">Bạn muốn học tiếp thế nào?</h2><p className="dictation-modal-copy"><strong>{lessonTitle}</strong><br />Đã xác nhận {confirmedCount} câu{typeof totalScore === 'number' ? ` · Điểm tổng ${totalScore}/100` : ''}<br />Lưu lần cuối {new Date(savedAt).toLocaleString()}.</p><div className="dictation-modal-actions"><button type="button" onClick={onContinue} className="dictation-primary-button">Tiếp tục với tiến trình đã lưu</button><button type="button" onClick={onRestart} className="dictation-secondary-button">Làm lại từ đầu</button></div></section></div>;
}

function PremiumRequiredDialog({ lessonTitle, onClose }: { lessonTitle: string; onClose: () => void }) {
  return <div role="presentation" className="dictation-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="premium-required-title" className="dictation-modal"><div className="dictation-modal-icon premium-icon" aria-hidden="true">★</div><p className="dictation-modal-eyebrow premium-eyebrow">Bài học Premium</p><h2 id="premium-required-title">Mở khóa bài học</h2><p className="dictation-modal-copy"><strong>{lessonTitle}</strong> nằm trong thư viện Premium. Chọn gói học để tiếp tục luyện tập bài này.</p><div className="dictation-modal-actions"><button type="button" onClick={onClose} className="dictation-secondary-button">Để sau</button><Link href="/subscription" className="dictation-primary-button premium-button">Xem gói học</Link></div></section></div>;
}

function FillBlanks({ text, value, onChange, onConfirm }: { text: string; value: string; onChange: (value: string) => void; onConfirm: () => void }) {
  const words = text.split(/\s+/);
  const slots = words.map((word, index) => index % 2 === 1);
  const existing = value ? value.split(/\s+/) : [];
  const [slotValues, setSlotValues] = useState<Record<number, string>>(() => Object.fromEntries(words.map((_, index) => [index, slots[index] ? existing[index] ?? '' : ''])));
  return <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 p-4">{words.map((word, index) => slots[index] ? <input key={index} aria-label={`Từ còn thiếu ${Math.floor(index / 2) + 1}`} value={slotValues[index] ?? ''} onKeyDown={(event) => { if (event.key !== 'Enter') return; event.preventDefault(); if (event.ctrlKey || event.metaKey) onConfirm(); else { const inputs = Array.from(event.currentTarget.parentElement?.querySelectorAll('input') ?? []); inputs[inputs.indexOf(event.currentTarget) + 1]?.focus(); } }} onChange={(event) => { const nextSlots = { ...slotValues, [index]: event.target.value }; setSlotValues(nextSlots); const complete = words.every((_, i) => !slots[i] || (nextSlots[i] ?? '').trim()); onChange(complete ? words.map((item, i) => slots[i] ? nextSlots[i] : item).join(' ') : ''); }} className="w-28 rounded border-b-2 border-indigo-400 bg-indigo-50 px-2 py-1 outline-none focus:border-indigo-700" /> : <span key={index}>{word}</span>)}</div>;
}
