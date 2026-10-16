'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { Headphones, Mic, CheckCircle2, Flame, ArrowRight } from 'lucide-react';

export default function Home() {
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">

      {/* Hero Section */}
      <div className="text-center py-10 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-5">
          <span>✨ Nền tảng luyện nghe nói thế hệ mới</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Làm chủ tiếng Anh cùng{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Dictation &amp; Shadowing
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600">
          Chép chính tả thời gian thực và luyện nhại giọng cùng AI đánh giá phát âm chi tiết đến từng từ.
        </p>

        {/* User personalized status or CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {mounted && isAuthenticated && user ? (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-200">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{user.fullName}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{user.email}</span>
                  <span>•</span>
                  <span className="text-amber-600 font-medium flex items-center gap-0.5">
                    <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Streak {user.streakCount} ngày
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <span>Bắt đầu học miễn phí</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all flex items-center justify-center"
              >
                Đăng nhập tài khoản
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Dictation Card */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Headphones className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nghe chép chính tả (Dictation)</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Rèn luyện đôi tai với hệ thống so sánh đối chiếu thời gian thực (WER/Levenshtein) ngay trên trình duyệt, phát hiện từ còn thiếu và sai lỗi chính tả.
          </p>
          <ul className="text-xs text-slate-500 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Đối chiếu tức thì từng từ</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Lưu từ vựng yếu vào Review List tự động</span>
            </li>
          </ul>
          <div className="mt-5">
            <Link
              href="/practice/dictation"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <span>Vào luyện nghe ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Shadowing Card */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Mic className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nói nhại phản xạ (Shadowing)</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Thu âm và nhận phản hồi chấm điểm phát âm chi tiết (Accuracy, Fluency, Completeness) từ AI Speech Service chuẩn xác đến từng từ.
          </p>
          <ul className="text-xs text-slate-500 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Tô màu trực quan: Xanh (chuẩn), Vàng (khá), Đỏ (cần sửa)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Tích hợp trực tiếp trong Core API với độ trễ thấp</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
