'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { world, tsv, j } = require('./world');

const DC = '2025-2026-DC1';
function setup() {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2025-2026', '01/09/2025', '31/05/2026']) }).ok);
  assert.ok(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, row: { chi_nhanh_ma: 'HN', lcb: '6000000', ltb: '100000' } }).ok);
  assert.ok(e.api('save', { table: 'KY_LUONG', row: { ma: DC, nam_hoc_ma: '2025-2026', hoc_ky: 'DC1', loai: 'Điều chỉnh', tu_ngay: '01/03/2026', den_ngay: '01/03/2026' } }).ok);
  return e;
}

test('Thu nhập hiện tại có Hỗ trợ GVCN và Hỗ trợ khác: mặc định 0, tổng dùng làm mốc bảo vệ lương', () => {
  const e = setup();
  // NV001: 14.000.000 + GVCN 1.000.000 + khác 1.500.000 = 16.500.000 > phương án mới 16.120.000 => giữ mức
  const id = j(e.run('Db.find("THU_NHAP_NEN",function(x){return x.ma_nv==="NV001";}).id'));
  assert.ok(e.api('save', { table: 'THU_NHAP_NEN', id, row: { ma_nv: 'NV001', thu_nhap: '14.000.000', ho_tro_gvcn: '1.000.000', ho_tro_khac: '1.500.000', hieu_luc_tu: '01/01/2026' } }).ok);
  const list = e.api('list', { table: 'THU_NHAP_NEN' }).data.rows;
  const a = list.find(x => x.ma_nv === 'NV001'), b = list.find(x => x.ma_nv === 'NV002');
  assert.deepStrictEqual([a.ho_tro_gvcn, a.ho_tro_khac, a.tong_thu_nhap, a.ho_ten], [1000000, 1500000, 16500000, 'Nguyễn Thị A']);
  assert.deepStrictEqual([b.ho_tro_gvcn, b.ho_tro_khac, b.tong_thu_nhap], [0, 0, 15000000]); // nhập CSV bỏ trống => 0
  assert.ok(!e.api('save', { table: 'THU_NHAP_NEN', row: { ma_nv: 'NV002', thu_nhap: '1', ho_tro_gvcn: '-5', hieu_luc_tu: '01/01/2030' } }).ok);

  e.as('tro.ly@vaschools.edu.vn');
  assert.ok(e.api('calc.run', { ky_ma: DC }).ok);
  const tm = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: DC } }).data.rows;
  const t1 = tm.find(x => x.ma_nv === 'NV001'), t2 = tm.find(x => x.ma_nv === 'NV002');
  assert.deepStrictEqual([t1.thu_nhap_hien_tai, t1.hien_tai_gvcn, t1.hien_tai_khac, t1.pa_moi, t1.chinh_thuc], [16500000, 1000000, 1500000, 16120000, 16500000]);
  assert.match(t1.ghi_chu, /giữ mức thu nhập/);
  assert.deepStrictEqual([t2.thu_nhap_hien_tai, t2.chinh_thuc], [15000000, 16120000]);
});

test('Nhập CSV thu nhập hiện tại với Hỗ trợ GVCN/khác; mốc tạo khi chốt chỉ gồm lương (hỗ trợ = 0)', () => {
  const e = setup();
  e.as('admin@vaschools.edu.vn');
  const r = e.api('importCommit', { table: 'THU_NHAP_NEN', mode: 'upsert', text: tsv(['Mã nhân sự', 'Thu nhập/tháng', 'Hỗ trợ GVCN', 'Hỗ trợ khác', 'Hiệu lực từ'],
    ['NV001', '15.000.000', '500.000', '', '01/01/2026']) });
  assert.ok(r.ok, JSON.stringify(r));
  const row = j(e.run('Db.find("THU_NHAP_NEN",function(x){return x.ma_nv==="NV001";})'));
  assert.deepStrictEqual([row.thu_nhap, row.ho_tro_gvcn, row.ho_tro_khac], [15000000, 500000, 0]);
  e.as('tro.ly@vaschools.edu.vn');
  e.api('calc.run', { ky_ma: DC });
  e.api('quyettoan.submit', { ky_ma: DC, truong_ma: 'HCM_THPT' });
  const id = e.api('phieu.list', { tab: 'cua_toi' }).data.rows[0].id;
  for (const u of ['ht.hcm', 'nhansu', 'tgd']) { e.as(u + '@vaschools.edu.vn'); assert.ok(e.api('phieu.act', { id, action: 'Duyệt' }).ok); }
  const moc = j(e.run('Db.filter("THU_NHAP_NEN",function(x){return x.ma_nv==="NV001"&&x.hieu_luc_tu==="2026-03-01";})[0]'));
  assert.deepStrictEqual([moc.thu_nhap, moc.ho_tro_gvcn, moc.ho_tro_khac], [16120000, 0, 0]);
});

test('Tính toán lấy trường và đối tượng theo dòng quá trình ngạch bậc đang hiệu lực (đổi trường/đối tượng giữa chừng)', () => {
  const e = setup();
  e.as('admin@vaschools.edu.vn');
  // Từ 01/03/2026 NV001 chuyển sang trường HN... không cùng chi nhánh nên dùng một trường khác của HCM
  assert.ok(e.api('importCommit', { table: 'TRUONG', text: tsv(['Mã trường', 'Tên trường', 'Chi nhánh', 'Cấp học'], ['HCM_THCS', 'THCS HCM', 'HCM', 'THCS']) }).ok);
  assert.ok(e.api('save', { table: 'QUA_TRINH_NGACH', autoClose: true, row: { ma_nv: 'NV001', ngach_ma: 'GV2', truong_ma: 'HCM_THCS', doi_tuong: 'GV Tiểu học nhiều môn', hieu_luc_tu: '01/03/2026' } }).ok);
  e.as('tro.ly@vaschools.edu.vn');
  assert.ok(e.api('calc.run', { ky_ma: DC }).ok);
  const t = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: DC, ma_nv: 'NV001' } }).data.rows[0];
  assert.deepStrictEqual([t.truong_ma, t.doi_tuong, t.tham_nien], ['HCM_THCS', 'GV Tiểu học nhiều môn', 6]);
  // KPI tiết dạy tiểu học: 100000 × 1,1 × 96 × 0,7 = 7.392.000 (khác 8.800.000 của "GV còn lại")
  assert.strictEqual(t.luong_kpi, 7392000);
  // lọc theo trường tại ngày tính: trường cũ không còn có NV001
  assert.strictEqual(e.api('calc.run', { ky_ma: DC, truong_ma: 'HCM_THPT' }).code, 'EMPTY'); // trường cũ không còn ai tại ngày tính
  assert.strictEqual(j(e.run('Db.all("THU_NHAP_MOI").filter(function(x){return x.ma_nv==="NV001";}).length')), 1);
  // tổng hợp theo trường dùng trường tại thời điểm tính
  const s = e.api('tonghop', { ky_ma: DC, group: 'truong' }).data;
  assert.deepStrictEqual(j(s.groups.map(g => g.label)), ['THCS HCM', 'THPT Hà Nội']);
});

test('Dòng quá trình ngạch bậc thiếu đối tượng (dữ liệu cũ) bị cảnh báo thay vì tính sai; nâng cấp tự chuyển Trường/Đối tượng từ hồ sơ cũ', () => {
  const e = setup();
  e.as('admin@vaschools.edu.vn');
  // mô phỏng dữ liệu cũ: hồ sơ còn cột truong_ma/doi_tuong trong sheet, dòng quá trình ngạch chưa có
  const sh = e.sheet('NHAN_SU'), head = sh.data[0];
  head.push('truong_ma', 'doi_tuong', 'to_chuyen_mon');
  const iMa = head.indexOf('ma_nv');
  sh.data.forEach((row, i) => { if (i === 0) return; row[head.indexOf('truong_ma')] = row[iMa] === 'NV001' ? 'HCM_THPT' : 'HN_THPT'; row[head.indexOf('doi_tuong')] = row[iMa] === 'NV001' ? 'Quản lý' : 'GV còn lại'; row[head.indexOf('to_chuyen_mon')] = 'Tổ Toán'; });
  e.run('Db.tx(function(){ Db.updateMany("QUA_TRINH_NGACH", Db.all("QUA_TRINH_NGACH").map(function(x){return {id:x.id, patch:{doi_tuong:"", truong_ma:""}};}), "t"); })');
  e.api('cache.flush');
  e.as('tro.ly@vaschools.edu.vn');
  const run = e.api('calc.run', { ky_ma: DC });
  assert.strictEqual(run.data.incomes, 0);
  assert.match(run.data.warnings.join('|'), /NV001.*chưa có "Đối tượng tính lương"/);

  e.as('admin@vaschools.edu.vn');
  const up = j(e.run('Seed.upgrade()'));
  assert.strictEqual(up.chuyenDonVi, 2);
  const q = j(e.run('Db.all("QUA_TRINH_NGACH").map(function(x){return x.ma_nv+":"+x.truong_ma+":"+x.doi_tuong;})'));
  assert.deepStrictEqual(q, ['NV001:HCM_THPT:Quản lý', 'NV002:HN_THPT:GV còn lại']);
  assert.strictEqual(j(e.run('Seed.upgrade().chuyenDonVi')), 0); // chạy lại không đổi gì
  e.as('tro.ly@vaschools.edu.vn');
  assert.strictEqual(e.api('calc.run', { ky_ma: DC }).data.incomes, 2);
});
