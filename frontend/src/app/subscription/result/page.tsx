'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import {
  CheckCircle2,
  XCircle,
  Crown,
  Calendar,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CreditCard,
  FileCheck2,
} from 'lucide-react';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { updateUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<{
    txnRef?: string;
    amount?: number;
    planName?: string;
    durationDays?: number;
    premiumExpiredAt?: string;
  }>({});

  useEffect(() => {
    verifyPayment();
  }, [searchParams]);

  const verifyPayment = async () => {
    setLoading(true);
    const txnRef = searchParams.get('vnp_TxnRef') || '';
    const responseCode = searchParams.get('vnp_ResponseCode') || '';
    const amountParam = searchParams.get('vnp_Amount') || '0';

    if (!txnRef) {
      setSuccess(false);
      setMessage('Không tìm thấy thông tin mã giao dịch trong kết quả phản hồi.');
      setLoading(false);
      return;
    }

    try {
      // Gọi API backend để thẩm định chữ ký và kích hoạt Premium (idempotent)
      const queryStr = searchParams.toString();
      const res = await apiFetch<any>(`/payment/verify-return?${queryStr}`);

      if (res && res.success) {
        setSuccess(true);
        setMessage(res.message || 'Thanh toán và kích hoạt gói cước thành công!');
        setDetails({
          txnRef: res.transaction?.transactionRef || txnRef,
          amount: res.transaction?.amount ? Number(res.transaction.amount) : Math.round(Number(amountParam) / 100),
          planName: res.plan?.name || 'Gói cước Shadowtation Premium',
          durationDays: res.plan?.durationDays,
          premiumExpiredAt: res.transaction?.user?.premiumExpiredAt,
        });

        // Cập nhật lại thông tin người dùng từ máy chủ vào AuthStore
        try {
          const freshUser = await apiFetch<any>('/auth/me');
          updateUser(freshUser);
        } catch {
          // Bỏ qua lỗi phụ nếu mạng chậm
        }
      } else {
        setSuccess(false);
        setMessage(res?.message || 'Giao dịch không thành công hoặc người dùng đã hủy thanh toán.');
        setDetails({
          txnRef,
          amount: Math.round(Number(amountParam) / 100),
        });
      }
    } catch (err: any) {
      console.error('Lỗi thẩm định thanh toán:', err);
      // Nếu responseCode là 00 nhưng backend lỗi mạng, vẫn thông báo rõ ràng
      if (responseCode === '00') {
        setSuccess(true);
        setMessage('Giao dịch của bạn đã hoàn tất trên cổng thanh toán VNPAY!');
        setDetails({
          txnRef,
          amount: Math.round(Number(amountParam) / 100),
        });
        // Cố gắng reload profile
        apiFetch<any>('/auth/me')
          .then((u) => updateUser(u))
          .catch(() => {});
      } else {
        setSuccess(false);
        setMessage(err.message || 'Giao dịch đã bị gián đoạn hoặc không thành công.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 max-w-xl mx-auto text-center shadow-lg">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Đang Thẩm Định Giao Dịch</h2>
        <p className="text-sm text-slate-500 mt-2">
          Hệ thống đang kết nối với máy chủ VNPAY để xác thực chữ ký số HMAC-SHA512 và kích hoạt tài khoản của bạn...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 max-w-xl mx-auto shadow-xl text-center">
      {success ? (
        <>
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-100">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
            <span>Nâng Cấp Thành Công!</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Chào Mừng Đến Với Shadowtation Premium
          </h1>

          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {message} Giờ đây toàn bộ kho bài học Dictation & Shadowing và các tính năng phân tích WER nâng cao đã sẵn sàng phục vụ bạn.
          </p>

          {/* Details Card */}
          <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-slate-400" />
                Mã giao dịch:
              </span>
              <span className="font-mono font-bold text-slate-800">{details.txnRef || 'N/A'}</span>
            </div>

            {details.planName && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Gói đã đăng ký:
                </span>
                <span className="font-semibold text-slate-800">{details.planName}</span>
              </div>
            )}

            {details.amount !== undefined && details.amount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  Số tiền thanh toán:
                </span>
                <span className="font-bold text-emerald-600">
                  {details.amount.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Trạng thái:
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                Đã thanh toán (SUCCESS)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/practice/dictation"
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <span>Vào Luyện Bài Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center"
            >
              Về Trang Chủ
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* Failure Icon */}
          <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-6 shadow-md shadow-red-100">
            <XCircle className="w-12 h-12" />
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Thanh Toán Không Thành Công
          </h1>

          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {message}
          </p>

          {details.txnRef && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-left font-mono">
              Mã giao dịch: {details.txnRef}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/subscription"
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Thử Lại Thanh Toán</span>
            </Link>

            <Link
              href="/"
              className="px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center"
            >
              Về Trang Chủ
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function SubscriptionResultPage() {
  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <div className="bg-white rounded-3xl border border-slate-200 p-12 max-w-xl mx-auto text-center shadow-lg">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800">Đang Tải Kết Quả Thanh Toán...</h2>
            </div>
          }
        >
          <PaymentResultContent />
        </Suspense>
      </main>
    </div>
  );
}
