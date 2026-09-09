/**
 * PageDiem.gs - Trang "Điểm cộng/trừ" (Trưởng nhóm trở lên lập phiếu, Quản lý duyệt)
 */
function pageDiem_(user, params) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  var dm = getDanhMucDungChung();
  var nhanSuOpts = dm.nhanSu.map(function (n) { return { value: n.Email, label: n.HoTen }; });
  var maDiemOpts = dm.maDiem.map(function (m) { return { value: m.MaDiem, label: m.MaDiem + ' - ' + m.LyDo + ' (' + m.SoDiem + ')' }; });
  var congViecRows = readAll_(SHEET_NAMES.CONG_VIEC);
  var cvOpts = congViecRows.map(function (c) { return { value: c.MaCongViec, label: c.MaCongViec + ' - ' + c.NoiDung }; });

  var html = '<div class="card"><h2>Lập phiếu ghi nhận điểm cộng/trừ</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'taoPhieuDiem', returnPage: 'diem' }) +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Nhân sự đề xuất *</label>' + selectHtml_('nhanSuDuocDeXuat', nhanSuOpts, '', '-- Chọn --', 'required') + '</div>' +
    '<div class="field"><label>Mã điểm *</label>' + selectHtml_('maDiem', maDiemOpts, '', '-- Chọn --', 'required') + '</div>' +
    '</div>' +
    '<div class="field"><label>Công việc liên quan (không bắt buộc)</label>' + selectHtml_('maCongViecLienQuan', cvOpts, '', '-- Không liên quan công việc cụ thể --') + '</div>' +
    '<div class="field"><label>Nội dung *</label><textarea name="noiDung" required></textarea></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lập phiếu</button></div>' +
    '</form></div>';

  var rows = listPhieuDiem(user);
  var isQuanLy = isQuanLyTroLen_(user);
  var body = rows.map(function (r) {
    var actions = '';
    if (isQuanLy && r.TrangThai === 'Chờ duyệt') {
      actions = '<a class="btn success" href="' + escHtml_(linkTo_('diem', { view: 'duyet', maPhieu: r.MaPhieu })) + '">Duyệt</a> ' +
        '<a class="btn danger" href="' + escHtml_(linkTo_('diem', { view: 'tuchoiphieu', maPhieu: r.MaPhieu })) + '">Từ chối</a>';
    }
    return '<tr><td>' + escHtml_(r.MaPhieu) + '</td><td>' + escHtml_(r.NhanSuDuocDeXuat) + '</td><td>' + escHtml_(r.MaDiem) + '</td>' +
      '<td>' + escHtml_(r.SoDiem) + '</td><td>' + escHtml_(r.NoiDung) + '</td><td>' + pillPhieu_(r.TrangThai) + '</td><td>' + actions + '</td></tr>';
  }).join('');

  html += '<div class="card"><h2>Danh sách phiếu điểm</h2>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã phiếu</th><th>Nhân sự</th><th>Mã điểm</th><th>Điểm</th><th>Nội dung</th><th>Trạng thái</th><th></th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="7"><div class="empty-state">Chưa có phiếu điểm nào.</div></td></tr>') + '</tbody></table></div></div>';

  if (params.view === 'duyet' && params.maPhieu) {
    html += confirmBox_('duyetPhieuDiem', { maPhieu: params.maPhieu }, 'Xác nhận duyệt phiếu điểm ' + params.maPhieu + '?', 'diem', 'success');
  }
  if (params.view === 'tuchoiphieu' && params.maPhieu) {
    html += '<div class="card"><h3>Từ chối phiếu điểm ' + escHtml_(params.maPhieu) + '</h3>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'tuChoiPhieuDiem', returnPage: 'diem', maPhieu: params.maPhieu }) +
      '<div class="field"><label>Lý do từ chối</label><textarea name="lyDo" required></textarea></div>' +
      '<div class="btn-row"><button class="btn danger" type="submit">Xác nhận từ chối</button></div>' +
      '</form></div>';
  }
  return html;
}

/** Hộp xác nhận nhanh (nút Duyệt) - submit ngay bằng 1 form ẩn */
function confirmBox_(action, hidden, question, returnPage, btnClass) {
  return '<div class="card"><p>' + escHtml_(question) + '</p>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_(Object.assign({ action: action, returnPage: returnPage }, hidden)) +
    '<div class="btn-row"><button class="btn ' + (btnClass || '') + '" type="submit">Xác nhận</button> ' +
    '<a class="btn secondary" href="' + escHtml_(linkTo_(returnPage)) + '">Huỷ</a></div>' +
    '</form></div>';
}

function doPostTaoPhieuDiem_(e) {
  taoPhieuDiem(getCurrentUser_(), {
    nhanSuDuocDeXuat: e.parameter.nhanSuDuocDeXuat,
    maDiem: e.parameter.maDiem,
    maCongViecLienQuan: e.parameter.maCongViecLienQuan,
    noiDung: e.parameter.noiDung
  });
  return { flash: { type: 'ok', msg: 'Đã lập phiếu, chờ Quản lý duyệt.' } };
}
function doPostDuyetPhieuDiem_(e) {
  duyetPhieuDiem(getCurrentUser_(), { maPhieu: e.parameter.maPhieu });
  return { flash: { type: 'ok', msg: 'Đã duyệt phiếu điểm ' + e.parameter.maPhieu + '.' } };
}
function doPostTuChoiPhieuDiem_(e) {
  tuChoiPhieuDiem(getCurrentUser_(), { maPhieu: e.parameter.maPhieu, lyDo: e.parameter.lyDo });
  return { flash: { type: 'ok', msg: 'Đã từ chối phiếu điểm ' + e.parameter.maPhieu + '.' } };
}
