# Web app Định biên & Phân công – Khối Mầm non Việt Mỹ (Google Apps Script)

Căn cứ: *Quy định tên lớp học – Định biên nhân sự Khối Mầm non* (HDMN-DBNS-01, hiệu lực 01/06/2026).

## Triển khai (≈10 phút)
1. Tạo một Google Sheet trống (đây là cơ sở dữ liệu) → **Tiện ích mở rộng › Apps Script**.
2. Tạo 3 file trong dự án Apps Script và dán nội dung: `Code.gs`, `Index.html` (đặt tên **Index**, loại HTML), và bật *Hiện tệp kê khai appsscript.json* rồi dán `appsscript.json`.
3. Chọn hàm `setup` → Chạy (cấp quyền). Người chạy lần đầu trở thành **Admin**. (Muốn thử nhanh: chạy `seedDemo`.)
4. **Triển khai › Ứng dụng web**: *Thực thi bằng: Tôi* · *Người có quyền truy cập: Bất kỳ ai trong tổ chức*. Gửi link cho người dùng.
5. Vào web app → **Phân quyền** để thêm người dùng, và **Cấu hình › Cơ sở** để khai báo các cơ sở.

> Chỉ nên chia sẻ Google Sheet cho Admin; mọi người dùng khác thao tác qua web app (quyền được kiểm tra ở phía máy chủ).

## Quy trình sử dụng
| Ai | Làm gì |
|---|---|
| Admin | Khai báo cơ sở, người dùng, ma trận phân quyền |
| Nhân sự (HR) | *Nhân sự › Nhập từ Excel*: dán Mã NV · Họ tên · Cơ sở · Chức danh · Trạng thái |
| Hiệu trưởng/Quản lý cơ sở | Tạo lớp + sĩ số thực học + giữ chỗ; gán **Vai trò định biên** cho từng nhân sự; **Phân lớp** cho GV/Bảo mẫu |
| HR / Chủ tịch HĐHT | *Tổng quan*: ma trận đối chiếu tất cả cơ sở, xuất CSV; *Báo cáo cơ sở*: chi tiết |

## Quy tắc tính (đều chỉnh được trong **Cấu hình**)
- **Định biên cơ sở**: tổng sĩ số = thực học + giữ chỗ → chọn khung (<50, 50–59, 60–70, 71–150, 151–190, >190) → so sánh số nhân sự đang làm theo từng vị trí với định biên (Thiếu / Đạt / Thừa).
- **Định biên lớp**: mỗi nhóm tuổi có tỉ lệ HS:GV và cơ cấu GV + bảo mẫu (Pre-N 4:1, N 5:1 – 2GV+1BM; Pre-K.A 6:1, Pre-K.B 8:1, K 10:1 – 2GV). Sức chứa chuẩn = tỉ lệ × (GV + BM định biên); báo **Vượt tỉ lệ** khi sĩ số > tỉ lệ × số người thực tế.
- **Đề xuất bổ sung** (mục 4 đề án): lớp có sĩ số ≥ sức chứa chuẩn + 2 → hiển thị "Đủ điều kiện đề xuất".
- Nhân sự "Nghỉ việc" không được tính. Cảnh báo: chưa phân vai trò, GV/BM chưa phân lớp, phân vào >1 lớp.

## Điểm cần xác nhận với đề án (bản scan)
1. Khung sĩ số trong bản scan ghi "50–60", "60–70", "71–150" (trùng 60, hở 70). App đặt 50–59, 60–70, 71–150; sửa tại *Cấu hình › Khung sĩ số*.
2. Bảng định biên cơ sở được đọc từ OCR; hãy đối chiếu lại *Cấu hình › Định biên cơ sở* với bản gốc (đặc biệt hàng Trợ lý / Trợ lý kiêm nhiệm).
3. "Tỉ lệ 4:1 – 2 GV + 1 bảo mẫu" được hiểu là tỉ lệ tính trên **tổng số người chăm sóc** trong lớp (Pre-N tối đa 12 trẻ, N 15, Pre-K.A 12, Pre-K.B 16, K 20).
4. "Giáo viên Tiếng Anh VN" được tính ở cấp cơ sở (không gắn lớp).

## Hiệu năng
- Mở app: 1 lệnh gọi `loadAll` lấy toàn bộ dữ liệu; chuyển tab hiển thị tức thì từ bộ nhớ trình duyệt, tự làm mới nền nếu dữ liệu cũ hơn 30 giây (nút **⟳ Làm mới** để tải ngay).
- Máy chủ cache từng sheet (CacheService, 10 phút) và xoá cache khi ghi; đổi vai trò/phân lớp chỉ ghi đúng ô thay đổi.
- **Lưu ý**: nếu sửa trực tiếp trong Google Sheet (không qua web app), dữ liệu có thể chậm tối đa 10 phút mới hiện lên; chạy lại `setup` hoặc chờ hết cache.
