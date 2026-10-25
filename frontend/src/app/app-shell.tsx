'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import {
  Home,
  Headphones,
  Mic,
  BarChart3,
  LayoutDashboard,
  Crown,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Flame,
  LogIn,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Trang chủ', icon: Home },
  {
    href: '/practice/dictation?mode=dictation',
    label: 'Luyện nghe Dictation',
    icon: Headphones,
    mode: 'dictation',
  },
  {
    href: '/practice/dictation?mode=shadowing',
    label: 'Luyện nói Shadowing',
    icon: Mic,
    mode: 'shadowing',
  },
  { href: '/practice/shadowing/results', label: 'Kết quả phát âm AI', icon: BarChart3 },
  { href: '/dashboard', label: 'Tiến độ học tập', icon: LayoutDashboard },
  { href: '/subscription', label: 'Gói học Premium', icon: Crown },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logoutStore = useAuthStore((state) => state.logout);
  const updateUserStore = useAuthStore((state) => state.updateUser);

  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [practiceNavMode, setPracticeNavMode] = useState<'dictation' | 'shadowing'>('dictation');

  // Sidebar collapsible state
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Đọc trạng thái thu gọn đã lưu từ trước
    const saved = localStorage.getItem('shadowtation_sidebar_collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('shadowtation_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const syncAuth = () => {
      const token =
        localStorage.getItem('access_token') ??
        sessionStorage.getItem('access_token') ??
        localStorage.getItem('accessToken') ??
        sessionStorage.getItem('accessToken');

      const isAuthed = Boolean(token);
      setSignedIn(isAuthed);

      if (isAuthed) {
        const rawProfile =
          localStorage.getItem('student_profile') ?? sessionStorage.getItem('student_profile');
        if (rawProfile) {
          try {
            setUser(JSON.parse(rawProfile));
          } catch {
            setUser(authUser);
          }
        } else {
          setUser(authUser);
        }

        apiFetch<UserProfile>('/auth/me')
          .then((fresh) => {
            setUser(fresh);
            updateUserStore(fresh);
          })
          .catch(() => undefined);
      } else {
        setUser(null);
      }
    };

    const syncPracticeMode = () =>
      setPracticeNavMode(
        new URLSearchParams(window.location.search).get('mode') === 'shadowing'
          ? 'shadowing'
          : 'dictation',
      );

    syncAuth();
    syncPracticeMode();

    window.addEventListener('shadowtation:auth-change', syncAuth);
    window.addEventListener('shadowtation:practice-mode', syncPracticeMode);
    window.addEventListener('popstate', syncPracticeMode);

    return () => {
      window.removeEventListener('shadowtation:auth-change', syncAuth);
      window.removeEventListener('shadowtation:practice-mode', syncPracticeMode);
      window.removeEventListener('popstate', syncPracticeMode);
    };
  }, [pathname, authUser, updateUserStore]);

  function signOut() {
    const refreshToken =
      localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');
    if (refreshToken) {
      void apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    logoutStore();
    setSignedIn(false);
    setUser(null);
    setMobileOpen(false);
    router.push('/login');
  }

  const displayName = user?.fullName || 'Học viên';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'HV';

  const isPremium = user?.role === 'PREMIUM_STUDENT';
  const isAdmin = user?.role === 'ADMIN';

  // Nếu là trang quản trị (/admin/**), nhường quyền render cho AdminLayout riêng biệt
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  // Component render nội dung Profile / Khối Đăng nhập (Đặt ở dưới đáy sidebar)
  const renderUserProfile = (isDrawer = false) => {
    const isExpanded = !collapsed || isDrawer;

    if (signedIn) {
      if (isExpanded) {
        return (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 shadow-sm transition">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
                  {initials}
                </span>
                {isPremium ? (
                  <span
                    className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-sm"
                    title="Premium"
                  >
                    <Crown className="h-2 w-2" />
                  </span>
                ) : isAdmin ? (
                  <span
                    className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-rose-500 text-white shadow-sm"
                    title="Admin"
                  >
                    <ShieldCheck className="h-2 w-2" />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-slate-900">{displayName}</p>
                <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-2 text-[11px]">
              {isAdmin ? (
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    <ShieldCheck className="h-3 w-3" /> Quản trị viên
                  </span>
                  <Link
                    href="/admin"
                    onClick={() => isDrawer && setMobileOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    <span>Vào Admin →</span>
                  </Link>
                </div>
              ) : isPremium ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  <Crown className="h-3 w-3" /> Gói Premium
                </span>
              ) : (
                <div className="flex w-full items-center justify-between">
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Gói Free
                  </span>
                  <Link
                    href="/subscription"
                    onClick={() => isDrawer && setMobileOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Nâng cấp Premium →</span>
                  </Link>
                </div>
              )}

              {user && user.streakCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>{user.streakCount} ngày</span>
                </span>
              )}
            </div>
          </div>
        );
      }

      // Collapsed state
      return (
        <div className="my-1.5 flex justify-center px-1">
          <div
            className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm"
            title={`${displayName} (${user?.email})`}
          >
            {initials}
            {isPremium ? (
              <span className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-sm">
                <Crown className="h-2 w-2" />
              </span>
            ) : isAdmin ? (
              <span className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-rose-500 text-white shadow-sm">
                <ShieldCheck className="h-2 w-2" />
              </span>
            ) : null}

            {/* Hover Tooltip */}
            <div className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-xl group-hover:block">
              <p className="font-bold">{displayName}</p>
              <p className="text-[10px] text-slate-300">{user?.email}</p>
              <p className="mt-1 text-[10px] text-amber-300">
                {isPremium ? 'Gói Premium' : isAdmin ? 'Quản trị viên' : 'Gói Miễn phí'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Chưa đăng nhập (Hiển thị khối Đăng nhập / Đăng ký ở dưới cùng)
    if (isExpanded) {
      return (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 text-center">
          <p className="text-xs font-bold text-indigo-950">Tham gia học tập</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Đăng nhập để lưu tiến độ</p>
          <div className="mt-2.5 flex flex-col gap-1.5">
            <Link
              href="/login"
              onClick={() => isDrawer && setMobileOpen(false)}
              className="rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 text-center transition"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              onClick={() => isDrawer && setMobileOpen(false)}
              className="rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 text-center transition"
            >
              Đăng ký miễn phí
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="my-1.5 flex justify-center px-1">
        <Link
          href="/login"
          className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
          title="Đăng nhập tài khoản"
        >
          <LogIn className="h-5 w-5" />
        </Link>
      </div>
    );
  };

  // Component render danh sách Link điều hướng
  const renderNavItems = (isDrawer = false) => {
    const isExpanded = !collapsed || isDrawer;

    return (
      <nav className="space-y-1.5 px-3" aria-label="Điều hướng học tập">
        {navItems.map((item) => {
          const [linkPath, query] = item.href.split('?');
          const requestedMode = new URLSearchParams(query ?? '').get('mode');
          const active =
            pathname === linkPath && (!requestedMode || requestedMode === practiceNavMode);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (requestedMode) {
                  setPracticeNavMode(requestedMode === 'shadowing' ? 'shadowing' : 'dictation');
                }
                if (isDrawer) setMobileOpen(false);
              }}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${!isExpanded ? 'justify-center px-2' : ''}`}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'
                }`}
              />
              {isExpanded && <span className="truncate">{item.label}</span>}

              {/* Hover Tooltip when collapsed */}
              {!isExpanded && (
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}

      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ================= DESKTOP COLLAPSIBLE SIDEBAR ================= */}
      <aside
        className={`hidden md:flex flex-col justify-between fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-slate-200/90 shadow-sm transition-all duration-300 ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {/* Top Section: Logo + Nav Items */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header Brand & Collapse Toggle */}
          <div
            className={`flex h-16 shrink-0 items-center border-b border-slate-100 px-4 ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!collapsed ? (
              <>
                <Link href="/" className="brand flex items-center gap-2.5">
                  <span className="brand-mark">S</span>
                  <span className="font-extrabold text-base tracking-tight text-slate-800">
                    shadow<span className="text-indigo-600">tation</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  title="Thu gọn thanh bên"
                  aria-label="Thu gọn thanh bên"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Link href="/" className="brand-mark">
                  S
                </Link>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  title="Mở rộng thanh bên"
                  aria-label="Mở rộng thanh bên"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Nav Items List (Nằm ở trên, ngay dưới Logo) */}
          <div className="flex-1 overflow-y-auto py-3">
            {renderNavItems(false)}
          </div>
        </div>

        {/* Bottom Section (Footer): Phần Đăng nhập / User Profile chuyển xuống đây! */}
        <div className="border-t border-slate-100 p-2 space-y-1.5 shrink-0 bg-white">
          {/* Khối User Profile hoặc Đăng nhập theo yêu cầu người dùng */}
          {renderUserProfile(false)}

          {signedIn && (
            <button
              type="button"
              onClick={signOut}
              className={`group relative flex items-center gap-3 w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition ${
                collapsed ? 'justify-center px-2' : ''
              }`}
              title={collapsed ? 'Đăng xuất' : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Đăng xuất</span>}
              {collapsed && (
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                  Đăng xuất
                </div>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            className={`flex items-center gap-2.5 w-full rounded-xl px-3.5 py-2 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition ${
              collapsed ? 'justify-center px-2' : ''
            }`}
            title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Thu gọn thanh bên</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ================= MOBILE TOPBAR ================= */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="brand flex items-center gap-2">
            <span className="brand-mark h-7 w-7 text-xs">S</span>
            <span className="font-extrabold text-sm tracking-tight text-slate-800">
              shadow<span className="text-indigo-600">tation</span>
            </span>
          </Link>
        </div>

        {signedIn ? (
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-[11px] font-bold text-white shadow-sm">
              {initials}
            </span>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
          >
            Đăng nhập
          </Link>
        )}
      </header>

      {/* ================= MOBILE DRAWER ================= */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col justify-between md:hidden animate-in slide-in-from-left duration-200">
            {/* Top + Middle */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="brand flex items-center gap-2.5"
                >
                  <span className="brand-mark">S</span>
                  <span className="font-extrabold text-base tracking-tight text-slate-800">
                    shadow<span className="text-indigo-600">tation</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation links */}
              <div className="flex-1 overflow-y-auto py-3">
                {renderNavItems(true)}
              </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-slate-100 p-3 space-y-2 shrink-0 bg-white">
              {renderUserProfile(true)}

              {signedIn && (
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-3 w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? 'md:pl-[76px]' : 'md:pl-64'
        }`}
      >
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
