/**
 * MailService.gs — Gửi email thông báo. Mọi lỗi gửi mail được nuốt (log lại)
 * để không làm hỏng luồng nghiệp vụ chính (vd. hết quota MailApp).
 */

function sendMail_(to, subject, htmlBody) {
  if (!to) return;
  try {
    MailApp.sendEmail({ to: to, subject: '[Quản lý công việc] ' + subject, htmlBody: htmlBody });
  } catch (e) {
    console.error('sendMail_ lỗi: ' + e);
  }
}

function mailHoSoTaoMoi_(hoSo) {
  var body = 'Xin chào ' + hoSo.HoTenNguoiGui + ',<br><br>' +
    'Hồ sơ của bạn đã được tiếp nhận vào hệ thống với thông tin:<br>' +
    '<b>Mã hồ sơ:</b> ' + hoSo.MaHoSo + '<br>' +
    '<b>Mã xác nhận:</b> ' + hoSo.MaXacNhan + '<br>' +
    '<b>Tiêu đề:</b> ' + hoSo.TieuDe + '<br><br>' +
    'Vui lòng lưu lại 2 mã trên để tra cứu tiến độ xử lý ở tab <b>Tra cứu</b> của hệ thống.<br><br>Trân trọng.';
  sendMail_(hoSo.EmailNguoiGui, 'Tiếp nhận hồ sơ ' + hoSo.MaHoSo, body);
}

function mailHoSoPhanCong_(hoSo, congViec) {
  var body = 'Xin chào ' + hoSo.HoTenNguoiGui + ',<br><br>' +
    'Hồ sơ <b>' + hoSo.MaHoSo + '</b> (' + hoSo.TieuDe + ') đã được phân công xử lý.<br>' +
    '<b>Người phụ trách:</b> ' + congViec.NguoiPhuTrach + '<br>' +
    '<b>Thời hạn xử lý:</b> ' + congViec.ThoiHan + '<br><br>' +
    'Bạn có thể tra cứu tiến độ bằng mã hồ sơ + mã xác nhận ở tab Tra cứu.<br><br>Trân trọng.';
  sendMail_(hoSo.EmailNguoiGui, 'Hồ sơ ' + hoSo.MaHoSo + ' đã được phân công', body);
}

function mailHoSoTuChoi_(hoSo) {
  var body = 'Xin chào ' + hoSo.HoTenNguoiGui + ',<br><br>' +
    'Rất tiếc, hồ sơ <b>' + hoSo.MaHoSo + '</b> (' + hoSo.TieuDe + ') đã bị từ chối tiếp nhận.<br>' +
    '<b>Lý do:</b> ' + hoSo.LyDoTuChoi + '<br><br>Trân trọng.';
  sendMail_(hoSo.EmailNguoiGui, 'Hồ sơ ' + hoSo.MaHoSo + ' bị từ chối', body);
}

function mailCongViecDaNop_(hoSo, congViec) {
  if (!hoSo) return;
  var body = 'Xin chào ' + hoSo.HoTenNguoiGui + ',<br><br>' +
    'Hồ sơ <b>' + hoSo.MaHoSo + '</b> (' + hoSo.TieuDe + ') đã được xử lý xong.<br>' +
    '<b>Link kết quả:</b> ' + congViec.LinkKetQua + '<br><br>' +
    'Bạn có thể xem chi tiết tại tab Tra cứu.<br><br>Trân trọng.';
  sendMail_(hoSo.EmailNguoiGui, 'Hồ sơ ' + hoSo.MaHoSo + ' đã có kết quả', body);
}

function mailNguoiPhuTrachTinNhanTraCuu_(userEmail, maCV, tenNguoiGui, noiDung) {
  var body = 'Bạn có tin nhắn mới từ người đề xuất (' + tenNguoiGui + ') liên quan công việc <b>' + maCV + '</b>:<br><br>' +
    '<i>' + noiDung + '</i><br><br>Vui lòng mở tab Quản lý công việc để phản hồi.';
  sendMail_(userEmail, 'Tin nhắn mới cho công việc ' + maCV, body);
}
