'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type LoginResult = { accessToken: string; user: { fullName: string; email: string } };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await apiFetch<LoginResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('access_token', result.accessToken);
      localStorage.setItem('student_profile', JSON.stringify(result.user));
      window.dispatchEvent(new Event('shadowtation:auth-change'));
      router.replace('/');
      router.refresh();
    } catch (e) {
      setError(e instanceof TypeError
        ? 'Không kết nối được máy chủ đăng nhập. Hãy khởi động Backend API và kiểm tra cổng 4000, rồi thử lại.'
        : (e as Error).message || 'Không đăng nhập được. Vui lòng kiểm tra email, mật khẩu và thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="mx-auto grid min-h-[75vh] max-w-6xl place-items-center px-5 py-12">
    <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
      <div className="bg-indigo-700 p-8 text-white md:p-10">
        <Link href="/" className="text-sm font-semibold text-indigo-100 hover:text-white">← Về trang chủ</Link>
        <p className="mt-12 text-sm font-bold uppercase tracking-[.2em] text-indigo-200">Shadowtation</p>
        <h1 className="mt-3 text-3xl font-bold">Tiếp tục hành trình học tiếng Anh</h1>
        <p className="mt-4 leading-7 text-indigo-100">Đăng nhập để luyện Dictation, lưu tiến độ và tiếp tục các bài học của bạn.</p>
      </div>
      <form onSubmit={submit} className="p-8 md:p-10">
        <h2 className="text-2xl font-bold text-slate-900">Đăng nhập</h2>
        <p className="mt-2 text-slate-600">Dùng email và mật khẩu tài khoản học viên.</p>
        {process.env.NODE_ENV === 'development' && <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">Tài khoản học viên mẫu sau khi chạy seed: <strong>student@shadowtation.local</strong> · mật khẩu <strong>Student@123456</strong>.</p>}
        <label htmlFor="login-email" className="mt-7 block text-sm font-semibold text-slate-700">Email</label>
        <input id="login-email" type="email" autoComplete="username" required maxLength={150} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
        <label htmlFor="login-password" className="mt-5 block text-sm font-semibold text-slate-700">Mật khẩu</label>
        <input id="login-password" type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={submitting} className="mt-7 w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">{submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <p className="mt-5 text-center text-sm text-slate-500">Chỉ muốn xem? <Link href="/" className="font-semibold text-indigo-700">Xem bài học có sẵn</Link></p>
      </form>
    </section>
  </main>;
}
