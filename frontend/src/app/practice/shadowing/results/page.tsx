'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type WordResult = { word: string; accuracy_score: number; error_type: string; color: 'GREEN' | 'YELLOW' | 'RED' };
type Assessment = {
  overall_score: number;
  assessment_source?: 'OPENAI' | 'MOCK' | 'LEGACY';
  accuracy_score: number;
  fluency_score: number;
  completeness_score: number;
  words_score_detail: WordResult[];
};
type ResultItem = {
  attemptId: string;
  createdAt: string;
  lessonId: string;
  lessonTitle: string;
  sentenceId: string;
  sentenceText: string;
  result: Assessment | null;
};

const wordClass = {
  GREEN: 'shadowing-word-green',
  YELLOW: 'shadowing-word-yellow',
  RED: 'shadowing-word-red',
} as const;

export default function ShadowingResultsPage() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ items: ResultItem[] }>('/practice/shadowing/history')
      .then((data) => setItems(data.items ?? []))
      .catch((cause: Error) => setError(cause.message || 'Chưa tải được lịch sử chấm phát âm.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const scored = items.filter((item) => item.result);
    const realScored = scored.filter((item) => item.result!.assessment_source !== 'MOCK');
    const average = realScored.length
      ? Math.round(realScored.reduce((sum, item) => sum + item.result!.overall_score, 0) / realScored.length)
      : 0;
    const wordsToPractice = realScored.reduce((sum, item) => sum + item.result!.words_score_detail.filter((word) => word.color !== 'GREEN').length, 0);
    return { count: scored.length, realCount: realScored.length, average, wordsToPractice };
  }, [items]);

  return <main className="shadowing-history-page">
    <header className="shadowing-history-header">
      <div>
        <Link href="/practice/dictation?mode=shadowing" className="shadowing-history-back">← Quay lại</Link>
        <p className="shadowing-eyebrow">UC-05 · KẾT QUẢ PHÁT ÂM AI</p>
        <h1>Kết quả và tiến bộ phát âm</h1>
        <p>Xem lại điểm từ các lượt Shadowing đã chấm và nhận diện những từ cần luyện thêm. Khi muốn thực hành, hãy chọn chế độ và bài học trong thư viện.</p>
      </div>
    </header>

    <section className="shadowing-history-stats" aria-label="Tóm tắt kết quả">
      <article><span>Lượt đã chấm</span><strong>{summary.count}</strong></article>
      <article><span>Điểm trung bình thực</span><strong>{summary.realCount ? `${summary.average}/100` : '—'}</strong></article>
      <article><span>Từ cần luyện thêm</span><strong>{summary.wordsToPractice}</strong></article>
    </section>

    {loading && <p className="shadowing-history-state">Đang tải kết quả đã chấm…</p>}
    {error && <div role="alert" className="shadowing-history-state error">{error}<p><Link href="/features/uc-01">Đăng nhập lại</Link> hoặc thử tải lại trang.</p></div>}
    {!loading && !error && !items.length && <section className="shadowing-history-empty">
      <span aria-hidden="true">◎</span><h2>Chưa có kết quả phát âm</h2>
      <p>Sau khi ghi âm và gửi chấm trong Shadowing, điểm tổng quan và phân tích từng từ sẽ được lưu tại đây.</p>
    </section>}

    <section className="shadowing-history-list" aria-label="Lịch sử chấm phát âm">
      {items.map((item) => {
        const result = item.result;
        const expanded = expandedId === item.attemptId;
        return <article key={item.attemptId} className="shadowing-history-card">
          <button type="button" className="shadowing-history-card-toggle" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : item.attemptId)}>
            <span className="shadowing-history-score">{result?.overall_score ?? '—'}<small>/100</small></span>
            <span className="shadowing-history-main"><small>{item.lessonTitle} · {new Date(item.createdAt).toLocaleString()}{result?.assessment_source === 'MOCK' ? ' · GIẢ LẬP' : ''}</small><strong>{item.sentenceText}</strong></span>
            <span className="shadowing-history-expand">{expanded ? 'Thu gọn' : 'Xem phân tích'}</span>
          </button>
          {expanded && result && <div className="shadowing-history-detail">
            <div className="shadowing-history-metrics">{[
              ['Độ chính xác', result.accuracy_score],
              ['Độ trôi chảy', result.fluency_score],
              ['Mức độ đầy đủ', result.completeness_score],
            ].map(([label, score]) => <div key={label}><span>{label}</span><strong>{score}%</strong></div>)}</div>
            <div className="shadowing-history-words"><div><strong>Phân tích từng từ</strong><span>Điểm thấp hơn cho biết từ nên được luyện lại.</span></div>
              <div className="shadowing-scored-words">{result.words_score_detail.map((word, index) => <span key={`${index}-${word.word}`} className={wordClass[word.color] ?? wordClass.RED} title={`${word.accuracy_score}% · ${word.error_type}`}>{word.word}<small>{word.accuracy_score}</small></span>)}</div>
            </div>
            <p className="shadowing-history-practice-hint">Muốn luyện lại, mở danh sách bài học, chọn Shadowing và tìm bài trong “Bài đang luyện dở &amp; học gần đây”.</p>
          </div>}
        </article>;
      })}
    </section>
  </main>;
}
