# Hệ thống Quản lý công việc nhóm (Google Apps Script)

Web app nội bộ cho nhóm 15 người, dùng Google Sheet làm cơ sở dữ liệu và
Google Apps Script (HtmlService) làm giao diện. Đăng nhập bằng tài khoản
Google (không cần màn hình đăng nhập riêng).

**Kiến trúc**: server-rendered pages (`doGet`/`doPost`) + `<form>` HTML
thuần — **không dùng `google.script.run`**. Lý do: một số mạng nội bộ
(đặc biệt mạng trường học có lọc nội dung) chặn kênh RPC/AJAX ngầm mà
`google.script.run` dùng, khiến trang treo vô thời hạn dù nội dung tĩnh
vẫn tải bình thường. Với kiến trúc form thuần, mỗi thao tác gửi 1 request
HTTP GET/POST chuẩn (giống mọi trang web thông thường) nên không bị chặn.
Đánh đổi: trang sẽ **tải lại sau mỗi thao tác** thay vì cập nhật ngầm mượt.

## 1. Cấu trúc thư mục

```
apps-script/
├─ appsscript.json      # Manifest (quyền, chế độ triển khai)
└─ Code.gs              # TOÀN BỘ ứng dụng: dữ liệu, nghiệp vụ, giao diện,
                         # routing doGet()/doPost() - gộp 1 file duy nhất,
                         # không có file .html nào (CSS nhúng thẳng trong
                         # file bằng 1 biến chuỗi APP_CSS_).
```

Chỉ có **đúng 2 file** cần đưa vào Apps Script Editor: `appsscript.json`
(manifest) và `Code.gs`. Không cần tạo thêm file HTML nào — mọi trang đều
được dựng bằng cách ghép chuỗi HTML ngay trong `Code.gs` rồi trả về qua
`HtmlService.createHtmlOutput(html)`.

Bên trong `Code.gs`, code được chia thành các khối theo comment `// ====`
cho dễ đọc/tìm (Constants, SheetDB, Utils, Auth, MailService, các Service
nghiệp vụ, Render helpers, từng trang Page*, và cuối cùng là Routing
doGet/doPost) — nhưng vẫn chỉ là 1 file duy nhất, copy-paste 1 lần.

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

### Cách B — copy thủ công vào Apps Script Editor (đơn giản, chỉ 2 file)

1. Vào https://script.google.com (hoặc Tiện ích mở rộng → Apps Script từ
   Google Sheet của bạn).
2. Xoá nội dung mặc định trong `Code.gs`, copy toàn bộ nội dung file
   `Code.gs` trong thư mục này vào.
3. Bật **Project Settings** → tick "Show appsscript.json manifest file in
   editor" → mở file `appsscript.json` vừa hiện ra, dán đúng nội dung
   file `appsscript.json` trong thư mục này vào.
4. Lưu lại (Ctrl+S). Xong — không cần tạo thêm file nào khác.

## 3. Cấu hình trước khi dùng

1. Mở dự án Apps Script, chạy hàm `khoiTaoDuLieuMau` một lần (menu
   **Run** → chọn hàm → Run) để:
   - Tạo 1 Google Sheet CSDL mới (Spreadsheet ID được lưu vào
     Script Properties, key `SPREADSHEET_ID`).
   - Tạo sẵn danh mục Đơn vị / Phân mục / Mã điểm mẫu.
   - Gán **tài khoản Google đang chạy script làm Admin hệ thống** trong
     sheet `NhanSu` — đây là người đầu tiên có quyền vào tab Thiết lập.
2. Deploy Web App: **Deploy → New deployment → Web app**.
   - Execute as: **Me** (đã đặt sẵn trong `appsscript.json`). Lý do chọn
     "Me" thay vì "User accessing the web app": với "User accessing",
     mỗi người truy cập phải tự cấp quyền OAuth riêng lần đầu, việc này
     có thể bị domain Workspace (đặc biệt domain giáo dục) chặn/hạn chế
     khiến trang treo vô thời hạn ở "Đang tải...". Với "Me", chỉ người
     deploy cần cấp quyền một lần; `Session.getActiveUser()` vẫn nhận
     diện đúng từng người truy cập miễn access giới hạn trong domain và
     admin không chặn riêng thông tin này.
   - Who has access: **Anyone within [tên tổ chức]** (yêu cầu tài khoản
     Google Workspace cùng domain — đúng theo lựa chọn đăng nhập bằng
     Google account).
   - Nếu sau khi deploy vẫn không nhận diện được người dùng (tab userbox
     báo "Chưa được cấp quyền nội bộ" dù email đã có trong `NhanSu`), rất
     có thể domain Workspace chặn chia sẻ định danh người dùng cho script
     chạy dưới quyền người khác — cần liên hệ quản trị Workspace mở
     "Drive SDK" / cho phép chia sẻ thông tin người dùng nội bộ cho ứng
     dụng tự phát triển, hoặc quay lại dùng "User accessing the web app"
     sau khi domain đã whitelist các domain ở mục **7. Xử lý sự cố mạng**
     bên dưới.
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

## 7. Xử lý sự cố mạng (trang treo ở "Đang tải...")

Nếu trang web app tải xong giao diện (form, các tab) nhưng ô thông tin
người dùng ở góc trên phải kẹt mãi ở "Đang tải..." không hiện tên/lỗi gì
— đây là dấu hiệu kênh RPC (`google.script.run`) của Apps Script bị chặn
bởi mạng/tường lửa/proxy nội bộ (thường gặp ở mạng trường học có lọc nội
dung), không phải lỗi trong code. Cần quản trị mạng mở (whitelist) các
domain sau để Apps Script hoạt động được:

```
script.google.com
script.googleusercontent.com
*.googleusercontent.com
accounts.google.com
apis.google.com
```

Cách xác nhận nhanh: thử truy cập web app qua mạng khác (4G/hotspot) hoặc
qua VPN — nếu chạy được bình thường thì chắc chắn là do mạng chặn, không
phải do cấu hình web app hay code.

- Chat tải lại khi mở modal hoặc bấm Gửi (không real-time); có thể thêm
  polling định kỳ nếu cần.
- Chưa hỗ trợ upload file trực tiếp (theo lựa chọn khi thu thập yêu cầu).
- Báo cáo điểm hiện tính theo toàn bộ lịch sử; có thể bổ sung lọc theo
  tháng/quý nếu cần chi tiết hơn.
