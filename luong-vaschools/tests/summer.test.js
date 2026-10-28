'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createEnv } = require('./harness');
const { world, approveAll, KY, tsv, j } = require('./world');

const HE = '2025-2026-HE', DC = '2025-2026-DC1';

function base() {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2025-2026', '01/09/2025', '31/05/2026']) }).ok);
  assert.ok(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, row: { chi_nhanh_ma: 'HN', lcb: '6000000', ltb: '100000' } }).ok);
  return e;
}
const kyHe = (e) => assert.ok(e.api('save', { table: 'KY_LUONG', row: { ma: HE, nam_hoc_ma: '2025-2026', hoc_ky: 'HE', loai: 'Hè', tu_ngay: '01/06/2026', den_ngay: '31/07/2026' } }).ok);
const kyDc = (e) => assert.ok(e.api('save', { table: 'KY_LUONG', row: { ma: DC, nam_hoc_ma: '2025-2026', hoc_ky: 'DC1', loai: 'Điều chỉnh', tu_ngay: '01/03/2026', den_ngay: '01/03/2026' } }).ok);

test('Engine.summer: thu nhập ngày × x + 60% × thu nhập ngày × y; nghỉ hè không hưởng', () => {
  const E = createEnv().ctx.Engine, P = { he_ngay_chia: 24, he_ty_le_khong_phan_cong: 0.6 };
  const r = j(E.summer({ thuNhapThang: 16120000, x: 30, y: 10, param: P }));
  assert.deepStrictEqual([r.thu_nhap_ngay, r.tien_x, r.tien_y, r.tong_he], [671667, 20150000, 4030000, 24180000]);
  assert.match(j(E.summer({ thuNhapThang: 15000000, x: 0, y: 0, param: P })).ghi_chu, /không hưởng/);
  assert.strictEqual(j(E.summer({ thuNhapThang: 15000000, x: 0, y: 10, param: P })).tong_he, 3750000);
});

test('Kỳ hè: khai báo hợp lệ, duyệt, tính lương hè, tổng hợp, xuất, chốt (không tạo mốc thu nhập)', () => {
  const e = base();
  kyHe(e);
  assert.match(e.api('save', { table: 'KY_LUONG', row: { ma: '2025-2026-HE', nam_hoc_ma: '2025-2026', hoc_ky: 'HE', loai: 'Học kỳ', tu_ngay: '01/06/2026', den_ngay: '31/07/2026' } }).error, /Loại phải là "Hè"|Đã tồn tại/);
  e.as('gv.hcm@vaschools.edu.vn');
  const line = (x, y, extra) => ({ row: Object.assign({ ky_ma: HE, ma_nv: 'NV001', so_ngay_lam: String(x), so_ngay_san_sang: String(y) }, extra) });
  assert.match(e.api('save', Object.assign({ table: 'HE_KHAI_BAO' }, line(50, 20))).error, /vượt số ngày/);
  assert.match(e.api('save', Object.assign({ table: 'HE_KHAI_BAO' }, line(5, 5, { ky_ma: KY }))).error, /không phải kỳ hè/);
  assert.ok(!e.api('save', Object.assign({ table: 'HE_KHAI_BAO' }, line(5, 5, { ma_nv: 'NV002' }))).ok); // ngoài trường
  assert.ok(e.api('save', Object.assign({ table: 'HE_KHAI_BAO' }, line(30, 10))).ok);
  assert.ok(!e.api('save', Object.assign({ table: 'HE_KHAI_BAO' }, line(1, 1))).ok); // trùng khóa kỳ-nhân sự
  const sub = e.api('khaibao.submit', { ky_ma: HE, truong_ma: 'HCM_THPT' });
  assert.ok(sub.ok, JSON.stringify(sub));
  const id = e.api('phieu.list', { tab: 'cua_toi' }).data.rows[0].id;
  assert.match(j(e.api('phieu.get', { id }).data.items.rows)[0].join('|'), /Lương hè.*30 \/ 10/);
  approveAll(e, id, ['ht.hcm', 'nhansu', 'tgd']);
  assert.strictEqual(j(e.run('Db.all("HE_KHAI_BAO")[0].trang_thai')), 'Đã duyệt');

  // chưa có Thu nhập hiện tại hiệu lực tại 01/06/2026 cho NV002; NV001 có (15.000.000)
  e.as('tro.ly@vaschools.edu.vn');
  const run = e.api('calc.run', { ky_ma: HE });
  assert.ok(run.ok, JSON.stringify(run));
  assert.strictEqual(run.data.loai, 'Hè');
  assert.strictEqual(run.data.incomes, 1);
  assert.match(run.data.warnings.join('|'), /NV002.*chưa khai báo ngày hè/);
  const r1 = e.api('list', { table: 'HE_THU_NHAP', filter: { ky_ma: HE } }).data.rows[0];
  assert.deepStrictEqual([r1.ma_nv, r1.ho_ten, r1.truong_ma, r1.ngach_ten, r1.thu_nhap_ngay, r1.tien_x, r1.tien_y, r1.tong_he],
    ['NV001', 'Nguyễn Thị A', 'HCM_THPT', 'Giáo viên 2', 625000, 18750000, 3750000, 22500000]);

  const s = e.api('tonghop', { ky_ma: HE, group: 'chi_nhanh' }).data;
  assert.strictEqual(s.he, true);
  assert.deepStrictEqual(j([s.total.so_nv, s.total.ngay_lam, s.total.ngay_san_sang, s.total.tong_he, s.chua_tinh]), [1, 30, 10, 22500000, 1]);
  const t = e.api('tonghop.export', { ky_ma: HE, bang: 'he' }).data;
  assert.strictEqual(t.rows, 1);
  assert.ok(t.text.split('\n').every(l => l.split('\t').length === 16));
  assert.ok(t.text.includes('\t22500000\t'));

  // chốt hè
  assert.ok(e.api('quyettoan.submit', { ky_ma: HE, truong_ma: 'HCM_THPT' }).ok);
  const pid = e.api('phieu.list', { tab: 'cua_toi' }).data.rows.find(x => x.ky === HE && x.loai === 'Quyết toán kỳ').id;
  assert.match(j(e.api('phieu.get', { id: pid }).data.items.rows)[0].join('|'), /22\.500\.000/);
  const nenBefore = j(e.run('Db.all("THU_NHAP_NEN").length'));
  approveAll(e, pid, ['ht.hcm', 'nhansu', 'tgd']);
  assert.strictEqual(j(e.run('Db.all("HE_THU_NHAP")[0].trang_thai')), 'Đã chốt');
  assert.strictEqual(j(e.run('Db.all("THU_NHAP_NEN").length')), nenBefore); // lương hè không tạo mốc
  e.as('tro.ly@vaschools.edu.vn');
  const again = e.api('calc.run', { ky_ma: HE, truong_ma: 'HCM_THPT' });
  assert.ok(again.ok, JSON.stringify(again));
  assert.strictEqual(again.data.skippedLocked, 1);
});

test('Lương hè: tính thử dòng chưa duyệt không chốt được; mốc theo ngày bắt đầu kỳ hè', () => {
  const e = base();
  kyHe(e);
  e.run(`Db.tx(function(){ Db.insertMany("HE_KHAI_BAO", [{ky_ma:"${HE}",ma_nv:"NV001",so_ngay_lam:0,so_ngay_san_sang:0,ghi_chu:"",trang_thai:"Nháp",phieu_ma:""}], "t"); })`);
  e.as('tro.ly@vaschools.edu.vn');
  assert.strictEqual(e.api('calc.run', { ky_ma: HE, truong_ma: 'HCM_THPT' }).data.incomes, 0);
  const r = e.api('calc.run', { ky_ma: HE, truong_ma: 'HCM_THPT', gom: 'tat_ca' });
  assert.strictEqual(r.data.incomes, 1);
  const row = e.api('list', { table: 'HE_THU_NHAP' }).data.rows[0];
  assert.deepStrictEqual([row.tong_he, row.nguon], [0, 'Gồm dòng chưa duyệt']);
  assert.match(row.ghi_chu, /không hưởng/);
  assert.strictEqual(e.api('quyettoan.submit', { ky_ma: HE, truong_ma: 'HCM_THPT' }).code, 'UNAPPROVED');
});

test('Mô phỏng: so sánh hiện hành và kịch bản theo nhóm, không ghi dữ liệu, kể cả nhân sự đã chốt', () => {
  const e = base();
  kyDc(e);
  e.as('tro.ly@vaschools.edu.vn');
  const sim = (kb, extra) => e.api('calc.simulate', Object.assign({ ky_ma: DC, kich_ban: kb, group: 'chi_nhanh' }, extra));
  // LCB +10%: PA 16.852.000 bị trần 10% (16.500.000) giới hạn
  let r = sim({ lcb_pct: '10' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepStrictEqual(j([r.data.total.base_chinh_thuc, r.data.total.sim_chinh_thuc, r.data.total.delta, r.data.total.pct]), [32240000, 33000000, 760000, 2.36]);
  assert.deepStrictEqual(j(r.data.groups.map(g => [g.label, g.base_chinh_thuc, g.sim_chinh_thuc])), [['TP. Hồ Chí Minh', 16120000, 16500000], ['Hà Nội', 16120000, 16500000]]);
  // trần giảm 7 điểm (10% -> 3%): max 15.450.000
  r = sim({ tran_diem: '-7' });
  assert.deepStrictEqual(j([r.data.total.sim_chinh_thuc, r.data.total.delta]), [30900000, -1340000]);
  // tham số đề án: cộng phụ trội vào thu nhập (không có phụ trội ở đợt này nên không đổi)
  r = sim({ param_key: 'pt_vao_thu_nhap', param_value: '1' });
  assert.strictEqual(r.data.total.delta, 0);
  assert.strictEqual(r.data.de_an, 'DA01-2026');
  // không ghi gì
  assert.strictEqual(j(e.run('Db.all("THU_NHAP_MOI").length')), 0);
  assert.strictEqual(j(e.run('Policy.bundle("DA01-2026").luong.HCM.lcb')), 6000000);
  // vẫn mô phỏng được khi đã có kết quả chốt
  assert.ok(e.api('calc.run', { ky_ma: DC }).ok);
  e.run('Db.tx(function(){ Db.updateMany("THU_NHAP_MOI", Db.all("THU_NHAP_MOI").map(function(x){return {id:x.id, patch:{trang_thai:"Đã chốt"}};}), "t"); })');
  assert.strictEqual(sim({ lcb_pct: '10' }).data.total.so_nv, 2);
  // kiểm tra đầu vào, kỳ hè, phân quyền
  assert.strictEqual(sim({}).code, 'BAD_REQUEST');
  assert.strictEqual(sim({ lcb_pct: '500' }).code, 'BAD_REQUEST');
  assert.strictEqual(sim({ param_key: 'khong_co', param_value: '1' }).code, 'BAD_REQUEST');
  assert.strictEqual(sim({ param_key: 'tn_toi_thieu', param_value: '' }).code, 'BAD_REQUEST');
  e.as('admin@vaschools.edu.vn');
  kyHe(e);
  assert.match(e.api('calc.simulate', { ky_ma: HE, kich_ban: { lcb_pct: '5' } }).error, /kỳ hè/);
  e.as('ht.hn@vaschools.edu.vn'); // chỉ có calc.view
  assert.strictEqual(sim({ lcb_pct: '10' }).code, 'FORBIDDEN');
});
