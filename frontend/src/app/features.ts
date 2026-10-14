export type Feature = { id: string; title: string; description: string; category: string; icon: string; href: string; available: boolean };

export const features: Feature[] = [
  { id: 'uc-01', title: 'Đăng nhập & tài khoản', description: 'Truy cập hồ sơ học tập và quản lý thông tin cá nhân.', category: 'Tài khoản', icon: '◎', href: '/features/uc-01', available: false },
  { id: 'uc-02', title: 'Luyện nghe Dictation', description: 'Nghe từng câu, chép lại và xem lỗi sai ngay khi nhập.', category: 'Luyện nghe', icon: '♫', href: '/practice/dictation', available: true },
  { id: 'uc-03', title: 'Gợi ý khi luyện tập', description: 'Nghe chậm, mở gợi ý theo cấp độ hoặc xem transcript.', category: 'Luyện nghe', icon: '✦', href: '/practice/dictation?feature=hints', available: true },
  { id: 'uc-04', title: 'Luyện nói Shadowing', description: 'Nghe câu mẫu và luyện nói nhại theo nhịp audio.', category: 'Luyện nói', icon: '◉', href: '/features/uc-04', available: false },
  { id: 'uc-05', title: 'Kết quả phát âm AI', description: 'Xem phân tích độ chính xác, độ trôi chảy và từ cần cải thiện.', category: 'Luyện nói', icon: '✧', href: '/features/uc-05', available: false },
  { id: 'uc-06', title: 'Tiến độ học tập', description: 'Theo dõi streak và nhìn lại hành trình học của bạn.', category: 'Cá nhân hóa', icon: '▥', href: '/features/uc-06', available: true },
  { id: 'uc-07', title: 'Danh sách ôn tập', description: 'Tập trung luyện lại những từ bạn thường nghe hoặc viết nhầm.', category: 'Cá nhân hóa', icon: '↻', href: '/features/uc-07', available: false },
  { id: 'uc-08', title: 'Quản lý bài học', description: 'Rà soát nội dung, transcript và bài học được xuất bản.', category: 'Quản trị', icon: '▤', href: '/features/uc-08', available: false },
  { id: 'uc-09', title: 'Quản lý tài khoản', description: 'Cập nhật thông tin và trạng thái tài khoản.', category: 'Quản trị', icon: '♙', href: '/features/uc-09', available: false },
  { id: 'uc-10', title: 'Gói học Premium', description: 'Khám phá quyền lợi và các gói học nâng cao.', category: 'Tài khoản', icon: '♕', href: '/features/uc-10', available: false },
];
