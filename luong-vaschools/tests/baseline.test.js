'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { world, approveAll, KY, tsv, j } = require('./world');

const DC1 = '2025-2026-DC1', DC2 = '2026-2027-DC1';

function setup() {
  const w = world(), e = w.e;
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2025-2026', '01/09/2025', '31/05/2026']) }).ok);
  assert.ok(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, row: { chi_nhanh_ma: 'HN', lcb: '6000000', ltb: '100000' } }).ok);
  const dc = (ma, nam, hk, ngay) => assert.ok(e.api('save', { table: 'KY_LUONG', row: { ma, nam_hoc_ma: nam, hoc_ky: hk, loai: 'Điều chỉnh', tu_ngay: ngay, den_ngay: ngay } }).ok);
  dc(DC1, '2025-2026', 'DC1', '01/03/2026');
  dc(DC2, '2026-2027', 'DC1', '01/03/2027');
  return w;
}

const baseline = (e, ma) => j(e.run(`Db.filter("THU_NHAP_NEN",function(x){return x.ma_nv==="${ma}";}).sort(function(a,b){return a.hieu_luc_tu<b.hieu_luc_tu?-1:1;}).map(function(x){return x.hieu_luc_tu+">"+x.hieu_luc_den+":"+x.thu_nhap;})`));

function closeAdjustment(e, ky) {
  e.as('tro.ly@vaschools.edu.vn');
  assert.ok(e.api('calc.run', { ky_ma: ky }).ok);
  assert.ok(e.api('quyettoan.submit', { ky_ma: ky, truong_ma: 'HCM_THPT' }).ok);
  const id = e.api('phieu.list', { tab: 'cua_toi' }).data.rows.find(x => x.ky === ky).id;
  approveAll(e, id, ['ht.hcm', 'nhansu', 'tgd']);
  return id;
}

test('Chốt đợt Điều chỉnh: mức lương chính thức thành "Thu nhập hiện tại" mới, hiệu lực từ ngày hiệu lực của đợt', () => {
  const { e } = setup();
  const id = closeAdjustment(e, DC1);
  assert.deepStrictEqual(baseline(e, 'NV001'), ['2026-01-01>2026-02-28:15000000', '2026-03-01>:16120000']);
  assert.deepStrictEqual(baseline(e, 'NV002'), ['2026-01-01>:15000000']); // chưa chốt trường HN thì chưa đổi
  const note = j(e.run('Db.find("THU_NHAP_NEN",function(x){return x.ma_nv==="NV001"&&x.hieu_luc_tu==="2026-03-01";}).ghi_chu'));
  assert.match(note, /Từ chốt 2025-2026-DC1 \(PH-/);
  // người tạo phiếu được báo
  e.as('tro.ly@vaschools.edu.vn');
  assert.ok(e.api('notify.list').data.items.some(n => /đã được duyệt/.test(n.title) && /1 mốc "Thu nhập hiện tại" hiệu lực từ 01\/03\/2026/.test(n.body)));
  assert.ok(j(e.run('Db.all("AUDIT_LOG").map(function(x){return x.hanh_dong;})')).includes('TAO_MOC_THU_NHAP'));
  assert.ok(id);
});

test('Đợt Điều chỉnh năm sau so với kết quả đợt liền kề trước; học kỳ cùng năm không cộng dồn trần', () => {
  const { e } = setup();
  closeAdjustment(e, DC1);

  // Học kỳ 1 năm 2026-2027: vẫn so với mốc TRƯỚC đợt điều chỉnh 01/03/2026 (15.000.000), không phải 16.120.000
  e.run(`Db.tx(function(){ Db.insertMany("KHAI_BAO", [{ky_ma:"${KY}",ma_nv:"NV001",loai:"Thực dạy",noi_dung:"Toán",so_luong:22,don_vi:"Tiết/Tuần",dac_thu:"Không",tu_ngay:"2026-09-07",den_ngay:"2026-12-27",trang_thai:"Đã duyệt",phieu_ma:""}], "t"); })`);
  e.as('tro.ly@vaschools.edu.vn');
  assert.ok(e.api('calc.run', { ky_ma: KY, truong_ma: 'HCM_THPT' }).ok);
  const hk = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: KY, ma_nv: 'NV001' } }).data.rows[0];
  assert.strictEqual(hk.thu_nhap_hien_tai, 15000000);

  // Đợt điều chỉnh 01/03/2027: mốc = kết quả chốt 01/03/2026 (16.120.000); thâm niên 7 năm => HS thâm niên 0,14
  assert.ok(e.api('calc.run', { ky_ma: DC2 }).ok);
  const a = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: DC2, ma_nv: 'NV001' } }).data.rows[0];
  const b = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: DC2, ma_nv: 'NV002' } }).data.rows[0];
  assert.deepStrictEqual([a.thu_nhap_hien_tai, a.tham_nien, a.pa_moi, a.chenh_lech, a.ty_le_tran, a.max_income, a.chinh_thuc],
    [16120000, 7, 16240000, 120000, 0.1, 17732000, 16240000]);
  assert.strictEqual(b.thu_nhap_hien_tai, 15000000); // HN chưa chốt đợt trước nên vẫn mốc cũ
  assert.strictEqual(b.chinh_thuc, 16240000);

  // Chốt đợt 2027 nối tiếp lịch sử, không chồng chéo
  assert.ok(e.api('quyettoan.submit', { ky_ma: DC2, truong_ma: 'HCM_THPT' }).ok);
  const id = e.api('phieu.list', { tab: 'cua_toi' }).data.rows.find(x => x.ky === DC2).id;
  approveAll(e, id, ['ht.hcm', 'nhansu', 'tgd']);
  assert.deepStrictEqual(baseline(e, 'NV001'), ['2026-01-01>2026-02-28:15000000', '2026-03-01>2027-02-28:16120000', '2027-03-01>:16240000']);
});

test('Chốt học kỳ không tạo mốc; mốc đã có cùng ngày được giữ nguyên và báo bỏ qua', () => {
  const { e } = setup();
  // mốc nhập tay trùng ngày hiệu lực của đợt
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('save', { table: 'THU_NHAP_NEN', autoClose: true, row: { ma_nv: 'NV001', thu_nhap: '99000000', hieu_luc_tu: '01/03/2026', ghi_chu: 'nhập tay' } }).ok);
  closeAdjustment(e, DC1);
  assert.deepStrictEqual(baseline(e, 'NV001'), ['2026-01-01>2026-02-28:15000000', '2026-03-01>:99000000']);
  const log = j(e.run('Db.all("AUDIT_LOG").filter(function(x){return x.hanh_dong==="TAO_MOC_THU_NHAP";}).map(function(x){return x.chi_tiet;})'));
  assert.match(log.join('|'), /NV001: đã có mốc hiệu lực 01\/03\/2026, giữ nguyên/);

  // học kỳ: chốt xong không thêm mốc
  e.run(`Db.tx(function(){ Db.insertMany("KHAI_BAO", [{ky_ma:"${KY}",ma_nv:"NV001",loai:"Thực dạy",noi_dung:"Toán",so_luong:22,don_vi:"Tiết/Tuần",dac_thu:"Không",tu_ngay:"2026-09-07",den_ngay:"2026-12-27",trang_thai:"Đã duyệt",phieu_ma:""}], "t"); })`);
  const before = j(e.run('Db.all("THU_NHAP_NEN").length'));
  closeAdjustment(e, KY);
  assert.strictEqual(j(e.run('Db.all("THU_NHAP_NEN").length')), before);
});

test('Tham số đề án pt_vao_thu_nhap: tồn tại ở mọi phiên bản (kể cả bản đã ban hành) sau nâng cấp', () => {
  const { e } = world();
  e.run(`Db.tx(function(){ Db.removeMany("DEAN_PARAM", Db.filter("DEAN_PARAM", function(x){return x.khoa==="pt_vao_thu_nhap";}).map(function(x){return x.id;})); })`);
  assert.match(j(e.run('Policy.checkReady("DA01-2026")')).join('|'), /pt_vao_thu_nhap/);
  assert.strictEqual(j(e.run('Seed.upgrade().thamSoMoi')), 1);
  assert.ok(!j(e.run('Policy.checkReady("DA01-2026")')).join('|').includes('pt_vao_thu_nhap'));
  assert.strictEqual(j(e.run('Policy.bundle("DA01-2026").param.pt_vao_thu_nhap')), 0);
});
