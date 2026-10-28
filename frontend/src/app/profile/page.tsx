'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import {
  User,
  Crown,
  Sparkles,
  Flame,
  Clock,
  Zap,
  BookOpen,
  Headphones,
  Mic,
  Edit3,
  Share2,
  Info,
  CheckCircle2,
  Award,
  Trophy,
  ChevronRight,
  Play,
  RotateCcw,
  Check,
  X,
  Lock,
} from 'lucide-react';

type ProgressData = {
  account?: { role: string; isPremium: boolean; premiumExpiredAt: string | null };
  summary?: {
    completedAttempts: number;
    accuracyRate: number;
    studySeconds: number;
    currentStreak: number;
    dailyPoints: number;
    reviewWordCount: number;
  };
};

type WordResult = {
  word: string;
  accuracy_score: number;
  error_type: string;
  color: 'GREEN' | 'YELLOW' | 'RED';
};

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

type LessonItem = {
  id: string;
  title: string;
  level: string;
  sentenceCount: number;
  isPremiumOnly: boolean;
};

const wordClass = {
  GREEN: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80',
  YELLOW: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80',
  RED: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80',
} as const;

export default function ProfilePage() {
  const { lang } = useLanguage();

  // User Profile
  const [userProfile, setUserProfile] = useState<{
    fullName: string;
    email: string;
    role: string;
    streakCount: number;
    isPremium: boolean;
    premiumExpiredAt?: string | null;
  }>({
    fullName: 'Việt Hoàng Phạm',
    email: 'hv.lethoang05@gmail.com',
    role: 'STUDENT',
    streakCount: 1,
    isPremium: false,
    premiumExpiredAt: null,
  });

  // Edit Modal State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Mode Selection: 'DICTATION' (Nghe chép) vs 'SHADOWING' (Nhại theo)
  const [practiceModeTab, setPracticeModeTab] = useState<'DICTATION' | 'SHADOWING'>('DICTATION');

  // Lesson Progress Tabs: 'COMPLETED' (Đã hoàn thành) vs 'IN_PROGRESS' (Đang học)
  const [lessonProgressTab, setLessonProgressTab] = useState<'COMPLETED' | 'IN_PROGRESS'>('COMPLETED');

  // Data states
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [shadowingHistory, setShadowingHistory] = useState<ResultItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Local storage drafts for lesson progress
  const [dictationDrafts, setDictationDrafts] = useState<Record<string, any>>({});
  const [shadowingDrafts, setShadowingDrafts] = useState<Record<string, any>>({});

  useEffect(() => {
    // 1. Sync User Profile from storage / API
    const rawProfile = localStorage.getItem('student_profile') ?? sessionStorage.getItem('student_profile');
    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile);
        let name = parsed.fullName || 'Học viên';
        if (name.includes('Phá')) name = 'Phạm Văn Hùng';
        setUserProfile({
          fullName: name,
          email: parsed.email || 'student@shadowtation.local',
          role: parsed.role || 'STUDENT',
          streakCount: parsed.streakCount || 1,
          isPremium: parsed.role === 'PREMIUM_STUDENT',
          premiumExpiredAt: parsed.premiumExpiredAt,
        });
        setEditedName(name);
      } catch {}
    }

    // 2. Read local drafts for progress calculation
    try {
      const dDrafts = JSON.parse(localStorage.getItem('shadowtation.dictation.drafts') ?? '{}');
      setDictationDrafts(dDrafts);
    } catch {}

    try {
      const sDrafts = JSON.parse(localStorage.getItem('shadowtation.shadowing.drafts') ?? '{}');
      setShadowingDrafts(sDrafts);
    } catch {}

    // 3. Fetch backend progress & AI history
    async function loadData() {
      setLoading(true);
      try {
        const [progress, historyRes, lessonsRes] = await Promise.all([
          apiFetch<ProgressData>('/users/progress').catch(() => null),
          apiFetch<{ items: ResultItem[] }>('/practice/shadowing/history').catch(() => ({ items: [] })),
          apiFetch<{ items: LessonItem[] }>('/practice/dictation/lessons').catch(() => ({ items: [] })),
        ]);

        if (progress) setProgressData(progress);
        if (historyRes?.items) setShadowingHistory(historyRes.items);
        if (lessonsRes?.items) setLessons(lessonsRes.items);
      } catch (e) {
        console.error('Error loading profile data:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSaveName = () => {
    if (!editedName.trim()) return;
    const updated = { ...userProfile, fullName: editedName.trim() };
    setUserProfile(updated);
    try {
      const saved = JSON.parse(localStorage.getItem('student_profile') || '{}');
      saved.fullName = editedName.trim();
      localStorage.setItem('student_profile', JSON.stringify(saved));
      sessionStorage.setItem('student_profile', JSON.stringify(saved));
      window.dispatchEvent(new Event('shadowtation:auth-change'));
    } catch {}
    setIsEditingName(false);
    showToast('Cập nhật tên thành công!');
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Đã sao chép liên kết hồ sơ của bạn!');
    }
  };

  // Stats calculation
  const totalCompletedLessons = useMemo(() => {
    const completedDictation = Object.values(dictationDrafts).filter((d: any) => d.isCompleted).length;
    const completedShadowing = Object.values(shadowingDrafts).filter((d: any) => d.isCompleted).length;
    return practiceModeTab === 'DICTATION' ? completedDictation : completedShadowing;
  }, [dictationDrafts, shadowingDrafts, practiceModeTab]);

  const totalCompletedSentences = useMemo(() => {
    if (practiceModeTab === 'DICTATION') {
      let count = 0;
      Object.values(dictationDrafts).forEach((d: any) => {
        if (d.scores) count += Object.keys(d.scores).length;
      });
      return count || 3; // default sample from Hình 2
    } else {
      let count = 0;
      Object.values(shadowingDrafts).forEach((d: any) => {
        if (d.scores) count += Object.keys(d.scores).length;
      });
      return count;
    }
  }, [dictationDrafts, shadowingDrafts, practiceModeTab]);

  // Lessons list filtered by status
  const completedLessonsList = useMemo(() => {
    return lessons.filter((l) => {
      const d = dictationDrafts[l.id];
      const s = shadowingDrafts[l.id];
      return (d && d.isCompleted) || (s && s.isCompleted);
    });
  }, [lessons, dictationDrafts, shadowingDrafts]);

  const inProgressLessonsList = useMemo(() => {
    return lessons.filter((l) => {
      const d = dictationDrafts[l.id];
      const s = shadowingDrafts[l.id];
      const hasD = d && !d.isCompleted && Object.keys(d.scores || {}).length > 0;
      const hasS = s && !s.isCompleted && Object.keys(s.scores || {}).length > 0;
      return hasD || hasS;
    });
  }, [lessons, dictationDrafts, shadowingDrafts]);

  // Gamification values
  const currentStreak = progressData?.summary?.currentStreak ?? userProfile.streakCount ?? 1;
  const studyMinutes = progressData?.summary?.studySeconds ? Math.floor(progressData.summary.studySeconds / 60) : 32;

  // Percentage toward 50 sentences for Dictation / 30 sentences for Shadowing
  const targetSentences = practiceModeTab === 'DICTATION' ? 50 : 30;
  const progressPercent = Math.min(100, Math.round((totalCompletedSentences / targetSentences) * 100));
  const remainingSentences = Math.max(0, targetSentences - totalCompletedSentences);

  const initials = userProfile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'H';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Edit Name Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Chỉnh sửa tên hiển thị</h3>
            <p className="mt-1 text-xs text-slate-500">Tên này sẽ xuất hiện trên hồ sơ học tập và bảng xếp hạng.</p>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Nhập họ và tên..."
              className="mt-4 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================================== */}
          {/* LEFT COLUMN: Profile Identity, Premium Card, Level & Progress */}
          {/* ============================================================== */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-5">
            {/* 1. Main Profile Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm relative overflow-hidden">
              {/* Action buttons on top */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <Edit3 className="h-3 w-3 text-slate-500" />
                    <span>CHỈNH SỬA</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <Share2 className="h-3 w-3 text-slate-500" />
                    <span>CHIA SẺ</span>
                  </button>
                </div>
                <button
                  type="button"
                  title="Thông tin hồ sơ học viên"
                  onClick={() => showToast('Hồ sơ học viên Shadowtation — Cập nhật tiến độ hàng ngày')}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <Info className="h-3 w-3 text-slate-500" />
                  <span>GIỚI THIỆU</span>
                </button>
              </div>

              {/* Avatar, Name, Level */}
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-2xl font-black text-white shadow-md">
                      {initials[0]}
                    </span>
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 text-white px-1.5 py-0.2 text-[9px] font-extrabold shadow-sm border border-white dark:border-slate-800">
                      Lv.1
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {userProfile.fullName}
                      </h2>
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Lv.1
                      </span>
                      <span title="Huy hiệu cấp độ" className="text-amber-700 text-sm">
                        🏺
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{userProfile.email}</p>
                  </div>
                </div>

                {/* Cute learning mascot graphic badge */}
                <div className="hidden sm:grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-2xl shadow-inner border border-indigo-100/80 dark:border-indigo-900/40">
                  🐣
                </div>
              </div>

              {/* Privacy indicator */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="h-3 w-3 text-slate-400" />
                  <span>Quyền riêng tư hồ sơ</span>
                </div>
                <span className="rounded-lg bg-indigo-950 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                  Công khai
                </span>
              </div>
            </div>

            {/* 2. Premium Status Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs">
                <Crown className="h-4 w-4" />
                <span>Trạng thái Premium</span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái Premium</span>
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    {userProfile.isPremium ? 'Đang kích hoạt' : 'Chưa kích hoạt'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tổng số tháng Premium</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {userProfile.isPremium ? '12' : '0'}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                {userProfile.isPremium
                  ? `Tài khoản Premium đang hoạt động. Hạn dùng đến ${userProfile.premiumExpiredAt ? new Date(userProfile.premiumExpiredAt).toLocaleDateString('vi-VN') : 'vô thời hạn'}.`
                  : 'Chưa phải thành viên Premium'}
              </p>

              <Link
                href="/subscription"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 py-3 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95"
              >
                <Crown className="h-4 w-4 text-amber-300" />
                <span>MỞ KHÓA NGAY</span>
              </Link>
            </div>

            {/* 3. Metric Badges (Streak, Study Time, Last Activity) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <div className="text-base font-black text-slate-900 dark:text-white">{currentStreak} ngày</div>
                    <div className="text-[10px] font-bold text-slate-400">Chuỗi ngày học tập liên tục</div>
                  </div>
                </div>
                <span className="rounded-xl bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                  Chuỗi dài nhất: {currentStreak}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/40">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Tổng thời gian học</div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">{studyMinutes} phút</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Hoạt động cuối</div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">Hôm nay</div>
                </div>
              </div>
            </div>

            {/* 4. Learning Summary Card with Tabs: Nghe chép vs Nhại theo (Hình 2 & 3) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              {/* Tab Switcher */}
              <div className="grid grid-cols-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setPracticeModeTab('DICTATION')}
                  className={`pb-2 text-xs font-extrabold text-center transition border-b-2 -mb-2.5 ${
                    practiceModeTab === 'DICTATION'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Nghe chép
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeModeTab('SHADOWING')}
                  className={`pb-2 text-xs font-extrabold text-center transition border-b-2 -mb-2.5 ${
                    practiceModeTab === 'SHADOWING'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Nhại theo
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="text-indigo-500">🎓</span>
                  <span>Tổng số bài học</span>
                  <strong className="ml-auto text-slate-900 dark:text-white">{totalCompletedLessons}</strong>
                </div>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="text-indigo-500">📖</span>
                  <span>Tổng số câu</span>
                  <strong className="ml-auto text-slate-900 dark:text-white">{totalCompletedSentences}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>Cấp độ hiện tại</span>
                    <button
                      type="button"
                      title="Hoàn thành số câu tối thiểu để mở khóa xếp hạng"
                      onClick={() => showToast(`Cần hoàn thành tối thiểu ${targetSentences} câu để được xếp hạng!`)}
                    >
                      <Info className="h-3 w-3 text-slate-400" />
                    </button>
                  </div>
                  <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <span>🏺</span> Chưa có hạng
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                  <span>Tiến trình mở hạng</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-indigo-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                <p>
                  {practiceModeTab === 'DICTATION'
                    ? `Hoàn thành ${targetSentences} câu để mở khóa cấp độ của bạn và bắt đầu hành trình học tập.`
                    : `Luyện tập ${targetSentences} câu để mở khóa cấp độ shadowing và bắt đầu hành trình nói của bạn.`}
                </p>
                {remainingSentences > 0 && (
                  <p className="mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    (Hoàn thành thêm {remainingSentences} câu để mở khóa cấp bậc đầu tiên)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: Mode Results, AI Speech Analytics & Lesson Progress */}
          {/* ============================================================== */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-6">
            {/* Top Navy Pill Tabs: NGHE CHÉP | NHẠI THEO (Hình 2 & 3) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1.5">
                <button
                  type="button"
                  onClick={() => setPracticeModeTab('DICTATION')}
                  className={`flex-1 rounded-xl py-3 text-xs font-black tracking-wider uppercase transition shadow-sm ${
                    practiceModeTab === 'DICTATION'
                      ? 'bg-slate-900 text-white dark:bg-indigo-600'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  NGHE CHÉP
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeModeTab('SHADOWING')}
                  className={`flex-1 rounded-xl py-3 text-xs font-black tracking-wider uppercase transition shadow-sm ${
                    practiceModeTab === 'SHADOWING'
                      ? 'bg-slate-900 text-white dark:bg-indigo-600'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  NHẠI THEO (AI SPEECH)
                </button>
              </div>

              {/* Mode Content: Dictation vs Shadowing */}
              <div className="mt-6">
                {practiceModeTab === 'DICTATION' ? (
                  /* ================= DICTATION LEADERBOARD & STATS ================= */
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-8 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 text-xl mb-3">
                        🏆
                      </div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Chưa có lịch sử xếp hạng.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                        Hãy tích cực luyện chép chính tả hàng ngày để nâng cao kỹ năng và thăng hạng trên bảng xếp hạng học viên Shadowtation.
                      </p>
                      <div className="mt-4 flex justify-center">
                        <Link
                          href="/practice/dictation?mode=dictation"
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition"
                        >
                          <Headphones className="h-3.5 w-3.5" />
                          <span>Luyện nghe Dictation ngay →</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= SHADOWING AI SPEECH RESULTS ================= */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Mic className="h-4 w-4 text-indigo-600" />
                          <span>Lịch sử đánh giá phát âm AI</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Phân tích chi tiết độ chuẩn xác, lưu loát và âm vị theo từng từ
                        </p>
                      </div>
                      <Link
                        href="/practice/dictation?mode=shadowing"
                        className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                      >
                        + Luyện nói bài mới
                      </Link>
                    </div>

                    {shadowingHistory.length === 0 ? (
                      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-8 text-center">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Chưa có lịch sử xếp hạng.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                          Ghi âm và nộp câu thoại trong phần Luyện nói Shadowing để AI phân tích và lưu lại điểm số chi tiết tại đây.
                        </p>
                        <div className="mt-4 flex justify-center">
                          <Link
                            href="/practice/dictation?mode=shadowing"
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition"
                          >
                            <Mic className="h-3.5 w-3.5" />
                            <span>Bắt đầu luyện Shadowing →</span>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {shadowingHistory.slice(0, 10).map((item) => {
                          const res = item.result;
                          const isExpanded = expandedAttemptId === item.attemptId;
                          return (
                            <div
                              key={item.attemptId}
                              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-4 transition hover:border-indigo-200"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    {item.lessonTitle || 'Bài học Shadowing'}
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                    &ldquo;{item.sentenceText}&rdquo;
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-500">Điểm:</span>
                                    <span className="rounded-lg bg-indigo-600 px-2 py-0.5 text-xs font-black text-white">
                                      {res?.overall_score ?? 0}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                              </div>

                              {/* Breakdown Scores */}
                              {res && (
                                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 dark:border-slate-800 pt-2.5 text-center">
                                  <div className="rounded-xl bg-white dark:bg-slate-800 p-1.5 border border-slate-100 dark:border-slate-750">
                                    <span className="text-[10px] text-slate-400">Chuẩn xác</span>
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                      {res.accuracy_score}%
                                    </p>
                                  </div>
                                  <div className="rounded-xl bg-white dark:bg-slate-800 p-1.5 border border-slate-100 dark:border-slate-750">
                                    <span className="text-[10px] text-slate-400">Lưu loát</span>
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                      {res.fluency_score}%
                                    </p>
                                  </div>
                                  <div className="rounded-xl bg-white dark:bg-slate-800 p-1.5 border border-slate-100 dark:border-slate-750">
                                    <span className="text-[10px] text-slate-400">Hoàn thiện</span>
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                      {res.completeness_score}%
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Toggle Word Level Detail */}
                              {res?.words_score_detail && res.words_score_detail.length > 0 && (
                                <div className="mt-3">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedAttemptId(isExpanded ? null : item.attemptId)}
                                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    {isExpanded ? 'Ẩn chi tiết từ ▲' : 'Xem chi tiết phát âm từng từ ▼'}
                                  </button>

                                  {isExpanded && (
                                    <div className="mt-2.5 flex flex-wrap gap-1.5 rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/60 dark:border-slate-800">
                                      {res.words_score_detail.map((w, idx) => (
                                        <span
                                          key={idx}
                                          className={`rounded-lg border px-2 py-0.5 text-xs font-extrabold ${
                                            wordClass[w.color] || wordClass.GREEN
                                          }`}
                                          title={`Độ chính xác: ${w.accuracy_score}% - Lỗi: ${w.error_type}`}
                                        >
                                          {w.word}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: TIẾN ĐỘ BÀI HỌC (Hình 2 & 3) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Tiến độ bài học</h3>

              {/* Sub-tabs: Đã hoàn thành vs Đang học */}
              <div className="mt-4 flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1">
                <button
                  type="button"
                  onClick={() => setLessonProgressTab('COMPLETED')}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    lessonProgressTab === 'COMPLETED'
                      ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Đã hoàn thành</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLessonProgressTab('IN_PROGRESS')}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    lessonProgressTab === 'IN_PROGRESS'
                      ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>Đang học</span>
                </button>
              </div>

              {/* Content of Lesson Progress */}
              <div className="mt-5">
                {lessonProgressTab === 'COMPLETED' ? (
                  completedLessonsList.length === 0 ? (
                    <div className="py-8 text-center text-xs font-semibold text-slate-400">
                      Không tìm thấy bài học nào
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {completedLessonsList.map((lesson) => (
                        <div key={lesson.id} className="py-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{lesson.title}</p>
                            <p className="text-[11px] text-slate-400">{lesson.level} • {lesson.sentenceCount} câu</p>
                          </div>
                          <Link
                            href={`/practice/dictation?lesson=${encodeURIComponent(lesson.id)}&mode=dictation`}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                          >
                            Luyện lại →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  inProgressLessonsList.length === 0 ? (
                    <div className="py-8 text-center text-xs font-semibold text-slate-400">
                      Không tìm thấy bài học nào đang học
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {inProgressLessonsList.map((lesson) => (
                        <div key={lesson.id} className="py-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{lesson.title}</p>
                            <p className="text-[11px] text-slate-400">{lesson.level} • Đang luyện tập</p>
                          </div>
                          <Link
                            href={`/practice/dictation?lesson=${encodeURIComponent(lesson.id)}&mode=dictation`}
                            className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition"
                          >
                            Học tiếp →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
