# Demo Website (Bản có đầy đủ các UC)

> **Tên nhánh Git:** `demo-website-ban-co-day-du-cac-uc`  
> **Dự án:** Shadowtation — Website học tiếng Anh bằng Dictation & Shadowing  
> **Trường / Lớp:** Trường Công nghệ thông tin, Đại học Phenikaa — Đồ án chuyên ngành-1-1-26 (N03)  
> **Giảng viên hướng dẫn:** ThS. Nguyễn Thị Dinh  
> **Nhóm thực hiện:** Phạm Văn Hùng, Nguyễn Mạnh Cường  

---

## 📌 Giới thiệu tổng quan nhánh

Nhánh **`demo-website-ban-co-day-du-cac-uc`** là bản tổng hợp mã nguồn toàn diện, hoàn chỉnh và ổn định nhất của dự án Shadowtation, được chuẩn hóa và kiểm thử đồng bộ 100% để phục vụ việc **báo cáo, demo trực tiếp và nghiệm thu đồ án**.

Toàn bộ các yêu cầu chức năng (10 Use Cases từ **UC-01 đến UC-10**), các tính năng AI nâng cao (AI Tutor Chatbot, AI Auto-Transcription, AI Chấm phát âm), hệ thống đa ngôn ngữ (i18n), Dark/Light theme, cổng thanh toán VNPAY và Cổng Quản trị Admin Portal độc lập đều đã được tích hợp hoàn chỉnh và hoạt động mượt mà.

---

## 🚀 Danh mục 10 Use Cases (UC-01 đến UC-10) đã tích hợp đầy đủ

### 1. UC-01: Xác thực & Quản lý tài khoản (Authentication & Account Management)
- **Đăng ký / Đăng nhập:** Cơ chế xác thực bảo mật JWT, mã hóa mật khẩu an toàn.
- **Phân quyền người dùng:** Tách biệt rõ ràng 2 vai trò **Học viên** (Free / Premium) và **Quản trị viên** (Admin).
- **Trang cá nhân:** Cập nhật thông tin học viên, đổi mật khẩu, theo dõi thời hạn gói Premium.

### 2. UC-02: Luyện nghe chép chính tả (Dictation Practice)
- **Trình phát Audio linh hoạt:** Hỗ trợ tua lùi thông minh (Back 3s, 5s), điều chỉnh tốc độ phát (0.75x - 1.5x), lặp lại từng câu (Loop sentence).
- **So khớp thời gian thực:** Thuật toán tính toán độ tương đồng ký tự và từ vựng (WER / Levenshtein), highlight màu xanh lá (đúng), màu đỏ (sai), màu vàng (gợi ý).
- **Phím tắt chuyên nghiệp:** Hỗ trợ `Ctrl + Space` (Play/Pause), `Tab` (Skip câu), `Esc` (Tua lại).
- **Tính toán chỉ số:** Chấm điểm độ chính xác (Accuracy %), tốc độ gõ (WPM), lưu lại lịch sử kết quả bài học.

### 3. UC-03: Luyện nói nhại theo (Shadowing Practice)
- **Ghi âm trực tiếp trên Web:** Sử dụng Web Audio API ghi âm microphone chất lượng cao với thanh đo cường độ âm thanh real-time.
- **Biểu đồ sóng âm (Waveform):** So sánh trực quan dạng sóng âm giữa giọng audio mẫu chuẩn bản xứ và giọng ghi âm của người học.
- **AI Chấm điểm phát âm:** Đánh giá đa chiều với 4 tiêu chí: **Accuracy** (Độ chính xác), **Fluency** (Độ lưu loát), **Completeness** (Độ hoàn thiện), **Pronunciation Score** (Điểm phát âm tổng quan).
- **Phản hồi chi tiết từng từ:** Đánh dấu màu xanh/vàng/đỏ cho từng từ vựng trong câu nói và gợi ý sửa âm vị chưa chuẩn.

### 4. UC-04: Sổ tay từ vựng & Tra cứu nhanh (Vocabulary Notebook & Quick Lookup)
- **Tra cứu từ tức thì:** Click đúp hoặc bôi đen từ bất kỳ trong bài học để xem phiên âm IPA, nghĩa Tiếng Việt, phân loại từ (Noun/Verb/Adj) và nghe audio phát âm.
- **Lưu từ vựng:** Thêm từ mới vào sổ tay cá nhân (`/vocabulary`) chỉ với 1 click, kèm ngữ cảnh câu mẫu trong bài nghe.

### 5. UC-05: Ôn tập ngắt quãng thông minh (Spaced Repetition System - SRS)
- **Thuật toán SRS:** Tự động lên lịch ôn tập từ vựng theo khoảng thời gian tối ưu (1 ngày, 3 ngày, 7 ngày, 14 ngày, 30 ngày) dựa trên mức độ ghi nhớ.
- **Thẻ Flashcard 3D:** Hiệu ứng lật thẻ mượt mà, ẩn hiện nghĩa và câu ví dụ, hỗ trợ nghe lại phát âm.
- **Chấm điểm độ khó:** 4 nút đánh giá chuẩn SRS (**Again / Hard / Good / Easy**) để tính toán chu kỳ lặp lại cho phiên tiếp theo.

### 6. UC-06: Thống kê & Báo cáo học tập (Dashboard & Analytics)
- **Hệ thống Streak:** Đếm chuỗi ngày học tập liên tục, khích lệ duy trì thói quen học tiếng Anh mỗi ngày.
- **Biểu đồ tiến độ trực quan:** Thống kê tổng số từ đã thuộc, số bài nghe đã hoàn thành, tổng thời lượng đã luyện tập.
- **Phân tích kỹ năng:** Biểu đồ radar/cột đánh giá sự tiến bộ trong kỹ năng Nghe và Nói theo thời gian.

### 7. UC-07: Trợ lý gia sư AI Tutor Chatbot 24/7 (AI Learning Assistant)
- **Hỗ trợ học tập 24/7:** Tích hợp Chatbot AI nổi ở góc phải màn hình, luôn sẵn sàng giải đáp thắc mắc về ngữ pháp, phát âm và từ vựng.
- **Gợi ý thông minh theo ngữ cảnh:** Đưa ra các câu hỏi mẫu gợi ý (Quick Prompts) dựa trên bài học hiện tại.
- **Trải nghiệm đàm thoại tự nhiên:** Giao diện bóng bẩy, hỗ trợ phím tắt, ghi nhớ ngữ cảnh cuộc trò chuyện.

### 8. UC-08: Quản trị nội dung & Cấu hình hệ thống (Admin Portal & AI Auto-Transcription)
- **Cổng Quản trị Admin Portal độc lập (`/admin`):** Giao diện riêng biệt, chuyên nghiệp dành cho Admin.
- **Quản lý danh sách bài học:** Tạo bài mới, chỉnh sửa thông tin, xóa bài, tải lên file âm thanh (MP3, WAV, AAC,...).
- **AI Auto-Transcription:** Công cụ AI nhận diện âm thanh tự động, chuyển đổi audio thành danh sách câu thoại (subtitles/transcripts) kèm timestamp chuẩn xác từng mili-giây.
- **Form Cấu hình hệ thống (SystemConfig):** Giao diện quản trị cấu hình tham số hệ sinh thái: Ngưỡng chấm điểm phát âm AI, Giới hạn bài học Free, Cấu hình API Key, Cho phép đăng ký mới,...

### 9. UC-09: Tùy biến giao diện & Hỗ trợ đa ngôn ngữ (UI Customization & i18n)
- **Đa ngôn ngữ (i18n):** Chuyển đổi ngôn ngữ linh hoạt giữa **Tiếng Việt** và **Tiếng Anh (English)** tức thì trên toàn bộ giao diện người dùng.
- **Dark Mode & Light Mode:** Hệ thống Design Tokens chuẩn chỉnh, hỗ trợ chuyển đổi Chế độ Tối (Dark) và Chế độ Sáng (Light) mượt mà, tối ưu cho mắt khi luyện tập ban đêm.

### 10. UC-10: Nâng cấp gói cước & Cổng thanh toán trực tuyến (Subscription & Payment)
- **Bảng so sánh gói cước:** Bảng quyền lợi trực quan giữa gói Free và Premium chuẩn phong cách SaaS hiện đại tại cả Trang chủ (`/`) và Trang thanh toán (`/subscription`).
- **Cổng thanh toán bảo mật:** Tích hợp cổng thanh toán trực tuyến **VNPAY Sandbox** chuẩn giao thức ngân hàng và chế độ Mock Payment phục vụ kiểm thử nhanh chóng.
- **Tự động kích hoạt quyền lợi Premium:** Mở khóa không giới hạn toàn bộ bài học nâng cao, không giới hạn số lượng bài nghe/nói và mở quyền sử dụng AI không hạn định.

---

## 🛠️ Hướng dẫn khởi chạy ứng dụng phục vụ Demo

### 1. Khởi động Backend API (Port 4000)
```bash
cd backend-api
npm install
npm run start:dev
```
- Endpoint: `http://localhost:4000/api`
- Swagger Docs (nếu có): `http://localhost:4000/api/docs`

### 2. Khởi động Frontend Web Application (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
- Ứng dụng Học viên: `http://localhost:3000`
- Cổng Quản trị Admin: `http://localhost:3000/admin`
- Luyện Nghe chép chính tả (Dictation): `http://localhost:3000/practice/dictation`
- Sổ tay từ vựng & Ôn tập (SRS): `http://localhost:3000/vocabulary`
- Dashboard tiến độ: `http://localhost:3000/dashboard`
- Nâng cấp Premium: `http://localhost:3000/subscription`

---

## 📋 Tài khoản Demo mẫu

| Vai trò | Email / Username | Mật khẩu | Quyền hạn |
|---|---|---|---|
| **Admin** | `admin@shadowtation.edu.vn` | `Admin@123` | Toàn quyền quản trị bài học, AI transcription, cấu hình hệ thống |
| **Học viên Premium** | `premium@shadowtation.edu.vn` | `User@123` | Không giới hạn tính năng, mở khóa toàn bộ bài học |
| **Học viên Free** | `learner@shadowtation.edu.vn` | `User@123` | Sử dụng các bài học tiêu chuẩn, tra cứu từ vựng |

---
*Bản quyền thuộc về Nhóm Đồ án Shadowtation — Đại học Phenikaa (2026).*
