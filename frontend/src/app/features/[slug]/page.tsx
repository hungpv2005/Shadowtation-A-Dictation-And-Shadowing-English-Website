import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { features } from '../../features';

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const feature = features.find((item) => item.id === params.slug);
  if (!feature) notFound();
  if (feature.id === 'uc-01') redirect('/login');
  if (feature.id === 'uc-08') redirect('/admin');
  if (feature.id === 'uc-10') redirect('/subscription');
  if (feature.id === 'uc-06') redirect('/dashboard');
  return <main className="page-wrap feature-placeholder">
    <Link href="/" className="back-link">← Về trang chủ</Link>
    <section className="placeholder-panel"><span className={`feature-icon ${feature.id}`}>{feature.icon}</span><p className="eyebrow">{feature.id.toUpperCase()} · {feature.category.toUpperCase()}</p><h1>{feature.title}</h1><p className="placeholder-description">{feature.description}</p>
      {feature.available ? <p className="ready-message">Chức năng đã sẵn sàng để sử dụng.</p> : <div className="roadmap-note"><strong>Chức năng trong lộ trình</strong><p>Đây là điểm điều hướng dành cho chức năng này. Giao diện và nghiệp vụ sẽ được hoàn thiện theo từng use-case.</p></div>}
      <div className="placeholder-actions"><Link className="button button-primary" href={feature.id === 'uc-10' ? '/subscription' : feature.id === 'uc-05' ? '/practice/shadowing/results' : '/practice/dictation'}>{feature.id === 'uc-10' ? 'Xem các gói học' : feature.id === 'uc-05' ? 'Xem kết quả phát âm AI' : 'Mở danh sách bài học'} <span aria-hidden="true">→</span></Link><Link className="button button-quiet" href="/">Khám phá chức năng khác</Link></div>
    </section>
  </main>;
}
