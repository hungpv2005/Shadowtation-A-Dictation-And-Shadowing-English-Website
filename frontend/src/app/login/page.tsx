'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Headphones, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles, ShieldCheck, User } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error') || null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGoogleNotice(null);

    // Basic inline validation
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      setAuth(data.user, data.accessToken, data.refreshToken, rememberMe);

      // Điều hướng thông minh: ưu tiên redirectParam nếu có, sau đó đến role
      if (redirectParam && redirectParam.startsWith('/')) {
        router.push(redirectParam);
      } else if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setError(null);
    setGoogleNotice(null);
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const registerHref = redirectParam
    ? `/register?redirect=${encodeURIComponent(redirectParam)}`
    : '/register';

  return (
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/60 transition-all">
      {/* Brand Header */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
          <Headphones className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chào mừng trở lại!</h1>
        <p className="text-sm text-slate-500 mt-1">Đăng nhập để tiếp tục luyện nghe và nói tiếng Anh</p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs sm:text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Google Notice alert */}
      {googleNotice && (
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-xs sm:text-sm animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span className="leading-snug">{googleNotice}</span>
        </div>
      )}

      {/* Social Login Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer hover:border-slate-400"
      >
        <GoogleIcon />
        <span>Tiếp tục với Google</span>
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
          <span className="bg-white px-3 text-slate-400 font-semibold">hoặc đăng nhập bằng email</span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Email tài khoản
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="name@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Mật khẩu
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me & Helper */}
        <div className="flex items-center justify-between py-1">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
            <input
              id="login-remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Ghi nhớ đăng nhập trên thiết bị này</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer hover:shadow-indigo-300 active:scale-[0.99]"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Đang xác thực...</span>
            </div>
          ) : (
            <>
              <span>Đăng nhập</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Demo Accounts Quick-fill */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tài khoản mẫu (Demo nghiệm thu)
          </span>
          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
            1-click
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleFillDemo('student@shadowtation.local', 'Student@123456')}
            className="p-2 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl text-left transition-all group"
            title="Tài khoản Học viên Free"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 group-hover:text-indigo-600">
              <User className="w-3 h-3 text-slate-500 group-hover:text-indigo-500" />
              <span>Học viên</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Free</div>
          </button>

          <button
            type="button"
            onClick={() => handleFillDemo('premium@shadowtation.local', 'Premium@123456')}
            className="p-2 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 border border-emerald-200 rounded-xl text-left transition-all group"
            title="Tài khoản Học viên có gói Premium"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Premium</span>
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">VIP</div>
          </button>

          <button
            type="button"
            onClick={() => handleFillDemo('admin@shadowtation.local', 'Admin@123456')}
            className="p-2 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-300 border border-purple-200 rounded-xl text-left transition-all group"
            title="Tài khoản Quản trị viên"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-800">
              <ShieldCheck className="w-3 h-3 text-purple-600" />
              <span>Admin</span>
            </div>
            <div className="text-[10px] text-purple-600 mt-0.5">Toàn quyền</div>
          </button>
        </div>
      </div>

      {/* Footer link to Register */}
      <p className="text-center text-sm text-slate-500 mt-6">
        Chưa có tài khoản?{' '}
        <Link href={registerHref} className="text-indigo-600 font-semibold hover:underline">
          Đăng ký miễn phí
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl animate-pulse">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl mx-auto mb-4" />
            <div className="h-6 bg-slate-100 rounded w-1/2 mx-auto mb-2" />
            <div className="h-4 bg-slate-100 rounded w-3/4 mx-auto mb-8" />
            <div className="h-10 bg-slate-100 rounded mb-4" />
            <div className="h-10 bg-slate-100 rounded mb-4" />
            <div className="h-12 bg-slate-100 rounded" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

