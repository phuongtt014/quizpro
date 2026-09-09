/**
 * PageCongViec.gs - Trang "Quản lý công việc" (danh sách + chi tiết)
 */
function pageCongViec_(user, params) {
  if (params.id) {
    return pageCongViecDetail_(user, params.id);
  }
  var rows = listCongViec(user);
  var body = rows.map(function (r) {
    var diem = Number(r.DiemHienTai);
    var diemClass = diem >= 100 ? 'pos' : (diem < 100 ? 'neg' : '');
    return '<tr><td>' + escHtml_(r.MaCongViec) + '</td><td>' + escHtml_(r.NoiDung) + '</td><td>' + escHtml_(r.NguoiPhuTrach) + '</td>' +
      '<td>' + escHtml_(r.PhanLoai) + '</td><td>' + pillCongViec_(r.TrangThai) + '</td><td>' + escHtml_(r.ThoiHan) + '</td>' +
      '<td><span class="score-badge ' + diemClass + '">' + escHtml_(r.DiemHienTai) + '</span></td>' +
      '<td><a class="btn secondary" href="' + escHtml_(linkTo_('congviec', { id: r.MaCongViec })) + '">Chi tiết</a></td></tr>';
  }).join('');

  return '<div class="card"><h2>Quản lý công việc</h2>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã CV</th><th>Nội dung</th><th>Người phụ trách</th><th>Phân loại</th><th>Trạng thái</th><th>Thời hạn</th><th>Điểm</th><th></th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="8"><div class="empty-state">Chưa có công việc nào.</div></td></tr>') + '</tbody></table></div></div>';
}

function pageCongViecDetail_(user, maCongViec) {
  var data = getCongViecChiTiet(user, maCongViec);
  var cv = data.congViec, chat = data.chat;
  var isManager = isTruongNhomTroLen_(user);
  var isQuanLy = isQuanLyTroLen_(user);
  var isOwner = user && user.email === cv.NguoiPhuTrach;
  var backUrl = escHtml_(linkTo_('congviec'));

  var html = '<div class="card">' +
    '<p><a href="' + backUrl + '">&larr; Quay lại danh sách</a></p>' +
    '<h2>' + escHtml_(cv.NoiDung) + '</h2>' +
    '<p class="muted">Mã CV: ' + escHtml_(cv.MaCongViec) + (cv.MaHoSo ? ' — Từ hồ sơ: ' + escHtml_(cv.MaHoSo) : '') + '</p>' +
    '<p><b>Người phụ trách:</b> ' + escHtml_(cv.NguoiPhuTrach) + ' &nbsp; <b>Phân loại:</b> ' + escHtml_(cv.PhanLoai) + '</p>' +
    '<p><b>Mô tả:</b> ' + escHtml_(cv.MoTa) + '</p>' +
    '<p><b>Tài liệu đính kèm:</b><br>' + linksToHtml_(cv.TaiLieuDinhKem) + '</p>' +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Bắt đầu</label><input value="' + escHtml_(cv.ThoiGianBatDau) + '" disabled></div>' +
    '<div class="field"><label>Thời hạn</label><input value="' + escHtml_(cv.ThoiHan) + '" disabled></div>' +
    '</div>';

  html += '<div class="field"><label>Thời gian ghi nhận hoàn thành' + (isQuanLy ? ' (Quản lý có thể sửa)' : '') + '</label>';
  if (isQuanLy) {
    html += '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '" style="display:flex;gap:.5rem;align-items:flex-end">' +
      hiddenInputs_({ action: 'suaThoiGianHoanThanh', returnPage: 'congviec', id: cv.MaCongViec }) +
      '<input name="thoiGianHoanThanh" value="' + escHtml_(cv.ThoiGianHoanThanh) + '" style="flex:1">' +
      '<button class="btn secondary" type="submit">Lưu</button></form>';
  } else {
    html += '<input value="' + escHtml_(cv.ThoiGianHoanThanh) + '" disabled>';
  }
  html += '</div>';

  if (isManager || isOwner) {
    var statusOpts = CONGVIEC_STATUS_LIST.map(function (s) { return { value: s, label: s }; });
    html += '<h3 style="margin-top:1rem">Cập nhật trạng thái</h3>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'capNhatTrangThaiCongViec', returnPage: 'congviec', id: cv.MaCongViec }) +
      '<div class="field"><label>Trạng thái mới</label>' + selectHtml_('trangThaiMoi', statusOpts, cv.TrangThai) + '</div>' +
      (cv.MaHoSo ? '<div class="field"><label>Link trả kết quả (bắt buộc nếu chuyển sang "Đã nộp")</label><textarea name="linkKetQua" placeholder="https://..."></textarea></div>' : '') +
      '<div class="btn-row"><button class="btn" type="submit">Cập nhật trạng thái</button></div>' +
      '</form>';
  }

  if (isQuanLy) {
    var dm = getDanhMucDungChung();
    var madiemOpts = dm.maDiem.map(function (m) { return { value: m.MaDiem, label: m.MaDiem + ' - ' + m.LyDo + ' (' + m.SoDiem + ')' }; });
    html += '<h3 style="margin-top:1rem">Đánh giá của TĐV (chỉ Quản lý)</h3>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'danhGiaTDV', returnPage: 'congviec', id: cv.MaCongViec }) +
      '<div class="field"><label>Mã điểm</label>' + selectHtml_('maDiem', madiemOpts, cv.MaDanhGiaTDV, '-- Chọn mã điểm --') + '</div>' +
      '<div class="field"><label>Ghi chú của TĐV</label><textarea name="ghiChuTDV">' + escHtml_(cv.GhiChuTDV) + '</textarea></div>' +
      '<div class="btn-row"><button class="btn success" type="submit">Lưu đánh giá</button></div>' +
      '</form>';
  } else if (cv.GhiChuTDV || cv.MaDanhGiaTDV) {
    html += '<p><b>Đánh giá TĐV:</b> ' + escHtml_(cv.MaDanhGiaTDV) + ' &nbsp; <b>Ghi chú:</b> ' + escHtml_(cv.GhiChuTDV) + '</p>';
  }

  var chatHtml = !chat || !chat.length ? '<div class="muted">Chưa có tin nhắn nào.</div>' :
    chat.map(function (m) {
      return '<div class="chat-msg"><b>' + escHtml_(m.NguoiGui) + '</b><span class="t">' + escHtml_(m.ThoiGian) + '</span><div>' + escHtml_(m.NoiDung) + '</div></div>';
    }).join('');

  html += '<h3 style="margin-top:1rem">Khung chat công việc</h3>' +
    '<div class="chat-box">' + chatHtml + '</div>';
  if (isManager || isOwner) {
    html += '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'guiChatCongViec', returnPage: 'congviec', id: cv.MaCongViec }) +
      '<div class="field"><textarea name="noiDung" placeholder="Nhắn tin, dán link/ảnh sẽ tự thêm vào Tài liệu đính kèm..." required></textarea></div>' +
      '<div class="btn-row"><button class="btn" type="submit">Gửi</button></div>' +
      '</form>';
  }

  html += '</div>';
  return html;
}

function doPostCapNhatTrangThaiCongViec_(e) {
  capNhatTrangThaiCongViec(getCurrentUser_(), { maCongViec: e.parameter.id, trangThaiMoi: e.parameter.trangThaiMoi, linkKetQua: e.parameter.linkKetQua });
  return { flash: { type: 'ok', msg: 'Đã cập nhật trạng thái công việc ' + e.parameter.id + '.' }, redirectParams: { id: e.parameter.id } };
}
function doPostSuaThoiGianHoanThanh_(e) {
  suaThoiGianHoanThanh(getCurrentUser_(), { maCongViec: e.parameter.id, thoiGianHoanThanh: e.parameter.thoiGianHoanThanh });
  return { flash: { type: 'ok', msg: 'Đã lưu thời gian hoàn thành.' }, redirectParams: { id: e.parameter.id } };
}
function doPostDanhGiaTDV_(e) {
  danhGiaTDV(getCurrentUser_(), { maCongViec: e.parameter.id, maDiem: e.parameter.maDiem, ghiChuTDV: e.parameter.ghiChuTDV });
  return { flash: { type: 'ok', msg: 'Đã lưu đánh giá TĐV.' }, redirectParams: { id: e.parameter.id } };
}
function doPostGuiChatCongViec_(e) {
  guiChatCongViec(getCurrentUser_(), { maCongViec: e.parameter.id, noiDung: e.parameter.noiDung });
  return { flash: null, redirectParams: { id: e.parameter.id } };
}
