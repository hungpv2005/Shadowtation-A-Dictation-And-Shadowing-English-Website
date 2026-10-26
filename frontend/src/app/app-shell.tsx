'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { AiTutorBot } from './components/ai-tutor-bot';
import { useLanguage, FlagVN, FlagUK } from '@/lib/i18n';

const links = [
  { href: '/', label: 'Trang chủ', enLabel: 'Home' },
  { href: '/dashboard', label: 'Tiến độ học tập', enLabel: 'Progress' },
  { href: '/practice/dictation?mode=dictation', label: 'Luyện nghe', enLabel: 'Dictation' },
  { href: '/practice/dictation?mode=shadowing', label: 'Luyện nói', enLabel: 'Shadowing' },
  { href: '/practice/shadowing/results', label: 'Kết quả AI', enLabel: 'AI Results' },
  { href: '/features/uc-07', label: 'Sổ từ vựng', enLabel: 'Notebook' },
];

const studentUseCases = [
  { href: '/practice/dictation?mode=dictation', label: 'Luyện nghe', enLabel: 'Listening (Dictation)' },
  { href: '/practice/dictation?mode=shadowing', label: 'Luyện nói', enLabel: 'Speaking (Shadowing)' },
  { href: '/practice/dictation/results', label: 'Kết quả Luyện nghe', enLabel: 'Dictation Results' },
  { href: '/practice/shadowing/results', label: 'Kết quả Luyện nói', enLabel: 'Shadowing Results' },
  { href: '/dashboard', label: 'Tiến độ học tập', enLabel: 'Learning Progress' },
  { href: '/features/uc-07', label: 'Sổ từ vựng cá nhân', enLabel: 'Vocabulary Notebook' },
  { href: '/features/uc-08', label: 'Quản lý bài học', enLabel: 'Lesson Management' },
  { href: '/features/uc-09', label: 'Quản lý tài khoản', enLabel: 'Account Settings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const [signedIn, setSignedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [practiceNavMode, setPracticeNavMode] = useState<'dictation' | 'shadowing'>('dictation');

  // Header quick controls: Dark/Light, Lang dropdown, Notifications
  const [isDark, setIsDark] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(3);

  useEffect(() => {
    // Theme sync
    const savedTheme = localStorage.getItem('shadowtation_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(activeDark);
    document.documentElement.classList.toggle('dark', activeDark);

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

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('shadowtation_theme', next ? 'dark' : 'light');
  };

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

  return (
    <>
      <header className="app-header shadow-sm transition-colors duration-200">
        <div className="app-header-inner">
          <Link href="/" className="brand" aria-label="Shadowtation, trang chủ">
            <span className="brand-mark shadow-sm">S</span>
            <span className="font-extrabold text-slate-800 dark:text-white">
              shadow<span className="brand-accent text-blue-600">tation</span>
            </span>
          </Link>

          <nav className="main-nav hidden md:flex items-center gap-1 shrink-0" aria-label="Điều hướng chính">
            {links.map((link) => {
              const [linkPath, query] = link.href.split('?');
              const requestedMode = new URLSearchParams(query ?? '').get('mode');
              const active = pathname === linkPath && (!requestedMode || requestedMode === practiceNavMode);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => requestedMode && setPracticeNavMode(requestedMode === 'shadowing' ? 'shadowing' : 'dictation')}
                  className={
                    active
                      ? 'nav-link active whitespace-nowrap font-bold text-blue-700 bg-blue-50 dark:bg-slate-800 dark:text-blue-400'
                      : 'nav-link whitespace-nowrap text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                >
                  {lang === 'en' ? link.enLabel : link.label}
                </Link>
              );
            })}
          </nav>

          {/* Cụm công cụ điều khiển (Sáng/Tối, Ngôn ngữ cờ Anh-Việt, Chuông thông báo, Avatar Học viên) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* 1. Thanh gạt Nền sáng / Nền tối */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? t('theme.to_light') : t('theme.to_dark')}
              className="relative flex h-9 w-16 items-center rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 p-1 transition-colors duration-300 shadow-inner"
              aria-label="Chuyển đổi giao diện sáng tối"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-xs shadow-md transition-transform duration-300 ${
                  isDark ? 'translate-x-7 text-amber-300' : 'translate-x-0 text-amber-500'
                }`}
              >
                {isDark ? '🌙' : '☀️'}
              </span>
            </button>

            {/* 2. Biểu tượng chuyển đổi ngôn ngữ Anh - Việt với lá cờ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen((prev) => !prev)}
                title={lang === 'vi' ? 'Đang chọn Tiếng Việt - Bấm để chọn ngôn ngữ' : 'English selected - Click to change language'}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold shadow-sm hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-700 transition"
                aria-label="Chuyển đổi ngôn ngữ / Change language"
                aria-expanded={langMenuOpen}
              >
                {lang === 'vi' ? (
                  <>
                    <FlagVN className="w-5 h-3.5" />
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">Tiếng Việt</span>
                  </>
                ) : (
                  <>
                    <FlagUK className="w-5 h-3.5" />
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">English</span>
                  </>
                )}
                <span className="text-[10px] text-slate-400">▾</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLang('vi');
                      setLangMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                      lang === 'vi'
                        ? 'bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <FlagVN className="w-5 h-3.5" />
                      <span>Tiếng Việt</span>
                    </span>
                    {lang === 'vi' && <span>✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLang('en');
                      setLangMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                      lang === 'en'
                        ? 'bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <FlagUK className="w-5 h-3.5" />
                      <span>English</span>
                    </span>
                    {lang === 'en' && <span>✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* 3. Biểu tượng Thông báo (Bell) kèm popup dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                title={t('nav.notifications')}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-slate-700 transition"
                aria-expanded={notifOpen}
                aria-label={t('nav.notifications')}
              >
                <span className="text-base">🔔</span>
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-sm ring-1 ring-white">
                    {unreadNotifs}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                      {t('nav.notifications')} ({unreadNotifs})
                    </span>
                    {unreadNotifs > 0 && (
                      <button
                        type="button"
                        onClick={() => setUnreadNotifs(0)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t('nav.mark_all_read')}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    <Link
                      href="/practice/dictation"
                      onClick={() => setNotifOpen(false)}
                      className="block rounded-xl p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition border border-transparent hover:border-blue-100"
                    >
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('nav.streak_notif_title')}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t('nav.streak_notif_desc')}
                      </p>
                    </Link>

                    <Link
                      href="/practice/vocabulary-review"
                      onClick={() => setNotifOpen(false)}
                      className="block rounded-xl p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition border border-transparent hover:border-blue-100"
                    >
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('nav.vocab_notif_title')}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t('nav.vocab_notif_desc')}
                      </p>
                    </Link>

                    <Link
                      href="/subscription"
                      onClick={() => setNotifOpen(false)}
                      className="block rounded-xl p-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100/60 transition"
                    >
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{t('nav.vip_notif_title')}</p>
                      <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                        {isPremium ? t('nav.vip_active') : t('nav.vip_upgrade_prompt')}
                      </p>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Avatar Học viên & Dropdown Menu */}
            {signedIn ? (
              <div className="profile-menu">
                <button
                  type="button"
                  className="profile-link flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-slate-700"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((open) => !open)}
                >
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-black text-white shadow-sm">
                    HV
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white px-1 text-[9px] font-extrabold ${
                        isPremium ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                      }`}
                    >
                      {isPremium ? '★' : 'F'}
                    </span>
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{t('nav.student')}</span>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider ${
                        isPremium ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isPremium ? 'Premium' : 'Free'}
                    </span>
                  </div>
                  <span aria-hidden="true" className="text-xs text-slate-400">
                    ⌄
                  </span>
                </button>
                {profileOpen && (
                  <div className="profile-dropdown shadow-xl border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-2 bg-white dark:bg-slate-800">
                    <div className="mb-2 border-b border-slate-100 dark:border-slate-700 px-3 pb-2 pt-1">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t('nav.account')}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('nav.student')}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                            isPremium ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isPremium ? '★ VIP' : 'FREE'}
                        </span>
                      </div>
                    </div>
                    <p className="profile-dropdown-title text-xs font-bold text-slate-400 uppercase tracking-wide px-3 py-1">
                      {t('nav.learning_features')}
                    </p>
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
                          className="block rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 font-medium"
                        >
                          {lang === 'en' ? item.enLabel : item.label}
                        </Link>
                      );
                    })}
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                    <Link
                      href="/subscription"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      {isPremium ? t('nav.manage_premium') : t('nav.upgrade_premium')}
                    </Link>
                    <Link
                      href="/features/uc-09"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {t('nav.profile_settings')}
                    </Link>
                    <button
                      type="button"
                      onClick={signOut}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/features/uc-01" className="login-link shadow-sm font-bold">
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="app-content">{children}</div>

      {/* 24/7 AI Tutor Chatbot Component */}
      <AiTutorBot />
    </>
  );
}

