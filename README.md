# Shadowtation — Website học tiếng Anh bằng Dictation & Shadowing

> 🌟 **Nhánh:** `demo-website-ban-co-day-du-cac-uc` — **Demo Website (Bản có đầy đủ các UC)**  
> Bản phát hành tích hợp trọn vẹn 10 Use Cases (UC-01 đến UC-10), AI Tutor Chatbot 24/7, Đa ngôn ngữ (i18n), Dark/Light Mode, AI Auto-Transcription và Admin Portal độc lập.  
> Chi tiết tài liệu mô tả nhánh xem tại: [`BRANCH_DESCRIPTION.md`](BRANCH_DESCRIPTION.md).

Đồ án chuyên ngành — Trường Công nghệ thông tin, Đại học Phenikaa.
Học phần: Đồ án chuyên ngành-1-1-26 (N03). Giảng viên hướng dẫn: ThS. Nguyễn Thị Dinh.

**Nhóm thực hiện:** Phạm Văn Hùng, Nguyễn Mạnh Cường

## Giới thiệu

Nền tảng luyện Nghe – Nói tiếng Anh theo hai phương pháp:

- **Dictation:** nghe và chép chính tả, đối chiếu thời gian thực (WER/Levenshtein) ngay trên trình duyệt.
- **Shadowing:** nói nhại theo audio mẫu, AI (Azure Pronunciation Assessment) chấm điểm phát âm đến từng từ.

Ngoài ra có Dashboard, Streak, Review List cá nhân hóa và gói Premium thanh toán tự động qua VNPAY/Stripe.
Hệ thống chỉ có hai vai trò con người: **Học viên** (Free/Premium) và **Admin**.

## Kiến trúc

Modular Monolith (100% TypeScript) tích hợp module chấm điểm phát âm trực tiếp trong Core API.

| Thành phần | Công nghệ | Thư mục |
|---|---|---|
| Giao diện | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, wavesurfer.js | `frontend/` |
| Core API, Dictation & Speech | NestJS, TypeORM, Passport/JWT, youtube-transcript, Azure Speech SDK, fluent-ffmpeg | `backend-api/` |
| Dữ liệu | PostgreSQL 15 (JSONB), Redis 7, S3/MinIO | — |
| Thanh toán | VNPAY (sandbox), Stripe | — |

Chi tiết xem tài liệu SRS trong thư mục [`docs/`](docs/).

## Cấu trúc thư mục

```
Shadowtation/
├── docs/            Tài liệu SRS và thiết kế
├── frontend/        Next.js
├── backend-api/     NestJS (Core API & Chấm điểm phát âm)
├── .env.example     Mẫu biến môi trường
└── README.md
```

## Yêu cầu môi trường

- Git
- Node.js LTS (20 trở lên)
- FFmpeg (có trong PATH)
- PostgreSQL 15 và Redis 7 (chạy Docker hoặc dịch vụ Native/Cloud)

## Cài đặt và chạy (cập nhật dần theo tiến độ)

```bash
# 1. Lấy mã nguồn
git clone https://github.com/hungpv2005/Shadowtation-A-Dictation-And-Shadowing-English-Website.git
cd Shadowtation-A-Dictation-And-Shadowing-English-Website

# 2. Tạo file môi trường
cp .env.example .env                              # Windows PowerShell: copy .env.example .env
cp frontend/.env.example frontend/.env.local

# 3. Chạy PostgreSQL và Redis (sẽ bổ sung docker-compose.yml ở Giai đoạn 1)

# 4. Backend và Frontend: xem hướng dẫn trong từng thư mục
```

## Quy ước làm việc với Git

- Nhánh `main` chỉ chứa mã đã chạy được. Mỗi chức năng làm trên nhánh riêng, ví dụ `feat/auth-uc01`.
- Hợp nhất vào `main` bằng Pull Request.
- Tuyệt đối không commit file `.env` hay khóa bí mật.
- Cú pháp commit: `feat:`, `fix:`, `docs:`, `chore:`, `test:`.

## Lộ trình triển khai

| GĐ | Nội dung |
|---|---|
| 0 | Chốt baseline tài liệu SRS |
| 1 | Môi trường và khung dự án |
| 2 | Cơ sở dữ liệu và migration |
| 3 | Xác thực và phân quyền (UC-01) |
| 4 | Quản trị bài học (UC-08) |
| 5 | Dictation (UC-02, UC-03) |
| 6 | Shadowing và chấm phát âm AI (UC-04, UC-05) |
| 7 | Dashboard, Streak, Review List (UC-06, UC-07) |
| 8 | Thanh toán Premium (UC-10) |
| 9 | Kiểm thử |
| 10 | Triển khai và nghiệm thu |
