import Link from 'next/link';
import { features } from './features';

const homeFeatureIds = ['uc-02', 'uc-04', 'uc-05', 'uc-06', 'uc-07'];

export default function Home() {
  const homeFeatures = homeFeatureIds.map((id) => features.find((feature) => feature.id === id)!).filter(Boolean);

  return <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 text-slate-900 md:px-8 md:pt-14">
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-7 py-9 text-white shadow-lg md:px-12 md:py-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_.75fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-indigo-200">Học một chút mỗi ngày</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight md:text-5xl">Nghe rõ hơn. Nói tự tin hơn.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-indigo-100">Luyện nghe tiếng Anh theo từng câu, nhận phản hồi dễ hiểu và theo dõi tiến bộ trong một không gian học tập gọn gàng.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/practice/dictation?mode=dictation" className="rounded-xl bg-white px-5 py-3 font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50">Dictation <span aria-hidden="true">→</span></Link>
            <Link href="/practice/dictation?mode=shadowing" className="rounded-xl border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10">Shadowing <span aria-hidden="true">→</span></Link>
            <Link href="#learning-features" className="rounded-xl border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10">Khám phá chức năng</Link>
          </div>
        </div>
        <aside className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm md:p-7">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-100">Lộ trình bắt đầu</p>
          <ol className="mt-5 space-y-5">
            <li className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-indigo-700">1</span><div><p className="font-bold">Chọn Dictation hoặc Shadowing</p><p className="mt-1 text-sm leading-6 text-indigo-100">Chọn chế độ tại danh sách bài học trước khi mở bài.</p></div></li>
            <li className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-indigo-700">2</span><div><p className="font-bold">Chọn một bài nghe</p><p className="mt-1 text-sm leading-6 text-indigo-100">Lọc bài theo trình độ hoặc loại nội dung.</p></div></li>
            <li className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-indigo-700">3</span><div><p className="font-bold">Xem phản hồi và ôn từ khó</p><p className="mt-1 text-sm leading-6 text-indigo-100">Đối chiếu phát âm từng từ, xem điểm AI và luyện lại khi cần.</p></div></li>
          </ol>
        </aside>
      </div>
    </section>

    <section id="learning-features" className="pt-14">
      <div className="mx-auto mb-7 max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">Không gian học tập</p>
        <h2 className="mt-2 text-3xl font-bold md:text-4xl">Chọn điều bạn muốn luyện hôm nay</h2>
        <p className="mt-3 text-lg leading-7 text-slate-600">Bắt đầu với một hoạt động đơn giản. Bạn có thể quay lại các mục tiêu khác bất cứ lúc nào.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
        {homeFeatures.map((feature, index) => <Link key={feature.id} href={feature.href} className={`group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg ${index < 3 ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-2xl font-bold text-indigo-700 transition group-hover:bg-indigo-100">{feature.icon}</span>
          <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
          <p className="mt-2 min-h-14 leading-7 text-slate-600">{feature.description}</p>
          <span className="mt-5 inline-flex items-center gap-2 font-bold text-indigo-700">{index === 0 ? 'Chọn bài nghe' : 'Mở chức năng'} <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></span>
        </Link>)}
      </div>
    </section>

    <section className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 md:flex-row md:items-center md:p-8">
      <div><h2 className="text-xl font-bold">Chọn chế độ luyện tập</h2><p className="mt-1 text-slate-600">Cả Dictation và Shadowing đều dùng chung danh sách bài học.</p></div>
      <div className="flex flex-wrap gap-3"><Link href="/practice/dictation?mode=dictation" className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700">Dictation</Link><Link href="/practice/dictation?mode=shadowing" className="shrink-0 rounded-xl border border-indigo-200 bg-white px-5 py-3 font-bold text-indigo-700 hover:bg-indigo-50">Shadowing</Link></div>
    </section>
  </main>;
}
