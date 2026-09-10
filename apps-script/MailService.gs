/**
 * MailService.gs — Gửi email thông báo qua HÀNG ĐỢI để không làm chậm phản hồi cho người dùng.
 *
 * queueMail_() chỉ ghi 1 dòng vào sheet MailQueue (rất nhanh) rồi trả về ngay; một trigger chạy
 * mỗi phút (processMailQueue_) mới thực sự gọi MailApp để gửi. Trước đây gọi MailApp.sendEmail
 * ngay trong lúc xử lý request là nguyên nhân chính khiến "Tạo công việc", "Phân công hồ sơ"...
 * bị chậm (MailApp có thể mất 1-3 giây mỗi lần gọi).
 */

function queueMail_(to, subject, htmlBody) {
  if (!to) return;
  appendObject_(getSheet_(SHEETS.MAILQUEUE), SCHEMA[SHEETS.MAILQUEUE], {
    Id: genCode_('MQ', 6), ToEmail: to, Subject: '[Quản lý công việc] ' + subject, Body: htmlBody,
    TrangThai: 'ChoGui', NgayTao: nowStr_(), NgayGui: ''
  });
}

/** Chạy định kỳ (trigger mỗi phút) — gửi thật các email đang chờ trong hàng đợi. */
function processMailQueue_() {
  var sh = getSheet_(SHEETS.MAILQUEUE);
  var rows = sheetToObjects_(sh);
  var pending = rows.filter(function (r) { return r.TrangThai === 'ChoGui'; });
  if (!pending.length) return;
  // Giới hạn mỗi lần chạy để không vượt quá thời gian thực thi cho phép của Apps Script.
  pending.slice(0, 25).forEach(function (r) {
    try {
      MailApp.sendEmail({ to: r.ToEmail, subject: r.Subject, htmlBody: r.Body });
      updateObjectById_(sh, SCHEMA[SHEETS.MAILQUEUE], 'Id', r.Id, { TrangThai: 'DaGui', NgayGui: nowStr_() });
    } catch (e) {
      updateObjectById_(sh, SCHEMA[SHEETS.MAILQUEUE], 'Id', r.Id, { TrangThai: 'Loi', NgayGui: nowStr_() });
      console.error('processMailQueue_ lỗi gửi mail tới ' + r.ToEmail + ': ' + e);
    }
  });
}

/** Đảm bảo có đúng 1 trigger định kỳ xử lý hàng đợi mail (tự tạo nếu chưa có, idempotent). */
function ensureMailTrigger_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('mailTriggerReady') === '1') return;
  var already = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'processMailQueue_'; });
  if (!already) {
    ScriptApp.newTrigger('processMailQueue_').timeBased().everyMinutes(1).create();
  }
  props.setProperty('mailTriggerReady', '1');
}

function mailHoSoTaoMoi_(hoSo) {
  var body = 'Xin chào ' + hoSo.HoTenNguoiGui + ',<br><br>' +
    'Hồ sơ của bạn đã được tiếp nhận vào hệ thống với thông tin:<br>' +
    '<b>Mã hồ sơ:</b> ' + hoSo.MaHoSo + '<br>' +
    '<b>Mã xác nhận:</b> ' + hoSo.MaXacNhan + '<br>' +
    '<b>Tiêu đề:</b> ' + hoSo.TieuDe + '<br><br>' +
    'Vui lòng lưu lại 2 mã trên để tra cứu tiến độ xử lý ở tab <b>Tra cứu</b> của hệ thống.<br><br>Trân trọng.';
  queueMail_(hoSo.EmailNguoiGui, 'Tiếp nhận hồ sơ ' + hoSo.MaHoSo, body);
}

function mailHoSoPhanCong_(hoSo, congViec) {
  var body = 'Xin chào ' + hoSo.HoTenNguoiGui + ',<br><br>' +
    'Hồ sơ <b>' + hoSo.MaHoSo + '</b> (' + hoSo.TieuDe + ') đã được phân công xử lý.<br>' +
    '<b>Người phụ trách:</b> ' + congViec.NguoiPhuTrach + '<br>' +
    '<b>Thời hạn xử lý:</b> ' + congViec.ThoiHan + '<br><br>' +
    'Bạn có thể tra cứu tiến độ bằng mã hồ sơ + mã xác nhận ở tab Tra cứu.<br><br>Trân trọng.';
  queueMail_(hoSo.EmailNguoiGui, 'Hồ sơ ' + hoSo.MaHoSo + ' đã được phân công', body);
}

function mailHoSoTuChoi_(hoSo) {
  var body = 'Xin chào ' + hoSo.HoTenNguoiGui + ',<br><br>' +
    'Rất tiếc, hồ sơ <b>' + hoSo.MaHoSo + '</b> (' + hoSo.TieuDe + ') đã bị từ chối tiếp nhận.<br>' +
    '<b>Lý do:</b> ' + hoSo.LyDoTuChoi + '<br><br>Trân trọng.';
  queueMail_(hoSo.EmailNguoiGui, 'Hồ sơ ' + hoSo.MaHoSo + ' bị từ chối', body);
}

function mailCongViecDaNop_(hoSo, congViec) {
  if (!hoSo) return;
  var body = 'Xin chào ' + hoSo.HoTenNguoiGui + ',<br><br>' +
    'Hồ sơ <b>' + hoSo.MaHoSo + '</b> (' + hoSo.TieuDe + ') đã được xử lý xong.<br>' +
    '<b>Link kết quả:</b> ' + congViec.LinkKetQua + '<br><br>' +
    'Bạn có thể xem chi tiết tại tab Tra cứu.<br><br>Trân trọng.';
  queueMail_(hoSo.EmailNguoiGui, 'Hồ sơ ' + hoSo.MaHoSo + ' đã có kết quả', body);
}

function mailNguoiPhuTrachTinNhanTraCuu_(userEmail, maCV, tenNguoiGui, noiDung) {
  var body = 'Bạn có tin nhắn mới từ người đề xuất (' + tenNguoiGui + ') liên quan công việc <b>' + maCV + '</b>:<br><br>' +
    '<i>' + noiDung + '</i><br><br>Vui lòng mở tab Quản lý công việc để phản hồi.';
  queueMail_(userEmail, 'Tin nhắn mới cho công việc ' + maCV, body);
}
