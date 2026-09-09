/**
 * PageThietLap.gs - Trang "Thiết lập" (chỉ Admin)
 */
function pageThietLap_(user, params) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  var data = getThietLapDayDu(user);

  function toggleUrl(page, action, keyField, item, curStatus) {
    var next = curStatus === TRANG_THAI_HOAT_DONG.HOAT_DONG ? TRANG_THAI_HOAT_DONG.NGUNG : TRANG_THAI_HOAT_DONG.HOAT_DONG;
    return linkTo_('thietlap', { view: 'toggle', kind: action, key: item[keyField], newStatus: next });
  }

  var donViRows = data.donVi.map(function (d) {
    return '<tr><td>' + escHtml_(d.MaDonVi) + '</td><td>' + escHtml_(d.TenDonVi) + '</td><td>' + escHtml_(d.TrangThai) + '</td>' +
      '<td><a class="btn secondary" href="' + escHtml_(toggleUrl('thietlap', 'donvi', 'MaDonVi', d, d.TrangThai)) + '">' + (d.TrangThai === 'Hoạt động' ? 'Ngừng' : 'Kích hoạt') + '</a></td></tr>';
  }).join('');

  var phanMucRows = data.phanMuc.map(function (p) {
    return '<tr><td>' + escHtml_(p.MaPhanMuc) + '</td><td>' + escHtml_(p.TenPhanMuc) + '</td><td>' + escHtml_(p.TrangThai) + '</td>' +
      '<td><a class="btn secondary" href="' + escHtml_(toggleUrl('thietlap', 'phanmuc', 'MaPhanMuc', p, p.TrangThai)) + '">' + (p.TrangThai === 'Hoạt động' ? 'Ngừng' : 'Kích hoạt') + '</a></td></tr>';
  }).join('');

  var maDiemRows = data.maDiem.map(function (m) {
    return '<tr><td>' + escHtml_(m.MaDiem) + '</td><td>' + escHtml_(m.LyDo) + '</td><td>' + escHtml_(m.SoDiem) + '</td><td>' + escHtml_(m.TrangThai) + '</td>' +
      '<td><a class="btn secondary" href="' + escHtml_(toggleUrl('thietlap', 'madiem', 'MaDiem', m, m.TrangThai)) + '">' + (m.TrangThai === 'Hoạt động' ? 'Ngừng' : 'Kích hoạt') + '</a></td></tr>';
  }).join('');

  var nhanSuRows = data.nhanSu.map(function (n) {
    return '<tr><td>' + escHtml_(n.Email) + '</td><td>' + escHtml_(n.HoTen) + '</td><td>' + escHtml_(n.DonVi) + '</td>' +
      '<td>' + escHtml_(ROLE_LABELS[n.VaiTro] || n.VaiTro) + '</td><td>' + escHtml_(n.TrangThai) + '</td>' +
      '<td><a class="btn secondary" href="' + escHtml_(toggleUrl('thietlap', 'nhansu', 'Email', n, n.TrangThai)) + '">' + (n.TrangThai === 'Hoạt động' ? 'Ngừng' : 'Kích hoạt') + '</a></td></tr>';
  }).join('');

  var donViOpts = data.donVi.map(function (d) { return { value: d.MaDonVi, label: d.TenDonVi }; });
  var vaiTroOpts = Object.keys(ROLE_LABELS).map(function (r) { return { value: r, label: ROLE_LABELS[r] }; });

  return '<div class="card"><h2>Đơn vị / Phòng ban</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'upsertDonVi', returnPage: 'thietlap' }) +
    '<div class="grid grid-2"><div class="field"><label>Mã đơn vị</label><input name="MaDonVi" required></div>' +
    '<div class="field"><label>Tên đơn vị</label><input name="TenDonVi" required></div></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lưu</button></div></form>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã</th><th>Tên</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
    (donViRows || '<tr><td colspan="4"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>' +

    '<div class="card"><h2>Phân mục hồ sơ</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'upsertPhanMuc', returnPage: 'thietlap' }) +
    '<div class="grid grid-2"><div class="field"><label>Mã phân mục</label><input name="MaPhanMuc" required></div>' +
    '<div class="field"><label>Tên phân mục</label><input name="TenPhanMuc" required></div></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lưu</button></div></form>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã</th><th>Tên</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
    (phanMucRows || '<tr><td colspan="4"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>' +

    '<div class="card"><h2>Mã điểm</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'upsertMaDiem', returnPage: 'thietlap' }) +
    '<div class="grid grid-2"><div class="field"><label>Mã điểm</label><input name="MaDiem" required></div>' +
    '<div class="field"><label>Số điểm (+/-)</label><input name="SoDiem" type="number" required></div></div>' +
    '<div class="field"><label>Lý do</label><input name="LyDo" required></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lưu</button></div></form>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã</th><th>Lý do</th><th>Điểm</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
    (maDiemRows || '<tr><td colspan="5"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>' +

    '<div class="card"><h2>Danh sách nhân sự</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'upsertNhanSu', returnPage: 'thietlap' }) +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Email</label><input name="Email" type="email" required></div>' +
    '<div class="field"><label>Họ tên</label><input name="HoTen" required></div>' +
    '<div class="field"><label>Đơn vị</label>' + selectHtml_('DonVi', donViOpts, '', '-- Chọn --') + '</div>' +
    '<div class="field"><label>Vai trò</label>' + selectHtml_('VaiTro', vaiTroOpts, ROLES.NHAN_VIEN) + '</div>' +
    '</div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lưu</button></div></form>' +
    '<div class="table-wrap"><table><thead><tr><th>Email</th><th>Họ tên</th><th>Đơn vị</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
    (nhanSuRows || '<tr><td colspan="6"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>';
}

/** Xử lý toggle trạng thái qua link GET (an toàn vì chỉ Admin thấy link này, không phải hành động phá huỷ) */
function xuLyToggleThietLap_(user, params) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  var kind = params.kind, key = params.key, newStatus = params.newStatus;
  if (kind === 'donvi') {
    var d = findOne_(SHEET_NAMES.DON_VI, 'MaDonVi', key);
    upsertDonVi(user, { MaDonVi: key, TenDonVi: d.TenDonVi, TrangThai: newStatus });
  } else if (kind === 'phanmuc') {
    var p = findOne_(SHEET_NAMES.PHAN_MUC, 'MaPhanMuc', key);
    upsertPhanMuc(user, { MaPhanMuc: key, TenPhanMuc: p.TenPhanMuc, TrangThai: newStatus });
  } else if (kind === 'madiem') {
    var m = findOne_(SHEET_NAMES.MA_DIEM, 'MaDiem', key);
    upsertMaDiem(user, { MaDiem: key, LyDo: m.LyDo, SoDiem: m.SoDiem, TrangThai: newStatus });
  } else if (kind === 'nhansu') {
    var n = findOne_(SHEET_NAMES.NHAN_SU, 'Email', key);
    upsertNhanSu(user, { Email: key, HoTen: n.HoTen, DonVi: n.DonVi, VaiTro: n.VaiTro, TrangThai: newStatus });
  }
}

function doPostUpsertDonVi_(e) {
  upsertDonVi(getCurrentUser_(), { MaDonVi: e.parameter.MaDonVi, TenDonVi: e.parameter.TenDonVi });
  return { flash: { type: 'ok', msg: 'Đã lưu đơn vị.' } };
}
function doPostUpsertPhanMuc_(e) {
  upsertPhanMuc(getCurrentUser_(), { MaPhanMuc: e.parameter.MaPhanMuc, TenPhanMuc: e.parameter.TenPhanMuc });
  return { flash: { type: 'ok', msg: 'Đã lưu phân mục.' } };
}
function doPostUpsertMaDiem_(e) {
  upsertMaDiem(getCurrentUser_(), { MaDiem: e.parameter.MaDiem, LyDo: e.parameter.LyDo, SoDiem: e.parameter.SoDiem });
  return { flash: { type: 'ok', msg: 'Đã lưu mã điểm.' } };
}
function doPostUpsertNhanSu_(e) {
  upsertNhanSu(getCurrentUser_(), { Email: e.parameter.Email, HoTen: e.parameter.HoTen, DonVi: e.parameter.DonVi, VaiTro: e.parameter.VaiTro });
  return { flash: { type: 'ok', msg: 'Đã lưu nhân sự.' } };
}
