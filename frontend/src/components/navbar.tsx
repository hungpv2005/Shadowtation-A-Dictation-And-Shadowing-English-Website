'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import {
  Headphones,
  LogOut,
  Flame,
  Sparkles,
  ShieldCheck,
  Crown,
  ChevronDown,
  KeyRound,
  CreditCard,
  User,
  ExternalLink,
} from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Khi đã đăng nhập, tự động lấy thông tin mới nhất từ /auth/me
    if (useAuthStore.getState().isAuthenticated) {
      apiFetch<any>('/auth/me')
        .then((profile) => updateUser(profile))
        .catch(() => {});
    }
  }, [updateUser]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      logout();
      router.push('/login');
    }
  };

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return null;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <Headphones className="w-5 h-5" />
          </div>
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Shadowtation
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/practice/dictation"
            className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100/70"
          >
            <Headphones className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Luyện nghe (Dictation)</span>
            <span className="sm:hidden">Luyện nghe</span>
          </Link>

          <Link
            href="/subscription"
            className="text-sm font-semibold text-slate-700 hover:text-amber-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50/70"
          >
            <Crown className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <span className="hidden sm:inline">Gói Premium</span>
            <span className="sm:hidden">Gói VIP</span>
          </Link>

          {mounted && isAuthenticated && user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="text-sm font-semibold text-purple-700 hover:text-purple-900 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100/80 border border-purple-200/60"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* User Area */}
        <div className="flex items-center gap-3">
          {!mounted ? (
            <div className="w-24 h-9 bg-slate-100 rounded-xl animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="relative flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
              {/* Streak Badge */}
              <div
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 font-medium text-xs shadow-xs"
                title={`Chuỗi liên tục ${user.streakCount} ngày học`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{user.streakCount}d</span>
              </div>

              {/* User Trigger Button */}
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all text-left ${
                  dropdownOpen
                    ? 'border-indigo-400 bg-indigo-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {/* Avatar with Status indicator */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>

                {/* Name & Role preview (Desktop) */}
                <div className="hidden md:block max-w-[120px] text-left">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    {user.role === 'PREMIUM_STUDENT' ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Premium
                      </span>
                    ) : user.role === 'ADMIN' ? (
                      <span className="text-purple-600 font-medium flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      <span>Học viên Free</span>
                    )}
                  </div>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {/* Enhanced Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Dropdown Header: User Info Card */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-indigo-200 shrink-0">
                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm truncate">{user.fullName}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {user.role === 'PREMIUM_STUDENT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-semibold">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>Gói Premium</span>
                            </span>
                          ) : user.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-semibold">
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              <span>Quản trị viên</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-medium">
                              <span>Tài khoản Free</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800 text-[11px] font-semibold">
                            <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                            <span>{user.streakCount} ngày streak</span>
                          </span>
                        </div>

                        {user.role === 'PREMIUM_STUDENT' && user.premiumExpiredAt && (
                          <div className="text-[11px] text-slate-500 mt-2">
                            Hạn dùng: <span className="font-medium text-slate-700">{formatExpiryDate(user.premiumExpiredAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Navigation Menu */}
                  <div className="p-2 space-y-0.5 text-xs">
                    {/* Upgrade Banner for Free Users */}
                    {user.role === 'STUDENT' && (
                      <Link
                        href="/subscription"
                        onClick={() => setDropdownOpen(false)}
                        className="mb-1.5 flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-md shadow-amber-200/50 hover:brightness-105 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 fill-white" />
                          <span>Nâng cấp gói Premium</span>
                        </div>
                        <Sparkles className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    <Link
                      href="/practice/dictation"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                    >
                      <Headphones className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Luyện nghe Dictation</span>
                    </Link>

                    <Link
                      href="/subscription"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-amber-600 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                    >
                      <CreditCard className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Gói cước &amp; Lịch sử thanh toán</span>
                    </Link>

                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-purple-700 hover:bg-purple-50 rounded-xl transition-colors font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Trang quản trị (Admin Panel)</span>
                      </Link>
                    )}

                    <Link
                      href="/forgot-password"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Đổi mật khẩu tài khoản</span>
                    </Link>
                  </div>

                  {/* Dropdown Footer: Logout */}
                  <div className="p-2 border-t border-slate-100 bg-slate-50/60">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

