/**
 * MailService.gs
 * Gửi email thông báo cho người gửi hồ sơ ở các mốc quan trọng.
 */

function getWebAppUrl_() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (e) {
    return '';
  }
}

function sendMailSafe_(to, subject, htmlBody) {
  if (!to || !isValidEmail_(to)) return;
  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (e) {
    Logger.log('Lỗi gửi email tới ' + to + ': ' + e.message);
  }
}

function mailWrap_(title, bodyHtml, maHoSo, maXacNhan) {
  var url = getWebAppUrl_();
  var lookupHint = (maHoSo && maXacNhan)
    ? '<p style="margin-top:16px;color:#5c5c57;font-size:13px">Mã hồ sơ: <b>' + maHoSo + '</b> &nbsp;|&nbsp; Mã xác nhận: <b>' + maXacNhan + '</b><br>Dùng 2 mã này để tra cứu tiến độ' + (url ? ' tại <a href="' + url + '">hệ thống</a>.' : '.') + '</p>'
    : '';
  return '<div style="font-family:Arial,sans-serif;max-width:560px">' +
    '<h2 style="color:#534AB7;margin-bottom:8px">' + title + '</h2>' +
    bodyHtml +
    lookupHint +
    '<p style="margin-top:24px;color:#8a8a84;font-size:12px">Email tự động từ Hệ thống Quản lý công việc nhóm - vui lòng không trả lời email này.</p>' +
    '</div>';
}

function mailHoSoDaTiepNhan_(hoSo) {
  var body = '<p>Xin chào <b>' + hoSo.HoTen + '</b>,</p>' +
    '<p>Hồ sơ của bạn đã được ghi nhận vào hệ thống với thông tin:</p>' +
    '<ul><li>Tiêu đề: ' + hoSo.TieuDe + '</li><li>Phân mục: ' + hoSo.PhanMuc + '</li></ul>' +
    '<p>Hồ sơ sẽ được bộ phận tiếp nhận xem xét và phân công xử lý trong thời gian sớm nhất.</p>';
  sendMailSafe_(hoSo.Email, '[Đã tiếp nhận] Hồ sơ ' + hoSo.MaHoSo, mailWrap_('Đã tiếp nhận hồ sơ', body, hoSo.MaHoSo, hoSo.MaXacNhan));
}

function mailHoSoDaPhanCong_(hoSo) {
  var body = '<p>Xin chào <b>' + hoSo.HoTen + '</b>,</p>' +
    '<p>Hồ sơ <b>' + hoSo.MaHoSo + '</b> của bạn đã được phân công xử lý.</p>' +
    (hoSo.ThoiHan ? '<p>Thời hạn xử lý dự kiến: <b>' + hoSo.ThoiHan + '</b></p>' : '');
  sendMailSafe_(hoSo.Email, '[Đã phân công] Hồ sơ ' + hoSo.MaHoSo, mailWrap_('Hồ sơ đã được phân công', body, hoSo.MaHoSo, hoSo.MaXacNhan));
}

function mailHoSoTuChoi_(hoSo) {
  var body = '<p>Xin chào <b>' + hoSo.HoTen + '</b>,</p>' +
    '<p>Rất tiếc, hồ sơ <b>' + hoSo.MaHoSo + '</b> của bạn đã bị từ chối xử lý.</p>' +
    '<p>Lý do: ' + (hoSo.LyDoTuChoi || '(không có)') + '</p>';
  sendMailSafe_(hoSo.Email, '[Từ chối] Hồ sơ ' + hoSo.MaHoSo, mailWrap_('Hồ sơ bị từ chối', body, hoSo.MaHoSo, hoSo.MaXacNhan));
}

function mailHoSoHoanThanh_(hoSo) {
  var body = '<p>Xin chào <b>' + hoSo.HoTen + '</b>,</p>' +
    '<p>Hồ sơ <b>' + hoSo.MaHoSo + '</b> của bạn đã được xử lý xong.</p>' +
    (hoSo.LinkKetQua ? '<p>Link kết quả:<br>' + parseLinks_(hoSo.LinkKetQua).map(function (l) { return '<a href="' + l + '">' + l + '</a>'; }).join('<br>') + '</p>' : '');
  sendMailSafe_(hoSo.Email, '[Hoàn thành] Hồ sơ ' + hoSo.MaHoSo, mailWrap_('Hồ sơ đã hoàn thành', body, hoSo.MaHoSo, hoSo.MaXacNhan));
}
