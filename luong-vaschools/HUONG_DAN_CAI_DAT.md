# Hướng dẫn cài đặt nhanh (không cần cài phần mềm, khoảng 10 phút)

Bạn chỉ cần **4 tệp** trong thư mục `dist/`: `Code.gs`, `Index.html`, `Denied.html`, `appsscript.json`.

## Bước 1. Tạo dự án
1. Đăng nhập Google bằng tài khoản `@vaschools.edu.vn` sẽ làm **chủ hệ thống**.
2. Vào https://script.google.com → **Dự án mới (New project)**. Đặt tên: `He thong Luong VAS`.

## Bước 2. Dán 4 tệp
1. Bên trái, bấm **⚙ Cài đặt dự án (Project Settings)** → tích **"Show appsscript.json manifest file in editor"**.
2. Quay lại **Trình chỉnh sửa (Editor)** (biểu tượng `< >`).
3. **`appsscript.json`:** bấm tệp này, xóa hết, dán toàn bộ nội dung `dist/appsscript.json`.
4. **`Code.gs`:** bấm tệp `Code.gs` có sẵn, xóa hết, dán toàn bộ nội dung `dist/Code.gs`.
5. **`Index.html`:** bấm dấu **+** cạnh "Files" → **HTML** → đặt tên đúng `Index` → xóa nội dung mẫu, dán nội dung `dist/Index.html`.
6. **`Denied.html`:** làm tương tự, đặt tên đúng `Denied`, dán nội dung `dist/Denied.html`.
7. Bấm 💾 **Lưu**.

> Mẹo mở nhanh nội dung tệp: trên GitHub mở từng tệp trong `dist/` → bấm nút **Raw** → `Ctrl+A`, `Ctrl+C`.

## Bước 3. Cài đặt dữ liệu (chạy 1 lần)
1. Ở thanh trên, chọn hàm **`setupInstall`** → bấm **Chạy (Run)**.
2. Lần đầu Google hỏi quyền: **Xem xét quyền (Review permissions)** → chọn tài khoản → **Nâng cao (Advanced)** → **Đi tới ... (không an toàn)** → **Cho phép**. (Cảnh báo này bình thường vì ứng dụng do chính bạn viết.)
3. Khi chạy xong, **Nhật ký thực thi (Execution log)** hiện đường dẫn Google Sheet CSDL. Hệ thống đã tự tạo sẵn các sheet, đề án HP.ĐA.01 và gán bạn là quản trị.

## Bước 4. Mở web app
1. **Triển khai (Deploy)** → **Triển khai mới (New deployment)** → biểu tượng ⚙ chọn **Ứng dụng web (Web app)**.
2. *Thực thi bằng (Execute as)*: **Tôi (Me)**. *Ai có quyền truy cập (Who has access)*: **Bất kỳ ai trong vaschools.edu.vn**.
3. **Triển khai** → sao chép **URL ứng dụng web** → mở bằng trình duyệt.
4. Vào **Thiết lập → Cấu hình chung → `app_url`** → dán URL đó vào (để email thông báo có liên kết).

## Nâng cấp lên bản có Khai báo / Quyết toán / Phiếu duyệt (dành cho hệ thống đã cài)
1. Dán lại **cả 4 tệp** trong `dist/` (`Code.gs`, `Index.html`, `Denied.html`, `appsscript.json`) đè lên bản cũ, bấm 💾.
2. Chọn hàm **`setupEnsureSheets`** → **Chạy**. Hàm tự thêm các sheet/cột mới, thêm vai trò *Giáo vụ / Người đề xuất*, thêm các quyền mới
   cho vai trò mặc định và nạp quy trình duyệt mặc định. **Không xóa và không ghi đè dữ liệu hay quyền bạn đã chỉnh.** Chạy lại nhiều lần vẫn an toàn.
3. **Triển khai → Quản lý triển khai → ✏ → Phiên bản mới → Triển khai** (URL không đổi).
4. Gán vai trò: người nhập khai báo → **Giáo vụ / Người đề xuất** (phạm vi *Trường*), Hiệu trưởng → **Hiệu trưởng** (phạm vi *Trường*),
   Nhân sự → **Giám đốc Nhân sự**, Tổng giám đốc → **Tổng Giám đốc** (*Toàn hệ thống*). Xem/sửa chuỗi duyệt ở **Hệ thống → Quy trình duyệt**.

## Dùng thế nào để ra bảng thu nhập toàn công ty (tóm tắt)
1. **Thiết lập:** chi nhánh → trường → năm học → **kỳ**. Để tính thu nhập mới tại mốc đổi đề án (vd 01/03/2026): tạo kỳ loại **Điều chỉnh**
   (mã `2025-2026-DC1`, Học kỳ `DC1`, Loại `Điều chỉnh`, Từ ngày = Đến ngày = ngày hiệu lực; số tuần để 0).
2. **Nhân sự:** nhập hồ sơ, **Quá trình ngạch bậc** (ngạch hiệu lực tại ngày đó), **Thu nhập hiện tại** (mốc trước đề án, để tính trần và bảo vệ lương), kiêm nhiệm.
3. **Đề án:** bảo đảm có LCB/LTB cho mọi chi nhánh (chi nhánh mở sau được thêm mới vào đề án đã ban hành).
4. **Thu nhập & phụ trội:** chọn kỳ → **Tính toán** → xem **Tổng hợp toàn công ty** → **Sao chép bảng thu nhập** dán vào Excel.
5. **Phụ trội:** menu **Khai báo** nhập số tiết (có thể Nhập CSV) → **Gửi duyệt**; hoặc chọn chế độ **Tính thử** để xem trước phụ trội khi chưa duyệt.

## Mốc thu nhập cho năm sau (tự động)
- Mỗi năm thường có **1 đợt Điều chỉnh**. Sau khi đợt đó **gửi duyệt chốt và được duyệt xong**, hệ thống tự tạo "Thu nhập hiện tại" mới cho từng người
  (**chỉ lương, không gồm phụ trội**), hiệu lực từ **ngày hiệu lực của đợt**. Xem ở *Nhân sự → Thu nhập hiện tại* (ghi chú "Từ chốt …").
- Đợt Điều chỉnh năm sau sẽ tự so trần với mốc này. Chỉ cần tạo kỳ `2026-2027-DC1`… với ngày hiệu lực mới rồi bấm Tính toán.
- Phụ trội bình quân/tháng chỉ nằm ở cột **Chi phí/tháng** của bảng tổng hợp, không nằm trong thu nhập.
- Sau khi dán bản mới, chạy **`setupEnsureSheets`** để bổ sung tham số `pt_vao_thu_nhap` (=0) vào các đề án hiện có.

## Khi có bản cập nhật mã
Dán lại `Code.gs` / `Index.html` mới → **Triển khai → Quản lý triển khai → ✏ Sửa → Phiên bản mới → Triển khai** (URL không đổi). Nếu bản mới có thêm bảng/cột, chạy thêm hàm **`setupEnsureSheets`** (không mất dữ liệu).

## Lưu ý
- **Không chia sẻ file Google Sheet CSDL** cho người dùng. Họ chỉ cần URL web app.
- Thêm người dùng: vào **Hệ thống → Người dùng** (nhập CSV được), rồi **Gán vai trò**.
- Muốn cập nhật `dist/` sau khi sửa mã trong `src/`: chạy `npm run build`.
