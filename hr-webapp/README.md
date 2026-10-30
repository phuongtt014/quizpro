# Web app quản lý hồ sơ nhân sự (Google Apps Script + Google Sheet)

## Cài đặt (khoảng 5 phút)
1. Vào https://script.google.com > **Dự án mới** (hoặc mở Google Sheet > Tiện ích mở rộng > Apps Script).
2. Dán `Code.gs` vào file `Code.gs`. Tạo file HTML tên **index** rồi dán `index.html`.
3. Cài đặt dự án > tích **Hiện tệp kê khai appsscript.json**, dán nội dung `appsscript.json`.
4. Trong `Code.gs`, sửa `APP.INITIAL_ADMINS` thành email Admin đầu tiên.
5. Chọn hàm **setup** > **Chạy** > cấp quyền. Hàm tự tạo Google Sheet (hoặc dùng Sheet đang gắn) với 3 sheet:
   `NhanSu` (dữ liệu), `CauHinhTruong` (thiết lập trường), `PhanQuyen` (người dùng). Xem link Sheet ở Nhật ký thực thi.
6. **Triển khai > Ứng dụng web mới** > Thực thi bằng: **Tôi** > Ai có quyền truy cập: **Bất kỳ ai** > Triển khai. Lấy URL gửi nhân sự.
7. Đăng nhập bằng email Admin > tab **Thiết lập trường** (dán CSV danh mục) và **Phân quyền** (thêm email + khu vực).

Sửa code về sau: Triển khai > Quản lý bản triển khai > Sửa > Phiên bản mới.

## Quy tắc chính
- Đăng nhập: nhập email > nhận mã 6 số qua email (hiệu lực 5 phút, tối đa 5 lần thử) > phiên 6 giờ.
- Người dùng chỉ thấy/sửa hồ sơ thuộc **Khu Vực** được gán; Admin thấy tất cả. Quyền được kiểm tra ở server.
- Import/nhập tay kiểm tra nghiêm ngặt, phân biệt hoa/thường và khoảng trắng; dòng lỗi không được nhập và có báo lỗi chi tiết.
- Số: tối đa nguyên không âm (hiển thị `1.500.000`); ngày: `dd/mm/yyyy`.
- Giới hạn gửi mail: ~100 email/ngày (Gmail thường), ~1.500/ngày (Google Workspace).
