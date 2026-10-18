'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Lock, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft, Eye, EyeOff, XCircle } from 'lucide-react';

function getPasswordStrength(pass: string) {
  if (!pass) return { score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-400', percent: 0 };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Mật khẩu yếu', color: 'bg-red-500', textColor: 'text-red-500', percent: 25 };
    case 2:
      return { score: 2, label: 'Mật khẩu trung bình', color: 'bg-amber-500', textColor: 'text-amber-500', percent: 50 };
    case 3:
      return { score: 3, label: 'Mật khẩu khá an toàn', color: 'bg-blue-500', textColor: 'text-blue-500', percent: 75 };
    case 4:
      return { score: 4, label: 'Mật khẩu rất mạnh', color: 'bg-emerald-500', textColor: 'text-emerald-600', percent: 100 };
    default:
      return { score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-400', percent: 0 };
  }
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const passwordMatches = useMemo(() => {
    if (!confirmPassword) return null;
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  if (!token) {
    return (
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/60 text-center animate-in fade-in duration-200">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mb-4 shadow-inner">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Thiếu mã xác thực</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Đường dẫn đặt lại mật khẩu không hợp lệ hoặc thiếu mã token. Vui lòng yêu cầu một liên kết mới.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Yêu cầu liên kết mới</span>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo an toàn.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setLoading(true);

    try {
      await apiFetch<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Mã liên kết không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/60 transition-all">
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Đặt lại mật khẩu</h1>
        <p className="text-sm text-slate-500 mt-1">
          Thiết lập mật khẩu mới an toàn cho tài khoản của bạn
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs sm:text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {success ? (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center gap-2.5 text-emerald-800 text-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="font-bold text-emerald-900 text-base">Đổi mật khẩu thành công!</p>
            <p className="text-emerald-700 text-xs sm:text-sm leading-relaxed">
              Mật khẩu mới của bạn đã được cập nhật thành công. Bạn có thể đăng nhập ngay bây giờ.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 hover:shadow-indigo-300"
          >
            <span>Đăng nhập ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="new_password_field"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Tối thiểu 6 ký tự..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                tabIndex={-1}
                aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {newPassword && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${strength.color}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className={`font-semibold ${strength.textColor}`}>{strength.label}</span>
                  <span className="text-slate-400">Khuyên dùng: từ 8 ký tự, có số</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Xác nhận mật khẩu mới
              </label>
              {passwordMatches !== null && (
                <span className="text-[11px] flex items-center gap-1">
                  {passwordMatches ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Trùng khớp
                    </span>
                  ) : (
                    <span className="text-red-500 font-medium flex items-center gap-0.5">
                      <XCircle className="w-3 h-3" /> Chưa khớp
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirm_password_field"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nhập lại mật khẩu mới..."
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all text-slate-900 placeholder:text-slate-400 ${
                  passwordMatches === false
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer hover:shadow-indigo-300 active:scale-[0.99]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang cập nhật mật khẩu...</span>
              </div>
            ) : (
              <>
                <span>Xác nhận đổi mật khẩu</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Nhớ mật khẩu? Đăng nhập ngay</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

