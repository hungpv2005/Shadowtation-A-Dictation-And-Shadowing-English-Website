'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { addWordToPersonalDictionary, POS_OPTIONS } from '@/app/review-list-page';

export type VocabItem = {
  id: string;
  word: string;
  source: 'DICTATION' | 'SHADOWING';
  sentence?: string | null;
  lessonTitle?: string | null;
  hintTip?: string;
  isStarred?: boolean;
};

const DEFAULT_VOCAB_ITEMS: VocabItem[] = [
  {
    id: 'vocab-1',
    word: 'listening',
    source: 'DICTATION',
    sentence: 'Active listening is the key to mastering English communication.',
    hintTip: 'Phát âm rõ 2 âm tiết: LIS-ten-ing, âm /t/ là âm câm.',
    isStarred: false,
  },
  {
    id: 'vocab-2',
    word: 'pronunciation',
    source: 'SHADOWING',
    sentence: 'Your pronunciation improves significantly with daily speaking practice.',
    hintTip: 'Nhấn trọng âm ở âm tiết thứ tư: pro-nun-ci-A-tion.',
    isStarred: false,
  },
  {
    id: 'vocab-3',
    word: 'comprehension',
    source: 'DICTATION',
    sentence: 'Listening comprehension requires patience and consistent practice.',
    hintTip: 'Chú ý trọng âm rơi vào âm tiết: com-pre-HEN-sion.',
    isStarred: false,
  },
  {
    id: 'vocab-4',
    word: 'intonation',
    source: 'SHADOWING',
    sentence: 'Pay close attention to rising and falling intonation in the audio.',
    hintTip: 'Nhấn trọng âm ở âm tiết thứ ba: in-to-NA-tion, lên giọng ở cuối câu hỏi.',
    isStarred: false,
  },
  {
    id: 'vocab-5',
    word: 'vocabulary',
    source: 'DICTATION',
    sentence: 'Learning vocabulary in complete sentences helps you remember longer.',
    hintTip: 'Trọng âm rơi vào âm tiết thứ hai: vo-CAB-u-lar-y.',
    isStarred: false,
  },
  {
    id: 'vocab-6',
    word: 'fluency',
    source: 'SHADOWING',
    sentence: 'Shadowing technique allows learners to speak with natural fluency.',
    hintTip: 'Âm đầu /fl/ mượt mà, trọng âm đầu: FLU-en-cy.',
    isStarred: false,
  },
];

const VOCAB_STORAGE_KEY = 'shadowtation.vocab_review_items';

function VocabularyReviewContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'shadowing' ? 'SHADOWING' : 'DICTATION';
  const backHref = `/practice/dictation?mode=${initialMode.toLowerCase()}`;

  const [items, setItems] = useState<VocabItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DICTATION' | 'SHADOWING' | 'STARRED'>('ALL');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Practice Console State
  const [practiceTab, setPracticeTab] = useState<'TYPING' | 'SPEAKING'>('TYPING');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingFeedback, setTypingFeedback] = useState<{ kind: 'correct' | 'incorrect'; message: string; hintChars?: string } | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [speakingFeedback, setSpeakingFeedback] = useState<{ kind: 'correct' | 'incorrect'; message: string; advice?: string } | null>(null);

  // Hidden/blurred words (Eye toggle)
  const [blurredWordIds, setBlurredWordIds] = useState<Record<string, boolean>>({});
  const [allBlurred, setAllBlurred] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Load items from API and local storage
  useEffect(() => {
    let active = true;
    const loadSaved = () => {
      try {
        const localRaw = localStorage.getItem(VOCAB_STORAGE_KEY);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return DEFAULT_VOCAB_ITEMS;
    };

    const initial = loadSaved();
    setItems(initial);

    apiFetch<{ items: Array<{ id: string; word: string; source: 'DICTATION' | 'SHADOWING' | 'LEGACY'; sentence?: string | null; lessonTitle?: string | null }> }>('/users/review-list')
      .then((data) => {
        if (!active || !data.items || !data.items.length) return;
        const mapped: VocabItem[] = data.items.map((it) => ({
          id: it.id,
          word: it.word,
          source: it.source === 'SHADOWING' ? 'SHADOWING' : 'DICTATION',
          sentence: it.sentence || `Luyện từ ${it.word} trong bài học.`,
          lessonTitle: it.lessonTitle,
          hintTip: `Chú ý phát âm rõ âm đuôi và nhấn đúng trọng âm của từ "${it.word}".`,
          isStarred: false,
        }));
        setItems((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const additions = mapped.filter((m) => !existingIds.has(m.id));
          const merged = [...prev, ...additions];
          try {
            localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const updateItems = (next: VocabItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchFilter =
        filter === 'ALL'
          ? true
          : filter === 'STARRED'
          ? item.isStarred
          : item.source === filter;
      const matchSearch = !search.trim() || item.word.toLowerCase().includes(search.trim().toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [items, filter, search]);

  const currentItem: VocabItem | undefined = filteredItems[currentIndex] ?? filteredItems[0];

  useEffect(() => {
    if (currentIndex >= filteredItems.length && filteredItems.length > 0) {
      setCurrentIndex(0);
    }
    setTypedAnswer('');
    setTypingFeedback(null);
    setSpokenTranscript('');
    setSpeakingFeedback(null);
  }, [currentIndex, filteredItems.length, currentItem?.id]);

  const speakWord = (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const toggleStar = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = items.map((it) => (it.id === id ? { ...it, isStarred: !it.isStarred } : it));
    updateItems(next);
  };

  const toggleWordBlur = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlurredWordIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAllBlur = () => {
    const nextState = !allBlurred;
    setAllBlurred(nextState);
    const updated: Record<string, boolean> = {};
    items.forEach((it) => {
      updated[it.id] = nextState;
    });
    setBlurredWordIds(updated);
  };

  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = items.filter((it) => it.id !== id);
    updateItems(next);
    apiFetch(`/users/review-list/${id}`, { method: 'DELETE' }).catch(() => undefined);
    showToast('Đã xóa từ khỏi danh sách ôn tập.');
  };

  const handleClearAll = () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách từ vựng ôn tập này không?')) return;
    updateItems([]);
    apiFetch('/users/review-list', { method: 'DELETE' }).catch(() => undefined);
    showToast('Đã xóa toàn bộ từ vựng ôn tập.');
  };

  const handleAddToPersonalDict = (item: VocabItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    addWordToPersonalDictionary(
      item.word,
      `Từ cần ôn lại (${item.source === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe'})`,
      item.sentence || `Luyện tập từ "${item.word}" trong bài học.`,
      item.source === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe',
      'n',
    );
    showToast(`Đã thêm từ "${item.word}" vào Sổ từ vựng cá nhân!`);
  };

  // Dictation typing check
  const handleCheckTyped = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentItem || !typedAnswer.trim()) return;

    const normalizedInput = typedAnswer.trim().toLowerCase().replace(/[^\w]/g, '');
    const normalizedTarget = currentItem.word.trim().toLowerCase().replace(/[^\w]/g, '');

    if (normalizedInput === normalizedTarget) {
      setTypingFeedback({
        kind: 'correct',
        message: 'Chính xác! Bạn đã chép đúng từ vừa nghe.',
      });
    } else {
      const length = currentItem.word.length;
      const mask = Array.from({ length }, () => '_').join(' ');
      setTypingFeedback({
        kind: 'incorrect',
        message: 'Chưa chính xác.',
        hintChars: `Gợi ý: ${mask} (${length} chữ cái)`,
      });
    }
  };

  // Shadowing speech recognition
  const startRecording = () => {
    if (!currentItem) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsRecording(true);
      setSpeakingFeedback(null);
      setTimeout(() => {
        setIsRecording(false);
        setSpokenTranscript(currentItem.word);
        setSpeakingFeedback({
          kind: 'correct',
          message: 'Chính xác! Bạn đã phát âm tốt từ vừa nghe.',
        });
      }, 1500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeakingFeedback(null);
        setSpokenTranscript('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        setSpokenTranscript(transcript);
        const target = currentItem.word.toLowerCase();

        if (transcript.includes(target) || target.includes(transcript)) {
          setSpeakingFeedback({
            kind: 'correct',
            message: `Chính xác! Bạn đã phát âm chuẩn từ "${currentItem.word}".`,
          });
        } else {
          setSpeakingFeedback({
            kind: 'incorrect',
            message: 'Chưa chính xác.',
            advice: currentItem.hintTip || `Bạn vừa đọc: "${transcript}". Hãy nghe lại và phát âm rõ âm đuôi của từ "${currentItem.word}".`,
          });
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setSpeakingFeedback({
          kind: 'incorrect',
          message: 'Chưa nhận diện được giọng nói.',
          advice: 'Vui lòng kiểm tra quyền micro và thử nói to, rõ ràng hơn.',
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const counts = useMemo(() => {
    return {
      all: items.length,
      dict: items.filter((i) => i.source === 'DICTATION').length,
      shad: items.filter((i) => i.source === 'SHADOWING').length,
      starred: items.filter((i) => i.isStarred).length,
    };
  }, [items]);

  return (
    <main className="mx-auto min-h-[calc(100vh-76px)] max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-slate-900">
      {/* Nút quay lại danh sách bài học có ô khung rõ ràng */}
      <div className="mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
        >
          <span aria-hidden="true" className="text-lg">←</span> Quay lại danh sách bài học
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8">
        <span className="text-base font-bold uppercase tracking-wider text-blue-600">
          Trung tâm ôn tập từ vựng chuyên sâu
        </span>
        <h1 className="mt-1 text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          📖 Danh sách từ vựng ôn tập
        </h1>
        <p className="mt-2 text-lg text-slate-600 max-w-3xl">
          Toàn bộ các từ cần củng cố khi Luyện nghe &amp; Luyện nói được tập hợp tại đây. Bạn có thể nghe phát âm, ẩn từ để tự kiểm tra trí nhớ, hoặc luyện tập gõ và nói trực tiếp.
        </p>
      </header>

      {/* Thống kê nhanh 4 thẻ màu nổi bật */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <article className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-5 shadow-sm">
          <span className="block text-sm font-bold uppercase tracking-wider text-blue-700">Tổng từ cần ôn</span>
          <strong className="mt-1 block text-3xl font-black text-blue-800">{counts.all}</strong>
        </article>
        <article className="rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-5 shadow-sm">
          <span className="block text-sm font-bold uppercase tracking-wider text-sky-700">Từ Luyện nghe</span>
          <strong className="mt-1 block text-3xl font-black text-sky-800">{counts.dict}</strong>
        </article>
        <article className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
          <span className="block text-sm font-bold uppercase tracking-wider text-indigo-700">Từ Luyện nói</span>
          <strong className="mt-1 block text-3xl font-black text-indigo-800">{counts.shad}</strong>
        </article>
        <article className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5 shadow-sm">
          <span className="block text-sm font-bold uppercase tracking-wider text-amber-700">Đã gắn sao ⭐</span>
          <strong className="mt-1 block text-3xl font-black text-amber-800">{counts.starred}</strong>
        </article>
      </section>

      {/* Bộ lọc, tìm kiếm và công cụ thao tác */}
      <section className="mb-6 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`rounded-xl px-4 py-2 text-base font-bold transition ${
              filter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter('DICTATION')}
            className={`rounded-xl px-4 py-2 text-base font-bold transition ${
              filter === 'DICTATION'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Luyện nghe ({counts.dict})
          </button>
          <button
            type="button"
            onClick={() => setFilter('SHADOWING')}
            className={`rounded-xl px-4 py-2 text-base font-bold transition ${
              filter === 'SHADOWING'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Luyện nói ({counts.shad})
          </button>
          <button
            type="button"
            onClick={() => setFilter('STARRED')}
            className={`rounded-xl px-4 py-2 text-base font-bold transition ${
              filter === 'STARRED'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ⭐ Yêu thích ({counts.starred})
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 md:w-64">
            <input
              type="text"
              placeholder="Tìm kiếm từ vựng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={toggleAllBlur}
            className="rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-base font-bold text-slate-700 hover:bg-slate-50 transition"
            title="Ẩn hoặc hiện toàn bộ từ để kiểm tra khả năng nhớ"
          >
            {allBlurred ? '👁️ Hiện tất cả' : '👁️ Ẩn tất cả'}
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2 text-base font-bold text-rose-700 hover:bg-rose-100 transition"
              title="Xóa toàn bộ danh sách ôn tập"
            >
              🗑️ Xóa tất cả
            </button>
          )}
        </div>
      </section>

      {/* Main 2-column Layout */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1.8fr] items-start">
        {/* Left column: Word list */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xl font-extrabold text-slate-900">
              Danh sách từ vựng ({filteredItems.length})
            </h2>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Chọn từ để luyện tập
            </span>
          </div>

          <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredItems.map((item, index) => {
              const isSelected = (currentItem?.id === item.id);
              const isBlurred = Boolean(blurredWordIds[item.id]);

              return (
                <article
                  key={item.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <strong
                          className={`text-xl font-black text-slate-900 transition ${
                            isBlurred ? 'select-none blur-sm' : ''
                          }`}
                        >
                          {item.word}
                        </strong>
                        <span
                          className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                            item.source === 'SHADOWING'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.source === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe'}
                        </span>
                      </div>

                      {item.sentence && (
                        <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">
                          &ldquo;{item.sentence}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => speakWord(item.word)}
                        title={`Nghe phát âm "${item.word}"`}
                        className="rounded-lg p-2 text-slate-500 hover:bg-blue-100 hover:text-blue-700 transition"
                      >
                        🔊
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleWordBlur(item.id, e)}
                        title={isBlurred ? 'Hiện từ này' : 'Ẩn từ này'}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition"
                      >
                        {isBlurred ? '🙈' : '👁️'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleStar(item.id, e)}
                        title={item.isStarred ? 'Bỏ dấu sao' : 'Gắn dấu sao'}
                        className={`rounded-lg p-2 transition ${item.isStarred ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                      >
                        {item.isStarred ? '★' : '☆'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleAddToPersonalDict(item, e)}
                        title="Thêm vào Sổ từ vựng cá nhân"
                        className="rounded-lg p-2 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 transition"
                      >
                        📖
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        title="Xóa khỏi danh sách ôn tập"
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!filteredItems.length && (
              <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                <span className="text-4xl block mb-2">🎉</span>
                <p className="text-base font-bold">
                  {items.length === 0
                    ? 'Bạn chưa có từ vựng nào cần ôn lại.'
                    : 'Không tìm thấy từ vựng phù hợp với bộ lọc.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right column: Interactive Practice Console */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-7 shadow-sm sticky top-6">
          {currentItem ? (
            <div>
              {/* Word Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {currentItem.word}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakWord(currentItem.word)}
                      title={`Nghe phát âm chuẩn "${currentItem.word}"`}
                      className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition"
                    >
                      🔊
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleStar(currentItem.id, e)}
                      title={currentItem.isStarred ? 'Bỏ sao' : 'Gắn sao'}
                      className={`text-2xl transition ${currentItem.isStarred ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                    >
                      {currentItem.isStarred ? '★' : '☆'}
                    </button>
                  </div>
                  <span className="mt-1 inline-block text-xs font-extrabold uppercase tracking-wider text-blue-600">
                    Nguồn từ: {currentItem.source === 'SHADOWING' ? 'Bài Luyện nói (Shadowing)' : 'Bài Luyện nghe (Dictation)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleAddToPersonalDict(currentItem, e)}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-2.5 text-base font-bold text-emerald-800 shadow-sm hover:bg-emerald-100 transition shrink-0"
                >
                  📖 Lưu vào Sổ từ vựng
                </button>
              </div>

              {/* Ngữ cảnh câu */}
              {currentItem.sentence && (
                <div className="my-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ngữ cảnh bài học:
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-800">
                    &ldquo;{currentItem.sentence}&rdquo;
                  </p>
                  {currentItem.hintTip && (
                    <p className="mt-2 text-sm text-blue-800 bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
                      💡 <strong>Mẹo phát âm:</strong> {currentItem.hintTip}
                    </p>
                  )}
                </div>
              )}

              {/* Interactive Test Modes */}
              <div className="mt-6">
                <div className="flex border-b-2 border-slate-200 mb-5">
                  <button
                    type="button"
                    onClick={() => setPracticeTab('TYPING')}
                    className={`pb-3 px-5 text-base font-bold transition border-b-4 -mb-[2px] ${
                      practiceTab === 'TYPING'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ✍️ Kiểm tra gõ từ (Dictation)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPracticeTab('SPEAKING')}
                    className={`pb-3 px-5 text-base font-bold transition border-b-4 -mb-[2px] ${
                      practiceTab === 'SPEAKING'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🎙️ Luyện phát âm (Shadowing)
                  </button>
                </div>

                {/* Tab Gõ chính tả */}
                {practiceTab === 'TYPING' && (
                  <form onSubmit={handleCheckTyped} className="space-y-4">
                    <p className="text-base text-slate-600">
                      Nghe phát âm từ và nhập lại chính xác từ vựng vào ô dưới đây:
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={typedAnswer}
                        onChange={(e) => {
                          setTypedAnswer(e.target.value);
                          if (typingFeedback) setTypingFeedback(null);
                        }}
                        placeholder="Nhập từ vựng tiếng Anh..."
                        className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-lg font-bold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => speakWord(currentItem.word)}
                        className="rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-lg hover:bg-slate-100 transition"
                        title="Nghe lại"
                      >
                        🔊
                      </button>
                      <button
                        type="submit"
                        disabled={!typedAnswer.trim()}
                        className="rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Kiểm tra
                      </button>
                    </div>

                    {typingFeedback && (
                      <div
                        className={`rounded-2xl p-4 text-base font-bold ${
                          typingFeedback.kind === 'correct'
                            ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-2 border-rose-300'
                        }`}
                      >
                        <p>{typingFeedback.message}</p>
                        {typingFeedback.hintChars && (
                          <p className="mt-1 font-mono text-sm text-slate-600">
                            {typingFeedback.hintChars}
                          </p>
                        )}
                      </div>
                    )}
                  </form>
                )}

                {/* Tab Luyện nói */}
                {practiceTab === 'SPEAKING' && (
                  <div className="space-y-4">
                    <p className="text-base text-slate-600">
                      Bấm nút bắt đầu để ghi âm và phát âm từ &ldquo;<strong>{currentItem.word}</strong>&rdquo;:
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={isRecording}
                        className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-white shadow-md transition ${
                          isRecording
                            ? 'bg-rose-600 animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <span>{isRecording ? '🔴 Đang nghe bạn nói...' : '🎙️ Bắt đầu nói'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => speakWord(currentItem.word)}
                        className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        🔊 Nghe mẫu phát âm
                      </button>
                    </div>

                    {spokenTranscript && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <strong>Micro nhận diện:</strong> &ldquo;{spokenTranscript}&rdquo;
                      </div>
                    )}

                    {speakingFeedback && (
                      <div
                        className={`rounded-2xl p-4 text-base font-bold ${
                          speakingFeedback.kind === 'correct'
                            ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-300'
                            : 'bg-amber-50 text-amber-900 border-2 border-amber-300'
                        }`}
                      >
                        <p>{speakingFeedback.message}</p>
                        {speakingFeedback.advice && (
                          <p className="mt-1 text-sm font-normal text-slate-700">
                            {speakingFeedback.advice}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400">
              <span className="text-5xl block mb-3">📖</span>
              <p className="text-lg font-bold">Hãy chọn một từ ở cột bên trái để bắt đầu ôn tập</p>
            </div>
          )}
        </section>
      </div>

      {/* Redesigned Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl border-2 border-emerald-400 bg-white/95 backdrop-blur-md px-5 py-4 text-slate-800 shadow-2xl shadow-emerald-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-lg font-black text-white shadow-md">
            ✓
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
              Ôn tập từ vựng
            </p>
            <p className="text-base font-bold text-slate-800">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 font-bold p-1"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}

export default function VocabularyReviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải danh sách từ vựng ôn tập…</div>}>
      <VocabularyReviewContent />
    </Suspense>
  );
}
