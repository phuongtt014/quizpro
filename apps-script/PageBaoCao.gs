/**
 * PageBaoCao.gs - Trang "Báo cáo" (bảng điểm tổng hợp)
 */
function pageBaoCao_(user, params) {
  var rows = baoCaoBangDiem(user);
  var body = rows.map(function (r) {
    return '<tr><td>' + escHtml_(r.hoTen) + '</td><td>' + escHtml_(r.donVi) + '</td><td>' + escHtml_(ROLE_LABELS[r.vaiTro] || r.vaiTro) + '</td>' +
      '<td>' + escHtml_(r.soCongViec) + '</td><td>' + escHtml_(r.diemTrungBinhCongViec) + '</td><td>' + escHtml_(r.tongDiemThuongPhatDaDuyet) + '</td>' +
      '<td><b>' + escHtml_(r.diemTongHop) + '</b></td></tr>';
  }).join('');

  return '<div class="card"><h2>Bảng điểm tổng hợp</h2>' +
    '<div class="table-wrap"><table><thead><tr><th>Nhân sự</th><th>Đơn vị</th><th>Vai trò</th><th>Số CV</th><th>Điểm TB công việc</th><th>Tổng điểm thưởng/phạt</th><th>Điểm tổng hợp</th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="7"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>';
}
