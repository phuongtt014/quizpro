# Hệ thống Lương VASchools (Google Apps Script)

Số hóa Đề án lương khối Phổ thông (HP.ĐA.01, hiệu lực 01/03/2026) để dùng nhiều năm:
lịch sử ngạch bậc, phiên bản đề án, phân quyền theo phạm vi, nhập dữ liệu nghiêm ngặt.

**Trạng thái:** GĐ1 (nền tảng), GĐ2 (nhân sự), GĐ3 (quy trình duyệt nhiều bậc), GĐ4 (khai báo, quyết toán phụ trội, thu nhập mới) và GĐ5 (trần theo trường, lương hè, mô phỏng, báo cáo/xuất Excel) hoàn tất.

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

## Quy trình duyệt, khai báo, quyết toán

- **Quy trình cấu hình bằng dữ liệu** (*Hệ thống → Quy trình duyệt*): mỗi loại phiếu (Khai báo, Đề xuất ngạch, Quyết toán kỳ, Khác) có các bước
  *Đề xuất/Xét duyệt/Phê duyệt*, mỗi bước gắn một vai trò và phạm vi (cùng trường / cùng chi nhánh / toàn hệ thống).
  Dòng có **Trường để trống = quy trình mặc định**; thêm dòng có mã trường để **ghi đè riêng cho trường đó**.
  Mặc định cài sẵn: Hiệu trưởng (cùng trường) → Nhân sự (toàn hệ thống) → Tổng Giám đốc.
  Phiếu đã gửi giữ nguyên quy trình lúc gửi dù cấu hình đổi sau đó. Bước phải đánh số liên tục 1, 2, 3…
- **Quy tắc:** không tự duyệt phiếu của mình; không nhảy bậc; *Trả lại* và *Duyệt thay* (quản trị) bắt buộc ghi lý do; hỗ trợ **ủy quyền** có thời hạn
  (*Hệ thống → Ủy quyền*). Thông báo trong ứng dụng và email cho người tới lượt duyệt, người tạo phiếu khi được duyệt/trả lại.
- **Khai báo:** nhập số tiết thực dạy/trách nhiệm/định mức theo kỳ → *Gửi duyệt* → khi duyệt xong dòng thành "Đã duyệt". Chỉ dòng đã duyệt mới được tính.
- **Quyết toán:** *Tính toán* (tạm tính, tính lại được) → *Gửi duyệt chốt* → khi duyệt xong thành "Đã chốt", không bị ghi đè.
  Mỗi kết quả lưu kèm mã phiên bản đề án đã dùng. Công thức đúng PRD/đề án (quy đổi tiết, ưu tiên lấp giỏ trách nhiệm, KPI tiết dạy, thâm niên,
  vượt khung, hỗ trợ hạng trường, kiêm nhiệm, trần theo thâm niên, bảo vệ lương).
- **Quy ước tính toán:** dùng đề án hiệu lực **vào ngày cuối kỳ**; ngạch, kiêm nhiệm, thâm niên tại ngày cuối kỳ; thu nhập hiện tại tại ngày đầu kỳ.
  Định mức tự động (24/20 tiết/tuần × số tuần) chỉ áp dụng cho "GV Tiểu học nhiều môn" / "GV còn lại" khi không có dòng Định mức khai báo.
  Chi nhánh mở sau khi đề án ban hành: được **thêm mới** LCB/LTB vào đề án đã ban hành (không sửa/xóa).
- **Hai loại kỳ** (*Thiết lập → Kỳ quyết toán*): **Học kỳ** (HK1/HK2: tính phụ trội từ khai báo) và **Điều chỉnh** (mã `2025-2026-DC1`…: tính thu nhập mới
  tại một **ngày hiệu lực**, dùng khi đổi đề án hoặc đổi ngạch bậc, không cần khai báo; chọn "Kỳ lấy phụ trội" để cộng hỗ trợ dự kiến từ phụ trội của một học kỳ).
- **Thu nhập & phụ trội** (menu): *Tổng hợp toàn công ty* (theo chi nhánh / chi nhánh › trường / trường / đối tượng / ngạch / toàn công ty, có tổng cộng,
  tăng so với hiện tại, % tăng, quỹ năm ước tính, tiền phụ trội, số người giữ lương/bị trần), *Thu nhập từng người* (đủ thông tin nhân sự + từng thành phần),
  *Phụ trội từng người* (nút **Chi tiết** xem từng dòng khai báo quy ra tiết). Có nút **Sao chép bảng (dán vào Excel)**.
- **Mốc "Thu nhập hiện tại" tự cập nhật theo đợt Điều chỉnh:** khi phiếu chốt của một đợt **Điều chỉnh** được duyệt xong, mức chính thức (chỉ lương, **không gồm phụ trội**)
  của từng người trở thành mốc mới, **hiệu lực từ ngày hiệu lực của đợt**, mốc cũ tự kết thúc ngày liền trước. Đợt sau (thường 1 lần/năm) so trần với mốc này.
  Mốc đã có cùng ngày được giữ nguyên (ghi nhật ký). Học kỳ khi chốt **không** tạo mốc. Mọi kỳ lấy mốc theo *kết quả của đợt Điều chỉnh liền kề trước* nên các học kỳ
  cùng năm không cộng dồn trần.
- **Phụ trội và thu nhập:** theo mặc định phụ trội bình quân/tháng (tiền phụ trội ÷ số tháng) **không cộng vào thu nhập tháng** mà chỉ vào cột *Chi phí/tháng* của báo cáo.
  Muốn cộng lại như PRD: đặt tham số đề án `pt_vao_thu_nhap = 1` (Đề án → Tham số khác, ở bản Nháp).
- **Trần theo từng trường:** *Đề án → Trần tăng thu nhập* có cột **Trường** (trống = trần chung). Trường có dòng riêng thì dùng trần riêng của **năm gần nhất không quá năm xét**;
  khoảng thâm niên nào trần riêng không phủ thì lùi về trần chung. Khoảng thâm niên cùng (trường, năm) không được chồng nhau. Với đề án **đã ban hành** vẫn được
  **thêm** trần của năm/trường mới (không sửa/xóa dòng cũ) và dùng nút **Sao chép trần sang năm mới** để chép cả bộ rồi chỉnh. Ghi chú kết quả nêu "trần riêng của trường".
- **Lương hè** (đề án VI.2): tạo kỳ loại **Hè** (mã `2025-2026-HE`, học kỳ `HE`, vd 01/06–31/07). Menu *Khai báo* chọn kỳ hè để nhập **x** (ngày vào trường theo kế hoạch) và
  **y** (ngày không vào trường nhưng sẵn sàng); đăng ký nghỉ: x = y = 0. Gửi duyệt như khai báo thường. *Thu nhập & phụ trội → Tính toán*:
  lương hè = thu nhập ngày × x + 60% × thu nhập ngày × y, thu nhập ngày = thu nhập tháng ÷ 24 (tham số đề án `he_ngay_chia`, `he_ty_le_khong_phan_cong`);
  thu nhập tháng lấy từ "Thu nhập hiện tại" tại ngày bắt đầu kỳ hè. Có tổng hợp theo nhóm, xuất Excel và chốt qua phiếu duyệt (lương hè không tạo mốc thu nhập).
- **Mô phỏng** (*Thu nhập & phụ trội → Mô phỏng*, cho học kỳ/đợt điều chỉnh): nhập đổi LCB %, LTB %, cộng/trừ điểm % vào mọi tỷ lệ trần và/hoặc đổi một tham số đề án,
  hệ thống tính hai lần trong bộ nhớ (hiện hành và kịch bản, kể cả nhân sự đã chốt) rồi so sánh theo nhóm, cả lương và chi phí/tháng. **Không ghi dữ liệu.**
- **Tính thử:** chế độ "Tính thử cả dòng chưa duyệt" cho thấy phụ trội ngay khi mới nhập khai báo; kết quả được gắn nhãn *Gồm dòng chưa duyệt* và **không gửi chốt được**
  cho tới khi tính lại bằng "Chỉ dòng đã duyệt".
- **Điều kiện để có số liệu:** nhân sự cần có ngạch hiệu lực tại ngày cuối kỳ; đề án cần có LCB/LTB cho chi nhánh; muốn có "tăng so với hiện tại" và áp trần cần nhập
  *Nhân sự → Thu nhập hiện tại*. Nhân sự thiếu dữ liệu được liệt kê trong cảnh báo sau khi bấm Tính toán và đếm ở "chưa tính".
- **Chưa có trong GĐ4:** hỗ trợ đặc thù do Giám đốc chi nhánh quyết định; tiết quy đổi theo "buổi" (QD09) phải tự quy ra Tiết/Tuần khi khai báo.

## Cấu trúc mã

| Tệp | Vai trò |
|---|---|
| `Schema.gs` | Khai báo mọi bảng/cột/quyền/tham số. Giao diện, kiểm tra, nhập CSV đều sinh từ đây |
| `Db.gs` | Truy cập Google Sheets (khóa ghi, ghi hàng loạt). Có thể thay bằng CSDL khác |
| `Strict.gs`, `Csv.gs`, `Validate.gs` | Đọc CSV và kiểm tra nghiêm ngặt |
| `Auth.gs`, `Audit.gs`, `Notify.gs` | Xác thực/phân quyền, nhật ký, thông báo |
| `Policy.gs`, `Staff.gs` | Đề án có phiên bản; thâm niên (số năm tròn), ngạch hiện tại |
| `Engine.gs`, `Calc.gs` | Công thức tính (thuần, có kiểm thử) và điều phối tính cho một kỳ |
| `Workflow.gs` | Phiếu, quy trình duyệt nhiều bậc, ủy quyền |
| `Seed.gs`, `Setup.gs` | Dữ liệu đề án 2026 và cài đặt |
| `Api.gs` + `Index/App/Style.html` | Web app |

## Kiểm thử

```bash
npm test                      # 54 kiểm thử logic trên bản giả lập Apps Script
node tests/ui-smoke.js ./ảnh  # chạy giao diện thật trên Chromium (cần playwright)
```

## Điểm đã chốt khi đối chiếu PRD với đề án gốc

Thâm niên tính số năm tròn; có hỗ trợ vượt khung 0,01/năm; hỗ trợ hạng trường áp dụng cho cả Hiệu trưởng và Phó Hiệu trưởng;
số tháng chia hỗ trợ lấy theo cấu hình từng kỳ; quy đổi 1 tiết = 1,5 tiết cho môn đặc thù và đơn vị "buổi" là tham số của đề án;
bảng trần tăng thu nhập có cột *năm áp dụng*. Các điểm này sẽ được bộ tính toán ở GĐ4 sử dụng.
