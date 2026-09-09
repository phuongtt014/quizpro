/**
 * PageTraCuu.gs - Trang "Tra cứu" (dùng POST để tránh lộ mã xác nhận lên URL/lịch sử trình duyệt)
 */
function pageTraCuu_(user, params, ketQua) {
  var html = '<div class="card"><h2>Tra cứu hồ sơ</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'traCuuHoSo', returnPage: 'tracuu' }) +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Mã hồ sơ *</label><input name="maHoSo" placeholder="HS-20260909-0001" required value="' + escHtml_(params.maHoSo || '') + '"></div>' +
    '<div class="field"><label>Mã xác nhận *</label><input name="maXacNhan" placeholder="ABC123" required></div>' +
    '</div>' +
    '<div class="btn-row"><button class="btn" type="submit">Tra cứu</button></div>' +
    '</form></div>';

  if (ketQua) {
    var hoSo = ketQua.hoSo, cv = ketQua.congViec, chat = ketQua.chat;
    var chatHtml = !chat || !chat.length ? '<div class="muted">Chưa có tin nhắn nào.</div>' :
      chat.map(function (m) {
        return '<div class="chat-msg"><b>' + escHtml_(m.NguoiGui) + '</b><span class="t">' + escHtml_(m.ThoiGian) + '</span><div>' + escHtml_(m.NoiDung) + '</div></div>';
      }).join('');

    html += '<div class="card">' +
      '<h2>Kết quả tra cứu</h2>' +
      '<p><b>' + escHtml_(hoSo.TieuDe) + '</b> ' + pillHoSo_(hoSo.TrangThai) + '</p>' +
      '<p class="muted">Mã hồ sơ: ' + escHtml_(hoSo.MaHoSo) + ' — Gửi lúc: ' + escHtml_(hoSo.NgayTao) + '</p>' +
      '<p>Người phụ trách: ' + escHtml_(hoSo.NguoiPhuTrach || '(chưa phân công)') + (hoSo.ThoiHan ? ' — Thời hạn: ' + escHtml_(hoSo.ThoiHan) : '') + '</p>' +
      (hoSo.TrangThai === 'Từ chối' ? '<p>Lý do từ chối: ' + escHtml_(hoSo.LyDoTuChoi) + '</p>' : '') +
      (hoSo.LinkKetQua ? '<p>Link kết quả: ' + linksToHtml_(hoSo.LinkKetQua) + '</p>' : '') +
      (cv ? '<p>Trạng thái xử lý công việc: ' + pillCongViec_(cv.TrangThai) + '</p>' : '') +
      '<h3 style="margin-top:1rem">Trao đổi với người phụ trách</h3>' +
      '<div class="chat-box">' + chatHtml + '</div>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'guiTinTraCuu', returnPage: 'tracuu', maHoSo: hoSo.MaHoSo, maXacNhan: hoSo.MaXacNhan, showResult: '1' }) +
      '<div class="field"><textarea name="noiDung" placeholder="Nhập tin nhắn..." required></textarea></div>' +
      '<div class="btn-row"><button class="btn" type="submit">Gửi</button></div>' +
      '</form>' +
      '</div>';
  }
  return html;
}

function doPostTraCuuHoSo_(e) {
  var ketQua = traCuuHoSo(e.parameter.maHoSo, e.parameter.maXacNhan);
  var html = pageTraCuu_(getCurrentUser_(), { maHoSo: e.parameter.maHoSo }, ketQua);
  return { directHtml: html };
}

function doPostGuiTinTraCuu_(e) {
  guiTinTraCuu({ maHoSo: e.parameter.maHoSo, maXacNhan: e.parameter.maXacNhan, noiDung: e.parameter.noiDung });
  var ketQua = traCuuHoSo(e.parameter.maHoSo, e.parameter.maXacNhan);
  var html = pageTraCuu_(getCurrentUser_(), { maHoSo: e.parameter.maHoSo }, ketQua);
  return { directHtml: html };
}
