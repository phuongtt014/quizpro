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

## Kiểu dữ liệu số & độ tin cậy khi lưu

- Trường kiểu **Số** hiển thị có dấu chấm phân tách hàng nghìn (ví dụ `2.000.000`), dấu phẩy cho phần thập phân (`1.500,75`). Dữ liệu lưu dạng số thuần.
- Trường hệ thống (không bắt buộc) đổi được kiểu dữ liệu; trường bắt buộc (khối, phòng ban, vị trí, số lượng, tên ứng viên, đề xuất ứng tuyển) và trường lấy từ Danh mục thì cố định kiểu.
- Sau mỗi lần lưu **Thiết lập**, ứng dụng tự đọc lại Google Sheet để đối chiếu; nếu không khớp sẽ tự lưu lại một lần và báo đỏ ở góc dưới thanh bên trái nếu vẫn không được.
- Xem **Thiết lập → Dữ liệu & sao lưu → Chẩn đoán** để biết thời điểm lưu gần nhất và lỗi gần nhất.

## Xử lý khi báo "Thiết lập chưa được ghi vào Google Sheet"

1. Cập nhật **cả hai** file: `Code.gs` (bản mới tự dọn dòng trùng mã và đọc/ghi thống nhất) và `Index`, rồi Triển khai phiên bản mới.
2. Vào **Thiết lập → Dữ liệu & sao lưu → Kiểm tra Google Sheet** để xem số dòng từng sheet, mã bị trùng và kích thước ô dữ liệu.
3. Bấm vào dòng cảnh báo đỏ ở thanh bên để gửi lại Thiết lập.

## Xuất dữ liệu (CSV)

- Mỗi tab có nút **Xuất CSV** (cần quyền "Xuất dữ liệu ra file CSV" trong Thiết lập → Phân quyền; mặc định có ở Nhân viên tuyển dụng, Ban TGĐ, Quản trị).
  - **Tổng quan:** báo cáo KPI, phễu, lý do loại, theo vị trí, KPI thời gian tuyển, hồ sơ theo tháng (theo bộ lọc khối đang chọn).
  - **Đề xuất:** theo bộ lọc/tìm kiếm hiện tại, gồm cả các trường tự thêm, MTCV và tình trạng bản ký.
  - **Ứng viên:** danh sách (theo bộ lọc) hoặc chi tiết từng vòng phỏng vấn.
  - **Thư viện:** vị trí (danh sách hoặc lịch sử phiên bản), mẫu thư, biểu mẫu.
  - **Thiết lập:** từng bảng (khối, phòng ban, nguồn, lý do loại, trường, người dùng, phân quyền). Khối, phòng ban, nguồn, lý do loại, người dùng có thể nhập lại bằng **Nhập CSV**.
- File mở được bằng Excel / Google Sheets (UTF-8). Số điện thoại và mã bắt đầu bằng 0 được giữ nguyên; giá trị bắt đầu bằng `=`, `+`, `-`, `@` được thêm dấu `'` để tránh bị hiểu là công thức.

## Chữ ký cuối phiếu đề xuất

- Thiết lập → **Chữ ký phiếu đề xuất**: thêm / sửa / xoá / sắp xếp người ký. Mỗi người có **Chức danh**, **Họ và tên** (để trống nếu ký tay; gõ `{{nguoi_de_xuat}}` để tự điền tên người đề xuất), ghi chú dưới chức danh, dòng **Ngày ký: ...../....../........** và phạm vi áp dụng (tất cả khối hoặc một khối).
- Chọn số cột chữ ký mỗi hàng (2–6) và thêm ghi chú cuối phiếu. Nút **Xem trước** hiển thị theo từng khối; nút **In phiếu đề xuất** dùng đúng cấu hình này.

## Mẫu phiếu đề xuất (Thư viện → Mẫu phiếu đề xuất)

- Thiết lập **logo**, **Số hiệu**, **Ngày hiệu lực**, **Lần ban hành**, tiêu đề, tên đơn vị, dòng phụ và màu nhấn của phiếu in. Số hiệu / Ngày hiệu lực / Lần ban hành in ở **góc phải phía trên** phiếu và lặp lại ở chân phiếu.
- Logo tự được cắt viền trắng và thu nhỏ (giữ dưới ~36.000 ký tự để không vượt giới hạn ô Google Sheet).
- Có biểu mẫu mới: **Ban hành mẫu mới** (lần ban hành tự tăng, chọn ngày hiệu lực). Mẫu cũ được giữ lại; mỗi đề xuất ghi nhớ mẫu đang áp dụng lúc lập (đề xuất còn chờ duyệt được cập nhật theo mẫu hiện hành khi sửa) và in theo mẫu đó.
- Khối chữ ký ở cuối phiếu cấu hình tại Thiết lập → Chữ ký phiếu đề xuất.
