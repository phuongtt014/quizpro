/**
 * PageTiepNhan.gs - Trang "Tiếp nhận hồ sơ" (Trưởng nhóm trở lên)
 */
function pageTiepNhan_(user, params) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  var rows = listHoSoTiepNhan(user);
  var dm = getDanhMucDungChung();
  var nhanSuOpts = dm.nhanSu.map(function (n) { return { value: n.Email, label: n.HoTen }; });

  if (params.view === 'phancong' && params.maHoSo) {
    var hs = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ.');
    return '<div class="card"><h2>Phân công hồ sơ ' + escHtml_(hs.MaHoSo) + '</h2>' +
      '<p><b>' + escHtml_(hs.TieuDe) + '</b></p>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'assignHoSo', returnPage: 'tiepnhan', maHoSo: hs.MaHoSo }) +
      '<div class="field"><label>Người phụ trách</label>' + selectHtml_('nguoiPhuTrach', nhanSuOpts, hs.NguoiPhuTrach, '-- Chọn --', 'required') + '</div>' +
      '<div class="field"><label>Thời hạn xử lý</label><input type="date" name="thoiHan" value="' + escHtml_(hs.ThoiHan) + '" required></div>' +
      '<div class="btn-row"><button class="btn" type="submit">Xác nhận phân công</button> ' +
      '<a class="btn secondary" href="' + escHtml_(linkTo_('tiepnhan')) + '">Huỷ</a></div>' +
      '</form></div>';
  }

  if (params.view === 'tuchoi' && params.maHoSo) {
    var hs2 = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo);
    if (!hs2) throw new Error('Không tìm thấy hồ sơ.');
    return '<div class="card"><h2>Từ chối hồ sơ ' + escHtml_(hs2.MaHoSo) + '</h2>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'rejectHoSo', returnPage: 'tiepnhan', maHoSo: hs2.MaHoSo }) +
      '<div class="field"><label>Lý do từ chối</label><textarea name="lyDo" required></textarea></div>' +
      '<div class="btn-row"><button class="btn danger" type="submit">Xác nhận từ chối</button> ' +
      '<a class="btn secondary" href="' + escHtml_(linkTo_('tiepnhan')) + '">Huỷ</a></div>' +
      '</form></div>';
  }

  var body = rows.map(function (r) {
    var actions = '';
    if (r.TrangThai === 'Mới' || r.TrangThai === 'Đã phân công') {
      actions += '<a class="btn secondary" href="' + escHtml_(linkTo_('tiepnhan', { view: 'phancong', maHoSo: r.MaHoSo })) + '">Phân công</a> ';
    }
    if (r.TrangThai !== 'Từ chối' && r.TrangThai !== 'Đã hoàn thành') {
      actions += '<a class="btn danger" href="' + escHtml_(linkTo_('tiepnhan', { view: 'tuchoi', maHoSo: r.MaHoSo })) + '">Từ chối</a>';
    }
    return '<tr><td>' + escHtml_(r.MaHoSo) + '</td><td>' + escHtml_(r.HoTen) + '<br><span class="muted">' + escHtml_(r.Email) + '</span></td>' +
      '<td>' + escHtml_(r.TieuDe) + '</td><td>' + escHtml_(r.PhanMuc) + '</td><td>' + pillHoSo_(r.TrangThai) + '</td>' +
      '<td>' + escHtml_(r.NguoiPhuTrach) + '</td><td>' + escHtml_(r.ThoiHan) + '</td><td>' + actions + '</td></tr>';
  }).join('');

  return '<div class="card"><h2>Tiếp nhận hồ sơ</h2>' +
    '<div class="section-note">Chọn người phụ trách và thời hạn xử lý để phân công hồ sơ thành công việc, hoặc từ chối kèm lý do.</div>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã hồ sơ</th><th>Người gửi</th><th>Tiêu đề</th><th>Phân mục</th><th>Trạng thái</th><th>Người phụ trách</th><th>Thời hạn</th><th></th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="8"><div class="empty-state">Chưa có hồ sơ nào.</div></td></tr>') + '</tbody></table></div></div>';
}

function doPostAssignHoSo_(e) {
  assignHoSo(getCurrentUser_(), { maHoSo: e.parameter.maHoSo, nguoiPhuTrach: e.parameter.nguoiPhuTrach, thoiHan: e.parameter.thoiHan });
  return { flash: { type: 'ok', msg: 'Đã phân công hồ sơ ' + e.parameter.maHoSo + ' thành công.' } };
}
function doPostRejectHoSo_(e) {
  rejectHoSo(getCurrentUser_(), { maHoSo: e.parameter.maHoSo, lyDo: e.parameter.lyDo });
  return { flash: { type: 'ok', msg: 'Đã từ chối hồ sơ ' + e.parameter.maHoSo + '.' } };
}
