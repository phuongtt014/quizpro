# Hệ thống Quản lý công việc nhóm (Google Apps Script)

Web app quản lý công việc cho nhóm ~15 người, chạy trên nền tảng **Google Apps Script**
(bound vào 1 Google Sheet làm cơ sở dữ liệu). Gồm đầy đủ các mục:

1. **Form nộp hồ sơ** — sinh mã hồ sơ + mã xác nhận, gửi email.
2. **Tab Tiếp nhận** — Trưởng nhóm trở lên phân công (tạo công việc) hoặc từ chối (ghi lý do).
3. **Tab Tra cứu** — tra cứu bằng mã hồ sơ + mã xác nhận, nhắn tin cho người phụ trách.
4. **Tab Quản lý công việc** — đầy đủ trường theo yêu cầu, khung chat tự gom link vào đính kèm,
   trạng thái Cần làm/Đang làm/Đã nộp/TĐV xác nhận/Tạm ngưng/Hủy bỏ, điểm 100/công việc + mã điểm đánh giá.
5. **Tab Ghi nhận điểm cộng/trừ** — Nhập phiếu đề xuất → Quản lý duyệt → tính vào hệ thống.
6. **Tab Báo cáo hiệu suất** — xếp hạng điểm, thống kê trạng thái/đúng-trễ hạn, biểu đồ theo
   đơn vị/phân mục, xuất PDF (in trực tiếp từ trình duyệt).
7. **Tab Thiết lập** (chỉ Admin) — thêm/**sửa**/xoá người dùng (kể cả thông tin họ tên, email,
   SĐT, đơn vị), đơn vị/phòng ban, phân mục hồ sơ, mã điểm; kèm mục **Chẩn đoán** để tự kiểm
   tra khi có sự cố dữ liệu.

**Nhãn phiên bản**: góc trên sidebar luôn hiện dòng nhỏ `Build: YYYY-MM-DD.N` — dùng để xác
nhận trình duyệt đang chạy ĐÚNG bản code mới nhất đã deploy (build hiện tại: xem hằng số
`APP_BUILD` ở đầu `Code.gs`). Nếu báo lỗi gì mà build hiển thị không khớp với build mới nhất
tôi cung cấp, nghĩa là chưa deploy đúng bản hoặc trình duyệt đang cache trang cũ — hãy deploy
lại (New version) rồi Ctrl+F5.

## Vai trò & quyền truy cập theo tab

| Tab | Ai xem được |
|---|---|
| Nộp hồ sơ, Tra cứu | **Công khai** — ai có link cũng dùng được, không cần tài khoản |
| Quản lý công việc, Điểm cộng/trừ | Cần đăng nhập (bất kỳ vai trò nào) |
| Tiếp nhận, Báo cáo hiệu suất | Trưởng nhóm trở lên |
| Thiết lập | Chỉ Admin hệ thống |

| Vai trò | Quyền |
|---|---|
| Nhân viên | Xử lý công việc được giao, đề xuất điểm |
| Trưởng nhóm | + Tiếp nhận/phân công/từ chối hồ sơ, tạo công việc trực tiếp, tạm ngưng/hủy công việc |
| Quản lý | + Xác nhận TĐV kèm chấm điểm, sửa thời gian hoàn thành, duyệt điểm cộng/trừ, xem báo cáo |
| Admin hệ thống | + Toàn quyền tab Thiết lập (người dùng, danh mục) |

Sidebar tự ẩn/hiện theo đúng bảng trên: khách (chưa đăng nhập) chỉ thấy 2 mục Nộp hồ sơ/Tra cứu
+ nút "Đăng nhập"; sau khi đăng nhập sẽ thấy thêm các tab tương ứng vai trò. Phân quyền được
kiểm tra ở CẢ hai phía — ẩn ở giao diện và bắt buộc lại ở server (`requireMinRole_`) — nên dù
có ai đó cố gọi thẳng API cũng không bỏ qua được.

## Cách triển khai

1. Tạo mới 1 **Google Sheet** trống — đây sẽ là cơ sở dữ liệu.
2. Trong Sheet, vào **Tiện ích mở rộng → Apps Script**.
3. Xoá file `Code.gs` mặc định, sau đó tạo lần lượt các file **cùng tên** (đuôi `.gs` cho code
   server, đuôi `.html` cho giao diện) như trong thư mục `apps-script/` của repo này, rồi copy
   đúng nội dung tương ứng vào. Riêng `appsscript.json` sửa trực tiếp qua biểu tượng ⚙️
   **Project Settings → Show "appsscript.json"**.
   - Cách nhanh hơn: cài [`clasp`](https://github.com/google/clasp) (`npm i -g @google/clasp`),
     `clasp login`, `clasp create --type sheet --title "Quản lý công việc nhóm"` rồi
     `clasp push` từ thư mục `apps-script/`.
4. Vào **Deploy → New deployment → Web app**:
   - Execute as: **Me** (chủ sở hữu script — để gửi được email qua `MailApp`).
   - Who has access: **Anyone** (để tab Nộp hồ sơ/Tra cứu dùng được ngoài tổ chức nếu cần;
     có thể đổi thành "Anyone within [tổ chức]" nếu muốn giới hạn nội bộ trường).
5. Mở link Web app vừa deploy → đăng nhập bằng tài khoản mẫu bên dưới → vào tab **Thiết lập**
   tạo tài khoản thật cho 15 thành viên, cập nhật danh sách đơn vị/phân mục/mã điểm.

## Tài khoản mẫu (seed sẵn khi chạy lần đầu)

| Username | Mật khẩu | Vai trò |
|---|---|---|
| admin | 123456 | Admin hệ thống |
| quanly | 123456 | Quản lý |
| truongnhom | 123456 | Trưởng nhóm |
| nhanvien | 123456 | Nhân viên |

⚠️ **Đổi mật khẩu các tài khoản này ngay sau khi triển khai** (tab Thiết lập → Người dùng →
Reset mật khẩu), hoặc khoá bớt tài khoản không dùng.

Dữ liệu mẫu cũng được tạo sẵn ở tab Thiết lập: 5 đơn vị/phòng ban, 5 phân mục hồ sơ, 6 mã điểm
cộng/trừ (C1–C3 dương, T1–T3 âm) — **anh/chị chỉnh sửa lại cho đúng thực tế** của trường.

**Sửa (không chỉ thêm/xoá)**: mỗi dòng ở cả 4 danh mục trong tab Thiết lập (Người dùng, Đơn
vị/phòng ban, Phân mục hồ sơ, Mã điểm cộng/trừ) giờ có thêm nút **"Sửa"** riêng để chỉnh trực
tiếp mà không cần xoá rồi thêm lại — Người dùng: sửa họ tên/email/SĐT/đơn vị (nút "Sửa thông
tin"), đổi vai trò (dropdown), khoá/mở khoá, reset mật khẩu; Đơn vị/Phân mục: sửa tên; Mã điểm:
sửa mô tả + số điểm (riêng chính mã điểm — VD `C1` — không cho đổi vì có thể đã bị dùng ở công
việc/phiếu điểm cũ; muốn đổi mã thì xoá rồi thêm mã mới).

## Đã tối ưu tốc độ (bản cập nhật sau triển khai)

Thao tác "Tạo công việc" / tạo mới trong tab Thiết lập từng chậm vì mỗi request gọi dịch vụ
Spreadsheet rất nhiều lần (mỗi lần ~100-400ms) và gửi email đồng bộ (`MailApp` có thể mất 1-3
giây) ngay trong lúc xử lý. Đã cải thiện:

- **Cache trong 1 lượt thực thi**: Spreadsheet, các Sheet và dữ liệu bảng đã đọc được cache lại
  trong phạm vi 1 lần gọi từ client, tránh lấy lại/kiểm tra header nhiều lần cho cùng 1 sheet.
- **Kiểm tra header rẻ hơn**: chỉ ghi header khi sheet thực sự trống, thay vì đọc + so sánh dữ
  liệu mỗi lần truy cập sheet.
- **Gửi email qua hàng đợi**: các hàm `mailXxx_` giờ chỉ ghi 1 dòng vào sheet `MailQueue` (rất
  nhanh) và trả kết quả về ngay cho người dùng; 1 trigger chạy mỗi phút (`processMailQueue_`)
  mới thực sự gọi `MailApp` để gửi. Email vẫn đến nơi, chỉ trễ tối đa ~1 phút thay vì chặn thao
  tác tạo hồ sơ/công việc.
- Bỏ các lần gọi `ensureAllSheets_()` thừa (chỉ thật sự cần chạy 1 lần khi tải trang ở `doGet`).
- Giảm timeout khoá ghi (`LockService`) từ 30 giây xuống 10 giây để lỗi báo về nhanh hơn nếu có
  tranh chấp ghi, thay vì treo lâu.
- Gộp các lệnh gọi API độc lập chạy song song (`Promise.all`) thay vì gọi tuần tự ở modal "Tạo
  công việc" và tab Thiết lập; danh sách vai trò (tĩnh) chuyển sang hardcode phía client, bớt
  hẳn 1 vòng gọi server.

**Vẫn còn chậm?** Bản thân nền tảng Apps Script có độ trễ nền khoảng 1-2 giây cho **mỗi** lệnh
`google.script.run` (do cơ chế iframe/sandbox của HtmlService, nằm ngoài khả năng tối ưu từ phía
code) — đây là giới hạn tự nhiên của nền tảng, không phải lỗi. Cách cải thiện thêm nếu vẫn thấy
chậm:
- Sheet dữ liệu càng lớn (nhiều dòng `HoSo`/`CongViec`/`ChatLog`...) thì mỗi lần đọc toàn bảng
  càng lâu — nên định kỳ archive dữ liệu cũ (hồ sơ/công việc đã xong quá lâu) sang 1 Sheet lưu
  trữ riêng nếu số dòng lên tới hàng nghìn.
- Google Apps Script container "nguội" (lâu không ai dùng) sẽ khởi động chậm hơn ở lượt đầu —
  các lượt thao tác sau trong cùng phiên làm việc sẽ nhanh hơn hẳn.
- Nếu tài khoản chạy script là Gmail cá nhân (không phải Google Workspace của trường), hạn mức
  và tốc độ các dịch vụ Google có thể thấp hơn — nên dùng tài khoản Workspace để deploy.

## Đã sửa lỗi: nộp hồ sơ xong nhưng Tra cứu / Tiếp nhận không thấy

Nguyên nhân kép, đã khắc phục trong bản cập nhật này:

1. **Cache "sống sót" qua nhiều lượt gọi**: cơ chế cache tăng tốc ở bản trước đôi khi bị Apps
   Script tái sử dụng giữa các lệnh gọi liên tiếp, khiến tab Tra cứu/Tiếp nhận đọc phải dữ liệu
   cũ (từ trước khi hồ sơ mới được ghi). Đã sửa: cache được xoá sạch (`_resetRequestCache_`) ở
   đầu MỌI lệnh gọi từ client, đảm bảo luôn đọc dữ liệu mới nhất.
2. **Mã xác nhận / số điện thoại mất số 0 ở đầu**: Google Sheets tự động hiểu các chuỗi toàn số
   (VD mã xác nhận `"012345"`, số điện thoại `"0987654321"`) là số, làm rụng mất số 0 đầu tiên
   khi ghi vào ô — dẫn đến tra cứu bằng đúng mã đã gửi qua email vẫn báo "không tìm thấy" vì mã
   lưu trong Sheet đã bị đổi thành `12345`. Đã sửa: ép định dạng "Văn bản thuần" cho các cột này
   (`MaXacNhan`, `SoDienThoaiNguoiGui`, `SoDienThoai`) — áp dụng tự động, chỉ cần deploy lại.

   ⚠️ Các hồ sơ **đã tạo trước khi cập nhật** có thể vẫn còn lỗi mất số 0 trong dữ liệu cũ (không
   thể tự khôi phục số đã mất) — nếu tra cứu hồ sơ cũ bị lỗi, hãy mở sheet `HoSo`, cột
   `MaXacNhan`, gõ lại thủ công đúng mã đã gửi trong email (thêm số 0 còn thiếu ở đầu, định dạng
   cột lúc này đã là văn bản thuần nên gõ lại sẽ giữ nguyên). Hồ sơ tạo **sau** khi cập nhật thì
   không còn gặp lỗi này.
3. **(Bản cập nhật mới nhất) Thiếu `SpreadsheetApp.flush()` sau khi ghi**: đây mới là nguyên
   nhân gốc rễ chính. Apps Script có thể gộp các lệnh ghi (`appendRow`/`setValues`) lại và
   không "chốt" ngay xuống Sheet thật — nếu 1 request KHÁC (VD mở tab Tra cứu/Tiếp nhận ngay sau
   khi vừa nộp hồ sơ) đọc dữ liệu trước khi phần ghi được chốt xong, nó vẫn thấy trạng thái CŨ,
   dù bản thân người vừa nộp thấy dòng mới hiện ra trên Sheet. Đã thêm `SpreadsheetApp.flush()`
   ngay sau MỌI lần ghi (`appendObject_`, `updateObjectById_`, `deleteRowById_`, `getNextSeq_`)
   để đảm bảo dữ liệu luôn được chốt trước khi trả kết quả về client.

4. **(Mới nhất) Công cụ Chẩn đoán trả về `null`**: nếu bấm "Kiểm tra dữ liệu" mà kết quả hiện ra
   đúng chữ `null` (không phải JSON, không có `ok:false`/thông báo lỗi nào), đây là dấu hiệu
   `google.script.run` không thực sự nhận được phản hồi từ server — gần như chắc chắn KHÔNG
   phải lỗi logic đọc Sheet (vì hàm `debugSheetInfo` giờ đã bọc try/catch riêng từng phần, không
   thể tự crash toàn bộ), mà là 1 trong các nguyên nhân sau:
   - **Chưa deploy đúng bản mới nhất** — nguyên nhân phổ biến nhất. Kiểm tra bằng nhãn
     `Build: ...` ở góc trên sidebar (xem mục "Nhãn phiên bản" ở trên).
   - **Trình duyệt đang cache trang HTML cũ** — Ctrl+F5 (hoặc mở cửa sổ ẩn danh) rồi thử lại.
   - Mạng/firewall trường học chặn 1 phần giao tiếp của khung iframe mà Apps Script dùng.

   Đã thêm hàm `ping()` (tab Thiết lập → Chẩn đoán → nút "1. Ping") — hàm này KHÔNG đụng tới
   Sheet/đăng nhập, chỉ trả về ngay 1 chuỗi cố định. Nếu **ping cũng trả về `null`** thì chắc
   chắn 100% là lỗi kết nối/deploy như trên, không liên quan gì tới code đọc Sheet của app; nếu
   ping ra kết quả bình thường nhưng "Kiểm tra dữ liệu" vẫn `null` thì gửi lại tôi cả 2 kết quả
   để chẩn đoán tiếp. Để có thông tin chắc chắn nhất, mở **Apps Script → mục Thực thi
   (Executions)** ở thanh bên trái, xem log của lần gọi `debugSheetInfo`/`ping` gần nhất — log
   này ghi lại chính xác những gì thực sự chạy trên server bất kể client nhận được gì.

5. **(Nguyên nhân gốc thật sự) Kiểu `Date` lọt qua `google.script.run`**: đây mới là nguyên nhân
   chính khiến TẤT CẢ các tab danh sách (Tiếp nhận, Quản lý công việc, Điểm...) hiển thị trống
   dù server đọc đúng dữ liệu — kể cả sau khi đã có `SpreadsheetApp.flush()`. Google Sheets có
   thể tự nhận diện 1 ô dạng "2026-09-10 14:30:00" và âm thầm chuyển thành kiểu `Date` thật (dù
   ghi vào bằng chuỗi). Gọi 1 hàm server TRỰC TIẾP trong cùng 1 lượt thực thi (như
   `debugSheetInfo` gọi `listHoSoTiepNhan` để chẩn đoán) vẫn nhận đúng vì không phải mã hoá gì —
   nhưng khi CLIENT THẬT gọi qua `google.script.run` (phải mã hoá dữ liệu để gửi qua khung
   iframe), nếu trong kết quả có lẫn dù chỉ 1 giá trị kiểu `Date`, cả phản hồi có thể bị hỏng và
   client nhận về `null` — im lặng, không có lỗi nào cả. Đã sửa tận gốc: `sheetToObjects_` và
   `updateObjectById_` (2 hàm mọi service đều dùng để đọc/trả dữ liệu) giờ luôn ép mọi giá trị
   `Date` về chuỗi ngay khi đọc từ Sheet, trước khi trả về bất kỳ đâu.

**Cách dùng công cụ chẩn đoán**: tab Thiết lập → mục **🔧 Chẩn đoán** (chỉ Admin thấy) → bấm "2.
Kiểm tra dữ liệu" để xem trực tiếp server đang đọc được bao nhiêu dòng và 5 hồ sơ mới nhất
trong sheet `HoSo`/`CongViec` ngay tại thời điểm đó. Dùng ngay sau khi nộp thử 1 hồ sơ — nếu
server đã "thấy" hồ sơ đó (xuất hiện trong `hoSoLast5`) mà tab Tra cứu/Tiếp nhận vẫn không hiển
thị thì lỗi nằm ở phía giao diện (mã hồ sơ/mã xác nhận gõ sai, hoặc đang đăng nhập sai vai trò);
nếu server cũng KHÔNG thấy thì cần gửi lại kết quả JSON đó để chẩn đoán tiếp.

⚠️ **Sau khi cập nhật code**: deploy lại (Deploy → Manage deployments → sửa deployment hiện có
→ Version: New) rồi **tải lại hẳn trang** (Ctrl+F5, đừng dùng tab trình duyệt đang mở từ trước)
trước khi test lại — mở lại app lần đầu hệ thống sẽ tự tạo trigger gửi mail định kỳ, có thể
Google hỏi lại quyền truy cập (uỷ quyền thêm quyền tạo trigger), bấm **Cho phép**. Sheet mới
`MailQueue` sẽ tự sinh, không cần tạo tay.

## Ghi chú kỹ thuật & giới hạn

- **Xác thực**: hệ thống tự quản lý tài khoản (username/password, mật khẩu băm SHA-256 + salt
  riêng từng người), không dùng đăng nhập Google. Phiên đăng nhập (token) lưu ở `localStorage`
  trình duyệt, hết hạn sau 12 giờ.
- **Đính kèm**: chỉ nhận dưới dạng link (Drive hoặc link ngoài) — không lưu file trực tiếp lên
  server để đơn giản hoá và tránh tốn quota Drive.
- **Khung chat**: cập nhật khi bấm nút "Làm mới" hoặc mở lại công việc (không polling tự động)
  theo đúng lựa chọn khi thiết kế.
- **Điểm số**: mỗi công việc có nền 100 điểm, khi Quản lý "Xác nhận TĐV" có thể chọn mã điểm để
  cộng/trừ ra **Điểm cuối cùng** của công việc đó. Điểm ở tab **Ghi nhận điểm cộng/trừ** là điểm
  **tích luỹ cá nhân riêng** (dùng cho bảng xếp hạng ở Báo cáo hiệu suất), độc lập với điểm của
  từng công việc cụ thể.
- **Email**: dùng `MailApp` của tài khoản deploy script, gửi qua hàng đợi (`MailQueue` + trigger
  mỗi phút, xem mục tối ưu tốc độ ở trên) — Gmail cá nhân giới hạn ~100 email/ngày, tài khoản
  Google Workspace (trường học) thường cao hơn nhiều, đủ dùng cho quy mô 15 người.
- **Nộp hồ sơ / Tra cứu công khai**: `submitHoSo`, `lookupHoSo`, `sendTraCuuMessage`,
  `listDonVi`, `listPhanMuc` không yêu cầu đăng nhập — ai có link web app cũng dùng được 2 tab
  này ngay, không cần tài khoản. Các tab còn lại (Tiếp nhận, Quản lý công việc, Điểm cộng/trừ,
  Báo cáo, Thiết lập) đều bị ẩn khỏi sidebar cho tới khi đăng nhập, và server luôn kiểm tra lại
  quyền (`requireSession_`/`requireMinRole_`) nên không thể bỏ qua bằng cách gọi thẳng API.
- **Xuất báo cáo PDF**: dùng `window.print()` của trình duyệt (chọn "Lưu thành PDF" ở hộp thoại
  in) — CSS đã ẩn sẵn sidebar/topbar/bộ lọc khi in.
- Toàn bộ dữ liệu lưu trong các sheet ẩn dùng làm bảng: `Users, Sessions, HoSo, CongViec,
  ChatLog, DiemCongTru, Settings_DonVi, Settings_PhanMuc, Settings_MaDiem, Counters, MailQueue`.
  Không nên sửa tay các sheet này trực tiếp trừ khi biết rõ cấu trúc cột.

## Cấu trúc file

```
apps-script/
├── appsscript.json         # Manifest
├── Code.gs                 # doGet + include()
├── Utils.gs                # Hàm tiện ích (mã hoá, sinh mã, ngày giờ...)
├── DB.gs                   # Schema, khởi tạo & seed sheet, CRUD chung
├── Auth.gs                 # Đăng nhập / phiên / phân quyền
├── MailService.gs          # Gửi email thông báo
├── HoSoService.gs          # Form hồ sơ, Tiếp nhận, Tra cứu
├── CongViecService.gs      # Quản lý công việc + khung chat
├── DiemService.gs          # Điểm cộng/trừ
├── SettingsService.gs      # Người dùng & danh mục (Thiết lập)
├── ReportService.gs        # Báo cáo hiệu suất
├── Index.html               # Khung SPA
├── CSS.html                 # Giao diện dùng chung
├── JsCommon.html             # Hàm JS dùng chung (api(), toast, modal...)
├── View_Login.html
├── View_Form.html
├── View_TraCuu.html
├── View_TiepNhan.html
├── View_CongViec.html
├── View_Diem.html
├── View_BaoCao.html
└── View_ThietLap.html
```
