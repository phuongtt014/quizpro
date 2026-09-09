/**
 * PageForm.gs - Trang "Gửi hồ sơ"
 */
function pageForm_(user, params) {
  var dm = getDanhMucDungChung();
  var donViOpts = dm.donVi.map(function (d) { return { value: d.MaDonVi, label: d.TenDonVi }; });
  var phanMucOpts = dm.phanMuc.map(function (p) { return { value: p.MaPhanMuc, label: p.TenPhanMuc }; });

  return '<div class="card">' +
    '<h2>Form nhận hồ sơ</h2>' +
    '<div class="section-note">Điền đầy đủ thông tin. Sau khi gửi, hệ thống sẽ cấp Mã hồ sơ + Mã xác nhận qua email để bạn tra cứu tiến độ.</div>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'submitHoSo', returnPage: 'form' }) +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Họ tên *</label><input name="hoTen" required></div>' +
    '<div class="field"><label>Email *</label><input name="email" type="email" required></div>' +
    '<div class="field"><label>Số điện thoại</label><input name="soDienThoai"></div>' +
    '<div class="field"><label>Đơn vị / Phòng ban *</label>' + selectHtml_('donVi', donViOpts, '', '-- Chọn --', 'required') + '</div>' +
    '</div>' +
    '<div class="field"><label>Tiêu đề *</label><input name="tieuDe" required></div>' +
    '<div class="field"><label>Phân mục *</label>' + selectHtml_('phanMuc', phanMucOpts, '', '-- Chọn --', 'required') + '</div>' +
    '<div class="field"><label>Nội dung chi tiết *</label><textarea name="noiDungChiTiet" required></textarea></div>' +
    '<div class="field link-list-input"><label>Tài liệu đính kèm (mỗi link 1 dòng)</label><textarea name="taiLieuDinhKem" placeholder="https://drive.google.com/..."></textarea></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Gửi hồ sơ</button></div>' +
    '</form>' +
    '</div>';
}

/** Xử lý POST action=submitHoSo, trả về flash + trang chuyển hướng riêng (hiện mã hồ sơ/xác nhận) */
function doPostSubmitHoSo_(e) {
  var payload = {
    hoTen: e.parameter.hoTen,
    email: e.parameter.email,
    soDienThoai: e.parameter.soDienThoai,
    donVi: e.parameter.donVi,
    tieuDe: e.parameter.tieuDe,
    phanMuc: e.parameter.phanMuc,
    noiDungChiTiet: e.parameter.noiDungChiTiet,
    taiLieuDinhKem: parseLinks_(e.parameter.taiLieuDinhKem)
  };
  var res = submitHoSo(payload);
  var html = '<div class="card">' +
    '<h2>Gửi hồ sơ thành công</h2>' +
    '<p>Mã hồ sơ: <b>' + escHtml_(res.maHoSo) + '</b></p>' +
    '<p>Mã xác nhận: <b>' + escHtml_(res.maXacNhan) + '</b></p>' +
    '<p class="muted">Thông tin này đã được gửi tới email của bạn. Vui lòng lưu lại để tra cứu tiến độ ở tab "Tra cứu".</p>' +
    '<div class="btn-row"><a class="btn" href="' + escHtml_(linkTo_('form')) + '">Gửi hồ sơ khác</a> ' +
    '<a class="btn secondary" href="' + escHtml_(linkTo_('tracuu')) + '">Đi tới Tra cứu</a></div>' +
    '</div>';
  return { directHtml: html };
}
