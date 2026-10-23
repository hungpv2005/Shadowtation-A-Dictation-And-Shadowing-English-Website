import Link from 'next/link';

const plans = [
  { title: 'Premium 1 Tháng', price: '199.000đ', detail: 'Linh hoạt bắt đầu học nâng cao', duration: '30 ngày' },
  { title: 'Premium 1 Năm', price: '1.990.000đ', detail: 'Tiết kiệm hơn khi học dài hạn', duration: '365 ngày', featured: true },
];

export default function SubscriptionPage() {
  return <main className="page-wrap feature-placeholder"><Link href="/" className="back-link">← Về trang chủ</Link><section className="subscription-heading"><p className="eyebrow">SHADOWTATION PREMIUM</p><h1>Mở rộng hành trình học tiếng Anh</h1><p>Chọn gói học phù hợp với nhịp học của bạn.</p></section>
    <div className="plan-grid">{plans.map((plan) => <article key={plan.title} className={plan.featured ? 'plan-card plan-featured' : 'plan-card'}><span className="plan-duration">{plan.duration}</span><h2>{plan.title}</h2><p>{plan.detail}</p><strong>{plan.price}</strong><button type="button" disabled>Thanh toán sắp ra mắt</button></article>)}</div>
    <p className="subscription-note">Thanh toán trực tuyến sẽ khả dụng khi use-case Premium được kết nối với backend.</p>
  </main>;
}
