# Web app Định biên & Phân công – Khối Mầm non Việt Mỹ (Google Apps Script)

Căn cứ: *Quy định tên lớp học – Định biên nhân sự Khối Mầm non* (HDMN-DBNS-01, hiệu lực 01/06/2026).

## Triển khai (≈10 phút)
1. Tạo một Google Sheet trống (đây là cơ sở dữ liệu) → **Tiện ích mở rộng › Apps Script**.
2. Tạo 3 file trong dự án Apps Script và dán nội dung: `Code.gs`, `Index.html` (đặt tên **Index**, loại HTML), và bật *Hiện tệp kê khai appsscript.json* rồi dán `appsscript.json`.
3. Chọn hàm `setup` → Chạy (cấp quyền). Người chạy lần đầu trở thành **Admin**. (Muốn thử nhanh: chạy `seedDemo`.)
4. **Triển khai › Ứng dụng web**: *Thực thi bằng: Tôi* · *Người có quyền truy cập: Bất kỳ ai trong tổ chức*. Gửi link cho người dùng.
5. Vào web app → **Phân quyền** để thêm người dùng, và **Cấu hình › Cơ sở** để khai báo các cơ sở.

> Chỉ nên chia sẻ Google Sheet cho Admin; mọi người dùng khác thao tác qua web app (quyền được kiểm tra ở phía máy chủ).

## Quy trình sử dụng
| Ai | Làm gì |
|---|---|
| Admin | Khai báo cơ sở, người dùng, ma trận phân quyền |
| Nhân sự (HR) | *Nhân sự › Nhập từ Excel*: dán Mã NV · Họ tên · Cơ sở · Chức danh · Trạng thái |
| Hiệu trưởng/Quản lý cơ sở | Tạo lớp + sĩ số thực học + giữ chỗ; gán **Vai trò định biên** cho từng nhân sự; **Phân lớp** cho GV/Bảo mẫu |
| HR / Chủ tịch HĐHT | *Tổng quan*: ma trận đối chiếu tất cả cơ sở, xuất CSV; *Báo cáo cơ sở*: chi tiết |

## Quy tắc tính (đều chỉnh được trong **Cấu hình**)
- **Định biên cơ sở**: tổng sĩ số = thực học + giữ chỗ → chọn khung (<50, 50–59, 60–70, 71–150, 151–190, >190) → so sánh số nhân sự đang làm theo từng vị trí với định biên (Thiếu / Đạt / Thừa).
- **Định biên lớp**: mỗi nhóm tuổi có tỉ lệ HS:GV và cơ cấu GV + bảo mẫu (Pre-N 4:1, N 5:1 – 2GV+1BM; Pre-K.A 6:1, Pre-K.B 8:1, K 10:1 – 2GV). Sức chứa chuẩn = tỉ lệ × (GV + BM định biên); báo **Vượt tỉ lệ** khi sĩ số > tỉ lệ × số người thực tế.
- **Đề xuất bổ sung** (mục 4 đề án): lớp có sĩ số ≥ sức chứa chuẩn + 2 → hiển thị "Đủ điều kiện đề xuất".
- Nhân sự "Nghỉ việc" không được tính. Cảnh báo: chưa phân vai trò, GV/BM chưa phân lớp, phân vào >1 lớp.

## Điểm cần xác nhận với đề án (bản scan)
1. Khung sĩ số trong bản scan ghi "50–60", "60–70", "71–150" (trùng 60, hở 70). App đặt 50–59, 60–70, 71–150; sửa tại *Cấu hình › Khung sĩ số*.
2. Bảng định biên cơ sở được đọc từ OCR; hãy đối chiếu lại *Cấu hình › Định biên cơ sở* với bản gốc (đặc biệt hàng Trợ lý / Trợ lý kiêm nhiệm).
3. "Tỉ lệ 4:1 – 2 GV + 1 bảo mẫu" được hiểu là tỉ lệ tính trên **tổng số người chăm sóc** trong lớp (Pre-N tối đa 12 trẻ, N 15, Pre-K.A 12, Pre-K.B 16, K 20).
4. "Giáo viên Tiếng Anh VN" được tính ở cấp cơ sở (không gắn lớp).

## Hiệu năng
- Mở app: 1 lệnh gọi `loadAll` lấy toàn bộ dữ liệu; chuyển tab hiển thị tức thì từ bộ nhớ trình duyệt, tự làm mới nền nếu dữ liệu cũ hơn 30 giây (nút **⟳ Làm mới** để tải ngay).
- Máy chủ cache từng sheet (CacheService, 10 phút) và xoá cache khi ghi; đổi vai trò/phân lớp chỉ ghi đúng ô thay đổi.
- **Lưu ý**: nếu sửa trực tiếp trong Google Sheet (không qua web app), dữ liệu có thể chậm tối đa 10 phút mới hiện lên; chạy lại `setup` hoặc chờ hết cache.

## Lịch sử phân công theo kỳ (tab "Lịch sử phân công")
- **Chốt kỳ**: lưu ảnh chụp của cơ sở theo tháng (YYYY-MM): nhân sự, vai trò định biên, lớp phụ trách, sĩ số và kết luận định biên. Chốt lại cùng kỳ sẽ ghi đè (có hỏi xác nhận).
- **Xem lại / so sánh**: mở một kỳ cũ để xem đúng bảng phân công lúc đó; so sánh với *Hiện tại* hoặc kỳ khác để thấy ai đổi vai trò/lớp, ai mới vào, ai không còn. Xuất CSV được.
- **Tự động**: chạy menu *Định biên › 3. Bật tự động chốt kỳ hằng tháng* — 1h sáng ngày 1 hệ thống chốt kỳ của tháng trước (không ghi đè kỳ đã chốt tay).
- Quyền mới trong ma trận phân quyền: *Xem lịch sử phân công*, *Chốt kỳ phân công* (Hiệu trưởng chỉ chốt được cơ sở của mình).
- **Nâng cấp từ bản cũ**: dán lại `Code.gs`, `Index.html`, `appsscript.json`, chạy lại `setup` một lần (tự sửa sheet Nhật ký bị thiếu tiêu đề, thêm 2 quyền mới mà không đổi các tick cũ), rồi triển khai phiên bản mới.

## Gửi & phê duyệt (tab "Phê duyệt")
- Người có quyền *Gửi phê duyệt* tạo hồ sơ: chọn loại (Phân công & định biên / Đề xuất bổ sung nhân sự – tách lớp / Khác), cơ sở, kỳ, tiêu đề, nội dung và **chọn tên người duyệt** từ danh sách người dùng được tick quyền *Được chọn làm người phê duyệt* (xếp thứ tự bằng ↑↓).
- Cách duyệt: **Tuần tự** (lần lượt từng người) hoặc **Đồng thời** (tất cả cùng duyệt). Ai từ chối (bắt buộc ghi lý do) → hồ sơ "Từ chối". Người gửi có thể **thu hồi** khi chưa duyệt xong.
- Hồ sơ tự đính kèm ảnh chụp nhân sự – vai trò – lớp – sĩ số – kết luận định biên **tại thời điểm gửi** (không đổi dù sau đó phân công thay đổi). Duyệt xong → ảnh chụp được ghi vào *Lịch sử phân công* của kỳ.
- Hệ thống gửi email thông báo (người duyệt kế tiếp / kết quả cho người gửi). Email gửi từ tài khoản chủ web app, nếu bị chặn hạn mức thì hồ sơ vẫn hợp lệ. Cần cấp quyền gửi mail khi triển khai lại.
- Ai xem được hồ sơ: người gửi, người trong luồng, và người có quyền *Xem mọi hồ sơ phê duyệt*.

## In & xuất Excel
- Nút **⬇ Excel** (.xlsx nhiều sheet) ở: Tổng quan, Báo cáo cơ sở, Nhân sự (theo bộ lọc đang chọn), Lịch sử (kèm sheet "Thay đổi" khi so sánh), Phiếu phê duyệt.
- Nút **🖨 In** (A4 ngang, ẩn menu/nút): Tổng quan, Báo cáo cơ sở, Lịch sử, Phiếu phê duyệt (có cột ký tên).
- Xuất Excel dùng thư viện SheetJS tải từ cdnjs; nếu mạng chặn, tự chuyển sang CSV.

## Khi sĩ số lớp thay đổi
1. *Lớp học › Sửa* (quyền *Quản lý lớp & sĩ số*): nhập sĩ số thực học và giữ chỗ mới. **Khung "Tác động"** hiện ngay trước khi lưu: tổng sĩ số cơ sở và khung định biên có đổi không, lớp còn đủ GV/bảo mẫu không, có vượt tỉ lệ / đủ điều kiện đề xuất (≥ sức chứa chuẩn + 2) không, vị trí nào đổi từ Đạt sang Thiếu.
2. Sau khi lưu, mọi báo cáo tính lại tức thì; nhật ký ghi "sĩ số cũ → mới".
3. Lớp mới/tách lớp: *+ Thêm lớp* rồi phân GV; lớp đóng: *Xoá*. 
4. Cần xin thêm người: *Phê duyệt › Gửi phê duyệt* (loại "Đề xuất bổ sung…") đính kèm đúng số liệu.
5. Cuối tháng *Chốt kỳ* (hoặc tự động): so sánh hai kỳ có bảng "Sĩ số lớp thay đổi".

## Đăng nhập bằng mã xác nhận (OTP qua email)
- Sau khi Google nhận diện tài khoản, người dùng phải nhập **mã 6 số gửi tới email của chính họ** (hiệu lực 5 phút, dùng 1 lần). Đúng mã → được dùng liên tục *PhienGio* giờ (mặc định 8), tải lại trang vẫn giữ phiên; hết hạn hoặc bấm **Đăng xuất** thì phải nhập lại.
- Bảo mật: mã lưu dạng băm; sai 5 lần → khoá 15 phút; gửi lại cách nhau 60 giây; phiên là token ký HMAC gắn với đúng email (đổi email/sửa token đều bị từ chối); kiểm tra ở **mọi** lệnh gọi phía máy chủ, không chỉ ở giao diện. Tài khoản chưa được cấp quyền không nhận được mã. Đăng nhập/sai mã/gửi mã đều ghi *Nhật ký*.
- Bật/tắt và đổi thời hạn ở *Cấu hình › Tham số*. Tắt khẩn cấp (vd. không gửi được mail): sửa ô `GiaTri` của `XacThucOTP` thành `0` trong sheet `CauHinh_ThamSo`.
- Menu *Định biên › 4. Đăng xuất mọi phiên* đổi khoá ký, buộc mọi người nhập lại mã (dùng khi nghi lộ phiên).
- Lưu ý: mã gửi bằng MailApp (hạn mức ~1.500 mail/ngày với Workspace); thư báo phê duyệt cũng tính vào hạn mức này.

## Email thông báo phê duyệt
- Thư đi từ tài khoản chủ web app (Google không cho giả địa chỉ gửi của người khác khi web app chạy "Thực thi bằng: Tôi"). Hệ thống hiển thị **tên người thao tác** ("Nguyễn A (Định biên MN)"), đặt **Reply-To = email người đó** và ghi rõ người gửi trong nội dung.
- Khi gửi phê duyệt có thể: tắt gửi mail thông báo, hoặc tick **CC cho tôi**.
- Muốn thư đi đúng từ hộp thư từng người phải triển khai "Thực thi bằng: Người dùng truy cập" – khi đó mọi người phải có quyền sửa Google Sheet dữ liệu, làm mất cơ chế phân quyền theo cơ sở, nên không khuyến nghị.
