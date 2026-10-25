'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const PREMIUM_FEATURES = [
  {
    icon: '🎙️',
    title: 'Chấm điểm phát âm AI không giới hạn',
    badge: 'Công nghệ AI độc quyền',
    desc: 'Đánh giá độ chính xác (Accuracy), độ lưu loát (Fluency), ngữ điệu (Intonation) và độ hoàn thiện (Completeness) thời gian thực theo từng câu.',
    detail: 'Phân tích chi tiết từng âm tiết và âm vị (phoneme), chỉ rõ từ phát âm chuẩn (xanh), chưa chuẩn (vàng) hay sai âm đuôi (đỏ) kèm mẹo đặt lưỡi.',
  },
  {
    icon: '🎬',
    title: 'Nhập video YouTube & Podcast riêng không giới hạn',
    badge: 'Tự do bài học',
    desc: 'Dán bất kỳ liên kết YouTube, bài phát biểu TED Talks, phóng sự thời sự BBC hay podcast nào bạn yêu thích.',
    detail: 'Hệ thống tự động tách phụ đề, ngắt từng câu thông minh và tạo bài tập Luyện nghe (Dictation) và Luyện nói (Shadowing) chỉ trong vài giây.',
  },
  {
    icon: '🧠',
    title: 'Sổ từ vựng thông minh & Lặp lại ngắt quãng (Spaced Repetition)',
    badge: 'Ghi nhớ vĩnh viễn',
    desc: 'Lưu trữ không giới hạn từ vựng kèm đầy đủ Loại từ (n, v, adj, adv...), câu ngữ cảnh thực tế và âm thanh phát âm bản xứ.',
    detail: 'Thuật toán tự động tính toán chu kỳ quên và nhắc nhở ôn tập những từ bạn hay sai nhất đúng vào thời điểm vàng của não bộ.',
  },
  {
    icon: '⚡',
    title: 'Tùy chỉnh tốc độ mượt mà & Chế độ luyện nói nâng cao',
    badge: 'Linh hoạt',
    desc: 'Làm chậm tốc độ audio từ 0.5x, 0.75x đến 1.25x mà không bị méo tiếng hay thay đổi cao độ giọng nói.',
    detail: 'Hỗ trợ ẩn/hiện phiên âm IPA quốc tế, bản dịch nghĩa tiếng Việt và chế độ nghe lặp từng phân đoạn khó (A-B loop).',
  },
  {
    icon: '📊',
    title: 'Báo cáo phân tích chuyên sâu & Biểu đồ tiến bộ cá nhân hóa',
    badge: 'Theo dõi sát sao',
    desc: 'Theo dõi chỉ số tiến bộ từng ngày, điểm trung bình thực tế, chuỗi ngày chuyên cần (streak) và tổng thời gian học tích lũy.',
    detail: 'Bảng xếp hạng và tổng kết những cụm từ hay mắc lỗi nhất để bạn có lộ trình cải thiện rõ ràng từng tuần.',
  },
  {
    icon: '🛡️',
    title: '100% không quảng cáo & Hỗ trợ kỹ thuật VIP 24/7',
    badge: 'Trải nghiệm đỉnh cao',
    desc: 'Học tập tập trung tuyệt đối, không có bất kỳ quảng cáo hay popup làm phiền nào.',
    detail: 'Tận hưởng băng thông máy chủ ưu tiên cao nhất, tốc độ tải âm thanh nhanh gấp 3 lần và được đội ngũ chuyên môn giải đáp thắc mắc 24/7.',
  },
];

const COMPARISON_ROWS = [
  { feature: 'Số câu chấm phát âm AI mỗi ngày', free: '5 câu / ngày', premium: 'Không giới hạn ⚡' },
  { feature: 'Tự nhập video YouTube & Podcast của riêng bạn', free: 'Tối đa 2 bài ngắn', premium: 'Không giới hạn bài học 🎬' },
  { feature: 'Phân tích chi tiết âm vị & Ngữ điệu sóng âm', free: 'Chấm điểm tổng quan', premium: 'Chi tiết từng âm vị + Mẹo phát âm 🎙️' },
  { feature: 'Sổ từ vựng cá nhân & Lặp lại ngắt quãng', free: 'Giới hạn 20 từ', premium: 'Không giới hạn + Thuật toán Spaced Repetition 🧠' },
  { feature: 'Tùy chỉnh tốc độ phát âm thanh giữ nguyên cao độ', free: '1.0x cố định', premium: '0.5x – 1.5x mượt mà ⚡' },
  { feature: 'Toàn bộ thư viện bài học chuẩn quốc tế (A1 – C2)', free: 'Các bài học cơ bản', premium: 'Mở khóa toàn bộ 100% thư viện 🌟' },
  { feature: 'Quảng cáo & Tốc độ tải máy chủ', free: 'Băng thông tiêu chuẩn', premium: 'Không quảng cáo 100% + Máy chủ VIP 🛡️' },
];

export default function SubscriptionPage() {
  const [isPremium, setIsPremium] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY' | 'LIFETIME'>('YEARLY');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkTier = () => {
      const tier = localStorage.getItem('shadowtation_tier');
      try {
        const raw = localStorage.getItem('student_profile');
        if (raw) {
          const u = JSON.parse(raw);
          setIsPremium(u?.role === 'PREMIUM_STUDENT' || u?.isPremium === true || tier === 'PREMIUM');
          return;
        }
      } catch {}
      setIsPremium(tier === 'PREMIUM');
    };
    checkTier();
    window.addEventListener('shadowtation:auth-change', checkTier);
    return () => window.removeEventListener('shadowtation:auth-change', checkTier);
  }, []);

  const handleToggleTier = (enable: boolean) => {
    if (enable) {
      localStorage.setItem('shadowtation_tier', 'PREMIUM');
      try {
        const raw = localStorage.getItem('student_profile');
        const profile = raw ? JSON.parse(raw) : { name: 'Học viên', email: 'student@example.com' };
        profile.role = 'PREMIUM_STUDENT';
        profile.isPremium = true;
        profile.premiumExpiredAt = new Date(Date.now() + 365 * 86400000).toISOString();
        localStorage.setItem('student_profile', JSON.stringify(profile));
      } catch {}
      setIsPremium(true);
      window.dispatchEvent(new Event('shadowtation:auth-change'));
      setToastMessage('🎉 Chúc mừng! Bạn đã nâng cấp thành công gói Premium.');
    } else {
      localStorage.removeItem('shadowtation_tier');
      try {
        const raw = localStorage.getItem('student_profile');
        if (raw) {
          const profile = JSON.parse(raw);
          profile.role = 'STUDENT';
          profile.isPremium = false;
          localStorage.setItem('student_profile', JSON.stringify(profile));
        }
      } catch {}
      setIsPremium(false);
      window.dispatchEvent(new Event('shadowtation:auth-change'));
      setToastMessage('Đã chuyển về tài khoản Miễn phí để kiểm thử.');
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-76px)] max-w-6xl px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      {/* Nút quay lại trang chủ dạng khung button */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
        >
          <span aria-hidden="true" className="text-lg">←</span> Quay lại trang chủ
        </Link>
      </div>

      {/* Hero Banner */}
      <header className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-blue-50 p-8 sm:p-12 shadow-md relative overflow-hidden mb-12">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/80 px-4 py-1 text-sm font-extrabold text-amber-900 mb-4 shadow-sm">
            <span>⭐ SHADOWTATION PREMIUM VIP</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Nâng tầm phản xạ tiếng Anh cùng trí tuệ nhân tạo AI
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-700 leading-relaxed font-medium">
            Mở khóa khả năng luyện nghe chép chính tả và nói nhại không giới hạn. Tự động sửa lỗi phát âm từng âm tiết và lưu trữ từ vựng riêng của bạn mãi mãi.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {isPremium ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-base font-black text-white shadow-lg shadow-amber-500/25">
                  ✓ Tài khoản của bạn đang là VIP Premium
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleTier(false)}
                  className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  (Kiểm thử: Chuyển về Miễn phí)
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleTier(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-black text-white shadow-xl shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700 transition hover:scale-105"
                >
                  ⭐ Kích hoạt trải nghiệm Premium ngay
                </button>
                <span className="text-sm font-semibold text-slate-500">
                  Thử nghiệm tính năng ngay không cần thẻ tín dụng
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 6 Tính năng cốt lõi của Premium */}
      <section className="mb-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-sm font-extrabold uppercase tracking-wider text-blue-600">Đặc quyền cao cấp</span>
          <h2 className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
            Gói Premium bao gồm những gì?
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Mọi công cụ bạn cần để bứt phá kỹ năng Nghe và Nói tiếng Anh từ cơ bản đến lưu loát như người bản xứ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PREMIUM_FEATURES.map((item, idx) => (
            <article
              key={idx}
              className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl shadow-inner">
                    {item.icon}
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 leading-snug">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-base text-slate-700 font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500 leading-normal">
                  {item.detail}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Bảng so sánh Miễn phí vs. Premium */}
      <section className="mb-14 rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-10 shadow-sm overflow-hidden">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-sm font-extrabold uppercase tracking-wider text-indigo-600">So sánh quyền lợi</span>
          <h2 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">
            Tài khoản Miễn phí vs. Gói Premium
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Xem sự khác biệt rõ rệt để lựa chọn phiên bản phù hợp nhất với mục tiêu học của bạn.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-4 px-4 text-base font-extrabold text-slate-900">Tính năng</th>
                <th className="py-4 px-4 text-base font-bold text-slate-500 w-1/4">Tài khoản Miễn phí</th>
                <th className="py-4 px-4 text-base font-black text-blue-700 w-1/3 bg-blue-50/70 rounded-t-2xl">
                  Gói học Premium ⭐
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-4 px-4 text-base font-bold text-slate-800">{row.feature}</td>
                  <td className="py-4 px-4 text-sm font-semibold text-slate-500">{row.free}</td>
                  <td className="py-4 px-4 text-base font-black text-blue-800 bg-blue-50/40">{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Các gói lựa chọn giá học */}
      <section className="mb-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-sm font-extrabold uppercase tracking-wider text-amber-600">Bảng giá ưu đãi</span>
          <h2 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">
            Chọn gói học phù hợp nhất với bạn
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Đầu tư cho kỹ năng giao tiếp tiếng Anh trọn đời với mức chi phí chỉ từ một ly cà phê mỗi tuần.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gói 1 Tháng */}
          <article
            onClick={() => setSelectedPlan('MONTHLY')}
            className={`cursor-pointer rounded-3xl border-2 p-7 transition flex flex-col justify-between ${
              selectedPlan === 'MONTHLY'
                ? 'border-blue-500 bg-white shadow-xl ring-2 ring-blue-300'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Linh hoạt</span>
              <h3 className="mt-1 text-2xl font-black text-slate-900">Gói 1 Tháng</h3>
              <p className="mt-2 text-sm text-slate-600">Phù hợp để trải nghiệm toàn bộ tính năng cao cấp ngắn hạn.</p>
              <div className="my-6">
                <span className="text-4xl font-black text-slate-900">149.000đ</span>
                <span className="text-sm font-bold text-slate-500"> / tháng</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleTier(true)}
              className="w-full rounded-2xl border-2 border-slate-300 bg-white py-3.5 text-base font-bold text-slate-800 hover:bg-slate-50 transition"
            >
              Chọn gói 1 tháng
            </button>
          </article>

          {/* Gói 1 Năm - Nổi bật nhất */}
          <article
            onClick={() => setSelectedPlan('YEARLY')}
            className={`cursor-pointer rounded-3xl border-2 p-7 transition flex flex-col justify-between relative overflow-hidden ${
              selectedPlan === 'YEARLY'
                ? 'border-amber-400 bg-gradient-to-b from-amber-50/50 to-white shadow-2xl ring-4 ring-amber-200'
                : 'border-amber-300 bg-amber-50/20'
            }`}
          >
            <div className="absolute top-0 right-0 rounded-bl-2xl bg-amber-500 px-4 py-1 text-xs font-black uppercase text-white shadow-sm">
              TIẾT KIỆM 55% · KHUYÊN DÙNG
            </div>
            <div>
              <span className="text-sm font-extrabold uppercase tracking-wider text-amber-600">Được yêu thích nhất</span>
              <h3 className="mt-1 text-2xl font-black text-slate-900">Gói 1 Năm + 3 Tháng</h3>
              <p className="mt-2 text-sm text-slate-600">Tặng thêm 3 tháng miễn phí. Đầu tư bài bản để nói tiếng Anh lưu loát.</p>
              <div className="my-6">
                <span className="text-4xl font-black text-amber-600">799.000đ</span>
                <span className="text-sm font-bold text-slate-500"> / 15 tháng</span>
                <p className="text-xs font-bold text-emerald-700 mt-1">Chỉ ~53.000đ/tháng</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleTier(true)}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-4 text-base font-black text-white shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700 transition"
            >
              ⭐ Nhận ưu đãi gói 1 năm
            </button>
          </article>

          {/* Gói Trọn đời */}
          <article
            onClick={() => setSelectedPlan('LIFETIME')}
            className={`cursor-pointer rounded-3xl border-2 p-7 transition flex flex-col justify-between ${
              selectedPlan === 'LIFETIME'
                ? 'border-indigo-500 bg-white shadow-xl ring-2 ring-indigo-300'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-indigo-600">Đầu tư 1 lần</span>
              <h3 className="mt-1 text-2xl font-black text-slate-900">Gói Trọn Đời (Lifetime)</h3>
              <p className="mt-2 text-sm text-slate-600">Sở hữu vĩnh viễn mọi bản cập nhật và bài học mới trong tương lai.</p>
              <div className="my-6">
                <span className="text-4xl font-black text-slate-900">1.490.000đ</span>
                <span className="text-sm font-bold text-slate-500"> / thanh toán 1 lần</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleTier(true)}
              className="w-full rounded-2xl border-2 border-indigo-300 bg-indigo-50 py-3.5 text-base font-bold text-indigo-800 hover:bg-indigo-100 transition"
            >
              Sở hữu trọn đời
            </button>
          </article>
        </div>
      </section>

      {/* Cam kết & Hỏi đáp nhanh */}
      <section className="rounded-3xl border-2 border-slate-200 bg-slate-50 p-8 sm:p-10 mb-10">
        <h3 className="text-2xl font-black text-slate-900 text-center mb-6">
          Câu hỏi thường gặp về gói Premium
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-700 text-base">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 mb-1">Tôi có thể tự dán video YouTube bất kỳ không?</h4>
            <p className="text-sm text-slate-600">Có, bạn có thể dán bất kỳ link video nào có phụ đề tiếng Anh (kể cả phụ đề tự động của YouTube). AI sẽ đồng bộ từng câu để bạn luyện tập.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 mb-1">AI chấm phát âm hoạt động chính xác thế nào?</h4>
            <p className="text-sm text-slate-600">Hệ thống phân tích giọng nói sử dụng mô hình học sâu đối chiếu phát âm của bạn với dữ liệu người bản ngữ chuẩn, phát hiện từng nguyên âm và phụ âm lệch chuẩn.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 mb-1">Tôi có được hoàn tiền nếu không phù hợp không?</h4>
            <p className="text-sm text-slate-600">Chúng tôi hỗ trợ chính sách hoàn tiền 100% trong 7 ngày đầu nếu bạn cảm thấy chương trình không giúp ích cho tiến bộ tiếng Anh của mình.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 mb-1">Tôi có thể hủy gia hạn gói cước bất cứ lúc nào không?</h4>
            <p className="text-sm text-slate-600">Hoàn toàn có thể. Bạn có thể tự quản lý hoặc hủy gói trong trang Quản lý tài khoản với 1 cú click chuột mà không có bất kỳ khoản phí ẩn nào.</p>
          </div>
        </div>
      </section>

      {/* Redesigned Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl border-2 border-emerald-400 bg-white/95 backdrop-blur-md px-5 py-4 text-slate-800 shadow-2xl shadow-emerald-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-lg font-black text-white shadow-md">
            ✓
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">Tài khoản Premium</p>
            <p className="text-base font-bold text-slate-800">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 font-bold p-1"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
