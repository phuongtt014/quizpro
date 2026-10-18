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

## Người ký trong đề xuất & bố cục chữ ký

- Khi tạo/sửa đề xuất có mục **"Người ký trên phiếu đề xuất"**: người đề xuất điều chỉnh họ tên từng người ký (để trống nếu ký tay). Danh sách chức danh lấy theo khối đã chọn ở Thiết lập → Chữ ký phiếu đề xuất. Tên đã nhập được lưu theo từng đề xuất và in trên phiếu.
- **Số cột chữ ký tối đa** mỗi hàng: các hàng được chia đều và canh giữa theo chiều ngang giấy (ví dụ 4 người ký, tối đa 3 cột → 2 + 2; 5 người → 3 + 2 canh giữa).
- Mẫu phiếu: **Tên đơn vị trên phiếu** để trống = không hiển thị.

## Trường của Sơ vấn / Phỏng vấn / Thư mời & xác nhận chuyển giai đoạn

- Thiết lập có thêm 3 mục **Trường – Sơ vấn**, **Trường – Phỏng vấn**, **Trường – Thư mời**: sửa tên, ẩn/hiện, bắt buộc, đổi kiểu, thêm trường mới (số, ngày, giờ, URL, tệp…), sắp xếp, nhập/xuất CSV. Trường dùng cho quy trình (Kết quả sơ vấn, Tên vòng và Kết quả phỏng vấn, Trạng thái thư mời) là trường hệ thống, chỉ đổi được tên. Dữ liệu của trường bị ẩn vẫn được giữ.
- Mọi lần **chuyển giai đoạn** của ứng viên (nút trong hồ sơ, kéo-thả trên bảng, hoặc hệ thống gợi ý sau khi ghi nhận sơ vấn / thêm vòng phỏng vấn / tạo thư mời) đều hiện hộp thoại **xác nhận**; chọn Huỷ thì giữ nguyên giai đoạn. Khi chuyển sang "Loại" phải chọn lý do ngay trong hộp thoại.

## Gửi email cho ứng viên bằng email tuyển dụng (alias "Gửi thư với tư cách")

**Yêu cầu:** cập nhật **cả `Code.gs` và `Index`**, rồi Triển khai phiên bản mới.

1. Trong Gmail của **tài khoản chủ dự án** (tài khoản quản trị): ⚙ Cài đặt → Xem tất cả cài đặt → **Tài khoản và Nhập** → **Gửi thư với tư cách** → *Thêm địa chỉ email khác* → nhập email tuyển dụng → xác minh (Gmail gửi thư xác nhận tới hộp thư tuyển dụng; bấm liên kết/nhập mã).
2. Trong Apps Script chọn hàm **`authorizeMail`** → Chạy → cấp quyền Gmail (màn hình cấp quyền sẽ nêu quyền truy cập Gmail; dự án chỉ dùng để gửi thư và đọc danh sách alias).
3. Triển khai → Quản lý bản triển khai → Phiên bản mới.
4. Trong ứng dụng: **Thiết lập → Email gửi ứng viên** → *Kiểm tra alias trong Gmail* → chọn địa chỉ gửi, nhập tên hiển thị, **BCC** (để thư cũng nằm trong hộp thư tuyển dụng), chữ ký, giới hạn/ngày → Bật → *Gửi thư thử*.
5. Gửi thư cho ứng viên: mở hồ sơ ứng viên → chọn mẫu thư → khung **Gửi email trực tiếp** (sửa người nhận, CC, đính kèm biểu mẫu từ Thư viện) → bấm **Gửi email ngay** → bấm lần nữa để xác nhận.

**Bảo mật & vận hành**
- Địa chỉ gửi, tên hiển thị, BCC, chữ ký, giới hạn/ngày do **máy chủ** đọc từ Thiết lập; giao diện chỉ chọn được người nhận, CC thêm, nội dung và tệp đính kèm (chỉ tệp trong thư mục của ứng dụng). Chỉ vai trò có quyền "Chuyển giai đoạn, soạn thư…" (hoặc quản trị) mới gửi được.
- Mọi email được ghi vào sheet **NhatKyEmail** (thời gian, người thao tác, người nhận, tiêu đề, kết quả) và vào lịch sử ứng viên.
- Ứng viên trả lời sẽ về địa chỉ tuyển dụng (hoặc Reply-To nếu đặt). Thư nằm trong "Đã gửi" của tài khoản chủ dự án; dùng BCC để có bản sao ở hộp thư tuyển dụng.
- Hạn mức Google Workspace khoảng 1.500 người nhận/ngày; ứng dụng có giới hạn riêng (mặc định 200 email/ngày).
- **Không chia sẻ** Google Sheet, thư mục Drive và dự án Apps Script cho nhân viên: họ chỉ cần quyền mở đường link ứng dụng.

## Biến chèn vào thư mẫu (tự sinh theo các trường đã thiết lập)

- Khi soạn/sửa **mẫu thư** (Thư viện → Mẫu thư), các nút chèn biến được nhóm theo: Chung, Ứng viên, Đề xuất tuyển dụng, Sơ vấn, **Phỏng vấn**, Thư mời, và nhóm "Tên cũ". Bấm nút để chèn vào ô **Tiêu đề** hoặc **Nội dung** (ô nào đang chọn).
- Mỗi trường trong Thiết lập (Đề xuất, Ứng viên, Sơ vấn, Phỏng vấn, Thư mời) có **mã chèn thư mẫu** (cột cuối của bảng trường), dạng `{{tiền_tố_mã}}`:
  - `uv_` ứng viên (vd. `{{uv_sdt}}`), `dx_` đề xuất (vd. `{{dx_so_luong}}`), `sv_` sơ vấn, `pv_` phỏng vấn (vd. `{{pv_nguoi_phong_van}}`, `{{pv_dia_diem}}`), `tm_` thư mời (vd. `{{tm_luong}}`).
  - **Trường tạo mới tự có mã** (tạo từ tên trường, ví dụ "Điểm chuyên môn" → `{{pv_diem_chuyen_mon}}`); đổi tên trường về sau **không** đổi mã, nên mẫu thư cũ không bị hỏng.
- Biến `pv_` lấy theo **vòng phỏng vấn được chọn**: mặc định vòng gần nhất có ngày; nếu ứng viên có nhiều vòng, hộp soạn thư có ô chọn vòng (đổi vòng sẽ soạn lại thư từ mẫu).
- Biến chung: `{{nguoi_gui}}`, `{{nguoi_gui_chuc_danh}}`, `{{cong_ty}}`, `{{ngay_hom_nay}}`, `{{ma_de_xuat}}`, `{{giai_doan}}`, `{{so_vong_pv}}`. Các tên cũ (`{{ten_ung_vien}}`, `{{vi_tri}}`, `{{ngay_phong_van}}`…) vẫn dùng được.
- Giá trị trống thì biến được giữ nguyên `{{...}}` và hộp thoại cảnh báo "Còn n trường chưa có dữ liệu"; thư còn biến chưa điền sẽ không gửi trực tiếp được.

---

## Gửi email bằng chính email của người bấm gửi (v21)

Mặc định (chế độ **Tài khoản chủ dự án**) thư được gửi bằng tài khoản chủ dự án + alias tuyển dụng. Nếu muốn **thư đi từ email của từng nhân viên bấm gửi** mà vẫn giữ **dữ liệu Sheet/Drive kín**, dùng chế độ **Email của chính người bấm gửi** với *hai bản triển khai* của cùng một dự án Apps Script:

| Bản triển khai | Thực thi dưới tư cách | Ai truy cập | Dùng để |
|---|---|---|---|
| **Chính** (đang dùng) | Tôi (chủ dự án) | Bất kỳ ai trong tổ chức | Toàn bộ ứng dụng, đọc/ghi Sheet |
| **Người gửi** (mới) | Người dùng truy cập ứng dụng web | Bất kỳ ai trong tổ chức | Chỉ một trang nhỏ "xem lại & Gửi ngay" |

Các bước (làm một lần):
1. Thay **Code.gs** và **Index** bằng bản v21. Chạy hàm **`setup()`** một lần (ghi nhận chủ dự án để chặn bản "người gửi" đụng vào dữ liệu).
2. **Triển khai → Triển khai mới → Ứng dụng web** → *Thực thi dưới tư cách: Người dùng truy cập ứng dụng web*; *Ai có quyền truy cập: Bất kỳ ai trong tổ chức* → sao chép URL (kết thúc `/exec`).
3. Bản triển khai **chính** cũng cần **Triển khai phiên bản mới** để nhận Code.gs mới.
4. Thiết lập → Email gửi ứng viên → *Gửi bằng tài khoản nào?* = **Email của chính người bấm gửi**, dán URL vào ô "URL bản triển khai người gửi", bật gửi trực tiếp.
5. Mỗi nhân viên lần đầu bấm gửi sẽ thấy màn hình Google xin cấp quyền Gmail (quản trị Workspace có thể tin cậy sẵn ứng dụng).

Cách hoạt động: bấm **Gửi email ngay** (xác nhận 2 lần) → ứng dụng kiểm tra thư và lưu nháp tạm (15 phút) → mở cửa sổ nhỏ hiển thị *Từ / Đến / Nội dung* → người dùng bấm **Gửi ngay** → thư gửi bằng Gmail của họ, một lần duy nhất → ứng dụng chính nhận kết quả, ghi nhật ký (`NhatKyEmail`) và lịch sử ứng viên.

Lưu ý:
- Cần cho phép **cửa sổ bật lên (pop-up)** cho trang ứng dụng.
- Tên hiển thị dùng được `{{ten}}` (tên trong Thiết lập → Người dùng); Reply-To mặc định là email người gửi (`{{email}}`).
- Nếu người gửi cũng có alias đã nhập (Gmail "Gửi thư với tư cách") thì dùng alias, nếu không thì dùng email của họ. BCC vẫn gửi bản sao vào hộp thư tuyển dụng.
- Giới hạn email/ngày tính **riêng cho từng người**.
- Tệp đính kèm lấy từ thư mục Drive của ứng dụng (cần chia sẻ trong tổ chức); tài khoản cá nhân (không có Workspace) không chia sẻ nội bộ được nên không đính kèm được ở chế độ này.
- Nếu đang đăng nhập nhiều tài khoản Google trong một trình duyệt, hãy mở ứng dụng bằng đúng tài khoản công ty (hoặc dùng cửa sổ ẩn danh/hồ sơ trình duyệt riêng).
- Bản triển khai "người gửi" **không đọc/ghi dữ liệu**: mọi hàm dữ liệu từ chối nếu không phải bản chính.
- Quay lại chế độ cũ bất cứ lúc nào bằng cách chọn lại *Tài khoản chủ dự án*.

---

## Giao diện thư chuyên nghiệp (v22)

Thư gửi ứng viên giờ có giao diện như mẫu **BM.09 – Thư mời nhận việc**: đầu thư (thông tin đơn vị + logo), tiêu đề lớn màu chủ đạo, bảng thông tin có hàng tiêu đề, danh sách quyền lợi, ô lưu ý và khối xác nhận của ứng viên.

**Thiết lập một lần** – Thiết lập → *Email gửi ứng viên* → mục *Giao diện thư gửi đi*:
- *Giao diện thư*: Chuyên nghiệp / Văn bản đơn giản.
- *Logo đầu thư*: lấy tự động từ **Thư viện → Mẫu phiếu** (logo đang hiệu lực); có thể ẩn.
- *Màu chủ đạo* và *Thông tin đầu thư* (mỗi dòng một nội dung: tên đơn vị, trụ sở, điện thoại, website).

**Mẫu thư** – Thư viện → Mẫu thư → **Cài bộ mẫu thư chuyên nghiệp** thêm 5 mẫu: Mời phỏng vấn, Mời nhận việc (BM.09), Cảm ơn sau phỏng vấn, Thông báo chưa phù hợp, Nhắc phản hồi. Mẫu cũ **không bị thay đổi** (có thể sửa hoặc xoá thủ công).

Cú pháp trình bày trong ô *Nội dung* của mẫu (có khung hướng dẫn và **xem trước trực tiếp** khi sửa mẫu; khi soạn thư cho ứng viên cũng có khung xem trước đúng như người nhận thấy):

| Gõ | Kết quả |
|---|---|
| `# Tiêu đề` | tiêu đề lớn căn giữa |
| `## I. Mục` | tiêu đề mục |
| `\| Hạng mục \| Chi tiết \|` | bảng (dòng đầu là hàng tiêu đề) |
| `- ý` / `  - ý con` | gạch đầu dòng / cấp con |
| `> **LƯU Ý:**` + `> • nội dung` | ô lưu ý |
| `~ dòng` | căn phải (khối xác nhận) |
| `**đậm**`, `*nghiêng*`, `<br>` | định dạng / xuống dòng trong ô bảng |

Thư không dùng ký hiệu nào vẫn hiển thị bình thường. Khi "Sao chép" hoặc "Mở trong ứng dụng email", ký hiệu được chuyển thành văn bản thuần dễ đọc.

**Trường mới cho Thư mời tuyển dụng** (tự thêm vào Thiết lập → Trường – Thư mời): *Cấp trên trực tiếp*, *Thời gian thử việc*, *Thu nhập thử việc tạm tính*; trường *Mức lương đề nghị* dùng cho "Thu nhập chính thức tạm tính" (có thể đổi tên). Điền các trường này ở hồ sơ ứng viên trước khi gửi thư mời nhận việc; trường còn trống sẽ được cảnh báo.

**Cập nhật Code.gs** (bắt buộc để thư gửi đi có giao diện mới) rồi Triển khai phiên bản mới. Logo gửi kèm dạng ảnh nhúng, không bị chặn như ảnh tải từ web. Ở chế độ "Email của chính người bấm gửi", cửa sổ gửi hiển thị luôn bản xem trước này.

---

## Nút Đồng ý / Từ chối trong thư mời nhận việc và khối chữ ký căn giữa (v24)

- Mẫu **Thư mời nhận việc (BM.09)** có mục *III. Xác nhận của Anh/Chị* với hai nút **ĐỒNG Ý NHẬN VIỆC** và **TỪ CHỐI**. Bấm nút, ứng dụng email của ứng viên mở thư trả lời **soạn sẵn** gửi về *Email nhận phản hồi* (Reply-To trong Thiết lập, nếu trống: email người gửi / alias). Nút **Từ chối** có sẵn dòng *"Lý do từ chối (vui lòng điền): "* để ứng viên nhập.
- Cách này chạy trên mọi ứng dụng email (không cần máy chủ công khai nên dữ liệu vẫn kín); kết quả nằm ở hộp thư trả lời, bạn cập nhật trạng thái Thư mời của ứng viên như bình thường.
- Cú pháp nút trong mẫu: `@ [Nhãn](mailto:địa_chỉ?subject=…&body=…){ok} [Nhãn](…){no}` (`{ok}` xanh, `{no}` đỏ, `\n` = xuống dòng). Biến mới: `{{email_phan_hoi}}`.
- Dòng bắt đầu bằng `~` giờ tạo **khối căn về bên phải nhưng các dòng bên trong canh giữa nhau** (tiêu đề, ngày tháng, "Ký & ghi rõ họ tên").
- Mẫu đã cài từ v22 sẽ được **cập nhật** khi bấm lại *Cài bộ mẫu thư chuyên nghiệp* (có xác nhận; hãy nhân bản trước nếu bạn đã tự sửa mẫu).

---

## In thư mời nhận việc (v25)

Hồ sơ ứng viên → **Soạn thư** → chọn mẫu → nút **In thư** (cạnh "Sao chép"): mở bản in khổ A4 có logo, đầu thư, bảng thông tin, ô lưu ý và khối chữ ký; riêng nút *Đồng ý / Từ chối* được đổi thành hai ô tích ☐ kèm dòng "Lý do (nếu từ chối)" để nhân viên tuyển dụng in ra kẹp hồ sơ. Bản in chỉ gồm nội dung thư (không kèm chữ ký email).

---

## Hồ sơ nhận việc (BM.11) & bàn giao cho C&B (v26)

Tab mới **Hồ sơ nhận việc** (cần quyền *Xem hồ sơ nhận việc*). Quy trình:
1. **Thư mời nhận việc** (mẫu BM.09 bản mới – bấm lại *Thư viện → Mẫu thư → Cài bộ mẫu thư chuyên nghiệp*) liệt kê sẵn **danh mục hồ sơ cần chuẩn bị** (biến `{{ho_so_can_chuan_bi}}`) và đường dẫn điền BM.10 (biến `{{link_bm10}}`, khai báo ở Thiết lập → Hồ sơ nhận việc).
2. Ứng viên **chấp nhận thư mời** (hoặc đã nhận việc) → xuất hiện trong tab *Tiếp nhận hồ sơ*. Nhân viên tuyển dụng mở hồ sơ → **Bắt đầu tiếp nhận** → tích từng hồ sơ **đã nhận** (có hoặc không; ngày nhận và người nhận tự ghi). Ghi chú / hẹn ngày bổ sung nhập ở cuối. Có nút **In BM.11** (cột "Nhân viên HCNS nhận" tự điền theo các đợt bàn giao đã được C&B xác nhận).
3. **Bàn giao cho C&B (nhiều đợt):** nút *Tạo đợt bàn giao* → chọn nhân viên C&B nhận, chọn các hồ sơ (của một hoặc nhiều ứng viên) đã nhận và chưa bàn giao → đợt ở trạng thái *Chờ C&B xác nhận*. Hồ sơ đã nằm trong đợt không bỏ tích được.
4. **C&B xác nhận trong ứng dụng:** tích từng hồ sơ sau khi đối chiếu với hồ sơ thực nhận → **Xác nhận đã nhận đủ** (từ lúc này C&B chịu trách nhiệm) hoặc **Từ chối** kèm **lý do bắt buộc** (hồ sơ chưa tích được ghi là *không khớp*). Có **In biên bản bàn giao** cho từng đợt.
5. Nếu bị từ chối: nhân viên tuyển dụng kiểm tra lại, bấm **Kiểm tra lại & làm lại bàn giao** (đợt mới, đánh dấu *lần 2…*). Hệ thống **đếm số lần bị từ chối / làm lại** theo ứng viên và theo nhân viên.

**Hạn & KPI** (Thiết lập → *Hồ sơ nhận việc*): hạn bàn giao **9 ngày làm việc** (mặc định tính từ **ngày nhận việc**; có thể đổi sang "ngày nhận hồ sơ đầu tiên", và chọn tính thứ Bảy), hạn thu đủ hồ sơ = ngày nhận việc + **7 ngày** (theo cam kết BM.11). Ngày lễ chưa được loại trừ. Tab *Báo cáo & đánh giá*: theo từng nhân viên tuyển dụng phụ trách – tỷ lệ thu đủ đúng hạn, số ngày thu đủ trung bình, hồ sơ thiếu quá hạn, bàn giao đúng hạn, chờ bàn giao quá hạn, số đợt, bị từ chối, tỷ lệ làm lại; danh sách "cần xử lý ngay"; xuất CSV.

**Phân quyền:** 4 quyền mới ở *Thiết lập → Phân quyền*: xem hồ sơ nhận việc, tiếp nhận & tạo bàn giao, xác nhận nhận bàn giao (C&B), xem báo cáo. Nhân viên tuyển dụng được cấp sẵn xem/tiếp nhận/báo cáo; có sẵn vai trò **Nhân viên C&B** (thêm người dùng và chọn vai trò này).

**Danh mục hồ sơ (BM.11):** *Thư viện → Hồ sơ nhận việc (BM.11)* – chỉnh/ban hành bản mới (mỗi dòng `Tên | Yêu cầu chi tiết | Số lượng / quy cách`). Hồ sơ đang xử lý giữ danh mục đã chốt lúc bắt đầu tiếp nhận.

### Phân định trách nhiệm (v27)
Mỗi hồ sơ nhận việc có **hai người chịu trách nhiệm rõ ràng**:
- **Nhân viên Tuyển dụng phụ trách** – thu hồ sơ bước đầu từ ứng viên và bàn giao cho C&B. Bắt buộc chọn khi bấm *Bắt đầu tiếp nhận* (ứng viên mới tạo bởi nhân viên tuyển dụng tự gán người tạo). KPI thu hồ sơ, bàn giao đúng hạn và số lần bị từ chối **tính cho người này**, không phụ thuộc ai bấm tạo đợt bàn giao.
- **Nhân viên C&B phụ trách** – kiểm tra và chịu trách nhiệm khi nhận bàn giao. Chọn khi bắt đầu tiếp nhận (hoặc đặt mặc định ở Thiết lập → Hồ sơ nhận việc). Đợt bàn giao chỉ gồm ứng viên của cùng một C&B; chỉ C&B được chọn (hoặc quản trị) mới xác nhận/từ chối đợt đó. Báo cáo có bảng đánh giá riêng cho C&B: số đợt nhận, xác nhận, từ chối, tỷ lệ từ chối, thời gian phản hồi trung bình.
Cả hai hiển thị ở danh sách, chi tiết hồ sơ, bản in BM.11 (ô ký "Người tiếp nhận" và "Nhân viên HCNS tiếp nhận") và file CSV.

### Hồ sơ không hợp lệ sau khi C&B đã xác nhận (v28)
Ở tab *Bàn giao cho C&B*, đợt đã **C&B nhận** có nút **Báo hồ sơ không hợp lệ sau xác nhận…** (C&B được chọn hoặc quản trị): chọn hồ sơ, nhập lý do. Khi đó:
- Hồ sơ được ghi nhận **không hợp lệ sau khi C&B xác nhận** → tính vào **đánh giá C&B** (cột "Xác nhận rồi mới phát hiện không hợp lệ" và "Đã khắc phục"), không tính lỗi cho nhân viên tuyển dụng.
- Trạng thái hồ sơ nhận việc chuyển sang **"Chưa hợp lệ – C&B thu bổ sung"**: **C&B trực tiếp làm việc với ứng viên để thu đủ**, nhân viên tuyển dụng không phải bàn giao lại (và không bị tính quá hạn bàn giao vì hồ sơ này).
- Khi thu đủ, C&B mở chi tiết hồ sơ → **Đã thu đủ hợp lệ** (ghi ngày và người xác nhận). Hồ sơ chỉ **Hoàn tất** khi không còn hồ sơ chưa hợp lệ.
- Hiển thị trong chi tiết hồ sơ, bản in BM.11 (ô "Nhân viên HCNS nhận" và Ghi chú), lịch sử ứng viên và CSV bàn giao. Có thêm bộ lọc "C&B thu bổ sung" và số đếm trên tab cho C&B.

### Thời hạn thu & bàn giao theo từng hồ sơ (v29)
Mặc định thời hạn lấy từ Thiết lập → Hồ sơ nhận việc (thu đủ = ngày nhận việc + 7 ngày; bàn giao = 9 ngày làm việc). Người có quyền mới **"Đặt thời hạn thu / bàn giao riêng cho từng hồ sơ nhận việc"** (quản trị có sẵn; cấp thêm cho trưởng nhóm ở *Phân quyền*) mở chi tiết hồ sơ → **Đặt thời hạn thu / bàn giao**: chọn riêng **hạn thu đủ từ ứng viên** và **hạn bàn giao cho C&B** cho nhân viên tuyển dụng phụ trách hồ sơ đó.
- **Bắt buộc ghi lý do** khi đổi mốc; lịch sử thay đổi (ai, lúc nào, từ → đến, lý do) lưu trong hồ sơ và hiện trong hộp thoại; ghi vào lịch sử ứng viên.
- Nút **Mặc định** trả về hạn theo Thiết lập.
- KPI, cảnh báo "Quá hạn" và bộ lọc đều tính theo hạn riêng nếu có. Danh sách đánh dấu ✎ ở hồ sơ có hạn đặt riêng; CSV có cột "Hạn đặt riêng".
- Bản in BM.11 ghi cam kết bổ sung "trước ngày …" theo hạn riêng.

### Thời hạn riêng cho từng hồ sơ trong danh mục (v30)
Thiết lập → **Hồ sơ nhận việc** có bảng **"Thời hạn riêng cho từng hồ sơ"**: mỗi hồ sơ của danh mục BM.11 (Sơ yếu lý lịch, Giấy khám sức khỏe, Lý lịch tư pháp…) có hai ô — **hạn thu** (số ngày kể từ ngày nhận việc) và **hạn bàn giao cho C&B** (số ngày làm việc). **Để trống = dùng mặc định chung** (hai ô phía trên). Liên kết theo **tên hồ sơ** (đổi tên hồ sơ ở Thư viện thì phải đặt lại hạn). Hạn áp dụng cho nhân viên tuyển dụng phụ trách thu hồ sơ.
- Chi tiết hồ sơ nhận việc hiển thị **hạn thu** và **hạn bàn giao** của từng mục, kèm dấu **Quá hạn** khi mục đó chưa thu / chưa bàn giao mà đã quá hạn riêng của mục.
- Danh sách và bộ lọc "Quá hạn": quá hạn khi có ít nhất một mục quá hạn; cột hạn hiển thị mốc muộn nhất.
- KPI: **thu đủ đúng hạn** = mọi mục được thu trước hạn riêng của từng mục; **bàn giao đúng hạn** = mọi mục được C&B nhận với ngày bàn giao không quá hạn riêng.
- Hạn đặt riêng cho **một ứng viên cụ thể** (v29, có lý do và lịch sử) vẫn dùng được và **thay thế** hạn từng hồ sơ cho ứng viên đó.
