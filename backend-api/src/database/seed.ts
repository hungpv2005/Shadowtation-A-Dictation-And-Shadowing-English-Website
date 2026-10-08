import * as bcrypt from 'bcryptjs';
import dataSource from './data-source';
import {
  Lesson,
  LessonSentence,
  SubscriptionPlan,
  SystemConfig,
  User,
  UserRole,
  WordTiming,
} from './entities';

/** Chia đều thời lượng câu cho từng từ (dữ liệu mẫu; Auto-Transcription thật sẽ thay thế ở GĐ4). */
function buildWords(text: string, start: number, end: number): WordTiming[] {
  const words = text.split(/\s+/).filter(Boolean);
  const step = (end - start) / words.length;
  return words.map((w, i) => ({
    word: w.replace(/[.,!?]/g, ''),
    start: Number((start + i * step).toFixed(2)),
    end: Number((start + (i + 1) * step).toFixed(2)),
  }));
}

const DEV_USERS: { email: string; fullName: string; role: UserRole; password: string; premiumDays?: number }[] = [
  {
    email: 'admin@shadowtation.local',
    fullName: 'Admin',
    role: 'ADMIN',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456',
  },
  { email: 'student@shadowtation.local', fullName: 'Học viên Free', role: 'STUDENT', password: 'Student@123456' },
  {
    email: 'premium@shadowtation.local',
    fullName: 'Học viên Premium',
    role: 'PREMIUM_STUDENT',
    password: 'Premium@123456',
    premiumDays: 30,
  },
];

const PLANS = [
  { name: 'Premium 1 Tháng', price: '199000', durationDays: 30 },
  { name: 'Premium 1 Năm', price: '1990000', durationDays: 365 },
];

const LESSONS = [
  {
    title: 'Daily Conversation 01',
    level: 'BEGINNER' as const,
    audioUrl: '/audio/daily-conversation-01.mp3',
    isPremiumOnly: false,
    sentences: [
      { start: 0.0, end: 3.0, text: 'Good morning, how are you today?' },
      { start: 3.2, end: 6.0, text: 'I am fine, thank you. And you?' },
      { start: 6.2, end: 9.5, text: 'I am doing great, thanks for asking.' },
    ],
  },
  {
    title: 'At the Coffee Shop',
    level: 'BEGINNER' as const,
    audioUrl: '/audio/at-the-coffee-shop.mp3',
    isPremiumOnly: false,
    sentences: [
      { start: 0.0, end: 3.2, text: 'Can I have a cup of coffee, please?' },
      { start: 3.4, end: 6.4, text: 'Sure, would you like milk or sugar?' },
      { start: 6.6, end: 9.0, text: 'Just a little milk, thank you.' },
    ],
  },
  {
    title: 'Technology and Daily Life',
    level: 'INTERMEDIATE' as const,
    audioUrl: '/audio/technology-and-daily-life.mp3',
    isPremiumOnly: true,
    sentences: [
      { start: 0.0, end: 3.8, text: 'Technology is changing the way we live and work.' },
      { start: 4.0, end: 7.6, text: 'Many people now study English with online tools.' },
      { start: 7.8, end: 11.4, text: 'Practice every day and you will improve quickly.' },
    ],
  },
];

// Ngưỡng và giới hạn vận hành, chỉnh được qua Admin Panel (NFR-SL-04)
const CONFIGS: { key: string; value: unknown; description: string }[] = [
  { key: 'pronunciation.green_min', value: 80, description: 'Điểm từ tối thiểu để hiện màu Xanh' },
  { key: 'pronunciation.yellow_min', value: 60, description: 'Điểm từ tối thiểu để hiện màu Vàng (dưới mức này là Đỏ)' },
  { key: 'review.add_threshold', value: 60, description: 'Từ có điểm dưới ngưỡng này tự động vào Review List' },
  { key: 'ai.timeout_seconds', value: 30, description: 'Timeout khi gọi dịch vụ AI' },
  { key: 'free.shadowing_daily_limit', value: 5, description: 'Số lượt chấm AI Shadowing mỗi ngày của tài khoản Free' },
  { key: 'free.review_list_limit', value: 10, description: 'Số mục Review List tối đa của tài khoản Free' },
];

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Không chạy seed dữ liệu mẫu ở môi trường production.');
  }
  await dataSource.initialize();

  const users = dataSource.getRepository(User);
  const plans = dataSource.getRepository(SubscriptionPlan);
  const lessons = dataSource.getRepository(Lesson);
  const sentences = dataSource.getRepository(LessonSentence);
  const configs = dataSource.getRepository(SystemConfig);

  for (const u of DEV_USERS) {
    if (await users.findOneBy({ email: u.email })) continue;
    await users.save(
      users.create({
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash: await bcrypt.hash(u.password, 10),
        premiumExpiredAt: u.premiumDays ? new Date(Date.now() + u.premiumDays * 24 * 3600 * 1000) : null,
      }),
    );
    console.log(`+ user ${u.email}`);
  }

  for (const p of PLANS) {
    if (await plans.findOneBy({ name: p.name })) continue;
    await plans.save(plans.create(p));
    console.log(`+ plan ${p.name}`);
  }

  for (const l of LESSONS) {
    if (await lessons.findOneBy({ title: l.title })) continue;
    const lesson = await lessons.save(
      lessons.create({
        title: l.title,
        level: l.level,
        audioUrl: l.audioUrl,
        isPremiumOnly: l.isPremiumOnly,
        status: 'PUBLISHED',
      }),
    );
    for (const s of l.sentences) {
      await sentences.save(
        sentences.create({
          lessonId: lesson.id,
          startTime: s.start,
          endTime: s.end,
          textContent: s.text,
          wordsJson: buildWords(s.text, s.start, s.end),
        }),
      );
    }
    console.log(`+ lesson ${l.title} (${l.sentences.length} câu)`);
  }

  for (const c of CONFIGS) {
    if (await configs.findOneBy({ key: c.key })) continue;
    await configs.save(configs.create({ key: c.key, value: c.value, description: c.description }));
    console.log(`+ config ${c.key}`);
  }

  await dataSource.destroy();
  console.log('Seed hoàn tất.');
}

seed().catch(async (err) => {
  console.error(err);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
