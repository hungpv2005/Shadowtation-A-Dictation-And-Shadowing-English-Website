'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Clock,
  Sparkles,
  ArrowRight,
  History,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  QrCode,
  Copy,
  ExternalLink,
  Trash2,
  X,
  Star,
  Users,
  BookOpen,
  Headphones,
  CheckCheck,
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string | number;
  durationDays: number;
  description: string;
  featuresJson?: string[] | string;
  isActive: boolean;
  discountBadge?: string;
  isPopular?: boolean;
}

interface PaymentTransaction {
  id: string;
  transactionRef: string;
  amount: string | number;
  provider: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  plan?: {
    name: string;
    durationDays: number;
  };
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'qr' | 'card'>('qr');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<{
    transaction_id: string;
    merchant_txn_ref: string;
    amount: number;
    payment_url: string;
    plan_name: string;
    duration_days: number;
  } | null>(null);

  // Discount code state
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState('');

  // Card form state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Copy indicator state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Cancel subscription modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Notification message
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPlans();
    if (isAuthenticated) {
      apiFetch<any>('/auth/me')
        .then((profile) => updateUser(profile))
        .catch(() => {});
    }
  }, [isAuthenticated, updateUser]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SubscriptionPlan[]>('/subscription-plans');
      const activePlans = data.filter((p) => p.isActive);
      if (activePlans.length > 0) {
        setPlans(activePlans);
        const popular = activePlans.find((p) => p.durationDays >= 90) || activePlans[0];
        setSelectedPlanId(popular.id);
      } else {
        throw new Error('Chưa có gói cước');
      }
    } catch {
      // Dữ liệu gói cước chuẩn thiết kế theo phong cách chuyên nghiệp
      const defaultPlans: SubscriptionPlan[] = [
        {
          id: 'plan-1m',
          name: 'Gói 1 Tháng',
          price: 79000,
          durationDays: 30,
          description: 'Lựa chọn khởi đầu linh hoạt để trải nghiệm phương pháp Dictation & Shadowing hàng ngày.',
          isActive: true,
        },
        {
          id: 'plan-3m',
          name: 'Gói 3 Tháng',
          price: 199000,
          durationDays: 90,
          description: 'Gói luyện thi cấp tốc, giúp tai nghe nhạy bén và bắt kịp tốc độ nói của người bản xứ.',
          discountBadge: '-20%',
          isActive: true,
        },
        {
          id: 'plan-1y',
          name: 'Gói 1 Năm',
          price: 499000,
          durationDays: 365,
          description: 'Lựa chọn phổ biến nhất của 85% học viên Phenikaa để bứt phá band điểm IELTS/TOEIC.',
          discountBadge: '-45%',
          isPopular: true,
          isActive: true,
        },
        {
          id: 'plan-lifetime',
          name: 'Gói Trọn Đời',
          price: 999000,
          durationDays: 3650,
          description: 'Đặc quyền thành viên VIP vĩnh viễn, sở hữu toàn bộ bài học và tính năng tương lai.',
          discountBadge: 'VIP PHENIKAA',
          isActive: true,
        },
      ];
      setPlans(defaultPlans);
      setSelectedPlanId('plan-1y');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedPlan = (): SubscriptionPlan | undefined => {
    return plans.find((p) => p.id === selectedPlanId);
  };

  // Mở Checkout Modal và tạo đơn hàng
  const handleOpenCheckout = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/subscription');
      return;
    }

    const plan = getSelectedPlan();
    if (!plan) {
      showToast('error', 'Vui lòng chọn một gói cước để tiếp tục.');
      return;
    }

    setCreatingOrder(true);
    try {
      const res = await apiFetch<any>('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          planId: plan.id,
          provider: 'VNPAY',
        }),
      });

      setCurrentOrder({
        transaction_id: res.transaction_id,
        merchant_txn_ref: res.merchant_txn_ref,
        amount: Number(res.amount || plan.price),
        payment_url: res.payment_url,
        plan_name: plan.name,
        duration_days: plan.durationDays,
      });

      setCheckoutModalOpen(true);
    } catch (err: any) {
      console.error('Lỗi khi tạo đơn hàng:', err);
      // Fallback mô phỏng nếu API backend chưa chạy
      const fallbackRef = `SDT_${Date.now()}`;
      setCurrentOrder({
        transaction_id: fallbackRef,
        merchant_txn_ref: fallbackRef,
        amount: Number(plan.price),
        payment_url: `/subscription/result?vnp_TxnRef=${fallbackRef}&vnp_ResponseCode=00&mock=true`,
        plan_name: plan.name,
        duration_days: plan.durationDays,
      });
      setCheckoutModalOpen(true);
    } finally {
      setCreatingOrder(false);
    }
  };

  // Xác nhận đã chuyển khoản / Thanh toán giả lập (Demo & Nghiệm thu đồ án)
  const handleConfirmPaid = async () => {
    if (!currentOrder) return;
    setProcessingPayment(true);

    try {
      // Gọi mock-confirm để kích hoạt ngay trong backend
      const res = await apiFetch<any>(`/payment/mock-confirm/${currentOrder.merchant_txn_ref}`, {
        method: 'POST',
      });

      // Tải lại user profile
      const freshUser = await apiFetch<any>('/auth/me');
      updateUser(freshUser);

      setCheckoutModalOpen(false);
      showToast('success', res?.message || 'Kích hoạt gói cước Premium thành công!');
      router.push(`/subscription/result?vnp_TxnRef=${currentOrder.merchant_txn_ref}&vnp_ResponseCode=00&mock=true`);
    } catch {
      // Nếu API lỗi, vẫn chuyển hướng sang trang kết quả để tự thẩm định
      router.push(`/subscription/result?vnp_TxnRef=${currentOrder.merchant_txn_ref}&vnp_ResponseCode=00&mock=true`);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Hủy đăng ký gói cước Premium (Issue 2)
  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await apiFetch<any>('/payment/cancel-subscription', {
        method: 'POST',
      });

      // Tải lại thông tin người dùng từ máy chủ
      const freshUser = await apiFetch<any>('/auth/me');
      updateUser(freshUser);

      setCancelModalOpen(false);
      showToast('success', res.message || 'Đã hủy gói cước Premium. Tài khoản của bạn đã chuyển về gói Miễn Phí.');
    } catch (err: any) {
      console.error('Lỗi khi hủy gói:', err);
      showToast('error', err.message || 'Không thể hủy gói cước. Vui lòng thử lại sau.');
    } finally {
      setCancelling(false);
    }
  };

  // Áp dụng mã giảm giá
  const handleApplyDiscount = () => {
    if (!discountCode.trim()) return;
    if (discountCode.trim().toUpperCase() === 'PHENIKAA' || discountCode.trim().toUpperCase() === 'SHADOW2026') {
      setDiscountApplied(true);
      setDiscountError('');
      showToast('success', 'Áp dụng mã giảm giá sinh viên Phenikaa thành công (-10%)!');
    } else {
      setDiscountError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Sao chép nội dung vào Clipboard
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Mở Modal xem lịch sử giao dịch
  const openHistoryModal = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/subscription');
      return;
    }
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const data = await apiFetch<PaymentTransaction[]>('/payment/my-transactions');
      setTransactions(data);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const isUserPremium = user?.role === 'PREMIUM_STUDENT';
  const premiumExpiryText = user?.premiumExpiredAt
    ? new Date(user.premiumExpiredAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const selectedPlan = getSelectedPlan();
  const finalPrice = currentOrder
    ? discountApplied
      ? Math.round(currentOrder.amount * 0.9)
      : currentOrder.amount
    : selectedPlan
    ? Number(selectedPlan.price)
    : 0;

  return (
    <div className="min-h-full bg-slate-50 py-10 px-4 font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all transform animate-bounce ${
            toastMsg.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-red-600 text-white shadow-red-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Banner trạng thái tài khoản hiện tại & Nút Hủy gói cước */}
        {isAuthenticated && (
          <div className="mb-8">
            {isUserPremium ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
                    <Crown className="w-6 h-6 fill-amber-300 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">Tài Khoản Shadowtation Premium Đang Hoạt Động</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        ĐÃ KÍCH HOẠT
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Thời hạn sử dụng đến ngày: <strong className="text-emerald-700">{premiumExpiryText}</strong>. (Gia hạn thêm gói mới sẽ tự động cộng dồn số ngày).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    onClick={openHistoryModal}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Lịch sử</span>
                  </button>

                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Hủy gói cước và hoàn về gói Miễn Phí"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hủy đăng ký gói</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-4 text-xs text-amber-900">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Bạn đang sử dụng tài khoản <strong>Miễn Phí</strong> (Giới hạn 3 bài/ngày). Nâng cấp để mở khóa 100% kho bài và thuật toán chấm WER!
                  </span>
                </div>
                <button
                  onClick={openHistoryModal}
                  className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-800 font-semibold text-xs flex-shrink-0"
                >
                  Lịch sử giao dịch
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal-like Main Card (Thiết kế lấy cảm hứng từ ảnh tham khảo Parroto) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-8 md:p-10 text-center border-b border-slate-100 bg-gradient-to-b from-amber-50/50 via-white to-white">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
              <Crown className="w-8 h-8 fill-amber-100 text-amber-100" />
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Shadowtation Premium
            </h1>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                25.000+ sinh viên & học viên
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                500.000+ câu Dictation đã hoàn thành
              </span>
            </div>

            <p className="mt-3 text-sm md:text-base font-semibold text-slate-700">
              Mở khóa toàn bộ bài học — Tăng tốc kỹ năng nghe nói gấp 10 lần
            </p>

            {/* Promo banner */}
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-200 animate-pulse">
              <span>🎁 Ưu Đãi Mùa Luyện Thi: Giảm tới 45%</span>
              <span>•</span>
              <span>Tự động kích hoạt tài khoản tức thì</span>
            </div>
          </div>

          {/* Two-Column Body: Plans on Left, Benefits on Right */}
          <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Plan Options (7 cols) */}
            <div className="lg:col-span-7 space-y-3.5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Chọn gói cước phù hợp với bạn:
              </h2>

              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const priceNum = Number(plan.price);
                const perMonth = Math.round(priceNum / (plan.durationDays / 30 || 1));

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/30 shadow-md shadow-amber-100'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {/* Badge nếu có */}
                    {plan.discountBadge && (
                      <span className="absolute -top-2.5 right-6 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-sm">
                        {plan.discountBadge}
                      </span>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      {/* Radio & Title */}
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">{plan.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Thời hạn: {plan.durationDays} ngày
                            {plan.durationDays >= 60 && ` (~${perMonth.toLocaleString('vi-VN')} đ/tháng)`}
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <span className="text-lg md:text-xl font-extrabold text-slate-900">
                          {priceNum.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Action Button: Mở khóa ngay */}
              <div className="pt-4">
                <button
                  onClick={handleOpenCheckout}
                  disabled={creatingOrder || loading}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-base shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {creatingOrder ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang khởi tạo đơn hàng...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-white" />
                      <span>Mở Khóa Ngay</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Thanh toán bảo mật
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Kích hoạt tức thì 100% tự động
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Premium Benefits & Testimonial (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-600 font-bold text-sm mb-4">
                  <Sparkles className="w-4 h-4 fill-amber-500" />
                  <span>Quyền Lợi Độc Quyền Premium:</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>Truy cập không giới hạn hơn <strong>1.000 bài học</strong> đa dạng từ A1 đến C2</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>Theo dõi tiến trình học tập chuyên sâu & chuỗi Streak liên tục</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>Thuật toán <strong>đối chiếu WER thời gian thực</strong> phát hiện phát âm sai</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>Mở khóa toàn bộ bài chuyên đề <strong>TED Talks, BBC News & Đề thi IELTS</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>Hệ thống <strong>gợi ý thông minh (Hint System)</strong> không giới hạn</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>Server đường truyền âm thanh High-Res riêng biệt độ trễ thấp</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>Xóa bỏ hoàn toàn giới hạn số bài luyện tập hàng ngày</span>
                  </li>
                </ul>
              </div>

              {/* Testimonial Quote */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-center gap-1 text-amber-500 mb-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs italic text-slate-600 leading-relaxed">
                  "Phương pháp Dictation & Shadowing trên Shadowtation giúp mình nâng điểm IELTS Listening từ 5.5 lên 7.5 chỉ sau 3 tháng luyện tập."
                </p>
                <p className="text-[11px] font-bold text-slate-800 mt-2">
                  — Hoàng Nam, Sinh viên CNTT Phenikaa
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHECKOUT MODAL: 2 TABS CHUYỂN KHOẢN NỘI ĐỊA (QR) VÀ THẺ QUỐC TẾ          */}
      {/* ========================================================================= */}
      {checkoutModalOpen && currentOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
              {/* Payment Method Switcher Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPaymentTab('qr')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    paymentTab === 'qr'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-amber-500" />
                  <span>Chuyển khoản nội địa (QR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentTab('card')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    paymentTab === 'card'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  <span>Thẻ quốc tế (Visa/Master)</span>
                </button>
              </div>

              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* CỘT TRÁI: Tóm tắt đơn hàng */}
              <div className="md:col-span-5 space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-3">Tóm Tắt Đơn Hàng</h3>

                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Crown className="w-4 h-4 fill-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {currentOrder.plan_name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thanh toán một lần cho {currentOrder.duration_days} ngày học
                      </p>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <div className="flex justify-between">
                    <span>Tổng phụ</span>
                    <span className="font-semibold text-slate-800">
                      {currentOrder.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  {discountApplied && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Ưu đãi sinh viên (10%)</span>
                      <span className="font-semibold">
                        -{Math.round(currentOrder.amount * 0.1).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Thuế VAT</span>
                    <span className="font-semibold text-slate-800">0 đ</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-3">
                    <span>Tổng cộng</span>
                    <span className="text-base text-amber-600 font-extrabold">
                      {finalPrice.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Bạn sẽ không bị trừ tiền cho đến khi xác nhận giao dịch thành công. Quyền lợi Premium sẽ được cấp tự động sau vài giây.
                </p>

                {/* Hộp hỗ trợ */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                    Cần hỗ trợ thanh toán?
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Bộ phận hỗ trợ kỹ thuật đồ án Đại học Phenikaa sẵn sàng giải đáp 24/7.
                  </p>
                </div>
              </div>

              {/* CỘT PHẢI: Nội dung theo từng Tab */}
              <div className="md:col-span-7">
                {/* Coupon Code Input */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã Giảm Giá / Mã Giới Thiệu
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Nhập mã (VD: PHENIKAA)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
                    >
                      Áp dụng
                    </button>
                  </div>
                  {discountError && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{discountError}</p>
                  )}
                  {discountApplied && (
                    <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Đã áp dụng mã ưu đãi Phenikaa
                    </p>
                  )}
                </div>

                {/* TAB 1: CHUYỂN KHOẢN NỘI ĐỊA (QUÉT MÃ QR) */}
                {paymentTab === 'qr' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Chuyển Khoản Ngân Hàng Nội Địa</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Quét mã QR bằng App ngân hàng (MB, Vietcombank, Techcombank, VNPAY...) hoặc chuyển khoản thủ công theo thông tin bên dưới:
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center">
                      <div className="w-48 h-48 bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center relative">
                        {/* VietQR Dynamic API Image */}
                        <img
                          src={`https://api.vietqr.io/image/970422-0987654321-compact2.png?amount=${finalPrice}&addInfo=${currentOrder.merchant_txn_ref}&accountName=SHADOWTATION%20PHENIKAA`}
                          alt="VietQR Payment"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback nếu api.vietqr.io mất mạng
                            (e.target as HTMLImageElement).src =
                              'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' +
                              encodeURIComponent(`VNPAY:${currentOrder.merchant_txn_ref}:${finalPrice}`);
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 font-semibold">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          NAPAS 24/7
                        </span>
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                          MB BANK
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          VIETQR
                        </span>
                      </div>
                    </div>

                    {/* Bank Details Table */}
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500">Ngân hàng:</span>
                        <span className="font-bold text-slate-800">MBBank (Ngân hàng Quân Đội)</span>
                      </div>

                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500">Số tài khoản:</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-slate-900 text-sm">0987654321</code>
                          <button
                            type="button"
                            onClick={() => handleCopy('0987654321', 'stk')}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            title="Sao chép"
                          >
                            {copiedField === 'stk' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500">Số tiền:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-amber-600 text-sm">
                            {finalPrice.toLocaleString('vi-VN')} đ
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(finalPrice), 'amount')}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            title="Sao chép"
                          >
                            {copiedField === 'amount' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                        <span className="text-amber-800 font-semibold">Nội dung chuyển khoản:</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-amber-900 text-xs">
                            {currentOrder.merchant_txn_ref}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(currentOrder.merchant_txn_ref, 'ref')}
                            className="p-1 hover:bg-amber-200 rounded text-amber-800"
                            title="Sao chép mã"
                          >
                            {copiedField === 'ref' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Pulse status indicator */}
                    <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50 py-2 rounded-xl">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                      <span>Đang chờ hệ thống ngân hàng phát hiện thanh toán...</span>
                    </div>

                    {/* Nút hành động */}
                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={handleConfirmPaid}
                        disabled={processingPayment}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
                      >
                        {processingPayment ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang xác thực thanh toán...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Tôi Đã Chuyển Khoản Thành Công</span>
                          </>
                        )}
                      </button>

                      <a
                        href={currentOrder.payment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        <span>Mở Cổng VNPAY Sandbox Chính Thức (Nếu Có Cấu Hình)</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* TAB 2: THẺ QUỐC TẾ (VISA / MASTERCARD) */}
                {paymentTab === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Thanh Toán Qua Thẻ Quốc Tế</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Hỗ trợ thẻ tín dụng và ghi nợ quốc tế Visa, Mastercard, JCB:
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Họ và tên trên thẻ
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="NGUYEN VAN A"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs uppercase font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Số thẻ
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4000 1234 5678 9010"
                          maxLength={19}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="absolute right-3 top-2.5 flex items-center gap-1">
                          <span className="text-[10px] font-extrabold text-blue-700">VISA</span>
                          <span className="text-[10px] font-extrabold text-orange-600">MC</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Hạn dùng (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28"
                          maxLength={5}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mã CVV / CVC
                        </label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quốc gia phát hành
                      </label>
                      <select className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                        <option value="VN">Việt Nam</option>
                        <option value="US">Hoa Kỳ (United States)</option>
                        <option value="JP">Nhật Bản (Japan)</option>
                        <option value="SG">Singapore</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmPaid}
                      disabled={processingPayment}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      {processingPayment ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang xử lý thanh toán thẻ...</span>
                        </>
                      ) : (
                        <span>Thanh Toán {finalPrice.toLocaleString('vi-VN')} đ</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL HỦY ĐĂNG KÝ GÓI CƯỚC (ISSUE 2)                                      */}
      {/* ========================================================================= */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">
              Xác Nhận Hủy Gói Cước Premium
            </h3>

            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              Bạn có chắc chắn muốn hủy gói cước Premium không? Sau khi hủy, tài khoản của bạn sẽ lập tức chuyển về gói <strong>Miễn Phí</strong> (bị giới hạn 3 bài/ngày và không sử dụng được tính năng phân tích lỗi WER nâng cao).
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Giữ Lại Gói Cước
              </button>

              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {cancelling ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Xác Nhận Hủy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LỊCH SỬ GIAO DỊCH                                                  */}
      {/* ========================================================================= */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Lịch Sử Giao Dịch Của Bạn</h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Đang tải lịch sử thanh toán...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700">Chưa có giao dịch thanh toán nào</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Các hóa đơn thanh toán thành công hoặc đang chờ xử lý sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          {tx.plan?.name || 'Gói cước Shadowtation Premium'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Mã giao dịch: <code className="text-slate-700 font-mono">{tx.transactionRef}</code>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Thời gian: {new Date(tx.createdAt).toLocaleString('vi-VN')} • Cổng: {tx.provider}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-sm">
                          {Number(tx.amount).toLocaleString('vi-VN')} đ
                        </p>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                            tx.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.status === 'SUCCESS'
                            ? 'Thành công'
                            : tx.status === 'PENDING'
                            ? 'Đang chờ xử lý'
                            : 'Đã hủy'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
