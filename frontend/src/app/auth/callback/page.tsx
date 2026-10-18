'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import { CheckCircle2, AlertCircle, Headphones } from 'lucide-react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(error));
      setTimeout(() => {
        router.push(`/login?error=${encodeURIComponent(error)}`);
      }, 2500);
      return;
    }

    if (!accessToken || !refreshToken) {
      setStatus('error');
      setErrorMessage('Không nhận được mã xác thực từ máy chủ.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    // Lấy thông tin user profile từ /auth/me
    const fetchProfileAndSetAuth = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Không thể tải thông tin tài khoản');
        }

        const profile = await response.json();
        setAuth(profile, accessToken, refreshToken, true);
        setStatus('success');

        setTimeout(() => {
          if (profile.role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        }, 800);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Lỗi khi hoàn tất phiên đăng nhập Google.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    fetchProfileAndSetAuth();
  }, [searchParams, router, setAuth]);

  return (
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 shadow-2xl shadow-slate-200/60 text-center animate-in fade-in zoom-in-95 duration-200">
      {status === 'loading' && (
        <div className="space-y-4">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
            <div className="absolute inset-0 rounded-2xl border-2 border-indigo-600/30 border-t-indigo-600 animate-spin" />
            <Headphones className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Đang xác thực tài khoản Google...</h2>
          <p className="text-xs text-slate-500">Vui lòng chờ trong giây lát, hệ thống đang đồng bộ dữ liệu học tập.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Đăng nhập Google thành công!</h2>
          <p className="text-xs text-emerald-700 font-medium">Đang chuyển hướng về trang chủ...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-2">
            <AlertCircle className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Xác thực không thành công</h2>
          <p className="text-xs text-red-600 font-medium leading-relaxed">{errorMessage}</p>
          <p className="text-[11px] text-slate-400">Đang quay lại trang đăng nhập...</p>
        </div>
      )}
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto animate-pulse mb-4" />
            <div className="h-5 bg-slate-100 rounded w-1/2 mx-auto animate-pulse" />
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
