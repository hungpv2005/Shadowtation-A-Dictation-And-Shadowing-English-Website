'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const links = [
  { href: '/', label: 'Trang chủ' },
  { href: '/dashboard', label: 'Tiến độ học tập' },
  { href: '/practice/dictation?mode=dictation', label: 'Luyện nghe' },
  { href: '/practice/dictation?mode=shadowing', label: 'Luyện nói' },
  { href: '/practice/shadowing/results', label: 'Kết quả AI' },
  { href: '/features/uc-07', label: 'Sổ từ vựng' },
];

const studentUseCases = [
  { href: '/practice/dictation?mode=dictation', label: 'Luyện nghe' },
  { href: '/practice/dictation?mode=shadowing', label: 'Luyện nói' },
  { href: '/practice/dictation/results', label: 'Kết quả Luyện nghe' },
  { href: '/practice/shadowing/results', label: 'Kết quả Luyện nói' },
  { href: '/dashboard', label: 'Tiến độ học tập' },
  { href: '/features/uc-07', label: 'Sổ từ vựng cá nhân' },
  { href: '/features/uc-08', label: 'Quản lý bài học' },
  { href: '/features/uc-09', label: 'Quản lý tài khoản' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [practiceNavMode, setPracticeNavMode] = useState<'dictation' | 'shadowing'>('dictation');

  useEffect(() => {
    const syncAuth = () => {
      const hasToken = Boolean(localStorage.getItem('access_token') ?? localStorage.getItem('accessToken'));
      setSignedIn(hasToken);
      try {
        const raw = localStorage.getItem('student_profile');
        if (raw) {
          const user = JSON.parse(raw);
          setIsPremium(user?.role === 'PREMIUM_STUDENT' || user?.role === 'ADMIN' || user?.isPremium === true || localStorage.getItem('shadowtation_tier') === 'PREMIUM');
        } else {
          setIsPremium(localStorage.getItem('shadowtation_tier') === 'PREMIUM');
        }
      } catch {
        setIsPremium(false);
      }
    };
    const syncPracticeMode = () => setPracticeNavMode(new URLSearchParams(window.location.search).get('mode') === 'shadowing' ? 'shadowing' : 'dictation');
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
  }, [pathname]);

  function signOut() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) void apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
    localStorage.removeItem('access_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('student_profile');
    setSignedIn(false);
    setProfileOpen(false);
    window.dispatchEvent(new Event('shadowtation:auth-change'));
    router.push('/features/uc-01');
  }

  return <>
    <header className="app-header shadow-sm">
      <div className="app-header-inner">
        <Link href="/" className="brand" aria-label="Shadowtation, trang chủ">
          <span className="brand-mark shadow-sm">S</span>
          <span className="font-extrabold text-slate-800">shadow<span className="brand-accent text-blue-600">tation</span></span>
        </Link>
        <nav className="main-nav" aria-label="Điều hướng chính">
          {links.map((link) => {
            const [linkPath, query] = link.href.split('?');
            const requestedMode = new URLSearchParams(query ?? '').get('mode');
            const active = pathname === linkPath && (!requestedMode || requestedMode === practiceNavMode);
            return <Link
              key={link.href}
              href={link.href}
              onClick={() => requestedMode && setPracticeNavMode(requestedMode === 'shadowing' ? 'shadowing' : 'dictation')}
              className={active ? 'nav-link active font-bold text-blue-700 bg-blue-50' : 'nav-link text-slate-600 hover:text-blue-600 hover:bg-slate-100'}
            >
              {link.label}
            </Link>;
          })}
        </nav>
        {signedIn ? (
          <div className="profile-menu">
            <button
              type="button"
              className="profile-link flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-black text-white shadow-sm">
                HV
                <span className={`absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white px-1 text-[9px] font-extrabold ${isPremium ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'}`}>
                  {isPremium ? '★' : 'F'}
                </span>
              </span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight">Học viên</span>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isPremium ? 'text-amber-600' : 'text-slate-500'}`}>
                  {isPremium ? 'Premium' : 'Free'}
                </span>
              </div>
              <span aria-hidden="true" className="text-xs text-slate-400">⌄</span>
            </button>
            {profileOpen && (
              <div className="profile-dropdown shadow-xl border-2 border-slate-100 rounded-2xl p-2 bg-white">
                <div className="mb-2 border-b border-slate-100 px-3 pb-2 pt-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Tài khoản</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">Học viên</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${isPremium ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {isPremium ? '★ VIP' : 'FREE'}
                    </span>
                  </div>
                </div>
                <p className="profile-dropdown-title text-xs font-bold text-slate-400 uppercase tracking-wide px-3 py-1">Chức năng học tập</p>
                {studentUseCases.map((item) => {
                  const [linkPath, query] = item.href.split('?');
                  const params = new URLSearchParams(query ?? '');
                  const modeAware = linkPath === '/practice/dictation';
                  if (modeAware && !params.has('mode')) params.set('mode', practiceNavMode);
                  const href = modeAware ? `${linkPath}?${params.toString()}` : item.href;
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium"
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="my-1 border-t border-slate-100" />
                <Link href="/subscription" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50">
                  {isPremium ? 'Quản lý gói Premium' : '⭐ Nâng cấp Premium'}
                </Link>
                <Link href="/features/uc-09" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Thông tin cá nhân &amp; Cài đặt
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/features/uc-01" className="login-link shadow-sm font-bold">
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
    <div className="app-content">{children}</div>
  </>;
}
