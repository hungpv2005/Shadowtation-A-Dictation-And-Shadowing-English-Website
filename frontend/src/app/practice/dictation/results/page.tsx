'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type WordResult = { word: string; accuracy_score: number; error_type: string };
type DictationResult = { overall_score: number; accuracy_score: number; words_score_detail: WordResult[] };
type ResultItem = {
  attemptId: string;
  createdAt: string;
  lessonId: string;
  lessonTitle: string;
  sentenceId: string;
  sentenceText: string;
  submittedText: string | null;
  result: DictationResult | null;
};

function wordClass(word: WordResult) {
  if (word.error_type === 'None') return 'shadowing-word-green';
  return word.accuracy_score >= 85 ? 'shadowing-word-yellow' : 'shadowing-word-red';
}

export default function DictationResultsPage() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ items: ResultItem[] }>('/practice/dictation/history')
      .then((data) => setItems(data.items ?? []))
      .catch((cause: Error) => setError(cause.message || 'Chưa tải được lịch sử Dictation.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const scored = items.filter((item) => item.result);
    const average = scored.length
      ? Math.round(scored.reduce((sum, item) => sum + item.result!.overall_score, 0) / scored.length)
      : 0;
    const wordsToPractice = scored.reduce((sum, item) => sum + item.result!.words_score_detail.filter((word) => word.error_type !== 'None').length, 0);
    return { count: scored.length, average, wordsToPractice };
  }, [items]);

  return <main className="shadowing-history-page">
    <header className="shadowing-history-header">
      <div>
        <Link href="/practice/dictation?mode=dictation" className="shadowing-history-back">← Quay lại</Link>
        <p className="shadowing-eyebrow">UC-02 · KẾT QUẢ DICTATION</p>
        <h1>Kết quả và tiến bộ Dictation</h1>
        <p>Xem điểm chép chính xác từng câu và những từ cần ôn lại. Kết quả Dictation được lưu riêng với kết quả phát âm Shadowing.</p>
      </div>
    </header>

    <section className="shadowing-history-stats" aria-label="Tóm tắt kết quả Dictation">
      <article><span>Lượt câu đã chấm</span><strong>{summary.count}</strong></article>
      <article><span>Điểm trung bình</span><strong>{summary.count ? `${summary.average}/100` : '—'}</strong></article>
      <article><span>Từ cần ôn lại</span><strong>{summary.wordsToPractice}</strong></article>
    </section>

    {loading && <p className="shadowing-history-state">Đang tải kết quả Dictation…</p>}
    {error && <div role="alert" className="shadowing-history-state error">{error}<p><Link href="/features/uc-01">Đăng nhập lại</Link> hoặc thử tải lại trang.</p></div>}
    {!loading && !error && !items.length && <section className="shadowing-history-empty">
      <span aria-hidden="true">✎</span><h2>Chưa có kết quả Dictation</h2>
      <p>Sau khi hoàn thành bài Dictation, điểm từng câu và tổng điểm bài sẽ xuất hiện tại đây.</p>
    </section>}

    <section className="shadowing-history-list" aria-label="Lịch sử kết quả Dictation">
      {items.map((item) => {
        const result = item.result;
        const expanded = expandedId === item.attemptId;
        return <article key={item.attemptId} className="shadowing-history-card">
          <button type="button" className="shadowing-history-card-toggle" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : item.attemptId)}>
            <span className="shadowing-history-score">{result?.overall_score ?? '—'}<small>/100</small></span>
            <span className="shadowing-history-main"><small>{item.lessonTitle} · {new Date(item.createdAt).toLocaleString()}</small><strong>{item.sentenceText}</strong></span>
            <span className="shadowing-history-expand">{expanded ? 'Thu gọn' : 'Xem kết quả'}</span>
          </button>
          {expanded && result && <div className="shadowing-history-detail">
            <div className="shadowing-history-metrics"><div><span>Độ chính xác</span><strong>{result.accuracy_score}%</strong></div></div>
            <p className="shadowing-history-practice-hint"><strong>Bạn đã nhập:</strong> {item.submittedText || '—'}</p>
            <div className="shadowing-history-words"><div><strong>Đối chiếu từ</strong><span>Từ sai được đánh dấu để bạn dễ nhận ra chỗ cần ôn.</span></div>
              <div className="shadowing-scored-words">{result.words_score_detail.map((word, index) => <span key={`${index}-${word.word}`} className={wordClass(word)} title={`${word.accuracy_score}% · ${word.error_type}`}>{word.word}<small>{word.accuracy_score}</small></span>)}</div>
            </div>
          </div>}
        </article>;
      })}
    </section>
  </main>;
}
