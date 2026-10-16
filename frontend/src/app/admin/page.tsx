'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  ShieldCheck,
  Database,
  Server,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Users,
  CheckCircle2,
  Lock,
  Layers,
  CreditCard,
  BookOpen,
  Activity,
  Plus,
  Trash2,
  Edit3,
  X,
  Search,
  Sparkles,
  Headphones,
  AlertCircle,
  FileText,
  Clock,
  Check,
} from 'lucide-react';

type HealthData = {
  status: string;
  database: string;
  timestamp: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  price: string;
  durationDays: number;
  isActive: boolean;
};

type LessonItem = {
  id: string;
  title: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  audioUrl: string;
  mediaType: 'AUDIO' | 'VIDEO' | 'PODCAST';
  sourceName: string | null;
  sourceUrl: string | null;
  durationSeconds: number | null;
  isPremiumOnly: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sentenceCount: number;
  createdAt: string;
};

type LessonSentence = {
  id: string;
  orderIndex: number;
  startTime: number;
  endTime: number;
  textContent: string;
  wordsJson: { word: string; start: number; end: number }[];
};

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'PLANS' | 'LESSONS' | 'SYSTEM'>('PLANS');

  // Notification Toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ================= TAB 1: PLANS STATE =================
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 199000,
    durationDays: 30,
    isActive: true,
  });

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const data = await apiFetch<SubscriptionPlan[]>('/admin/subscription-plans');
      setPlans(data);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách gói cước', 'error');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({ name: '', price: 199000, durationDays: 30, isActive: true });
    setPlanModalOpen(true);
  };

  const handleOpenEditPlan = (p: SubscriptionPlan) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      price: Number(p.price) || 0,
      durationDays: p.durationDays,
      isActive: p.isActive,
    });
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await apiFetch(`/admin/subscription-plans/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(planForm),
        });
        showToast(`Đã cập nhật gói cước "${planForm.name}" thành công!`);
      } else {
        await apiFetch('/admin/subscription-plans', {
          method: 'POST',
          body: JSON.stringify(planForm),
        });
        showToast(`Đã tạo mới gói cước "${planForm.name}" thành công!`);
      }
      setPlanModalOpen(false);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu gói cước', 'error');
    }
  };

  const handleDeletePlan = async (p: SubscriptionPlan) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa hoặc ẩn gói cước "${p.name}"?`)) return;
    try {
      const res = await apiFetch<{ success: boolean; message: string; action: string }>(
        `/admin/subscription-plans/${p.id}`,
        { method: 'DELETE' }
      );
      showToast(res.message);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa gói cước', 'error');
    }
  };

  // ================= TAB 2: LESSONS STATE =================
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonSearch, setLessonSearch] = useState('');
  const [lessonLevelFilter, setLessonLevelFilter] = useState<string>('ALL');
  const [lessonStatusFilter, setLessonStatusFilter] = useState<string>('ALL');

  // Lesson Modal
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonItem | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    level: 'BEGINNER' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    audioUrl: '',
    mediaType: 'AUDIO' as 'AUDIO' | 'VIDEO' | 'PODCAST',
    sourceName: '',
    sourceUrl: '',
    durationSeconds: 120,
    isPremiumOnly: false,
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  });

  // Sentences Modal (Transcript Review)
  const [sentencesModalOpen, setSentencesModalOpen] = useState(false);
  const [selectedLessonForSentences, setSelectedLessonForSentences] = useState<LessonItem | null>(null);
  const [lessonSentences, setLessonSentences] = useState<LessonSentence[]>([]);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [newSentenceText, setNewSentenceText] = useState('');
  const [newSentenceStart, setNewSentenceStart] = useState(0);
  const [newSentenceEnd, setNewSentenceEnd] = useState(3.0);

  const loadLessons = async () => {
    setLoadingLessons(true);
    try {
      const params = new URLSearchParams();
      if (lessonLevelFilter !== 'ALL') params.append('level', lessonLevelFilter);
      if (lessonStatusFilter !== 'ALL') params.append('status', lessonStatusFilter);
      if (lessonSearch.trim()) params.append('q', lessonSearch.trim());

      const data = await apiFetch<LessonItem[]>(`/admin/lessons?${params.toString()}`);
      setLessons(data);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách bài học', 'error');
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleOpenCreateLesson = () => {
    setEditingLesson(null);
    setLessonForm({
      title: '',
      level: 'BEGINNER',
      audioUrl: '',
      mediaType: 'AUDIO',
      sourceName: '',
      sourceUrl: '',
      durationSeconds: 120,
      isPremiumOnly: false,
      status: 'DRAFT',
    });
    setLessonModalOpen(true);
  };

  const handleOpenEditLesson = (l: LessonItem) => {
    setEditingLesson(l);
    setLessonForm({
      title: l.title,
      level: l.level,
      audioUrl: l.audioUrl,
      mediaType: l.mediaType,
      sourceName: l.sourceName || '',
      sourceUrl: l.sourceUrl || '',
      durationSeconds: l.durationSeconds || 0,
      isPremiumOnly: l.isPremiumOnly,
      status: l.status,
    });
    setLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLesson) {
        await apiFetch(`/admin/lessons/${editingLesson.id}`, {
          method: 'PUT',
          body: JSON.stringify(lessonForm),
        });
        showToast(`Đã cập nhật bài học "${lessonForm.title}" thành công!`);
      } else {
        await apiFetch('/admin/lessons', {
          method: 'POST',
          body: JSON.stringify(lessonForm),
        });
        showToast(`Đã tạo mới bài học "${lessonForm.title}" thành công!`);
      }
      setLessonModalOpen(false);
      loadLessons();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu bài học', 'error');
    }
  };

  const handleDeleteLesson = async (l: LessonItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài học "${l.title}"? Mọi câu thoại và lịch sử liên quan sẽ bị xóa.`)) return;
    try {
      await apiFetch(`/admin/lessons/${l.id}`, { method: 'DELETE' });
      showToast(`Đã xóa bài học "${l.title}" thành công.`);
      loadLessons();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa bài học', 'error');
    }
  };

  const handleOpenSentencesModal = async (l: LessonItem) => {
    setSelectedLessonForSentences(l);
    setSentencesModalOpen(true);
    setLoadingSentences(true);
    try {
      const data = await apiFetch<any>(`/admin/lessons/${l.id}`);
      setLessonSentences(data.sentences || []);
      // Tính toán start tiếp theo
      const last = (data.sentences || [])[data.sentences.length - 1];
      if (last) {
        setNewSentenceStart(Number(last.endTime.toFixed(1)));
        setNewSentenceEnd(Number((last.endTime + 3.0).toFixed(1)));
      } else {
        setNewSentenceStart(0);
        setNewSentenceEnd(3.0);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải câu thoại của bài học', 'error');
    } finally {
      setLoadingSentences(false);
    }
  };

  const handleAddSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForSentences || !newSentenceText.trim()) return;

    try {
      await apiFetch(`/admin/lessons/${selectedLessonForSentences.id}/sentences`, {
        method: 'POST',
        body: JSON.stringify({
          orderIndex: lessonSentences.length,
          startTime: Number(newSentenceStart),
          endTime: Number(newSentenceEnd),
          textContent: newSentenceText.trim(),
        }),
      });

      showToast('Đã thêm câu thoại thành công!');
      setNewSentenceText('');
      // Reload sentences
      const data = await apiFetch<any>(`/admin/lessons/${selectedLessonForSentences.id}`);
      setLessonSentences(data.sentences || []);
      const last = (data.sentences || [])[data.sentences.length - 1];
      if (last) {
        setNewSentenceStart(Number(last.endTime.toFixed(1)));
        setNewSentenceEnd(Number((last.endTime + 3.0).toFixed(1)));
      }
      loadLessons();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi thêm câu thoại', 'error');
    }
  };

  const handleDeleteSentence = async (sentenceId: string) => {
    if (!selectedLessonForSentences) return;
    if (!confirm('Bạn có chắc muốn xóa câu thoại này?')) return;
    try {
      await apiFetch(`/admin/lessons/${selectedLessonForSentences.id}/sentences/${sentenceId}`, {
        method: 'DELETE',
      });
      showToast('Đã xóa câu thoại thành công!');
      const data = await apiFetch<any>(`/admin/lessons/${selectedLessonForSentences.id}`);
      setLessonSentences(data.sentences || []);
      loadLessons();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa câu thoại', 'error');
    }
  };

  // ================= TAB 3: SYSTEM HEALTH =================
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string>('');

  const checkHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await apiFetch<HealthData>('/health');
      setHealth(data);
      setLastCheck(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: any) {
      setHealthError(err.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setLoadingHealth(false);
    }
  };

  // Initial Load
  useEffect(() => {
    setMounted(true);
    checkHealth();
    loadPlans();
    loadLessons();
  }, []);

  // Format Helper
  const formatVND = (price: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price) || 0);
  };

  const formatSeconds = (sec: number | null) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
          <span>Đang tải thông tin quản trị...</span>
        </div>
      </div>
    );
  }

  // Guard: Chỉ cho phép người dùng có vai trò ADMIN
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Yêu cầu quyền Quản trị viên</h1>
        <p className="text-sm text-slate-600 mb-6">
          Khu vực này dành riêng cho tài khoản Quản trị viên (Admin). Bạn hiện đang đăng nhập với vai trò{' '}
          <strong className="text-slate-800">{user?.role || 'Khách'}</strong>.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Đổi sang tài khoản Admin
          </Link>
          <Link
            href="/"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-sm border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
              : 'bg-red-900 text-red-50 border-red-700'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trung tâm Quản trị (Admin Portal)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                UC-08
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý danh mục gói cước Premium, kho bài học audio/transcript và giám sát hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang chủ</span>
          </Link>
          <Link
            href="/practice/dictation"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-semibold transition-colors"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Vào Dictation</span>
          </Link>
        </div>
      </div>

      {/* 3 Main Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('PLANS')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'PLANS'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Quản lý Gói cước ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LESSONS')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'LESSONS'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Kho bài học & Câu thoại ({lessons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'SYSTEM'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Giám sát Hệ thống</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: QUẢN LÝ GÓI CƯỚC PREMIUM                          */}
      {/* ======================================================== */}
      {activeTab === 'PLANS' && (
        <div className="space-y-6">
          {/* Top action & metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh mục Gói cước Premium</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các gói cước được hiển thị tại trang nâng cấp để học viên chọn mua qua VNPAY / Stripe
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadPlans}
                disabled={loadingPlans}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Làm mới danh sách"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPlans ? 'animate-spin text-purple-600' : ''}`} />
              </button>
              <button
                onClick={handleOpenCreatePlan}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-200 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm gói cước mới</span>
              </button>
            </div>
          </div>

          {/* Plans Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tên gói dịch vụ</th>
                  <th className="py-3 px-4">Giá bán (VND)</th>
                  <th className="py-3 px-4">Thời hạn sử dụng</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      Chưa có gói cước nào. Nhấn &quot;Thêm gói cước mới&quot; để tạo gói đầu tiên.
                    </td>
                  </tr>
                ) : (
                  plans.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">{formatVND(p.price)}</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-semibold">{p.durationDays}</span> ngày
                      </td>
                      <td className="py-3.5 px-4">
                        {p.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đang mở bán
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Tạm ẩn
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditPlan(p)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa gói"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(p)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa hoặc ẩn gói"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: QUẢN LÝ KHO BÀI HỌC (LESSONS)                      */}
      {/* ======================================================== */}
      {activeTab === 'LESSONS' && (
        <div className="space-y-6">
          {/* Top filter & action */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Quản trị Kho Bài học (Lessons)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thêm mới bài học, chỉnh sửa transcript từng câu, gắn cờ độc quyền Premium
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadLessons}
                  disabled={loadingLessons}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                  title="Làm mới"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLessons ? 'animate-spin text-purple-600' : ''}`} />
                </button>
                <button
                  onClick={handleOpenCreateLesson}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-200 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm bài học mới</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tiêu đề bài học..."
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadLessons()}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-800"
                />
              </div>

              {/* Level Filter */}
              <select
                value={lessonLevelFilter}
                onChange={(e) => {
                  setLessonLevelFilter(e.target.value);
                  setTimeout(loadLessons, 50);
                }}
                className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả cấp độ</option>
                <option value="BEGINNER">BEGINNER (Cơ bản)</option>
                <option value="INTERMEDIATE">INTERMEDIATE (Trung cấp)</option>
                <option value="ADVANCED">ADVANCED (Nâng cao)</option>
              </select>

              {/* Status Filter */}
              <select
                value={lessonStatusFilter}
                onChange={(e) => {
                  setLessonStatusFilter(e.target.value);
                  setTimeout(loadLessons, 50);
                }}
                className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
                <option value="DRAFT">Bản nháp (DRAFT)</option>
                <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
              </select>
            </div>
          </div>

          {/* Lessons Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Bài học</th>
                  <th className="py-3 px-4">Cấp độ</th>
                  <th className="py-3 px-4">Thời lượng / Số câu</th>
                  <th className="py-3 px-4">Quyền truy cập</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {lessons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Không tìm thấy bài học nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  lessons.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{l.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {l.sourceName ? `Nguồn: ${l.sourceName}` : 'Học liệu nội bộ'} • {l.mediaType}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            l.level === 'BEGINNER'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : l.level === 'INTERMEDIATE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {l.level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div>
                          <Clock className="w-3 h-3 inline mr-1 text-slate-400" />
                          <span>{formatSeconds(l.durationSeconds)}</span>
                        </div>
                        <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                          {l.sentenceCount} câu thoại
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {l.isPremiumOnly ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Premium Only
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            Miễn phí
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {l.status === 'PUBLISHED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Xuất bản
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Bản nháp
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenSentencesModal(l)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-lg transition-colors cursor-pointer"
                            title="Quản lý câu thoại & transcript"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Soạn câu ({l.sentenceCount})</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditLesson(l)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Sửa bài học"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(l)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa bài học"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GIÁM SÁT HỆ THỐNG                                 */}
      {/* ======================================================== */}
      {activeTab === 'SYSTEM' && (
        <div className="space-y-6">
          {/* 3 Thẻ Trạng thái Hạ tầng & Bảo mật */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Hạ tầng Cơ sở dữ liệu */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                {health?.status === 'ok' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Hoạt động tốt
                  </span>
                ) : healthError ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    Lỗi kết nối
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Đang kiểm tra...</span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Cơ sở dữ liệu (Database)</h2>
              <p className="text-xs text-slate-500 mb-4">PostgreSQL 15 trên nền tảng Neon.tech Cloud (SSL)</p>
              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Trạng thái kết nối:</span>
                  <strong className="text-emerald-600 font-semibold">
                    {health?.database ? `DB: ${health.database.toUpperCase()}` : 'Chưa rõ'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kiểm tra gần nhất:</span>
                  <span className="text-slate-500">{lastCheck || 'Vừa xong'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kiểu dữ liệu hỗ trợ:</span>
                  <span className="text-slate-700 font-medium">TypeORM + JSONB</span>
                </div>
              </div>
            </div>

            {/* Card 2: Core API & Backend Server */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Cổng 4000
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Core Backend API</h2>
              <p className="text-xs text-slate-500 mb-4">NestJS Modular Monolith, TypeScript</p>
              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>API Base URL:</span>
                  <span className="font-mono text-indigo-600 bg-slate-50 px-1.5 py-0.5 rounded">/api/v1</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Swagger Docs:</span>
                  <a
                    href="http://localhost:4000/docs"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-purple-600 hover:underline"
                  >
                    /docs
                  </a>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Xử lý âm thanh:</span>
                  <span className="text-slate-700 font-medium">FFmpeg + Azure Speech</span>
                </div>
              </div>
            </div>

            {/* Card 3: Bảo mật & Xác thực (UC-01) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  UC-01 Đầy đủ
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Xác thực & Bảo mật (JWT)</h2>
              <p className="text-xs text-slate-500 mb-4">Quản lý phiên đăng nhập và an toàn tài khoản</p>
              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Rate-limiting chống dò pass:</span>
                  <strong className="text-emerald-600 font-semibold">Tối đa 5 lần / 60s</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thời gian Access Token:</span>
                  <span className="text-slate-700 font-medium">15 phút (Bearer)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thời hạn Refresh Token:</span>
                  <span className="text-slate-700 font-medium">7 ngày (Tự thu hồi khi đổi pass)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chi tiết kỹ thuật & Phân quyền */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Mô hình phân quyền người dùng</h2>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-xs">1. Học viên Miễn phí (STUDENT)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Luyện nghe Dictation các bài cơ bản</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">Mặc định</span>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-emerald-900 text-xs">2. Học viên Cao cấp (PREMIUM_STUDENT)</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">Mở khóa toàn bộ bài học, luyện Shadowing với AI</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Nâng cao</span>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/60 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-purple-900 text-xs">3. Quản trị viên (ADMIN)</div>
                    <div className="text-[11px] text-purple-700 mt-0.5">Quản lý kho bài học, gói cước và cấu hình hệ thống</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">Toàn quyền</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-bold text-slate-900">Kiến trúc Công nghệ</h2>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Frontend Framework</span>
                  <span className="font-medium text-slate-800">Next.js 14 App Router</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Backend Server</span>
                  <span className="font-medium text-slate-800">NestJS v10 Modular Monolith</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Cloud Database</span>
                  <span className="font-medium text-slate-800">Neon.tech Serverless PostgreSQL 15</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Cổng thanh toán (UC-10)</span>
                  <span className="font-medium text-slate-800">VNPAY Sandbox / Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: THÊM / SỬA GÓI CƯỚC                             */}
      {/* ======================================================== */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingPlan ? 'Chỉnh sửa Gói cước' : 'Thêm Gói cước mới'}
              </h3>
              <button
                onClick={() => setPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên gói cước</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Premium 3 Tháng"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giá tiền (VND)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  placeholder="199000"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">Định dạng hiển thị: {formatVND(planForm.price)}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số ngày sử dụng (ngày)</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="30"
                  value={planForm.durationDays}
                  onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Mở bán gói cước này ngay (Hiển thị cho học viên)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-200 transition-all cursor-pointer"
                >
                  {editingPlan ? 'Lưu thay đổi' : 'Tạo gói cước'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: THÊM / SỬA BÀI HỌC                              */}
      {/* ======================================================== */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingLesson ? 'Chỉnh sửa Bài học' : 'Thêm Bài học mới'}
              </h3>
              <button
                onClick={() => setLessonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề bài học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Daily English Conversation 03"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cấp độ</label>
                  <select
                    value={lessonForm.level}
                    onChange={(e: any) => setLessonForm({ ...lessonForm, level: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="BEGINNER">BEGINNER (Cơ bản)</option>
                    <option value="INTERMEDIATE">INTERMEDIATE (Trung cấp)</option>
                    <option value="ADVANCED">ADVANCED (Nâng cao)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại phương tiện</label>
                  <select
                    value={lessonForm.mediaType}
                    onChange={(e: any) => setLessonForm({ ...lessonForm, mediaType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="AUDIO">AUDIO (Âm thanh)</option>
                    <option value="VIDEO">VIDEO (Video)</option>
                    <option value="PODCAST">PODCAST (Podcast)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đường dẫn tệp âm thanh (Audio URL)</label>
                <input
                  type="text"
                  required
                  placeholder="/audio/daily-conversation-01.mp3 hoặc URL S3/YouTube"
                  value={lessonForm.audioUrl}
                  onChange={(e) => setLessonForm({ ...lessonForm, audioUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-mono text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn học liệu (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="BBC, TED, YouTube..."
                    value={lessonForm.sourceName}
                    onChange={(e) => setLessonForm({ ...lessonForm, sourceName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thời lượng (giây)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="120"
                    value={lessonForm.durationSeconds}
                    onChange={(e) => setLessonForm({ ...lessonForm, durationSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái xuất bản</label>
                  <select
                    value={lessonForm.status}
                    onChange={(e: any) => setLessonForm({ ...lessonForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="DRAFT">Bản nháp (DRAFT)</option>
                    <option value="PUBLISHED">Xuất bản ngay (PUBLISHED)</option>
                    <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lessonForm.isPremiumOnly}
                      onChange={(e) => setLessonForm({ ...lessonForm, isPremiumOnly: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Chỉ dành cho Premium
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLessonModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-200 transition-all cursor-pointer"
                >
                  {editingLesson ? 'Cập nhật bài học' : 'Tạo bài học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: QUẢN LÝ CÂU THOẠI & TRANSCRIPT (SOẠN CÂU)       */}
      {/* ======================================================== */}
      {sentencesModalOpen && selectedLessonForSentences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Soạn câu thoại: {selectedLessonForSentences.title}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audio: <code className="text-slate-700 font-mono">{selectedLessonForSentences.audioUrl}</code>
                </p>
              </div>
              <button
                onClick={() => setSentencesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: Sentences List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingSentences ? (
                <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Đang tải câu thoại...</span>
                </div>
              ) : lessonSentences.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  Bài học này chưa có câu thoại nào. Hãy nhập câu thoại đầu tiên ở bên dưới!
                </div>
              ) : (
                lessonSentences.map((s, index) => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{s.textContent}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                          <span>
                            ⏱️ {s.startTime.toFixed(1)}s → {s.endTime.toFixed(1)}s ({(s.endTime - s.startTime).toFixed(1)}s)
                          </span>
                          <span>•</span>
                          <span>🔤 {s.wordsJson?.length || 0} từ</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSentence(s.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Xóa câu này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form: Add New Sentence */}
            <form onSubmit={handleAddSentence} className="pt-4 border-t border-slate-100 space-y-3 bg-white">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-purple-600" />
                <span>Thêm câu thoại mới vào bài:</span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bắt đầu (giây)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={newSentenceStart}
                    onChange={(e) => setNewSentenceStart(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kết thúc (giây)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={newSentenceEnd}
                    onChange={(e) => setNewSentenceEnd(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nội dung câu (tiếng Anh)</label>
                  <input
                    type="text"
                    required
                    placeholder="Good morning, how are you today?"
                    value={newSentenceText}
                    onChange={(e) => setNewSentenceText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lưu & Thêm câu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
