# HR Recruit – Hướng dẫn triển khai (Google Sheet làm cơ sở dữ liệu)

Ứng dụng gồm 2 file chạy trên **Google Apps Script**, dữ liệu nằm trong **Google Sheet** của bạn, tệp scan/biểu mẫu nằm trong **Google Drive**. Đăng nhập bằng tài khoản Google của công ty.

| File | Vai trò |
|---|---|
| `Code.gs` | Backend: đọc/ghi Google Sheet, tải tệp lên Drive, kiểm tra quyền |
| `Index.html` | Giao diện ứng dụng (dashboard, đề xuất, ứng viên, thư viện, thiết lập) |

## Các bước (khoảng 5 phút)

1. Tạo một **Google Sheet mới** (ví dụ "HR Recruit – Dữ liệu"). Để trống.
2. Trong Sheet: **Tiện ích mở rộng → Apps Script**.
3. Xoá nội dung mặc định của `Code.gs`, dán toàn bộ nội dung file `Code.gs`.
4. Bấm dấu **+** cạnh *Tệp* → **HTML** → đặt tên đúng là `Index` → dán toàn bộ nội dung `Index.html`.
5. Chọn hàm `setup` → bấm **Chạy** → cấp quyền (Sheet + Drive) khi được hỏi.
6. **Triển khai → Triển khai mới → loại "Ứng dụng web"**:
   - *Thực thi dưới tư cách:* **Tôi** (chủ sở hữu)
   - *Ai có quyền truy cập:* **Bất kỳ ai trong tổ chức của bạn** (vd. vaschools.edu.vn)
7. Sao chép **URL ứng dụng web** và gửi cho nhân sự. Có thể đặt làm dấu trang.

## Lần đầu sử dụng

- Người **mở ứng dụng đầu tiên** sẽ tự thành **Quản trị**, và hệ thống tạo các sheet `ThietLap`, `DeXuat`, `UngVien`, `ThuVien`.
- Vào **Thiết lập → Người dùng** thêm email Google của từng người và chọn vai trò (Người đề xuất, Nhân viên tuyển dụng, Ban TGĐ…). Người chưa có trong danh sách sẽ thấy màn hình "Chưa được cấp quyền".
- Muốn xem thử dữ liệu mẫu: **Thiết lập → Dữ liệu & sao lưu → Nạp dữ liệu mẫu**.
- Quản trị có ô **"Xem thử với vai trò"** ở cuối thanh bên để kiểm tra giao diện của từng vai trò.

## Cập nhật phiên bản sau này

Dán code mới vào `Code.gs` / `Index`, rồi **Triển khai → Quản lý bản triển khai → Chỉnh sửa → Phiên bản mới → Triển khai**. URL giữ nguyên.

## Lưu ý

- Có thể xem/lọc dữ liệu trực tiếp trong Sheet (các cột đọc được ở bên trái). **Không sửa cột `data`** (JSON) – đây là dữ liệu thật mà ứng dụng đọc.
- Ghi theo từng bản ghi, người sau ghi đè người trước nếu hai người sửa **cùng một** đề xuất/ứng viên cùng lúc. Bấm **Làm mới dữ liệu** để lấy bản mới nhất.
- Phân quyền chi tiết (ai được duyệt, ai được xem ứng viên…) hiện được kiểm tra ở giao diện. Phía máy chủ chỉ chặn người **chưa đăng ký** và chỉ cho **quản trị** sửa Thiết lập. Phù hợp nội bộ công ty; không dùng cho dữ liệu cần kiểm soát truy cập chặt hơn.
- Tệp tải lên (tối đa 10MB) lưu ở thư mục Drive "HR Recruit – Tệp đính kèm", chia sẻ chế độ "mọi người trong tổ chức có liên kết đều xem được".
- Hạn mức của Apps Script (dung lượng 50.000 ký tự/ô, số lần gọi/ngày) đủ cho quy mô tuyển dụng của một công ty/trường; nếu dữ liệu lên hàng chục nghìn ứng viên nên chuyển sang cơ sở dữ liệu chuyên dụng.
- Mở `Index.html` trực tiếp bằng trình duyệt sẽ chạy ở **chế độ xem thử** (dữ liệu chỉ lưu trên trình duyệt đó, không kết nối Google Sheet).

## Về file Index.html (dành cho người bảo trì)

- `Index.html` là **bản triển khai**: phần JavaScript được mã hoá base64 (khối `hr-payload`) để Apps Script không làm sai lệch mã. **Không sửa tay** file này.
- Mã nguồn đọc được nằm ở `src/Index.source.html`. Sau khi sửa nguồn, chạy `python3 build.py` để tạo lại `Index.html`.
- Nếu màn hình báo "Ứng dụng không khởi động được", thông báo sẽ kèm dòng code gây lỗi để dễ chẩn đoán.

## Phiên bản vị trí & mô tả công việc

- Mỗi vị trí (Thư viện → Vị trí) có nhiều **phiên bản**: file scan đã duyệt, ngày hiệu lực, thời hạn tuyển, nội dung thay đổi.
- Có bản mới: bấm **Bản mới**. Bản cũ tự hết hiệu lực vào ngày hiệu lực của bản mới và vẫn được lưu (xem ở **Lịch sử**).
- KPI thời gian tuyển của mỗi đề xuất dùng bản có hiệu lực **tại ngày Ban TGĐ duyệt**.
- Dữ liệu vị trí cũ (một bản duy nhất) tự được chuyển thành phiên bản v1.

## MTCV trong đề xuất & kiểu dữ liệu URL / File

- Khi tạo đề xuất, hệ thống kiểm tra vị trí đề xuất trong **Thư viện**:
  - Vị trí có file MTCV scan **đang hiệu lực** → tự đính kèm, người đề xuất **bắt buộc bấm "Xác nhận sử dụng MTCV hiện tại"** mới gửi được.
  - Chưa có file (hoặc vị trí chưa có trong Thư viện) → **bắt buộc tải file MTCV**. Ghi chú: file cần có ký số điện tử hoặc ký trực tiếp đến cấp Trưởng đơn vị (Khối văn phòng và Kinh doanh), đến cấp Hội đồng trực thuộc (Khối trường).
- Thiết lập → Trường: có thêm kiểu **Liên kết (URL)** và **Tệp tải lên (File)** (CSV: cột Kiểu ghi `URL` hoặc `Tệp tải lên`).
- Tệp dùng chung giữa Thư viện và đề xuất chỉ bị xoá khỏi Drive khi không còn bản ghi nào tham chiếu.
