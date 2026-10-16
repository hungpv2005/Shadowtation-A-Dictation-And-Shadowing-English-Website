'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import { Headphones, LogOut, Flame, Sparkles, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Khi đã đăng nhập, tự động lấy thông tin mới nhất từ /auth/me
    if (useAuthStore.getState().isAuthenticated) {
      apiFetch<any>('/auth/me')
        .then((profile) => updateUser(profile))
        .catch(() => { });
    }
  }, [updateUser]);

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      logout();
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <Headphones className="w-5 h-5" />
          </div>
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Shadowtation
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-4">
          <Link
            href="/practice/dictation"
            className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100/70"
          >
            <Headphones className="w-4 h-4 text-indigo-500" />
            <span>Luyện nghe (Dictation)</span>
          </Link>

          {mounted && isAuthenticated && user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="text-sm font-semibold text-purple-700 hover:text-purple-900 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100/80 border border-purple-200/60"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Quản trị (Admin)</span>
            </Link>
          )}
        </nav>

        {/* User Area */}
        <div className="flex items-center gap-4">
          {!mounted ? (
            <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              {/* Streak Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 font-medium text-xs shadow-sm">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{user.streakCount} ngày</span>
              </div>

              {/* Role Badge */}
              {user.role === 'PREMIUM_STUDENT' ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 font-medium text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Premium</span>
                </div>
              ) : user.role === 'ADMIN' ? (
                <Link
                  href="/admin"
                  className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-full text-purple-800 font-semibold text-xs transition-colors flex items-center gap-1"
                  title="Đi đến Dashboard Quản trị"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  <span>Admin</span>
                </Link>
              ) : (
                <div className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                  Học viên Free
                </div>
              )}

              {/* User Name */}
              <div className="text-sm font-semibold text-slate-800">
                {user.fullName}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all"
              >
                Đăng ký miễn phí
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
