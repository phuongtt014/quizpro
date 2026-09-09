# Hệ thống Quản lý công việc nhóm (Google Apps Script)

Web app nội bộ cho nhóm 15 người, dùng Google Sheet làm cơ sở dữ liệu và
Google Apps Script (HtmlService) làm giao diện. Đăng nhập bằng tài khoản
Google (không cần màn hình đăng nhập riêng).

## 1. Cấu trúc thư mục

```
apps-script/
├─ appsscript.json      # Manifest (quyền, chế độ triển khai)
├─ Constants.gs         # Tên sheet, danh sách trạng thái, vai trò
├─ SheetDB.gs           # Lớp truy xuất Google Sheet (đọc/ghi theo tên cột)
├─ Utils.gs             # Sinh mã hồ sơ/công việc/phiếu, mã xác nhận...
├─ Auth.gs              # Xác định user hiện tại + vai trò từ sheet NhanSu
├─ MailService.gs       # Gửi email thông báo cho người gửi hồ sơ
├─ HoSoService.gs       # Nghiệp vụ Form hồ sơ + Tiếp nhận + Tra cứu
├─ CongViecService.gs   # Nghiệp vụ Quản lý công việc + chat + đánh giá TĐV
├─ DiemService.gs       # Phiếu điểm cộng/trừ + luồng duyệt + Báo cáo
├─ SetupService.gs      # Tab Thiết lập (Admin) + khởi tạo dữ liệu mẫu
├─ Code.gs              # doGet() + các hàm apiXxx gọi từ client
├─ Index.html           # Giao diện SPA (7 tab)
├─ Styles.html          # CSS
└─ Client.html          # JavaScript phía client (google.script.run)
```

## 2. Cách triển khai

### Cách A — dùng clasp (khuyến nghị)

```bash
npm install -g @google/clasp
clasp login
cd apps-script
clasp create --title "Quản lý công việc nhóm" --type webapp
clasp push
clasp deploy
```

### Cách B — copy thủ công vào Apps Script Editor

1. Vào https://script.google.com → Tạo dự án mới.
2. Tạo lần lượt các file `.gs` và `.html` đúng tên như trong thư mục này,
   copy nội dung tương ứng vào.
3. Vào **Project Settings** → dán nội dung `appsscript.json` (hoặc bật
   "Show appsscript.json" và chỉnh trực tiếp).

## 3. Cấu hình trước khi dùng

1. Mở dự án Apps Script, chạy hàm `khoiTaoDuLieuMau` một lần (menu
   **Run** → chọn hàm → Run) để:
   - Tạo 1 Google Sheet CSDL mới (Spreadsheet ID được lưu vào
     Script Properties, key `SPREADSHEET_ID`).
   - Tạo sẵn danh mục Đơn vị / Phân mục / Mã điểm mẫu.
   - Gán **tài khoản Google đang chạy script làm Admin hệ thống** trong
     sheet `NhanSu` — đây là người đầu tiên có quyền vào tab Thiết lập.
2. Deploy Web App: **Deploy → New deployment → Web app**.
   - Execute as: **User accessing the web app** (đã đặt sẵn trong
     `appsscript.json`).
   - Who has access: **Anyone within [tên tổ chức]** (yêu cầu tài khoản
     Google Workspace cùng domain — đúng theo lựa chọn đăng nhập bằng
     Google account).
3. Truy cập URL Web App bằng tài khoản Admin vừa gán → vào tab **Thiết lập**
   để:
   - Thêm đầy đủ Đơn vị/Phòng ban, Phân mục hồ sơ, Mã điểm.
   - Thêm 15 nhân sự còn lại (Email Google, Họ tên, Đơn vị, Vai trò).

> Lưu ý: nếu Spreadsheet CSDL muốn dùng lại 1 Sheet có sẵn, đặt Script
> Property `SPREADSHEET_ID` = ID của Sheet đó trước khi chạy bước 1.

## 4. Vai trò & phân quyền

| Vai trò | Quyền |
|---|---|
| Nhân viên | Gửi hồ sơ, xem & cập nhật trạng thái công việc của chính mình (Đang làm/Đã nộp), chat công việc, xem điểm của mình ở Báo cáo |
| Trưởng nhóm | + Xem/phân công/từ chối hồ sơ ở Tiếp nhận, sửa mọi công việc, lập phiếu điểm |
| Quản lý (TĐV) | + Xác nhận công việc (TĐV xác nhận), Đánh giá TĐV (mã điểm + ghi chú), sửa "Thời gian ghi nhận hoàn thành", duyệt/từ chối phiếu điểm, xem toàn bộ Báo cáo |
| Admin hệ thống | + Toàn quyền tab Thiết lập (Đơn vị, Phân mục, Mã điểm, danh sách Nhân sự) |

Người gửi hồ sơ qua Form không cần có trong danh sách Nhân sự — họ chỉ cần
đăng nhập Google (cùng domain) để hệ thống ghi nhận, và tra cứu bằng
Mã hồ sơ + Mã xác nhận mà không cần vai trò gì.

## 5. Quy tắc nghiệp vụ chính đã cài đặt

- **Mã hồ sơ**: `HS-YYYYMMDD-####`; **Mã xác nhận**: 6 ký tự ngẫu nhiên,
  gửi qua email người gửi ngay khi nộp hồ sơ.
- **Trạng thái hồ sơ**: Mới → Đã phân công → Đang xử lý → Đã hoàn thành
  / Từ chối (đồng bộ tự động theo trạng thái công việc liên quan).
- **Trạng thái công việc**: Cần làm, Đang làm, Đã nộp, TĐV xác nhận,
  Tạm ngưng, Hủy bỏ.
- Khi công việc gắn với 1 hồ sơ chuyển sang **Đã nộp**, bắt buộc nhập
  link trả kết quả → tự gộp vào Tài liệu đính kèm và gửi email cho người
  đề xuất.
- **Thời gian ghi nhận hoàn thành**: tự động gán khi chuyển "Đã nộp";
  chỉ vai trò Quản lý sửa lại được.
- **Điểm công việc**: khởi điểm 100, chọn Mã điểm (Đánh giá TĐV) sẽ
  tự cộng/trừ vào điểm hiện tại (chỉ Quản lý thao tác được).
- **Phiếu điểm cộng/trừ**: Trưởng nhóm trở lên lập phiếu (chọn nhân sự,
  mã điểm tự lấy số điểm tương ứng) → trạng thái "Chờ duyệt" → Quản lý
  duyệt hoặc từ chối (có lý do) → khi Đã duyệt mới cộng/trừ vào điểm
  công việc liên quan (nếu có) và tính vào Báo cáo tổng hợp.
- **Khung chat** (công việc & tra cứu): tin nhắn có chứa link (http/https)
  sẽ tự thêm vào Tài liệu đính kèm của công việc.
- **Đính kèm**: chỉ nhập link có sẵn (Google Drive, ...), không upload
  file trực tiếp lên server.

## 6. Giới hạn đã biết / có thể mở rộng thêm sau

- Chat tải lại khi mở modal hoặc bấm Gửi (không real-time); có thể thêm
  polling định kỳ nếu cần.
- Chưa hỗ trợ upload file trực tiếp (theo lựa chọn khi thu thập yêu cầu).
- Báo cáo điểm hiện tính theo toàn bộ lịch sử; có thể bổ sung lọc theo
  tháng/quý nếu cần chi tiết hơn.
