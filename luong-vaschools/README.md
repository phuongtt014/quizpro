# Hệ thống Lương VASchools (Google Apps Script)

Số hóa Đề án lương khối Phổ thông (HP.ĐA.01, hiệu lực 01/03/2026) để dùng nhiều năm:
lịch sử ngạch bậc, phiên bản đề án, phân quyền theo phạm vi, nhập dữ liệu nghiêm ngặt.

**Trạng thái:** GĐ1 (nền tảng) + GĐ2 (nhân sự) hoàn tất. GĐ3 (quy trình duyệt nhiều bậc), GĐ4 (tính phụ trội/thu nhập mới), GĐ5 (hè, mô phỏng, báo cáo) làm tiếp.

## Cài đặt

1. Tạo dự án Apps Script (script.google.com) bằng tài khoản `@vaschools.edu.vn` của chủ hệ thống.
2. Cách nhanh nhất: làm theo `HUONG_DAN_CAI_DAT.md` (dán 4 tệp trong `dist/`). Tùy chọn dùng `clasp`: sao chép `.clasp.json.example` thành `.clasp.json`, điền `scriptId`, rồi `clasp push`.
   hoặc tạo từng tệp thủ công cùng tên (`.gs` là Script, `.html` là HTML, và `appsscript.json`).
   Nếu tạo thủ công, bật *Project Settings → Show "appsscript.json"* rồi dán nội dung.
3. Chạy hàm **`setupInstall`** (cấp quyền khi được hỏi). Hàm tạo Google Sheet CSDL `LUONG-VASCHOOLS-DB`, các sheet, nạp đề án HP.ĐA.01,
   các vai trò mặc định và đặt bạn làm quản trị. Xem địa chỉ Sheet trong Execution log.
4. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone within `vaschools.edu.vn`*. Mở URL để dùng.
5. Vào **Thiết lập → Cấu hình chung**, điền `app_url` bằng URL web app (để email có liên kết).
6. **Không chia sẻ file Google Sheet CSDL** cho người dùng: họ chỉ vào qua web app (dữ liệu lương nhạy cảm).

Cập nhật mã có thêm bảng/cột: `clasp push`, chạy `setupEnsureSheets` (không xóa dữ liệu), rồi Deploy bản mới.
Thêm quản trị khác: sửa email trong `setupAddAdmin` rồi chạy.

## Nguyên tắc dữ liệu

- **Phiên bản đề án:** mọi tham số (LCB, LTB theo chi nhánh, ngạch, hỗ trợ, quy đổi, trần, tham số) thuộc một phiên bản. Bản *Ban hành* bị khóa;
  muốn thay đổi: **Nhân bản → sửa bản Nháp → Ban hành** (hệ thống tự kết thúc hiệu lực bản trước vào ngày liền trước).
- **Lịch sử:** ngạch bậc, kiêm nhiệm, thu nhập nền có `Hiệu lực từ/đến`; không chồng chéo thời gian. Không xóa bản ghi đang được tham chiếu.
- **Nhập CSV nghiêm ngặt:** dán trực tiếp từ Excel/Google Sheets. Không tự sửa dữ liệu: khoảng trắng thừa, NBSP, ký tự ẩn, dấu tiếng Việt
  không chuẩn NFC, sai mã danh mục, sai định dạng ngày/số, trùng khóa, chồng chéo hiệu lực... đều báo lỗi theo dòng/cột
  (giá trị hiển thị lộ ký tự ẩn: `·` là khoảng trắng) và **không nhập dòng nào**.
- **Định dạng:** ngày `dd/MM/yyyy`; số thập phân `1,1` hoặc `1.1`; tiền `6000000` hoặc `6.000.000`; tỷ lệ `5%` hoặc `0,05`.
- **Phân quyền:** quyền chức năng × phạm vi (Toàn hệ thống / Chi nhánh / Trường / Cá nhân), chỉnh ở *Hệ thống → Ma trận quyền* và *Gán vai trò*.
  Vai trò `ADMIN` luôn đủ quyền; không thể gỡ quản trị viên cuối cùng.
- **Thông báo:** trong ứng dụng (🔔) và email (bật/tắt bằng cấu hình `email_bat`). Lỗi gửi email được ghi nhật ký, không chặn thao tác.
- **Nhật ký:** mọi thay đổi được ghi (người, thời điểm, trước/sau).

## Cấu trúc mã

| Tệp | Vai trò |
|---|---|
| `Schema.gs` | Khai báo mọi bảng/cột/quyền/tham số. Giao diện, kiểm tra, nhập CSV đều sinh từ đây |
| `Db.gs` | Truy cập Google Sheets (khóa ghi, ghi hàng loạt). Có thể thay bằng CSDL khác |
| `Strict.gs`, `Csv.gs`, `Validate.gs` | Đọc CSV và kiểm tra nghiêm ngặt |
| `Auth.gs`, `Audit.gs`, `Notify.gs` | Xác thực/phân quyền, nhật ký, thông báo |
| `Policy.gs`, `Staff.gs` | Đề án có phiên bản; thâm niên (số năm tròn), ngạch hiện tại |
| `Seed.gs`, `Setup.gs` | Dữ liệu đề án 2026 và cài đặt |
| `Api.gs` + `Index/App/Style.html` | Web app |

## Kiểm thử

```bash
npm test                      # 20 kiểm thử logic trên bản giả lập Apps Script
node tests/ui-smoke.js ./ảnh  # chạy giao diện thật trên Chromium (cần playwright)
```

## Điểm đã chốt khi đối chiếu PRD với đề án gốc

Thâm niên tính số năm tròn; có hỗ trợ vượt khung 0,01/năm; hỗ trợ hạng trường áp dụng cho cả Hiệu trưởng và Phó Hiệu trưởng;
số tháng chia hỗ trợ lấy theo cấu hình từng kỳ; quy đổi 1 tiết = 1,5 tiết cho môn đặc thù và đơn vị "buổi" là tham số của đề án;
bảng trần tăng thu nhập có cột *năm áp dụng*. Các điểm này sẽ được bộ tính toán ở GĐ4 sử dụng.
