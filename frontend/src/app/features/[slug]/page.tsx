import Link from 'next/link';
import { notFound } from 'next/navigation';
import { features } from '../../features';
import { LoginForm } from '../login-form';

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const feature = features.find((item) => item.id === params.slug);
  if (!feature) notFound();
  if (feature.id === 'uc-01') return <LoginForm />;
  if (feature.id === 'uc-06') return <main className="page-wrap feature-placeholder"><Link href="/" className="back-link">← Về trang chủ</Link><p className="eyebrow">UC-06 · CÁ NHÂN HÓA</p><h1>Tiến độ học tập</h1><p>Trang chủ là điểm bắt đầu và lối tắt tới các hoạt động Dictation, Shadowing và ôn tập.</p><Link className="button button-primary" href="/#learning-progress">Xem hoạt động học tập</Link></main>;
  return <main className="page-wrap feature-placeholder">
    <Link href="/" className="back-link">← Về trang chủ</Link>
    <section className="placeholder-panel"><span className={`feature-icon ${feature.id}`}>{feature.icon}</span><p className="eyebrow">{feature.id.toUpperCase()} · {feature.category.toUpperCase()}</p><h1>{feature.title}</h1><p className="placeholder-description">{feature.description}</p>
      {feature.available ? <p className="ready-message">Chức năng đã sẵn sàng để sử dụng.</p> : <div className="roadmap-note"><strong>Chức năng trong lộ trình</strong><p>Đây là điểm điều hướng dành cho chức năng này. Giao diện và nghiệp vụ sẽ được hoàn thiện theo từng use-case.</p></div>}
      <div className="placeholder-actions"><Link className="button button-primary" href={feature.id === 'uc-10' ? '/subscription' : '/practice/dictation'}>{feature.id === 'uc-10' ? 'Xem các gói học' : 'Bắt đầu với Dictation'} <span aria-hidden="true">→</span></Link><Link className="button button-quiet" href="/">Khám phá chức năng khác</Link></div>
    </section>
  </main>;
}
