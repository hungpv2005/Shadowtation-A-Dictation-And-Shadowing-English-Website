'use client';

import Link from 'next/link';
import { Check, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { features } from './features';
import { useLanguage } from '@/lib/i18n';

const homeFeatureIds = ['uc-02', 'uc-04', 'uc-05', 'uc-06', 'uc-07'];

export default function Home() {
  const { lang, t } = useLanguage();
  const homeFeatures = homeFeatureIds.map((id) => features.find((feature) => feature.id === id)!).filter(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 text-slate-900 dark:text-slate-100 md:px-8 md:pt-14">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-7 py-9 text-white shadow-xl md:px-12 md:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-blue-200">
              {t('home.eyebrow')}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight md:text-5xl">
              {t('home.hero_title')}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              {t('home.hero_desc')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/practice/dictation?mode=dictation"
                className="rounded-xl bg-white px-6 py-3 font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 text-base"
              >
                {t('home.cta_dictation')} <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/practice/dictation?mode=shadowing"
                className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10 text-base"
              >
                {t('home.cta_shadowing')} <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="#learning-features"
                className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10 text-base"
              >
                {t('home.cta_features')}
              </Link>
            </div>
          </div>
          <aside className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm md:p-7">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-100">
              {t('home.roadmap_title')}
            </p>
            <ol className="mt-5 space-y-5">
              <li className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-blue-700">
                  1
                </span>
                <div>
                  <p className="font-bold text-base">{t('home.step1_title')}</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    {t('home.step1_desc')}
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-blue-700">
                  2
                </span>
                <div>
                  <p className="font-bold text-base">{t('home.step2_title')}</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    {t('home.step2_desc')}
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-blue-700">
                  3
                </span>
                <div>
                  <p className="font-bold text-base">{t('home.step3_title')}</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    {t('home.step3_desc')}
                  </p>
                </div>
              </li>
            </ol>
          </aside>
        </div>
      </section>

      <section id="learning-features" className="pt-14">
        <div className="mx-auto mb-7 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600 dark:text-blue-400">
            {t('home.workspace_eyebrow')}
          </p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl text-slate-900 dark:text-slate-100">
            {t('home.workspace_title')}
          </h2>
          <p className="mt-3 text-lg leading-7 text-slate-600 dark:text-slate-400">
            {t('home.workspace_desc')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          {homeFeatures.map((feature, index) => (
            <Link
              key={feature.id}
              href={feature.href}
              className={`group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl ${
                index < 3 ? 'xl:col-span-2' : 'xl:col-span-3'
              }`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-2xl font-bold text-blue-700 dark:text-blue-400 transition group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-slate-100">
                {lang === 'en' ? (feature.enTitle ?? feature.title) : feature.title}
              </h3>
              <p className="mt-2 min-h-14 leading-7 text-slate-600 dark:text-slate-400 text-base">
                {lang === 'en' ? (feature.enDescription ?? feature.description) : feature.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 font-bold text-blue-700 dark:text-blue-400 text-base">
                {t('home.open_feature')}{' '}
                <span aria-hidden="true" className="transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Section Tóm tắt Gói học Free vs Premium (Chuẩn hóa theo Wireframe mục 1.6.1) */}
      <section id="pricing-plans" className="pt-16 pb-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600 dark:text-blue-400">
            {lang === 'en' ? 'Pricing & Plans' : 'Mô hình học tập'}
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100 md:text-4xl">
            {lang === 'en' ? 'Start Free, Accelerate with Premium' : 'Bắt đầu miễn phí, bứt phá cùng Premium'}
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400 md:text-lg">
            {lang === 'en'
              ? 'Practice English listening and shadowing daily at no cost. Upgrade anytime to unlock all exclusive lessons and advanced AI feedback.'
              : 'Luyện nghe và nói nhại tiếng Anh mỗi ngày không mất phí. Nâng cấp bất cứ lúc nào để mở khóa toàn bộ kho học liệu và trợ lý AI chuyên sâu.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Card 1: Học viên Miễn phí (Free) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition hover:shadow-md md:p-9">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{lang === 'en' ? 'Basic Tier' : 'Gói cơ bản'}</span>
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {lang === 'en' ? 'Free forever' : 'Miễn phí trọn đời'}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-black text-slate-900 dark:text-slate-100">
                {lang === 'en' ? 'Free Student' : 'Học viên Miễn phí'}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {lang === 'en'
                  ? 'Get familiar with Dictation & Shadowing, build daily English learning habits.'
                  : 'Làm quen với phương pháp Dictation & Shadowing, xây dựng thói quen học tiếng Anh mỗi ngày.'}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 dark:text-slate-100">0đ</span>
                <span className="text-xs font-semibold text-slate-500">
                  {lang === 'en' ? '/ forever' : '/ vĩnh viễn'}
                </span>
              </div>

              <ul className="mt-7 space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{lang === 'en' ? 'Dictation practice on standard fundamental lessons' : 'Luyện nghe chép chính tả (Dictation) các bài học cơ bản'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{lang === 'en' ? '5 AI Shadowing pronunciation assessments daily' : <><strong>5 lượt</strong> chấm phát âm AI Shadowing mỗi ngày</>}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{lang === 'en' ? 'Progressive hints & real-time error comparison' : 'Chế độ gợi ý từ vựng tăng dần & đối chiếu lỗi sai thời gian thực'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{lang === 'en' ? 'Daily Streak and learning time tracking' : <>Theo dõi chuỗi ngày học <strong>Streak</strong> và tổng thời lượng</>}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{lang === 'en' ? 'Vocabulary notebook holds up to 10 words' : <>Sổ từ vựng ôn tập lưu tối đa <strong>10 từ</strong> cần cải thiện</>}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/practice/dictation"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>{lang === 'en' ? 'Start learning free' : 'Bắt đầu học miễn phí'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Học viên Nâng cao (Premium) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-amber-400 dark:border-amber-500/70 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 p-8 shadow-xl shadow-amber-500/10 md:p-9">
            <div className="absolute -top-3.5 right-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
              <Crown className="h-3.5 w-3.5" />
              <span>{lang === 'en' ? 'Recommended' : 'Khuyên dùng'}</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Crown className="h-3.5 w-3.5" />
                  <span>{lang === 'en' ? 'Complete Plan' : 'Gói toàn diện'}</span>
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {lang === 'en' ? 'Save up to 30%' : 'Tiết kiệm tới 30%'}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-black text-slate-900 dark:text-slate-100">
                {lang === 'en' ? 'Premium Student' : 'Học viên Premium'}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {lang === 'en'
                  ? 'Unlock all premium features, practice speaking with unlimited AI evaluations to achieve native fluency.'
                  : 'Mở khóa toàn bộ tính năng cao cấp, luyện nói với AI không giới hạn để đạt độ chuẩn xác bản xứ.'}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-sm font-medium text-slate-500">{lang === 'en' ? 'From' : 'Chỉ từ'}</span>
                <span className="text-4xl font-black text-amber-600 dark:text-amber-400">49.000đ</span>
                <span className="text-xs font-semibold text-slate-500">
                  {lang === 'en' ? '/ month' : '/ tháng'}
                </span>
              </div>

              <ul className="mt-7 space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{lang === 'en' ? '100% full access to all exclusive and advanced lessons' : <><strong>Mở khóa 100%</strong> toàn bộ kho bài học độc quyền & nâng cao</>}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{lang === 'en' ? 'Unlimited daily AI Shadowing pronunciation assessments' : <><strong>Không giới hạn lượt</strong> chấm phát âm AI Shadowing mỗi ngày</>}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{lang === 'en' ? 'In-depth phonetic analysis: Accuracy & Fluency breakdown' : 'Phân tích chi tiết ngữ âm: Độ chuẩn xác (Accuracy) & Độ lưu loát (Fluency)'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{lang === 'en' ? 'Unlimited vocabulary items in your Review List Notebook' : <><strong>Không giới hạn số lượng</strong> từ vựng trong Sổ ôn tập Review List</>}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{lang === 'en' ? 'Import custom lessons from YouTube URLs and custom subtitles' : 'Tự thêm bài học từ liên kết video YouTube và phụ đề riêng'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{lang === 'en' ? 'Priority AI processing queue for instant feedback' : 'Ưu tiên băng thông xử lý AI với tốc độ phản hồi nhanh nhất'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-amber-100 dark:border-amber-900/40">
              <Link
                href="/subscription"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-600 hover:to-amber-700"
              >
                <Crown className="h-4 w-4" />
                <span>{lang === 'en' ? 'Explore Premium Plans' : 'Khám phá các gói học ngay'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl border-2 border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-slate-800/90 p-6 md:flex-row md:items-center md:p-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('home.bottom_title')}</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300 text-base">
            {t('home.bottom_desc')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/practice/dictation?mode=dictation"
            className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 text-base shadow-sm"
          >
            {t('home.cta_dictation')}
          </Link>
          <Link
            href="/practice/dictation?mode=shadowing"
            className="shrink-0 rounded-xl border-2 border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 font-bold text-blue-700 dark:text-blue-400 hover:bg-blue-50 text-base shadow-sm"
          >
            {t('home.cta_shadowing')}
          </Link>
        </div>
      </section>
    </main>
  );
}
