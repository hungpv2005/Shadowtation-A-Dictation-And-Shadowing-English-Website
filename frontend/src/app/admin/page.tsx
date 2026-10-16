'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  ShieldCheck,
  Database,
  Server,
  KeyRound,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Users,
  CheckCircle2,
  Lock,
  Layers,
  Activity,
  Cpu,
} from 'lucide-react';

type HealthData = {
  status: string;
  database: string;
  timestamp: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
    checkHealth();
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
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
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trung tâm Quản trị Hệ thống</h1>
              <p className="text-xs text-slate-500">
                Giám sát hạ tầng CSDL, cấu hình bảo mật xác thực (UC-01) và trạng thái toàn bộ dịch vụ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={checkHealth}
            disabled={loadingHealth}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
            <span>Làm mới trạng thái</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang chủ học viên</span>
          </Link>
        </div>
      </div>

      {/* Grid: 3 Thẻ Trạng thái Hạ tầng & Bảo mật */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Hạ tầng Cơ sở dữ liệu */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
              <span className="font-mono text-slate-700">/api/v1/docs</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Xử lý âm thanh:</span>
              <span className="text-slate-700 font-medium">FFmpeg + Azure Speech</span>
            </div>
          </div>
        </div>

        {/* Card 3: Bảo mật & Xác thực (UC-01) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
        {/* Bảng Vai trò trong Hệ thống */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Mô hình phân quyền người dùng</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800 text-xs">1. Học viên Miễn phí (FREE_STUDENT)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Luyện nghe Dictation các bài cơ bản, lưu Review List</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">Mặc định</span>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-emerald-900 text-xs">2. Học viên Cao cấp (PREMIUM_STUDENT)</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Mở khóa toàn bộ bài học, luyện Shadowing cùng AI chấm điểm chi tiết</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Nâng cao</span>
            </div>

            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-purple-900 text-xs">3. Quản trị viên (ADMIN)</div>
                <div className="text-[11px] text-purple-700 mt-0.5">Truy cập Dashboard quản trị, cấu hình hệ thống, theo dõi hạ tầng</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">Toàn quyền</span>
            </div>
          </div>
        </div>

        {/* Thông tin môi trường & Công nghệ */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">Thông tin Kiến trúc & Triển khai</h2>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Frontend Framework</span>
              <span className="font-medium text-slate-800">Next.js 14 (App Router) + Tailwind CSS</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">State Management</span>
              <span className="font-medium text-slate-800">Zustand (LocalStorage persisted)</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Backend Server</span>
              <span className="font-medium text-slate-800">NestJS v10 (Node.js LTS)</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Cloud Database</span>
              <span className="font-medium text-slate-800">Neon.tech Serverless PostgreSQL 15</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Thư viện Audio & AI</span>
              <span className="font-medium text-slate-800">wavesurfer.js, Azure Speech SDK</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
