export type Feature = { id: string; title: string; description: string; category: string; icon: string; href: string; available: boolean };

export const features: Feature[] = [
  { id: 'uc-01', title: 'Đăng nhập & tài khoản', description: 'Truy cập hồ sơ học tập và quản lý thông tin cá nhân.', category: 'Tài khoản', icon: '◎', href: '/features/uc-01', available: false },
  { id: 'uc-02', title: 'Luyện nghe (Dictation)', description: 'Nghe từng câu, chép lại và xem lỗi sai ngay khi nhập.', category: 'Luyện nghe', icon: '♫', href: '/practice/dictation?mode=dictation', available: true },
  { id: 'uc-03', title: 'Gợi ý khi luyện tập', description: 'Nghe chậm, mở gợi ý theo cấp độ hoặc xem transcript.', category: 'Luyện nghe', icon: '✦', href: '/practice/dictation?feature=hints', available: true },
  { id: 'uc-04', title: 'Luyện nói (Shadowing)', description: 'Nghe câu mẫu, ghi âm giọng nói và luyện nhại theo từng câu.', category: 'Luyện nói', icon: '◉', href: '/practice/dictation?mode=shadowing', available: true },
  { id: 'uc-05', title: 'Kết quả phát âm Luyện nói', description: 'Xem lịch sử chấm và nhận diện những từ cần luyện thêm.', category: 'Luyện nói', icon: '✧', href: '/practice/shadowing/results', available: true },
  { id: 'uc-06', title: 'Tiến độ học tập', description: 'Theo dõi thời lượng luyện tập, chuỗi ngày học và hành trình của bạn.', category: 'Cá nhân hóa', icon: '▥', href: '/dashboard', available: true },
  { id: 'uc-07', title: 'Sổ từ vựng cá nhân', description: 'Ghi chép và lưu trữ các từ vựng bạn muốn học, dễ dàng tra cứu và ôn tập riêng.', category: 'Cá nhân hóa', icon: '📖', href: '/features/uc-07', available: true },
  { id: 'uc-08', title: 'Quản lý bài học', description: 'Rà soát nội dung, transcript và bài học được xuất bản.', category: 'Quản trị', icon: '▤', href: '/features/uc-08', available: false },
  { id: 'uc-09', title: 'Quản lý tài khoản', description: 'Cập nhật thông tin và trạng thái tài khoản.', category: 'Quản trị', icon: '♙', href: '/features/uc-09', available: false },
  { id: 'uc-10', title: 'Gói học Premium', description: 'Khám phá quyền lợi và các gói học nâng cao.', category: 'Tài khoản', icon: '♕', href: '/features/uc-10', available: false },
];
