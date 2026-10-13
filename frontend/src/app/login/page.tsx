'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Headphones, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl shadow-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
            <Headphones className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chào mừng trở lại</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập để tiếp tục luyện nghe và nói tiếng Anh</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              'Đang xác thực...'
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Tài khoản mẫu */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center mb-2.5">Dùng nhanh tài khoản mẫu (Demo):</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('student@shadowtation.local', 'Student@123456')}
              className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors"
            >
              Học viên Free
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('premium@shadowtation.local', 'Premium@123456')}
              className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700 transition-colors"
            >
              Học viên Premium
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('admin@shadowtation.local', 'Admin@123456')}
              className="flex-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
