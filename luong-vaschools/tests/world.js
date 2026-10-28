'use strict';
// Dữ liệu mẫu dùng chung cho các kiểm thử: 2 chi nhánh, 2 trường, 2 nhân sự, đủ người dùng cho chuỗi duyệt mặc định.
const assert = require('node:assert');
const { createEnv } = require('./harness');

const j = (x) => JSON.parse(JSON.stringify(x));
const tsv = (...rows) => rows.map(r => r.join('\t')).join('\n');
const KY = '2026-2027-HK1';

/** Dựng môi trường: trường HCM_THPT + HN_THPT, nhân sự NV001, người dùng đủ các vai trò của chuỗi duyệt mặc định. */
function world() {
  const e = createEnv({ email: 'admin@vaschools.edu.vn' });
  e.install();
  const ok = (r) => { assert.ok(r.ok, JSON.stringify(r)); return r; };
  ok(e.api('importCommit', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['HN', 'Hà Nội', 'Hà Nội']) }));
  ok(e.api('importCommit', { table: 'TRUONG', text: tsv(['Mã trường', 'Tên trường', 'Chi nhánh', 'Cấp học'],
    ['HCM_THPT', 'THPT HCM', 'HCM', 'THPT'], ['HN_THPT', 'THPT Hà Nội', 'HN', 'THPT']) }));
  ok(e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2026-2027', '01/09/2026', '31/05/2027']) }));
  ok(e.api('importCommit', { table: 'KY_LUONG', text: tsv(['Mã kỳ', 'Năm học', 'Học kỳ', 'Từ ngày', 'Đến ngày', 'Số tuần quy định'], [KY, '2026-2027', 'HK1', '01/09/2026', '15/01/2027', '16']) }));
  ok(e.api('importCommit', { table: 'NHAN_SU', text: tsv(
    ['Mã nhân sự', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Email', 'Ngày vào làm', 'Chi nhánh'],
    ['NV001', 'Nguyễn Thị A', '15/05/1990', 'Nữ', 'a@vaschools.edu.vn', '01/09/2019', 'HCM'],
    ['NV002', 'Trần Văn B', '15/05/1990', 'Nam', 'b@vaschools.edu.vn', '01/09/2019', 'HN']) }));
  // Trường và đối tượng tính lương nằm ở quá trình ngạch bậc (có hiệu lực theo thời gian)
  ok(e.api('importCommit', { table: 'QUA_TRINH_NGACH', text: tsv(['Mã nhân sự', 'Ngạch', 'Trường', 'Đối tượng tính lương', 'Hiệu lực từ'],
    ['NV001', 'GV2', 'HCM_THPT', 'GV còn lại', '01/09/2019'], ['NV002', 'GV2', 'HN_THPT', 'GV còn lại', '01/09/2019']) }));
  ok(e.api('importCommit', { table: 'THU_NHAP_NEN', text: tsv(['Mã nhân sự', 'Thu nhập/tháng', 'Hiệu lực từ'], ['NV001', '15.000.000', '01/01/2026'], ['NV002', '15.000.000', '01/01/2026']) }));
  const users = ['gv.hcm', 'ht.hcm', 'ht.hn', 'nhansu', 'tgd', 'tro.ly', 'khac.truong'].map(u => u + '@vaschools.edu.vn');
  ok(e.api('importCommit', { table: 'USERS', text: tsv(['Email', 'Họ tên'], ...users.map(u => [u, u.split('@')[0]])) }));
  const G = (u, role, pv, ma = '') => [u + '@vaschools.edu.vn', role, pv, ma];
  ok(e.api('importCommit', { table: 'USER_ROLES', text: tsv(['Email', 'Vai trò', 'Phạm vi dữ liệu', 'Mã chi nhánh/trường'],
    G('gv.hcm', 'PROPOSER', 'Trường', 'HCM_THPT'), G('ht.hcm', 'PRINCIPAL', 'Trường', 'HCM_THPT'), G('ht.hn', 'PRINCIPAL', 'Trường', 'HN_THPT'),
    G('nhansu', 'HR_DIRECTOR', 'Toàn hệ thống'), G('tgd', 'CEO', 'Toàn hệ thống'), G('tro.ly', 'HR_STAFF', 'Toàn hệ thống'),
    G('khac.truong', 'PRINCIPAL', 'Trường', 'HCM_THPT')) }));
  return { e, ok };
}

const line = (extra) => Object.assign({ ky_ma: KY, ma_nv: 'NV001', loai: 'Thực dạy', noi_dung: 'Toán 10', so_luong: '22', don_vi: 'Tiết/Tuần', dac_thu: 'Không', tu_ngay: '07/09/2026', den_ngay: '27/12/2026' }, extra);

function approveAll(e, id, chain) {
  for (const u of chain) { e.as(u + '@vaschools.edu.vn'); const r = e.api('phieu.act', { id, action: 'Duyệt' }); assert.ok(r.ok, u + ' ' + JSON.stringify(r)); }
}


module.exports = { world, line, approveAll, KY, tsv, j };
