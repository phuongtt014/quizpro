# Cổng thông tin ứng viên (BM.10/HN.QT.01) – hướng dẫn triển khai

Cổng này là **một dự án Apps Script riêng, Google Sheet riêng**, hoàn toàn tách khỏi hệ thống tuyển dụng (`tuyen-dung/`). Hai hệ thống **không chia sẻ Sheet, Drive, tài khoản hay mã nguồn** và không gọi lẫn nhau. Nếu cổng bị tấn công, kẻ tấn công chỉ chạm tới dữ liệu của cổng.

## 1. Triển khai (làm một lần)
1. Tạo **Google Sheet mới** (đặt tên ví dụ "HR Cổng ứng viên – DỮ LIỆU"). Không dùng lại Sheet của hệ thống tuyển dụng. Chỉ chia sẻ Sheet này cho đúng những người cần xem dữ liệu gốc (nên chỉ chủ dự án).
2. **Tiện ích mở rộng → Apps Script**. Dán `Code-gs.txt` vào `Code.gs`; thêm tệp HTML tên **Index** và dán toàn bộ `Index.html`.
3. Chạy hàm **`setup()`** một lần (cấp quyền Sheet). Hàm tạo các sheet: `HoSo`, `NguoiDung` (chủ dự án là *Quản trị*), `CauHinh`, `NhatKy`.
4. Triển khai **hai bản** (Triển khai → Triển khai mới → Ứng dụng web), cả hai với *Thực thi dưới tư cách: **Tôi***:
   - **Bản CÔNG KHAI** – *Ai có quyền truy cập: **Bất kỳ ai***. Gửi đường dẫn này cho ứng viên.
   - **Bản NỘI BỘ** – *Ai có quyền truy cập: **Bất kỳ ai trong tổ chức***. Đường dẫn dùng cho nhân viên: thêm `?m=admin` vào cuối URL (ví dụ `https://script.google.com/a/macros/…/exec?m=admin`).
5. Mở bản nội bộ → tab **Người dùng** để thêm email nhân viên và gán vai trò.

> Mỗi lần sửa mã: **Triển khai → Quản lý triển khai → ✏ → Phiên bản mới** cho cả hai bản.

## 2. Ứng viên dùng như thế nào
- **Điền hồ sơ mới** → Gửi hồ sơ → hệ thống cấp **Mã hồ sơ** (`HS-2610-0001`) và **Số xác nhận** (8 ký tự, chỉ hiện một lần; chỉ lưu dạng băm).
- **Tra cứu / chỉnh sửa**: nhập mã hồ sơ + số xác nhận → xem, sửa, **in** (đúng bố cục BM.10).
- Nhập sai số xác nhận **5 lần** → tạm khoá tra cứu mã đó 30 phút.
- **Khoá chỉnh sửa**: sau *ngày nhận việc + 3 ngày* (ngày HCNS xác nhận nếu có, nếu không lấy ngày ứng viên khai). Nếu chưa có ngày nhận việc: tự khoá sau 60 ngày. HCNS có thể **Khoá ngay / Mở khoá** từng hồ sơ.

## 3. Nhân viên HCNS (bản nội bộ)
| Vai trò | Quyền |
|---|---|
| Xem | xem danh sách, xem chi tiết, in |
| Tuyển dụng | + sửa phần "Dành cho P. HCNS" (chức danh, cơ sở, địa điểm, thời gian, MSNV, ngày nhận việc, trạng thái, khoá/mở khoá, ghi chú), cấp lại số xác nhận, **xuất CSV / Excel** |
| Quản trị | + quản lý người dùng |
- Nút **Cấp lại số xác nhận**: dùng khi ứng viên mất số; chỉ hiện số mới một lần cho nhân viên → hãy xác minh danh tính ứng viên trước.
- Sheet `NhatKy` ghi lại: nộp, tra cứu, sửa, HCNS cập nhật, xuất dữ liệu (không ghi thông tin cá nhân).
- Hãy sửa dữ liệu **qua trang nội bộ**, không sửa trực tiếp trong Sheet `HoSo` (cột `data` mới là dữ liệu gốc).

## 4. Cấu hình (sheet `CauHinh`)
`lockDays` (3), `autoLockDays` (60), `maxFail` (5), `perHour` (120 hồ sơ/giờ), `perDay` (600 hồ sơ/ngày), `minFillSec` (20 giây).

## 5. Bảo mật đã áp dụng & giới hạn cần biết
- Tách riêng hoàn toàn khỏi hệ thống tuyển dụng; cổng không có thông tin đăng nhập hay đường vào hệ thống đó.
- Kiểm tra dữ liệu **ở máy chủ** (độ dài, định dạng, danh sách giá trị cho phép); chống chèn công thức vào Sheet/CSV; hiển thị luôn được mã hoá HTML.
- Số xác nhận ngẫu nhiên, lưu băm SHA-256 + muối; so sánh an toàn; khoá tạm khi sai nhiều lần; thông báo lỗi không tiết lộ mã hồ sơ có tồn tại hay không.
- Giới hạn tốc độ nộp hồ sơ, ô bẫy chống tự động, thời gian điền tối thiểu.
- **Giới hạn:** Apps Script không có CAPTCHA và không biết địa chỉ IP người dùng, nên chống spam ở mức vừa phải (đã có hạn mức giờ/ngày). Google hiển thị dải cảnh báo "ứng dụng do người dùng Apps Script tạo" ở đầu trang với người ngoài tổ chức (có thể nhúng vào Google Sites của trường để đẹp hơn). Thiết lập "Bất kỳ ai" có thể cần quản trị Google Workspace cho phép.
- Không có tải tệp lên (theo yêu cầu) → không có rủi ro tệp độc hại.

## 6. Cấu hình biểu mẫu (Quản trị)
Trang nội bộ (`?m=admin`) → tab **Cấu hình biểu mẫu** (chỉ vai trò *Quản trị*):
- **Sửa từng trường** ở mục II: tên hiển thị, **kiểu dữ liệu** (văn bản ngắn/dài, số, ngày, điện thoại, email, **danh sách chọn – dropdown**, chọn một, chọn nhiều), **bắt buộc**, **ẩn/hiện**, chiếm cả hàng, và **danh mục lựa chọn** (mỗi dòng một mục, tối thiểu 2) cho các kiểu danh sách.
- **Thêm trường mới** (tối đa 40): tự xuất hiện trên form, bản in (cuối mục II) và file CSV/Excel.
- **Đổi thứ tự** trên form bằng nút ↑ ↓ (bản in giữ nguyên bố cục BM.10).
- **Danh mục dropdown cho bảng**: *Bằng cấp*, *Hệ đào tạo* (mục III) và *Ngoại ngữ* (mục V). Để trống = ứng viên tự nhập.
- Trường 🔒 (vị trí ứng tuyển, họ tên, ngày sinh, CCCD, điện thoại, email) giữ kiểu dữ liệu và luôn hiển thị vì cần kiểm tra định dạng; vẫn đổi được tên và bắt buộc.
- Máy chủ kiểm tra theo đúng cấu hình: giá trị ngoài danh mục bị từ chối. Cấu hình áp dụng cho hồ sơ nộp/sửa từ thời điểm lưu; dữ liệu cũ giữ nguyên (trường bị ẩn/xoá vẫn còn trong dữ liệu gốc).
- Cấu hình lưu ở sheet `CauHinh` (dòng `formCfg`). Nút **Khôi phục mặc định** đưa biểu mẫu về như ban đầu.

### Nội dung cam kết
Tab **Cấu hình biểu mẫu** → cuối trang: sửa **nội dung cam kết** (mỗi đoạn cách nhau một dòng trống, tối đa 10 đoạn) và **nội dung ô tích xác nhận**. Nội dung hiển thị trên form và bản in. Mỗi hồ sơ **lưu kèm đúng nội dung cam kết ứng viên đã đồng ý lúc nộp/sửa**, nên đổi nội dung sau này không làm thay đổi hồ sơ cũ. Khi ứng viên mở lại hồ sơ để sửa, họ cần tích xác nhận lại (theo nội dung hiện hành).
