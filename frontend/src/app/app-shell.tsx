'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const links = [
  { href: '/', label: 'Trang chủ' },
  { href: '/practice/dictation?mode=dictation', label: 'Dictation' },
  { href: '/practice/dictation?mode=shadowing', label: 'Shadowing' },
  { href: '/practice/shadowing/results', label: 'Kết quả AI' },
  { href: '/features/uc-07', label: 'Ôn tập' },
];
const studentUseCases = [
  { href: '/practice/dictation?mode=shadowing', label: 'Luyện shadowing' },
  { href: '/practice/dictation?feature=hints', label: 'Gợi ý khi luyện Dictation' },
  { href: '/practice/dictation/results', label: 'Kết quả Dictation' },
  { href: '/practice/shadowing/results', label: 'Kết quả phát âm AI' },
  { href: '/features/uc-06', label: 'Tiến độ học tập' },
  { href: '/features/uc-07', label: 'Danh sách ôn tập' },
  { href: '/features/uc-08', label: 'Quản lý bài học' },
  { href: '/features/uc-09', label: 'Quản lý tài khoản' },
  { href: '/subscription', label: 'Gói học Premium' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [practiceNavMode, setPracticeNavMode] = useState<'dictation' | 'shadowing'>('dictation');
  useEffect(() => {
    const syncAuth = () => setSignedIn(Boolean(localStorage.getItem('access_token') ?? localStorage.getItem('accessToken')));
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
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="brand" aria-label="Shadowtation, trang chủ">
          <span className="brand-mark">S</span><span>shadow<span className="brand-accent">tation</span></span>
        </Link>
        <nav className="main-nav" aria-label="Điều hướng chính">
          {links.map((link) => {
            const [linkPath, query] = link.href.split('?');
            const requestedMode = new URLSearchParams(query ?? '').get('mode');
            const active = pathname === linkPath && (!requestedMode || requestedMode === practiceNavMode);
            return <Link key={link.href} href={link.href} onClick={() => requestedMode && setPracticeNavMode(requestedMode === 'shadowing' ? 'shadowing' : 'dictation')} className={active ? 'nav-link active' : 'nav-link'}>{link.label}</Link>;
          })}
        </nav>
        {signedIn ? <div className="profile-menu"><button type="button" className="profile-link" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}><span className="profile-avatar">HV</span><span className="profile-name">Học viên</span><span aria-hidden="true">⌄</span></button>{profileOpen && <div className="profile-dropdown"><p className="profile-dropdown-title">Chức năng học viên</p>{studentUseCases.map((item) => { const [linkPath, query] = item.href.split('?'); const params = new URLSearchParams(query ?? ''); const modeAware = linkPath === '/practice/dictation'; if (modeAware && !params.has('mode')) params.set('mode', practiceNavMode); const href = modeAware ? `${linkPath}?${params.toString()}` : item.href; return <Link key={item.href} href={href} onClick={() => setProfileOpen(false)}>{item.label}</Link>; })}<Link href="/features/uc-09" onClick={() => setProfileOpen(false)}>Thông tin cá nhân</Link><Link href="/features/uc-09" onClick={() => setProfileOpen(false)}>Cài đặt</Link><button type="button" onClick={signOut}>Đăng xuất</button></div>}</div> : <Link href="/features/uc-01" className="login-link">Đăng nhập</Link>}
      </div>
    </header>
    <div className="app-content">{children}</div>
  </>;
}
