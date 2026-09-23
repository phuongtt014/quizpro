# WEB APP QUẢN LÝ & TÍNH BHXH – HƯỚNG DẪN CÀI ĐẶT VÀ SỬ DỤNG

Web app chạy bằng **Google Apps Script**. Dữ liệu được lưu ngay trong Google Sheet gắn với script.
Mỗi công ty dùng **một file Google Sheet riêng**.

## 1. Các file trong bộ cài

| File | Tạo trong Apps Script dưới dạng | Nội dung |
|---|---|---|
| `Code.gs` | Tệp **Script** (tên `Code`) | Toàn bộ xử lý phía máy chủ: đọc/ghi Sheet, tính BHXH, báo cáo, phân quyền |
| `Index.html` | Tệp **HTML** (tên `Index`) | Khung trang web |
| `Styles.html` | Tệp **HTML** (tên `Styles`) | Giao diện (CSS) |
| `App.html` | Tệp **HTML** (tên `App`) | Xử lý trên trình duyệt (JavaScript) |
| `appsscript.json` | File cấu hình (manifest) | Múi giờ Việt Nam, V8 runtime |

## 2. Cài đặt (làm một lần cho mỗi công ty)

1. Tạo một **Google Sheet mới**, đặt tên, ví dụ `BHXH – Công ty ABC`.
2. Vào menu **Tiện ích mở rộng → Apps Script**.
3. Trong trình soạn thảo Apps Script:
   - Mở file `Code.gs` có sẵn, xóa hết nội dung, rồi dán nội dung file **Code.gs**.
   - Bấm **＋ → HTML**, đặt tên **`Index`** (không gõ đuôi .html), dán nội dung **Index.html**.
   - Làm tương tự cho **`Styles`** và **`App`**.
   - Vào **⚙ Cài đặt dự án**, tick **"Hiển thị tệp kê khai appsscript.json trong trình chỉnh sửa"**. Quay lại **Trình chỉnh sửa**, mở `appsscript.json` và dán nội dung file **appsscript.json** (file này có khai báo dịch vụ **Drive API** – cần để đọc file Excel khi nhập danh sách nhân viên).
   - Bấm **💾 Lưu**.
   - Kiểm tra: ở thanh bên trái có mục **Dịch vụ** (Services) — nếu chưa thấy **Drive API** trong danh sách, bấm dấu **+**, chọn **Drive API**, phiên bản **v3**, bấm **Thêm**.
4. Quay lại Google Sheet và **tải lại trang (F5)**. Menu **BHXH** sẽ xuất hiện.
5. Bấm **BHXH → 1. Khởi tạo / cập nhật cấu trúc**, rồi cấp quyền khi Google hỏi (Nâng cao → Đi tới…).
   App sẽ tự tạo các tab sau:

   | Tab | Vai trò |
   |---|---|
   | Thông tin chung | Mã/Tên công ty, MST, địa chỉ, vùng, **mức lương tối thiểu vùng**, lương cơ sở |
   | Phòng ban | Danh mục Đơn vị_Phòng ban (dùng cho dropdown) |
   | Khoản trích đóng | Các khoản, tỉ lệ, mức trần, ngày hiệu lực (lưu lịch sử nhiều dòng) |
   | Mã phân loại | Mỗi mã gồm những khoản nào, có thể đặt tỉ lệ riêng |
   | Danh sách nhân viên | **Hồ sơ gốc**, luôn là thông tin mới nhất |
   | Kỳ BHXH | Danh sách kỳ và trạng thái (Đang mở / Đã chốt) |
   | Dữ liệu kỳ | Bản sao DS nhân viên + lương của từng tháng |
   | Kết quả tính | Kết quả tính từng NV, từng khoản, từng kỳ |
   | Truy thu - Thoái thu | Các khoản điều chỉnh cho tháng cũ |
   | Phân quyền | Email và vai trò người dùng |
   | Nhật ký | Lịch sử thao tác |
   | Tỉ lệ Công đoàn | Tỉ lệ giữ lại Công đoàn cơ sở theo thời điểm (lưu lịch sử nhiều dòng) |

   > ⚠️ Các khoản trích, mã phân loại và mức lương trong phần khởi tạo **chỉ là số liệu mẫu**. Hãy **kiểm tra lại theo quy định hiện hành** trước khi dùng.

6. **Triển khai web app**: trong Apps Script bấm **Triển khai → Tùy chọn triển khai mới**, chọn loại **Ứng dụng web**:
   - **Thực thi dưới dạng:** *Tôi* (tài khoản của bạn)
   - **Ai có quyền truy cập:** *Bất kỳ ai trong <tên miền tổ chức>* (ví dụ vaschools.edu.vn)
   - Bấm **Triển khai** và sao chép **URL ứng dụng web**. Có thể xem lại link qua menu **BHXH → Mở web app**.

   > Với cách triển khai này, người dùng **không cần** quyền mở Google Sheet. Họ chỉ truy cập qua web app, và app phân quyền theo email đăng nhập. **Không nên chia sẻ file Sheet** cho người dùng Nhập liệu/Xem, vì như vậy họ có thể xem toàn bộ dữ liệu trực tiếp trong Sheet.

7. Mở web app, vào **Thiết lập → Phân quyền** để thêm người dùng.

### Khi cập nhật code sau này
Dán code mới vào, rồi vào **Triển khai → Quản lý các bản triển khai → ✏ Chỉnh sửa → Phiên bản: Phiên bản mới → Triển khai**. Link web app giữ nguyên.

### Nhiều công ty
Với file Sheet đã cài xong, vào **Tệp → Tạo bản sao**. Script được sao chép theo. Trong bản sao, xóa dữ liệu cũ nếu cần, rồi **triển khai web app riêng** (bước 6). Mỗi công ty sẽ có một link riêng.

## 3. Phân quyền

| Vai trò | Được làm |
|---|---|
| **Admin** | Toàn quyền: thiết lập (thông tin chung, phòng ban, khoản trích, mã phân loại, phân quyền), tạo kỳ, tính, **chốt kỳ**, xóa NV, xem nhật ký |
| **Nhập liệu** | Thêm/sửa hồ sơ NV có **Email NV quản lý hồ sơ = email của mình** (NV mới tự gán email của người tạo), nhập truy thu, bấm Tính kỳ. Chỉ thấy NV mình quản lý, kể cả trong báo cáo |
| **Xem** | Xem toàn bộ nhân viên và báo cáo, xuất Excel/PDF (dành cho Kế toán, Ban Giám đốc) |

Admin có thể đổi *Email NV quản lý hồ sơ* của bất kỳ NV nào để chuyển giao hồ sơ.

## 4. Quy trình hằng tháng

1. **Lần đầu:** nhập nhân viên vào **Nhân viên → Hồ sơ gốc** trên web app, hoặc dán trực tiếp vào tab *Danh sách nhân viên* trên Sheet.
   - Nếu dán trực tiếp, chạy thêm menu **BHXH → 2. Tính lại cột "Lương đóng BHXH"**.
   - Ngày nhập dạng `dd/mm/yyyy`. *Tháng dừng đóng* nhập dạng `mm/yyyy`.
2. **Admin tạo kỳ** (màn hình *Kỳ BHXH*):
   - Kỳ đầu tiên lấy dữ liệu từ hồ sơ gốc.
   - Các kỳ sau **sao chép toàn bộ NV + lương của kỳ trước**, bỏ những NV đã có *Tháng dừng đóng* ≤ kỳ mới, và bổ sung NV có trong hồ sơ gốc nhưng chưa có trong kỳ trước.
3. **Cập nhật biến động** ở màn hình *Nhân viên* (chọn kỳ đang mở). Sửa trực tiếp:
   - NV mới: bấm *Thêm nhân viên*.
   - NV nghỉ việc: nhập *Ngày nghỉ việc* và **Tháng dừng đóng**, là tháng đầu tiên **không** đóng. Ví dụ nghỉ ngày 20/09, không đóng tháng 9 thì nhập 09/2026; vẫn đóng tháng 9 thì nhập 10/2026.
   - Điều chỉnh lương, phụ cấp, mã phân loại, tham gia công đoàn.
   - Sửa ở kỳ mới nhất thì hồ sơ gốc cũng được cập nhật theo.
4. **Truy thu / thoái thu** cho các tháng đã qua: nhập NV, từ tháng – đến tháng, lương cũ, lương mới. Để truy đóng tháng chưa đóng, nhập lương cũ = 0.
5. Bấm **Tính**. Kiểm tra *Báo cáo → Bảng tính chi tiết* (cột Cảnh báo) và *Biến động tăng/giảm*.
6. **Admin chốt kỳ**: app tính lại lần cuối rồi khóa kỳ. Kỳ đã chốt không sửa được nữa. Phát sinh cho tháng đó phải nhập truy thu ở kỳ sau.
7. **Xuất Excel/PDF** ở màn hình *Báo cáo*.

## 5. Quy tắc tính

- **Lương đóng BHXH** = Mức lương chính + PC Kiêm nhiệm + PC Chức vụ + PC Độc hại + PC Khác.
- **NV đóng trong kỳ T** khi: tháng của *Ngày bắt đầu BHXH* ≤ T, **và** *Tháng dừng đóng* trống hoặc > T, **và** có mã phân loại đang áp dụng. App tính theo tháng, không xét số ngày làm việc.
- **Phiên bản khoản trích:** với mỗi *Mã nhận diện*, app dùng dòng có *Ngày hiệu lực* gần nhất nhưng ≤ ngày cuối tháng T. Nếu dòng đó có trạng thái *Ngừng áp dụng* thì khoản không được tính. Khi thay đổi tỉ lệ, **thêm dòng mới** (nút *Phiên bản mới*) thay vì sửa dòng cũ, để các kỳ cũ và truy thu vẫn tính đúng.
- **Tỉ lệ:** dùng tỉ lệ riêng khai trong mã phân loại (nếu có), không có thì dùng tỉ lệ mặc định. Nhập 8 nghĩa là 8%.
- **Mức trần:**
  - *Mức lương đóng tối đa*: tiền = min(Lương đóng, Mức tối đa) × Tỉ lệ.
  - *Mức đóng tối đa*: tiền = min(Lương đóng × Tỉ lệ, Mức tối đa).
  - *Không áp dụng*: tiền = Lương đóng × Tỉ lệ.
- **Công đoàn:** khoản có *Chỉ áp dụng đoàn viên công đoàn = Có* (ví dụ đoàn phí) chỉ tính cho NV có *Tham gia công đoàn = Có*. Kinh phí công đoàn (DN) tính cho tất cả NV thuộc mã phân loại có khoản đó.
- **Làm tròn:** từng khoản của từng NV làm tròn đến 1 đồng. Tổng bằng cộng các số đã làm tròn.
- **Lương tối thiểu vùng:** NV có lương đóng thấp hơn mức ở *Thông tin chung* sẽ bị **cảnh báo**. App không tự sửa số.
- **Truy thu/thoái thu** = Σ các tháng [tiền theo lương mới − tiền theo lương cũ], dùng tỉ lệ và mức trần của **chính tháng đó**. Số âm là thoái thu.

## 6. Nhập / xuất Excel, CSV ở tab Nhân viên

Màn hình **Nhân viên** có 4 nút:

| Nút | Chức năng |
|---|---|
| ⬇ File mẫu (Excel/CSV) | Tải file trống có sẵn tiêu đề cột đúng chuẩn và 2 dòng ví dụ, để điền dữ liệu rồi nhập lại |
| ⬇ Xuất Excel/CSV | Xuất danh sách đang xem (hồ sơ gốc hoặc một kỳ, trong phạm vi bạn được quản lý) ra file |
| ⬆ Nhập từ file | Mở hộp nhập, có 2 tab: **"Dán trực tiếp"** và **"Chọn file"** |

**Dán trực tiếp** (không cần lưu file): mở file mẫu hoặc bảng tính đang có, chọn và **sao chép (Ctrl+C)** vùng dữ liệu kể cả dòng tiêu đề, rồi **dán (Ctrl+V)** vào ô văn bản trong hộp nhập. Ứng dụng tự nhận diện dấu phân cách (tab khi dán từ Excel/Google Sheet, hoặc dấu phẩy/chấm phẩy nếu dán văn bản CSV).

**Chọn file:** tải lên file .csv/.xlsx/.xls đã điền.

**Quy tắc dữ liệu:** dòng tiêu đề phải có ít nhất 2 cột **"Mã NV"** và **"Họ và tên"**, đặt tên giống file mẫu (có thể thêm/bớt cột khác, thứ tự cột tùy ý). Ngày dạng `dd/mm/yyyy`, tháng dạng `mm/yyyy`.

**Ba cách nhập:**
- **Thêm mới / cập nhật:** dòng có Mã NV chưa có thì thêm nhân viên mới; Mã NV đã có thì cập nhật **toàn bộ** thông tin (cột không có trong file bị coi là rỗng). Dòng nào lỗi sẽ bị **bỏ qua** và báo cụ thể, các dòng còn lại vẫn được nhập.
- **Chỉ cập nhật các cột có trong dữ liệu:** dùng khi bạn chỉ muốn bổ sung hoặc sửa một vài trường (ví dụ chỉ có 2 cột "Mã NV" và "Email NV quản lý hồ sơ") mà **không đổi các cột khác**. Không tạo nhân viên mới – Mã NV phải đã tồn tại. Tick thêm **"Chỉ điền vào ô còn trống"** nếu chỉ muốn bổ sung dữ liệu đang thiếu, không ghi đè lên dữ liệu đã có.
- **Thay thế hoàn toàn:** xóa toàn bộ danh sách đang xem (trong phạm vi bạn quản lý) và thay bằng đúng nội dung file. Nếu file có **bất kỳ dòng lỗi nào**, ứng dụng sẽ **không thay đổi gì** để tránh mất dữ liệu — sửa lỗi rồi nhập lại.

Người **Nhập liệu** chỉ nhập/xuất được hồ sơ mình quản lý (theo *Email NV quản lý hồ sơ*); nhân viên mới do họ nhập sẽ tự gán email của họ. **Admin** không bị giới hạn này. Không nhập được vào kỳ đã chốt.

**Nếu nhập file Excel (.xlsx) báo lỗi:** vào Apps Script, mục **Dịch vụ** (thanh bên trái) → bấm **+** → thêm **Drive API** (phiên bản v3) → Lưu. Hoặc lưu file dưới dạng **CSV** rồi nhập lại — CSV luôn hoạt động mà không cần bước này.

**Các trường số tiền** (Mức lương chính, PC…, Mức tối đa, Lương đóng cũ/mới ở Truy thu) hiển thị có phân tách hàng ngàn khi nhập trên web app (gõ số, ứng dụng tự thêm dấu chấm).

## 7. Phân tách quỹ Công đoàn theo kỳ

1. Vào **Thiết lập → Khoản trích đóng**, sửa khoản **Đoàn phí công đoàn (NLĐ)** và **Kinh phí công đoàn (DN)** (hoặc khoản tương đương do bạn đặt), chọn **"Thuộc quỹ Công đoàn" = Có**. Đây là dấu hiệu để ứng dụng biết khoản nào tính vào quỹ Công đoàn – không phụ thuộc tên/mã khoản.
2. Vào **Thiết lập → Tỉ lệ Công đoàn**, thêm **hai** tỉ lệ giữ lại riêng: một cho **Đoàn phí công đoàn (NLĐ)**, một cho **Kinh phí công đoàn (DN)**, cùng **Ngày hiệu lực**. Tỉ lệ nộp Công đoàn Việt Nam của mỗi bên tự tính = 100% − tỉ lệ giữ lại tương ứng.
   - Giống tab Khoản trích đóng: mỗi khi tỉ lệ thay đổi, bấm **"＋ Thêm phiên bản"** để thêm dòng mới với ngày hiệu lực mới, **không sửa dòng cũ**. Mỗi kỳ tự dùng đúng tỉ lệ có hiệu lực tại tháng đó (dòng có ngày hiệu lực gần nhất nhưng ≤ cuối tháng), nên kỳ cũ luôn giữ đúng tỉ lệ tại thời điểm đó dù sau này tỉ lệ có đổi.
3. Vào **Báo cáo → Công đoàn**, chọn năm để xem 3 bảng: **Đoàn phí NLĐ** (thu, tỉ lệ giữ lại, giữ lại cơ sở, nộp Công đoàn VN), **Kinh phí công đoàn DN** (tương tự), và **Tổng hợp cả 2 nguồn**. Có thể xuất Excel/PDF (file gồm đầy đủ số liệu tách riêng NLĐ/DN).

## 8. Lưu ý

- **Sửa tay trên Google Sheet:** Nhân viên, Kỳ BHXH, Truy thu, và mọi tính toán/báo cáo luôn đọc dữ liệu **mới nhất** từ Sheet mỗi lần bạn mở màn hình đó hoặc bấm Tính — sửa tay xong là có tác dụng ngay. Riêng 5 danh mục **Khoản trích đóng, Mã phân loại, Tỉ lệ Công đoàn, Phòng ban, Thông tin chung** chỉ được tải **một lần lúc mở trang** để dùng cho dropdown; sửa tay trên Sheet sẽ không hiện ngay trên các màn hình đó. Bấm nút **"🔄 Làm mới dữ liệu"** ở góc trên (hoặc tải lại trang F5) để nạp lại.
- Không đổi tên các tab và tiêu đề cột. Có thể thêm cột riêng ở cuối, app sẽ bỏ qua các cột đó.
- Tab *Kết quả tính* do app ghi lại mỗi lần bấm Tính. Không sửa tay tab này.
- Muốn mở lại một kỳ đã chốt trong trường hợp khẩn cấp: Admin sửa ô *Trạng thái* của kỳ đó trong tab **Kỳ BHXH** trên Sheet thành *Đang mở*, sau đó ghi chú lý do.
- Nếu web app báo *"Không xác định được email đăng nhập"*: kiểm tra lại bước triển khai (Thực thi dưới dạng *Tôi*, truy cập *trong tổ chức*) và đăng nhập đúng tài khoản của tổ chức.
- Với quy mô 200 – 1.000 NV, một lần tính mất khoảng vài giây đến vài chục giây. Mỗi năm sinh ra khoảng 12.000 dòng *Dữ liệu kỳ* và 12.000 dòng *Kết quả tính*, vẫn nằm trong giới hạn của Google Sheet (10 triệu ô). Sau nhiều năm có thể tạo file mới cho năm mới, bằng cách sao chép file và xóa dữ liệu kỳ cũ.
