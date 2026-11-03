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

## Trần theo từng trường và mô phỏng
- **Trần riêng cho trường / cho năm sau:** *Đề án → mở đề án → Trần tăng thu nhập*. Bấm **Sao chép trần sang năm mới** (vd 2026 → 2027) rồi **+ Thêm** dòng
  riêng cho trường cần khác (cột *Trường* chọn mã trường; để trống là trần chung). Không cần nhân bản cả đề án.
- **Mô phỏng:** *Thu nhập & phụ trội* chọn học kỳ/đợt điều chỉnh → tab **Mô phỏng** → nhập thay đổi → Chạy mô phỏng (không làm thay đổi dữ liệu thật).
- Sau khi dán bản mới chạy `setupEnsureSheets` (thêm cột *Trường* cho bảng trần).
- **Lương hè không có trong hệ thống** (tính riêng trên bảng công). Bản cũ có thể đã tạo các sheet `HE_KHAI_BAO`, `HE_THU_NHAP` trong Google Sheet CSDL: hệ thống không còn dùng, anh/chị xóa tay được. Nếu đã tạo kỳ loại *Hè* thì xóa dòng đó ở Thiết lập → Kỳ quyết toán.

## Khi có bản cập nhật mã
Dán lại `Code.gs` / `Index.html` mới → **Triển khai → Quản lý triển khai → ✏ Sửa → Phiên bản mới → Triển khai** (URL không đổi). Nếu bản mới có thêm bảng/cột, chạy thêm hàm **`setupEnsureSheets`** (không mất dữ liệu).

## Nâng cấp lên bản "Trường/Đối tượng nằm ở Quá trình ngạch bậc"
1. Dán lại 4 tệp trong `dist/`, chạy **`setupEnsureSheets`**: hàm tự **chép Trường và Đối tượng tính lương từ hồ sơ cũ sang các dòng Quá trình ngạch bậc còn trống** (không ghi đè dòng đã có). Cột cũ trong sheet `NHAN_SU` vẫn còn nhưng hệ thống không dùng nữa, xóa tay được.
2. Mẫu nhập **Hồ sơ nhân sự** không còn các cột *Trường*, *Đối tượng tính lương*, *Tổ chuyên môn/Bộ phận* (dùng mẫu cũ sẽ bị báo "Tiêu đề không có trong mẫu"). Hãy tải mẫu mới ở nút **Tải mẫu CSV**.
3. Mẫu nhập **Quá trình ngạch bậc** có thêm *Trường* và *Đối tượng tính lương* (bắt buộc); mẫu **Thu nhập hiện tại** có thêm *Hỗ trợ GVCN*, *Hỗ trợ khác*.
4. Nhân sự mới nên nhập theo thứ tự: Hồ sơ nhân sự → Quá trình ngạch bậc (dòng đầu tiên từ ngày vào làm) → Thu nhập hiện tại.

## Xuất dữ liệu để lấy mã nhập sang tab khác
- Mỗi bảng có nút **Xuất dữ liệu** (Thiết lập → Chi nhánh, Trường, Năm học, Kỳ quyết toán, Hạng trường, Danh mục ngạch, Cấu hình chung; cũng có ở các bảng khác).
  Tiêu đề và giá trị **đúng định dạng mẫu nhập**: bấm **Sao chép** dán vào Excel/Google Sheets, hoặc **Tải file .csv**, rồi dán lại bằng *Nhập CSV* (chế độ *Thêm mới hoặc cập nhật theo khóa*).
- Tab *Quá trình ngạch bậc* không còn cột Họ tên riêng: cột Mã nhân sự đã hiện kèm tên.

## Quản trị viên tự duyệt phiếu do mình tạo
- Mặc định **không ai** duyệt được phiếu do chính mình tạo (kể cả quản trị viên). Muốn chạy thử một mình: *Thiết lập → Cấu hình chung → + Thêm*, Khóa `admin_tu_duyet`, Giá trị `Có`.
  Khi đó quản trị viên được **duyệt thay** từng bước (bắt buộc ghi chú, có nhật ký). Khi vận hành thật nên xóa dòng này hoặc đổi thành `Không`.

## Khai báo trách nhiệm theo bảng quy đổi của đề án
- Sau khi dán bản mới, chạy **`setupEnsureSheets`** (thêm cột *Mã quy đổi trách nhiệm* vào sheet Khai báo).
- Form **Khai báo → + Thêm**: chọn **Mã quy đổi trách nhiệm** (QD01–QD10, lấy từ bảng *Đề án → Quy đổi trách nhiệm* của đề án hiệu lực tại kỳ), hệ thống tự điền Loại = Trách nhiệm, Nội dung, Số lượng (số tiết theo bảng) và Đơn vị. Để trống nếu trách nhiệm không có trong bảng (nhập tự do như cũ).
- Hệ thống chặn: mã không có trong đề án, sai đơn vị, số tiết vượt mức quy đổi, mã dùng cho loại khác Trách nhiệm.
- Mã tính theo **buổi** (vd QD09 = 0,2 tiết/buổi): chọn đơn vị **Buổi** và nhập **số buổi**; hệ thống nhân với số tiết/buổi của bảng.
- Nhập CSV có thêm cột *Mã quy đổi trách nhiệm* (không bắt buộc; mẫu cũ không có cột này vẫn nhập được).

## Mở lại phiếu đã duyệt để sửa (chỉ quản trị viên)
- *Phiếu duyệt* → mở phiếu có trạng thái **Đã duyệt** (loại *Khai báo* hoặc *Quyết toán kỳ*) → ghi **lý do** vào ô ghi chú → **Mở lại để sửa**. Có nhật ký và thông báo cho người tạo, người đã duyệt.
- **Quyết toán kỳ:** kết quả về *Tạm tính*; nếu là kỳ Điều chỉnh, các mốc "Thu nhập hiện tại" do phiếu đó tạo ra được gỡ (trả lại hiệu lực cũ). Bị chặn nếu kỳ sau đã có kết quả chờ chốt/đã chốt.
- **Khai báo:** dòng về *Nháp*. Bị chặn nếu kỳ đã gửi chốt quyết toán cho những người trong phiếu: mở lại phiếu Quyết toán trước.
- Thứ tự sửa đúng: mở lại quyết toán → mở lại khai báo → sửa → gửi duyệt khai báo (phiếu mới) → Tính toán → gửi chốt (phiếu mới). Phiếu cũ giữ lịch sử với trạng thái *Đã mở lại*.

## Khai báo – định mức tự tính – một phiếu Phụ trội kỳ (bản mới)
- Dán lại 4 tệp, chạy **`setupEnsureSheets`** (thêm cột *Lý do* vào Khai báo, *Định mức quy định*/*Lý do sửa định mức* vào Phụ trội từng người, và quyền mới **`money.view`**
  cho các vai trò mặc định, **trừ Giáo vụ / Người đề xuất**). Bảng *Điều chỉnh định mức theo tuần* đã bỏ (sheet `DINH_MUC_TUAN` nếu có thì xóa tay được).
- **Định mức nằm ngay trên dòng Thực dạy.** Mỗi dòng có ô **Số tiết định mức (tiết/tuần)** điền sẵn theo *Đối tượng tính lương* của nhân sự (GV còn lại 20, GV Tiểu học nhiều môn 24… lấy từ đề án).
  Định mức của dòng = số tuần của dòng (từ ngày – đến ngày ÷ 7) × số tiết định mức. Muốn khác quy định (tuần nghỉ lễ, giảm tiết…) thì sửa số này và **bắt buộc nhập Lý do**; để trống hoặc bằng quy định thì không cần lý do.
  Ví dụ: 16 tiết/tuần (02/03–05/04), 22 tiết/tuần (06/04–26/04), tuần nghỉ lễ 9 tiết/tuần với định mức 6 (27/04–03/05) → định mức = 8 × 20 + 1 × 6 = 166 tiết.
- Nhiều dòng cùng thời gian (nhiều môn, dạy thêm, ôn thi HSG…): mỗi ngày chỉ tính **một** mức định mức, lấy từ **dòng chính** = dòng có số tiết/tuần nhiều nhất trong các dòng có nhập định mức (dòng để trống không quyết định).
  Dòng dạy thêm vì vậy không làm mất hay đổi định mức; muốn giảm định mức ở tuần nghỉ lễ thì sửa trên **dòng chính** của tuần đó. Khoảng nghỉ giữa các dòng (nghỉ việc, thai sản) tự không tính định mức.
  Giáo viên nghỉ việc giữa kỳ vì vậy có định mức đúng theo thời gian làm việc. *Số tuần quy định* của kỳ không dùng để tính định mức.
- Nhập CSV có thêm cột **Số tiết định mức (tiết/tuần)** (không bắt buộc). Dòng loại *Định mức* của bản cũ vẫn hoạt động (thay hoàn toàn số tự tính, phải có lý do) nhưng không cần dùng nữa. Sau khi dán bản mới chạy **`setupEnsureSheets`** để thêm cột.
- Tab **Tổng hợp theo người (xem trước)** trong Khai báo: số tiết thực dạy, trách nhiệm, định mức, phụ trội trách nhiệm/giảng dạy cho từng người (tính cả dòng Nháp). **Giáo vụ không thấy số tiền.**
- **Gửi duyệt phụ trội**: một phiếu duy nhất (không còn phiếu Khai báo riêng và phiếu Quyết toán riêng cho học kỳ). Hệ thống tính phụ trội, chụp kết quả và gửi lên các cấp;
  Hiệu trưởng/Nhân sự/TGĐ (có quyền `money.view`) xem bảng tiết + tiền + tổng. Duyệt xong: dòng khai báo thành *Đã duyệt*, kết quả thành *Đã chốt*. Trả lại/Hủy: dòng về *Nháp*. Admin có thể **Mở lại** như trước.
- Đợt *Điều chỉnh* không đổi (vẫn tính ở *Thu nhập & phụ trội* rồi gửi chốt).

## Nhân sự chỉ xếp ngạch để hưởng phụ trội (không thuộc đợt điều chỉnh thu nhập)
- Sau khi dán bản mới chạy **`setupEnsureSheets`** (thêm cột). *Nhân sự → Quá trình ngạch bậc* có cột **Áp dụng điều chỉnh thu nhập** (Có/Không, mặc định **Có**; dòng cũ để trống hiểu là Có). Nhập CSV có thêm cột này (không bắt buộc).
- Dòng đang hiệu lực đặt **Không** thì: **phụ trội vẫn khai báo, tính và duyệt đầy đủ**; không tính thu nhập mới, không áp trần, không có mức chính thức; **kỳ Điều chỉnh bỏ qua** họ và khi chốt không tạo mốc "Thu nhập hiện tại".
- Báo cáo tổng hợp: phụ trội của họ vẫn cộng vào **Chi phí/tháng**, hiện ở nhóm riêng **"Ngoài đợt điều chỉnh (chỉ phụ trội)"**, không nằm trong quỹ lương và phần tăng. Phiếu duyệt ghi "Ngoài đợt điều chỉnh" ở cột Mức chính thức.
- Muốn đưa họ vào diện điều chỉnh về sau: thêm dòng ngạch bậc mới (hiệu lực từ ngày đó) có cờ **Có**.

## Lưu ý
- **Tốc độ:** ứng dụng dùng bộ nhớ đệm. Nếu có ai **sửa trực tiếp trong file Google Sheet CSDL** (không khuyến khích), bấm nút **⟳ Làm mới dữ liệu** ở thanh trên cùng (cần quyền *Sửa thiết lập*), nếu không dữ liệu có thể chưa cập nhật tới 10 phút.
- **Không chia sẻ file Google Sheet CSDL** cho người dùng. Họ chỉ cần URL web app.
- Thêm người dùng: vào **Hệ thống → Người dùng** (nhập CSV được), rồi **Gán vai trò**.
- Muốn cập nhật `dist/` sau khi sửa mã trong `src/`: chạy `npm run build`.
