'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { readShadowingRecording, saveShadowingRecording, type SavedShadowingRecording } from './shadowing-recordings';

type Sentence = {
  id: string;
  startTime: number;
  endTime: number;
  textContent: string;
  wordsJson: { word: string; start: number; end: number }[];
};
type WordResult = { word: string; accuracy_score: number; error_type: string; color: 'GREEN' | 'YELLOW' | 'RED' };
type Assessment = {
  overall_score: number;
  assessment_source?: 'OPENAI' | 'MOCK' | 'LEGACY';
  accuracy_score: number;
  fluency_score: number;
  completeness_score: number;
  words_score_detail: WordResult[];
};
type Attempt = { attemptId: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; errorCode?: string | null; result?: Assessment | null };
const attemptsStorageKey = (lessonId: string) => `shadowtation.shadowing.attempts:${lessonId}`;

function readStoredAttempts(lessonId: string): Record<string, Attempt> {
  try {
    const value = JSON.parse(localStorage.getItem(attemptsStorageKey(lessonId)) ?? '{}') as Record<string, Attempt>;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, attempt]) => attempt && typeof attempt.attemptId === 'string' && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(attempt.status)));
  } catch { return {}; }
}

const wordColorClass = {
  GREEN: 'shadowing-word-green',
  YELLOW: 'shadowing-word-yellow',
  RED: 'shadowing-word-red',
} as const;

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function scoreMessage(errorCode?: string | null) {
  if (errorCode === 'AI_TIMEOUT') return 'Dịch vụ chấm điểm đang bận. Hãy thử gửi lại bản ghi.';
  if (errorCode === 'INVALID_AUDIO_FORMAT') return 'Không đọc được định dạng ghi âm này. Hãy ghi âm lại rồi thử gửi.';
  if (errorCode === 'AI_CONFIGURATION_ERROR') return 'Dịch vụ chấm AI chưa được cấu hình. Vui lòng báo quản trị viên kiểm tra OPENAI_API_KEY.';
  return 'Chưa chấm được bản ghi này. Hãy thử ghi âm và gửi lại.';
}

export function ShadowingPractice({
  lessonId,
  sentence,
  activeWordIndex,
  isActive,
  onCompleted,
  onScoreReset,
}: {
  lessonId: string;
  sentence: Sentence;
  activeWordIndex: number;
  isActive: boolean;
  onCompleted: (sentenceId: string, score: number, source: 'OPENAI' | 'MOCK' | 'LEGACY') => void;
  onScoreReset: (sentenceId: string) => void;
}) {
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [attemptsHydrated, setAttemptsHydrated] = useState(false);
  const [recordingReady, setRecordingReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [meter, setMeter] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<(SavedShadowingRecording & { url: string }) | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const currentSentenceIdRef = useRef(sentence.id);
  const attemptsRef = useRef(attempts);
  const onCompletedRef = useRef(onCompleted);
  const onScoreResetRef = useRef(onScoreReset);
  const recordingBlobRef = useRef(recordingBlob);
  attemptsRef.current = attempts;
  currentSentenceIdRef.current = sentence.id;
  onCompletedRef.current = onCompleted;
  onScoreResetRef.current = onScoreReset;
  recordingBlobRef.current = recordingBlob;

  const activeAttempt = attempts[sentence.id];
  const previewUrl = recordingBlob?.sentenceId === sentence.id ? recordingBlob.url : '';
  const previewBlob = recordingBlob?.sentenceId === sentence.id ? recordingBlob.blob : null;
  const previewAttemptId = recordingBlob?.sentenceId === sentence.id ? recordingBlob.attemptId : undefined;
  const attemptIsProcessing = activeAttempt?.status === 'PENDING' || activeAttempt?.status === 'PROCESSING';
  const needsAssessment = Boolean(previewBlob && !recording && !sending && !attemptIsProcessing
    && (activeAttempt?.status === 'FAILED' || !activeAttempt || previewAttemptId !== activeAttempt.attemptId));
  const waveform = useMemo(() => Array.from({ length: 36 }, (_, index) => {
    const natural = 14 + Math.abs(Math.sin(index * 1.7)) * 24;
    return recording ? Math.max(10, Math.min(100, natural + meter * (0.2 + (index % 5) * 0.13))) : natural;
  }), [recording, meter]);

  useEffect(() => {
    setAttempts(readStoredAttempts(lessonId));
    setAttemptsHydrated(true);
  }, [lessonId]);

  useEffect(() => {
    let cancelled = false;
    setRecordingReady(false);
    void readShadowingRecording(lessonId, sentence.id).then((saved) => {
      if (cancelled) return;
      const next = saved ? { ...saved, url: URL.createObjectURL(saved.blob) } : null;
      const previous = recordingBlobRef.current;
      if (previous) URL.revokeObjectURL(previous.url);
      recordingBlobRef.current = next;
      setRecordingBlob(next);
      setRecordingReady(true);
    }).catch(() => {
      if (!cancelled) {
        setError('Không tải được bản ghi đã lưu trên thiết bị. Bạn vẫn có thể ghi âm câu này lại.');
        setRecordingReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [lessonId, sentence.id]);

  useEffect(() => {
    if (!attemptsHydrated) return;
    try { localStorage.setItem(attemptsStorageKey(lessonId), JSON.stringify(attempts)); } catch { /* The sentence score and cursor are still saved by the practice page. */ }
  }, [lessonId, attempts, attemptsHydrated]);

  useEffect(() => {
    if (!activeAttempt || (activeAttempt.status !== 'PENDING' && activeAttempt.status !== 'PROCESSING')) return;
    let cancelled = false;
    let timer = 0;
    const poll = async () => {
      try {
        const response = await apiFetch<{ attemptId: string; status: Attempt['status']; errorCode?: string | null; result?: Assessment | null }>(
          `/practice/shadowing/status/${encodeURIComponent(activeAttempt.attemptId)}`,
        );
        if (cancelled) return;
        setError('');
        setAttempts((current) => ({ ...current, [sentence.id]: { ...current[sentence.id], ...response } }));
        if (response.status === 'COMPLETED' && response.result) onCompletedRef.current(sentence.id, response.result.overall_score, response.result.assessment_source ?? 'LEGACY');
        if (response.status === 'PENDING' || response.status === 'PROCESSING') timer = window.setTimeout(poll, 2000);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || 'Chưa tải được trạng thái chấm điểm.');
          timer = window.setTimeout(poll, 2000);
        }
      }
    };
    timer = window.setTimeout(poll, 2000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeAttempt?.attemptId, activeAttempt?.status, sentence.id]);

  function replaceRecording(next: (SavedShadowingRecording & { url: string }) | null) {
    const previous = recordingBlobRef.current;
    if (previous && previous.url !== next?.url) URL.revokeObjectURL(previous.url);
    recordingBlobRef.current = next;
    setRecordingBlob(next);
  }

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
    if (recordingBlobRef.current) URL.revokeObjectURL(recordingBlobRef.current.url);
  }, []);

  useEffect(() => {
    if (!isActive && recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, [isActive]);

  useEffect(() => {
    setError('');
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, [sentence.id]);

  function stopMeter() {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setRecording(false);
    setMeter(0);
  }

  async function startRecording() {
    setError('');
    if (!recordingReady) { setError('Đang khôi phục bản ghi câu này. Hãy chờ một chút rồi thử lại.'); return; }
    if (attemptIsProcessing || sending) { setError('Đang chấm bản ghi hiện tại. Hãy đợi kết quả trước khi ghi âm lại.'); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Trình duyệt này chưa hỗ trợ ghi âm. Hãy dùng phiên bản mới của Chrome, Edge, Firefox hoặc Safari.');
      return;
    }
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      setError('Trình duyệt chỉ cho phép ghi âm trên HTTPS. Hãy mở website qua kết nối bảo mật rồi thử lại.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        stopMeter();
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) { setError('Chưa thu được âm thanh. Hãy kiểm tra micro rồi ghi âm lại.'); return; }
        const saved: SavedShadowingRecording = { lessonId, sentenceId: sentence.id, blob, savedAt: new Date().toISOString() };
        if (currentSentenceIdRef.current === sentence.id) replaceRecording({ ...saved, url: URL.createObjectURL(blob) });
        void saveShadowingRecording(saved).catch(() => setError('Bản ghi dùng được trong bài này nhưng chưa lưu được trên thiết bị. Hãy giữ trang mở đến khi chấm xong.'));
      };
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (let index = 0; index < samples.length; index += 1) energy += Math.abs(samples[index] - 128);
        setMeter(Math.min(100, (energy / samples.length) * 2.7));
        animationRef.current = requestAnimationFrame(updateMeter);
      };
      setElapsed(0);
      recorder.start(250);
      setRecording(true);
      onScoreResetRef.current(sentence.id);
      animationRef.current = requestAnimationFrame(updateMeter);
      timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    } catch (e) {
      stopMeter();
      const name = (e as DOMException)?.name;
      setError(name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Chưa có quyền dùng micro. Hãy cấp quyền ghi âm trong cài đặt trang rồi thử lại.'
        : 'Không mở được micro. Kiểm tra thiết bị ghi âm rồi thử lại.');
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  async function submitRecording() {
    if (!previewBlob || !needsAssessment || recording || sending || attemptIsProcessing) return;
    setError('');
    if (previewBlob.size > 5 * 1024 * 1024) {
      setError('Bản ghi vượt quá 5 MB. Hãy ghi âm câu ngắn hơn hoặc giảm chất lượng micro rồi thử lại.');
      return;
    }
    setSending(true);
    try {
      const oldAttempt = attemptsRef.current[sentence.id];
      if (oldAttempt?.status === 'FAILED') {
        await apiFetch(`/practice/shadowing/${encodeURIComponent(oldAttempt.attemptId)}/discard`, { method: 'POST' });
      }
      const audio = new FormData();
      const extension = previewBlob.type.includes('mp4') ? 'm4a' : previewBlob.type.includes('ogg') ? 'ogg' : 'webm';
      audio.set('sentence_id', sentence.id);
      audio.set('audio_file', previewBlob, `shadowing-${sentence.id}.${extension}`);
      const response = await apiFetch<{ attempt_id: string; status: Attempt['status'] }>('/practice/shadowing/submit', { method: 'POST', body: audio });
      const submittedRecording: SavedShadowingRecording = {
        lessonId, sentenceId: sentence.id, blob: previewBlob, attemptId: response.attempt_id,
        savedAt: recordingBlob?.savedAt ?? new Date().toISOString(),
      };
      replaceRecording({ ...submittedRecording, url: previewUrl });
      void saveShadowingRecording(submittedRecording).catch(() => setError('Lượt chấm đã gửi, nhưng trạng thái bản ghi chưa lưu được trên thiết bị.'));
      setAttempts((current) => ({ ...current, [sentence.id]: { attemptId: response.attempt_id, status: response.status } }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để gửi bản ghi.');
      else setError((e as Error).message || 'Chưa gửi được bản ghi. Hãy thử lại.');
    } finally { setSending(false); }
  }

  function playRecording() {
    if (!previewAudioRef.current || !previewUrl) return;
    previewAudioRef.current.currentTime = 0;
    void previewAudioRef.current.play().catch(() => setError('Không phát được bản ghi. Hãy bấm phát trên thanh nghe hoặc ghi âm lại.'));
  }

  const shortcutActionsRef = useRef({ startRecording, stopRecording, submitRecording, playRecording });
  shortcutActionsRef.current = { startRecording, stopRecording, submitRecording, playRecording };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], audio, video')) return;
      const actions = shortcutActionsRef.current;
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        void actions.startRecording();
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        actions.stopRecording();
      } else if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        actions.playRecording();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        void actions.submitRecording();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [sentence.id]);

  const result = !recording && activeAttempt?.status === 'COMPLETED' && previewAttemptId === activeAttempt.attemptId ? activeAttempt.result : null;
  const phrase = sentence.textContent.trim().split(/\s+/);

  return <section className="shadowing-practice" aria-label="Luyện Shadowing và chấm điểm phát âm">
    <div className="shadowing-intro"><div><p className="shadowing-eyebrow">LUYỆN NÓI · UC-04</p><h2>Ghi âm và luyện nói nhại</h2></div><div className="shadowing-intro-copy"><p>Nghe câu mẫu, ghi âm câu trả lời và nhận điểm ngay sau khi AI chấm xong.</p></div></div>

    <div className="shadowing-karaoke" aria-label="Câu mẫu karaoke">
      {phrase.map((word, index) => {
        const timing = sentence.wordsJson?.[index];
        const highlighted = activeWordIndex === index || (!sentence.wordsJson?.length && activeWordIndex === index);
        return <span key={`${index}-${word}`} className={`shadowing-karaoke-word ${highlighted ? 'active' : ''}`}>{timing?.word || word}</span>;
      })}
    </div>

    <div className={`shadowing-recorder ${recording ? 'is-recording' : ''}`}>
      <div className="shadowing-recorder-copy"><span className={`shadowing-record-dot ${recording ? 'live' : ''}`} aria-hidden="true" />
        <div><strong>{recording ? 'Đang ghi âm' : previewUrl ? 'Bản ghi mới nhất đã lưu' : 'Lượt nói của bạn'}</strong><span>{recording ? 'Đang thu âm từ micro của bạn' : previewUrl ? 'Bản ghi được tự lưu trên thiết bị; ghi âm mới sẽ thay thế bản cũ của câu này.' : 'Bật micro rồi nói nhại theo câu mẫu'}</span></div>
        <time>{formatDuration(elapsed)}</time>
      </div>
      <div className="shadowing-waveform" aria-label={recording ? 'Biểu đồ âm lượng micro trực tiếp' : 'Biểu đồ âm thanh'} role="img">{waveform.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
      {recording && <p className="shadowing-mic-hint">Nói rõ ràng vào micro. Bạn có thể dừng ghi âm bất cứ lúc nào.</p>}
      {previewUrl && !recording && <audio ref={previewAudioRef} className="shadowing-preview-audio" controls preload="metadata" src={previewUrl} aria-label="Nghe lại bản ghi mới nhất của bạn" />}
      <div className="shadowing-recorder-actions">
        {recording
          ? <button type="button" className="shadowing-stop-button" onClick={stopRecording} aria-keyshortcuts="Alt+S"><span aria-hidden="true">■</span> Dừng ghi âm</button>
          : <button type="button" className="shadowing-record-button" onClick={() => void startRecording()} disabled={!recordingReady || attemptIsProcessing || sending} aria-keyshortcuts="Alt+R"><span aria-hidden="true">●</span> {previewUrl ? 'Ghi âm lại' : 'Bắt đầu ghi âm'}</button>}
        {previewUrl && !recording && <button type="button" className="shadowing-retry-button" onClick={playRecording} aria-keyshortcuts="Alt+P">▶ Nghe lại bản ghi</button>}
        {needsAssessment && <button type="button" className="shadowing-submit-button" onClick={() => void submitRecording()} disabled={sending} aria-keyshortcuts="Alt+Enter">{sending ? 'Đang gửi…' : activeAttempt?.status === 'FAILED' ? 'Gửi lại chấm điểm AI' : 'Gửi chấm điểm AI'}</button>}
        <span className="shadowing-audio-limit">WebM, WAV hoặc MP3 · tối đa 5 MB</span>
      </div>
      <p className="shadowing-shortcuts" aria-label="Phím tắt Shadowing"><strong>Phím tắt</strong><span><kbd>Alt</kbd>+<kbd>R</kbd> ghi âm lại</span><span><kbd>Alt</kbd>+<kbd>S</kbd> dừng ghi âm</span><span><kbd>Alt</kbd>+<kbd>P</kbd> nghe bản mới nhất</span><span><kbd>Alt</kbd>+<kbd>Enter</kbd> gửi chấm điểm AI</span></p>
    </div>

    {(activeAttempt?.status === 'PENDING' || activeAttempt?.status === 'PROCESSING') && <div className="shadowing-processing" role="status"><span className="shadowing-spinner" /><div><strong>{activeAttempt.status === 'PENDING' ? 'Đã gửi bản ghi' : 'AI đang phân tích phát âm'}</strong><p>Kết quả sẽ tự cập nhật sau khi chấm xong.</p></div></div>}
    {activeAttempt?.status === 'FAILED' && <p role="alert" className="shadowing-error">{scoreMessage(activeAttempt.errorCode)}</p>}
    {error && <p role="alert" className="shadowing-error">{error}</p>}

    {result && <section className="shadowing-result" aria-live="polite" aria-label="Kết quả chấm điểm phát âm">
      <div className="shadowing-result-heading"><div><p className="shadowing-eyebrow">KẾT QUẢ LUYỆN TẬP</p><h3>Phát âm của bạn</h3></div><div className="shadowing-score-circle"><strong>{result.overall_score}</strong><span>/100</span></div></div>
      <div className="shadowing-metric-grid">{[
        ['Độ chính xác', result.accuracy_score], ['Độ trôi chảy', result.fluency_score], ['Mức độ đầy đủ', result.completeness_score],
      ].map(([label, value]) => <div key={label} className="shadowing-metric"><span>{label}</span><strong>{value}%</strong><div><i style={{ width: `${value}%` }} /></div></div>)}</div>
      <div className="shadowing-word-results"><div className="shadowing-word-results-title"><strong>Phân tích từng từ</strong><span><i className="green" /> Tốt <i className="yellow" /> Cần luyện <i className="red" /> Chú ý</span></div>
        <div className="shadowing-scored-words">{result.words_score_detail.map((word, index) => <span key={`${index}-${word.word}`} className={wordColorClass[word.color] ?? 'shadowing-word-red'} title={`${word.accuracy_score}% · ${word.error_type}`}>{word.word}<small>{word.accuracy_score}</small></span>)}</div>
      </div>
      <p className="shadowing-review-note">Các từ cần luyện thêm đã được thêm vào danh sách ôn tập của bạn.</p>
    </section>}
  </section>;
}
