# Hệ thống Quản lý công việc nhóm (Google Apps Script)

Web app quản lý công việc cho nhóm ~15 người, chạy trên nền tảng **Google Apps Script**
(bound vào 1 Google Sheet làm cơ sở dữ liệu). Gồm đầy đủ các mục:

1. **Form nộp hồ sơ** — sinh mã hồ sơ + mã xác nhận, gửi email.
2. **Tab Tiếp nhận** — Trưởng nhóm trở lên phân công (tạo công việc) hoặc từ chối (ghi lý do).
3. **Tab Tra cứu** — tra cứu bằng mã hồ sơ + mã xác nhận, nhắn tin cho người phụ trách.
4. **Tab Quản lý công việc** — đầy đủ trường theo yêu cầu, khung chat tự gom link vào đính kèm,
   trạng thái Cần làm/Đang làm/Đã nộp/TĐV xác nhận/Tạm ngưng/Hủy bỏ, điểm 100/công việc + mã điểm đánh giá.
5. **Tab Ghi nhận điểm cộng/trừ** — Nhập phiếu đề xuất → Quản lý duyệt → tính vào hệ thống.
6. **Tab Báo cáo hiệu suất** — xếp hạng điểm, thống kê trạng thái/đúng-trễ hạn, biểu đồ theo
   đơn vị/phân mục, xuất PDF (in trực tiếp từ trình duyệt).
7. **Tab Thiết lập** (chỉ Admin) — quản lý người dùng, đơn vị/phòng ban, phân mục hồ sơ, mã điểm.

## Vai trò

| Vai trò | Quyền |
|---|---|
| Nhân viên | Xử lý công việc được giao, đề xuất điểm |
| Trưởng nhóm | + Tiếp nhận/phân công/từ chối hồ sơ, tạo công việc trực tiếp, tạm ngưng/hủy công việc |
| Quản lý | + Xác nhận TĐV kèm chấm điểm, sửa thời gian hoàn thành, duyệt điểm cộng/trừ, xem báo cáo |
| Admin hệ thống | + Toàn quyền tab Thiết lập (người dùng, danh mục) |

## Cách triển khai

1. Tạo mới 1 **Google Sheet** trống — đây sẽ là cơ sở dữ liệu.
2. Trong Sheet, vào **Tiện ích mở rộng → Apps Script**.
3. Xoá file `Code.gs` mặc định, sau đó tạo lần lượt các file **cùng tên** (đuôi `.gs` cho code
   server, đuôi `.html` cho giao diện) như trong thư mục `apps-script/` của repo này, rồi copy
   đúng nội dung tương ứng vào. Riêng `appsscript.json` sửa trực tiếp qua biểu tượng ⚙️
   **Project Settings → Show "appsscript.json"**.
   - Cách nhanh hơn: cài [`clasp`](https://github.com/google/clasp) (`npm i -g @google/clasp`),
     `clasp login`, `clasp create --type sheet --title "Quản lý công việc nhóm"` rồi
     `clasp push` từ thư mục `apps-script/`.
4. Vào **Deploy → New deployment → Web app**:
   - Execute as: **Me** (chủ sở hữu script — để gửi được email qua `MailApp`).
   - Who has access: **Anyone** (để tab Nộp hồ sơ/Tra cứu dùng được ngoài tổ chức nếu cần;
     có thể đổi thành "Anyone within [tổ chức]" nếu muốn giới hạn nội bộ trường).
5. Mở link Web app vừa deploy → đăng nhập bằng tài khoản mẫu bên dưới → vào tab **Thiết lập**
   tạo tài khoản thật cho 15 thành viên, cập nhật danh sách đơn vị/phân mục/mã điểm.

## Tài khoản mẫu (seed sẵn khi chạy lần đầu)

| Username | Mật khẩu | Vai trò |
|---|---|---|
| admin | 123456 | Admin hệ thống |
| quanly | 123456 | Quản lý |
| truongnhom | 123456 | Trưởng nhóm |
| nhanvien | 123456 | Nhân viên |

⚠️ **Đổi mật khẩu các tài khoản này ngay sau khi triển khai** (tab Thiết lập → Người dùng →
Reset mật khẩu), hoặc khoá bớt tài khoản không dùng.

Dữ liệu mẫu cũng được tạo sẵn ở tab Thiết lập: 5 đơn vị/phòng ban, 5 phân mục hồ sơ, 6 mã điểm
cộng/trừ (C1–C3 dương, T1–T3 âm) — **anh/chị chỉnh sửa lại cho đúng thực tế** của trường.

## Đã tối ưu tốc độ (bản cập nhật sau triển khai)

Thao tác "Tạo công việc" / tạo mới trong tab Thiết lập từng chậm vì mỗi request gọi dịch vụ
Spreadsheet rất nhiều lần (mỗi lần ~100-400ms) và gửi email đồng bộ (`MailApp` có thể mất 1-3
giây) ngay trong lúc xử lý. Đã cải thiện:

- **Cache trong 1 lượt thực thi**: Spreadsheet, các Sheet và dữ liệu bảng đã đọc được cache lại
  trong phạm vi 1 lần gọi từ client, tránh lấy lại/kiểm tra header nhiều lần cho cùng 1 sheet.
- **Kiểm tra header rẻ hơn**: chỉ ghi header khi sheet thực sự trống, thay vì đọc + so sánh dữ
  liệu mỗi lần truy cập sheet.
- **Gửi email qua hàng đợi**: các hàm `mailXxx_` giờ chỉ ghi 1 dòng vào sheet `MailQueue` (rất
  nhanh) và trả kết quả về ngay cho người dùng; 1 trigger chạy mỗi phút (`processMailQueue_`)
  mới thực sự gọi `MailApp` để gửi. Email vẫn đến nơi, chỉ trễ tối đa ~1 phút thay vì chặn thao
  tác tạo hồ sơ/công việc.
- Bỏ các lần gọi `ensureAllSheets_()` thừa (chỉ thật sự cần chạy 1 lần khi tải trang ở `doGet`).
- Giảm timeout khoá ghi (`LockService`) từ 30 giây xuống 10 giây để lỗi báo về nhanh hơn nếu có
  tranh chấp ghi, thay vì treo lâu.

⚠️ **Sau khi cập nhật code**: deploy lại (Deploy → Manage deployments → sửa deployment hiện có
→ Version: New) và mở lại app — lần đầu hệ thống sẽ tự tạo trigger gửi mail định kỳ, có thể
Google hỏi lại quyền truy cập (uỷ quyền thêm quyền tạo trigger), bấm **Cho phép**. Sheet mới
`MailQueue` sẽ tự sinh, không cần tạo tay.

## Ghi chú kỹ thuật & giới hạn

- **Xác thực**: hệ thống tự quản lý tài khoản (username/password, mật khẩu băm SHA-256 + salt
  riêng từng người), không dùng đăng nhập Google. Phiên đăng nhập (token) lưu ở `localStorage`
  trình duyệt, hết hạn sau 12 giờ.
- **Đính kèm**: chỉ nhận dưới dạng link (Drive hoặc link ngoài) — không lưu file trực tiếp lên
  server để đơn giản hoá và tránh tốn quota Drive.
- **Khung chat**: cập nhật khi bấm nút "Làm mới" hoặc mở lại công việc (không polling tự động)
  theo đúng lựa chọn khi thiết kế.
- **Điểm số**: mỗi công việc có nền 100 điểm, khi Quản lý "Xác nhận TĐV" có thể chọn mã điểm để
  cộng/trừ ra **Điểm cuối cùng** của công việc đó. Điểm ở tab **Ghi nhận điểm cộng/trừ** là điểm
  **tích luỹ cá nhân riêng** (dùng cho bảng xếp hạng ở Báo cáo hiệu suất), độc lập với điểm của
  từng công việc cụ thể.
- **Email**: dùng `MailApp` của tài khoản deploy script, gửi qua hàng đợi (`MailQueue` + trigger
  mỗi phút, xem mục tối ưu tốc độ ở trên) — Gmail cá nhân giới hạn ~100 email/ngày, tài khoản
  Google Workspace (trường học) thường cao hơn nhiều, đủ dùng cho quy mô 15 người.
- **Tab Tra cứu**: các hàm `lookupHoSo`/`sendTraCuuMessage` ở backend **không yêu cầu đăng
  nhập** (đúng như thiết kế), nhưng giao diện hiện gộp chung 1 màn hình đăng nhập cho toàn bộ
  ứng dụng để đơn giản hoá — nếu sau này muốn tách tab Tra cứu thành trang công khai riêng
  (không cần qua màn đăng nhập), có thể deploy thêm 1 Web app thứ 2 trỏ vào cùng Sheet, chỉ
  include `View_TraCuu.html`.
- **Xuất báo cáo PDF**: dùng `window.print()` của trình duyệt (chọn "Lưu thành PDF" ở hộp thoại
  in) — CSS đã ẩn sẵn sidebar/topbar/bộ lọc khi in.
- Toàn bộ dữ liệu lưu trong các sheet ẩn dùng làm bảng: `Users, Sessions, HoSo, CongViec,
  ChatLog, DiemCongTru, Settings_DonVi, Settings_PhanMuc, Settings_MaDiem, Counters, MailQueue`.
  Không nên sửa tay các sheet này trực tiếp trừ khi biết rõ cấu trúc cột.

## Cấu trúc file

```
apps-script/
├── appsscript.json         # Manifest
├── Code.gs                 # doGet + include()
├── Utils.gs                # Hàm tiện ích (mã hoá, sinh mã, ngày giờ...)
├── DB.gs                   # Schema, khởi tạo & seed sheet, CRUD chung
├── Auth.gs                 # Đăng nhập / phiên / phân quyền
├── MailService.gs          # Gửi email thông báo
├── HoSoService.gs          # Form hồ sơ, Tiếp nhận, Tra cứu
├── CongViecService.gs      # Quản lý công việc + khung chat
├── DiemService.gs          # Điểm cộng/trừ
├── SettingsService.gs      # Người dùng & danh mục (Thiết lập)
├── ReportService.gs        # Báo cáo hiệu suất
├── Index.html               # Khung SPA
├── CSS.html                 # Giao diện dùng chung
├── JsCommon.html             # Hàm JS dùng chung (api(), toast, modal...)
├── View_Login.html
├── View_Form.html
├── View_TraCuu.html
├── View_TiepNhan.html
├── View_CongViec.html
├── View_Diem.html
├── View_BaoCao.html
└── View_ThietLap.html
```
