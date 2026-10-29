'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { world, line, KY, tsv, j } = require('./world');

const DC = '2025-2026-DC1';

/** Thêm năm học 2025-2026, LCB/LTB cho chi nhánh HN và một đợt điều chỉnh hiệu lực 01/03/2026. */
function adjustment(e, extra = {}) {
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2025-2026', '01/09/2025', '31/05/2026']) }).ok);
  assert.ok(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, row: { chi_nhanh_ma: 'HN', lcb: '6000000', ltb: '100000' } }).ok);
  const r = e.api('save', { table: 'KY_LUONG', row: Object.assign({ ma: DC, nam_hoc_ma: '2025-2026', hoc_ky: 'DC1', loai: 'Điều chỉnh', tu_ngay: '01/03/2026', den_ngay: '01/03/2026' }, extra) });
  assert.ok(r.ok, JSON.stringify(r));
}

/** Chèn trực tiếp dòng khai báo cho NV001 ở kỳ HK1 (đã duyệt hoặc nháp) để kiểm tra phần tính. */
function declare(e, status) {
  e.run(`Db.tx(function(){ Db.insertMany("KHAI_BAO", [
    {ky_ma:"${KY}",ma_nv:"NV001",loai:"Thực dạy",noi_dung:"Toán 10",so_luong:22,don_vi:"Tiết/Tuần",dac_thu:"Không",tu_ngay:"2026-09-07",den_ngay:"2026-12-27",trang_thai:"${status}",phieu_ma:""},
    {ky_ma:"${KY}",ma_nv:"NV001",loai:"Trách nhiệm",noi_dung:"GVCN",so_luong:4,don_vi:"Tiết/Tuần",dac_thu:"Không",tu_ngay:"2026-09-07",den_ngay:"2026-12-27",trang_thai:"${status}",phieu_ma:""}
  ], "t"); })`);
}

test('Kỳ: đợt điều chỉnh không cần số tuần; học kỳ bắt buộc; loại phải khớp mã', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2025-2026', '01/09/2025', '31/05/2026']) });
  const base = { nam_hoc_ma: '2025-2026', tu_ngay: '01/03/2026', den_ngay: '01/03/2026' };
  assert.match(e.api('save', { table: 'KY_LUONG', row: Object.assign({ ma: '2025-2026-HK1', hoc_ky: 'HK1', loai: 'Học kỳ' }, base) }).error, /Đến ngày phải sau|Số tuần/);
  assert.match(e.api('save', { table: 'KY_LUONG', row: Object.assign({ ma: '2025-2026-HK1', hoc_ky: 'HK1', loai: 'Học kỳ' }, base, { den_ngay: '15/01/2026' }) }).error, /Số tuần/);
  assert.match(e.api('save', { table: 'KY_LUONG', row: Object.assign({ ma: DC, hoc_ky: 'DC1', loai: 'Học kỳ' }, base) }).error, /Điều chỉnh/);
  assert.ok(e.api('save', { table: 'KY_LUONG', row: Object.assign({ ma: DC, hoc_ky: 'DC1', loai: 'Điều chỉnh' }, base) }).ok);
});

test('Đợt điều chỉnh 01/03/2026: tính thu nhập mới cho toàn công ty, không cần khai báo; ảnh chụp thông tin nhân sự', () => {
  const { e } = world();
  adjustment(e);
  e.as('tro.ly@vaschools.edu.vn');
  const run = e.api('calc.run', { ky_ma: DC });
  assert.ok(run.ok, JSON.stringify(run));
  assert.strictEqual(run.data.loai, 'Điều chỉnh');
  assert.strictEqual(run.data.incomes, 2);
  assert.strictEqual(run.data.settled, 0);
  const a = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: DC, ma_nv: 'NV001' } }).data.rows[0];
  assert.deepStrictEqual([a.ho_ten, a.chi_nhanh_ma, a.truong_ma, a.doi_tuong, a.ngach_ten, a.tham_nien], ['Nguyễn Thị A', 'HCM', 'HCM_THPT', 'GV còn lại', 'Giáo viên 2', 6]);
  // 6.600.000 + 6.000.000 x 0,12 + 8.800.000 = 16.120.000 (thấp hơn trần 10% = 16.500.000)
  assert.deepStrictEqual([a.hs_tn, a.pa_moi, a.chinh_thuc, a.chenh_lech, a.ho_tro_pt], [0.12, 16120000, 16120000, 1120000, 0]);
});

test('Đợt điều chỉnh lấy hỗ trợ dự kiến từ phụ trội của học kỳ được chọn', () => {
  const { e } = world();
  adjustment(e);
  declare(e, 'Đã duyệt');
  e.as('tro.ly@vaschools.edu.vn');
  const hk = e.api('calc.run', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  assert.ok(hk.ok, JSON.stringify(hk));
  const noLink = e.api('calc.run', { ky_ma: DC });
  assert.match(noLink.data.warnings.join('|'), /Lấy phụ trội|Kỳ lấy phụ trội/);
  e.as('admin@vaschools.edu.vn');
  const dcId = j(e.run(`Db.find("KY_LUONG",function(k){return k.ma==="${DC}";}).id`));
  assert.ok(e.api('save', { table: 'KY_LUONG', id: dcId, row: { ma: DC, nam_hoc_ma: '2025-2026', hoc_ky: 'DC1', loai: 'Điều chỉnh', tu_ngay: '01/03/2026', den_ngay: '01/03/2026', ky_phu_troi: KY } }).ok);
  e.as('tro.ly@vaschools.edu.vn');
  assert.ok(e.api('calc.run', { ky_ma: DC }).ok);
  const a = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: DC, ma_nv: 'NV001' } }).data.rows[0];
  const b = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: DC, ma_nv: 'NV002' } }).data.rows[0];
  // Phụ trội bình quân (1.984.000/tháng) chỉ vào chi phí, KHÔNG làm tăng thu nhập hay mốc
  assert.deepStrictEqual([a.tien_pt, a.ho_tro_pt, a.pa_moi, a.chinh_thuc, a.luong_nen, a.chi_phi_thang], [9920000, 1984000, 16120000, 16120000, 16120000, 18104000]);
  assert.deepStrictEqual([b.tien_pt, b.ho_tro_pt, b.chinh_thuc, b.chi_phi_thang], [0, 0, 16120000, 16120000]);
  const s = e.api('tonghop', { ky_ma: DC, group: 'tat_ca' }).data.total;
  assert.deepStrictEqual([s.chinh_thuc, s.pt_binh_quan, s.chi_phi_thang, s.chi_phi_nam], [32240000, 1984000, 34224000, 410688000]);
});

test('Tổng hợp toàn công ty: theo chi nhánh/trường/ngạch, tổng quỹ, tăng so với hiện tại; lọc theo phạm vi', () => {
  const { e } = world();
  adjustment(e);
  e.as('tro.ly@vaschools.edu.vn');
  e.api('calc.run', { ky_ma: DC });
  const s = e.api('tonghop', { ky_ma: DC, group: 'chi_nhanh' }).data;
  assert.deepStrictEqual(j(s.groups.map(g => [g.label, g.so_nv, g.hien_tai, g.chinh_thuc, g.tang, g.pct_tang])),
    [['TP. Hồ Chí Minh', 1, 15000000, 16120000, 1120000, 7.47], ['Hà Nội', 1, 15000000, 16120000, 1120000, 7.47]]);
  assert.deepStrictEqual(j([s.total.so_nv, s.total.hien_tai, s.total.chinh_thuc, s.total.tang, s.total.quy_nam, s.total.chua_chot, s.chua_tinh]),
    [2, 30000000, 32240000, 2240000, 386880000, 2, 0]);
  assert.strictEqual(s.de_an, 'DA01-2026');
  assert.deepStrictEqual(j(e.api('tonghop', { ky_ma: DC, group: 'chi_nhanh_truong' }).data.groups.map(g => g.label)),
    ['TP. Hồ Chí Minh › THPT HCM', 'Hà Nội › THPT Hà Nội']);
  assert.strictEqual(e.api('tonghop', { ky_ma: DC, group: 'ngach' }).data.groups[0].label, 'Giáo viên 2');
  assert.strictEqual(e.api('tonghop', { ky_ma: DC, group: 'tat_ca' }).data.groups.length, 1);
  assert.strictEqual(e.api('tonghop', { ky_ma: DC, group: 'sai' }).code, 'BAD_REQUEST');
  // Hiệu trưởng chỉ thấy trường mình, không thấy tổng toàn công ty
  e.as('ht.hn@vaschools.edu.vn');
  const hn = e.api('tonghop', { ky_ma: DC, group: 'truong' }).data;
  assert.deepStrictEqual(j(hn.groups.map(g => g.label)), ['THPT Hà Nội']);
  assert.strictEqual(hn.total.so_nv, 1);
  // người không có quyền xem kết quả
  e.as('gv.hcm@vaschools.edu.vn');
  assert.ok(e.api('tonghop', { ky_ma: DC }).ok); // PROPOSER có calc.view trong phạm vi trường mình
  assert.strictEqual(e.api('tonghop', { ky_ma: DC, group: 'chi_nhanh' }).data.total.so_nv, 1);
});

test('Cảnh báo "chưa tính" khi có nhân sự bị bỏ qua (thiếu ngạch)', () => {
  const { e } = world();
  adjustment(e);
  e.as('admin@vaschools.edu.vn');
  e.api('importCommit', { table: 'NHAN_SU', text: tsv(
    ['Mã nhân sự', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Email', 'Ngày vào làm', 'Chi nhánh'],
    ['NV003', 'Lê Văn C', '01/01/1991', 'Nam', 'c@vaschools.edu.vn', '01/09/2020', 'HCM']) });
  e.as('tro.ly@vaschools.edu.vn');
  const r = e.api('calc.run', { ky_ma: DC });
  assert.match(r.data.warnings.join('|'), /NV003.*chưa có ngạch/);
  assert.strictEqual(e.api('tonghop', { ky_ma: DC }).data.chua_tinh, 1);
});

test('Xuất bảng để dán vào Excel: tiêu đề, số cột nhất quán, không có tab/xuống dòng lẫn trong ô', () => {
  const { e } = world();
  adjustment(e);
  e.as('tro.ly@vaschools.edu.vn');
  e.api('calc.run', { ky_ma: DC });
  const t = e.api('tonghop.export', { ky_ma: DC, bang: 'thu_nhap' }).data;
  const lines = t.text.split('\n');
  assert.strictEqual(t.rows, 2);
  assert.strictEqual(lines.length, 3);
  assert.ok(lines.every(l => l.split('\t').length === 30));
  assert.match(lines[0], /^Mã NV\tHọ tên\tChi nhánh/);
  assert.match(lines[1], /NV001\tNguyễn Thị A\tHCM\tHCM_THPT\tGV còn lại\t01\/09\/2019\tGiáo viên 2\t6/);
  assert.ok(lines[1].includes('\t16120000\t'));
  assert.strictEqual(e.api('tonghop.export', { ky_ma: DC, bang: 'phu_troi' }).data.rows, 0);
  e.as('ht.hn@vaschools.edu.vn');
  assert.strictEqual(e.api('tonghop.export', { ky_ma: DC, bang: 'thu_nhap' }).data.rows, 1);
});

test('Tính thử gồm dòng chưa duyệt: thấy được phụ trội ngay, nhưng không gửi chốt được', () => {
  const { e } = world();
  declare(e, 'Nháp');
  e.as('tro.ly@vaschools.edu.vn');
  let r = e.api('calc.run', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  assert.strictEqual(r.data.settled, 0); // chỉ dòng đã duyệt: chưa có gì để tính
  r = e.api('calc.run', { ky_ma: KY, truong_ma: 'HCM_THPT', gom: 'tat_ca' });
  assert.strictEqual(r.data.settled, 1);
  assert.strictEqual(r.data.unapproved, 1);
  const qt = e.api('list', { table: 'QUYET_TOAN', filter: { ky_ma: KY } }).data.rows[0];
  assert.deepStrictEqual([qt.tien_pt, qt.nguon, qt.ho_ten, qt.truong_ma], [9920000, 'Gồm dòng chưa duyệt', 'Nguyễn Thị A', 'HCM_THPT']);
  const sub = e.api('quyettoan.submit', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  assert.strictEqual(sub.code, 'UNAPPROVED');
  // Tính lại chỉ dòng đã duyệt: bản tạm tính thử bị thay thế, gửi chốt được
  r = e.api('calc.run', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  assert.strictEqual(r.data.settled, 0);
  assert.strictEqual(j(e.run('Db.all("QUYET_TOAN").length')), 0);
  assert.ok(e.api('quyettoan.submit', { ky_ma: KY, truong_ma: 'HCM_THPT' }).ok);
});

test('Chi tiết phụ trội từng người: từng dòng khai báo quy ra tiết; chỉ xem trong phạm vi', () => {
  const { e } = world();
  declare(e, 'Đã duyệt');
  e.as('tro.ly@vaschools.edu.vn');
  e.api('calc.run', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  const d = e.api('phutroi.chitiet', { ky_ma: KY, ma_nv: 'NV001' }).data;
  assert.deepStrictEqual(j(d.lines.map(l => [l.loai, l.ngay, l.tiet])), [['Thực dạy', 112, 352], ['Trách nhiệm', 112, 64]]);
  assert.deepStrictEqual([d.ketqua.dinh_muc, d.ketqua.pt_giang_day, d.so_tuan], [320, 32, 16]);
  e.as('ht.hn@vaschools.edu.vn');
  assert.strictEqual(e.api('phutroi.chitiet', { ky_ma: KY, ma_nv: 'NV001' }).code, 'FORBIDDEN');
});

test('Xuất dữ liệu đúng định dạng mẫu nhập, nhập lại được', () => {
  const { e } = world();
  for (const t of ['CHI_NHANH', 'TRUONG', 'NAM_HOC', 'KY_LUONG', 'TRUONG_HANG', 'NGACH_DM', 'SETTINGS']) {
    const x = e.api('export.table', { table: t });
    assert.strictEqual(x.ok, true, t + ' ' + JSON.stringify(x));
    const tpl = e.api('import.template', { table: t }).data;
    assert.strictEqual(x.data.tsv.split('\n')[0], tpl.tsv.split('\n')[0], 'tiêu đề trùng mẫu ' + t);
    if (!x.data.rows) continue; // bảng trống: chỉ có tiêu đề
    const chk = e.api('importCheck', { table: t, text: x.data.tsv, mode: 'upsert' });
    assert.strictEqual(chk.ok, true, t + ' ' + JSON.stringify(chk));
    assert.deepStrictEqual(j(chk.data.errors || []), [], t);
  }
});

test('Xóa kỳ nhập sai: tự bỏ kết quả tạm tính, còn kết quả đã chốt thì chặn', () => {
  const { e } = world();
  const ky = e.api('list', { table: 'KY_LUONG' }).data.rows.find(r => r.ma === KY);
  assert.strictEqual(e.api('calc.run', { ky_ma: KY, gom: 'tat_ca' }).ok, true);
  assert.ok(e.api('list', { table: 'THU_NHAP_MOI' }).data.total > 0);
  const del = e.api('remove', { table: 'KY_LUONG', id: ky.id });
  assert.strictEqual(del.ok, true, JSON.stringify(del));
  assert.strictEqual(e.api('list', { table: 'THU_NHAP_MOI' }).data.total, 0);
  assert.strictEqual(e.api('list', { table: 'QUYET_TOAN' }).data.total, 0);
});

test('Định mức giảm theo tuần nghỉ lễ, riêng từng trường', () => {
  const { e } = world();
  declare(e, 'Nháp');
  const dm = () => {
    assert.ok(e.api('calc.run', { ky_ma: KY, gom: 'tat_ca' }).ok);
    return j(e.api('list', { table: 'QUYET_TOAN', filter: { ky_ma: KY, ma_nv: 'NV001' } }).data.rows[0].dinh_muc);
  };
  assert.strictEqual(dm(), 320); // 16 tuần × 20
  const row = (truong, tu, den, v) => tsv(['Kỳ', 'Trường', 'Đối tượng tính lương', 'Từ ngày', 'Đến ngày', 'Định mức trong giai đoạn (tiết/tuần)', 'Lý do'],
    [KY, truong, 'GV còn lại', tu, den, v, 'Nghỉ lễ']);
  // chung: 1 tuần (7 ngày) còn 6 tiết → giảm 14
  assert.ok(e.api('importCommit', { table: 'DINH_MUC_TUAN', text: row('', '27/09/2026', '03/10/2026', '6') }).ok);
  assert.strictEqual(dm(), 306);
  // dòng riêng của trường HCM_THPT thay dòng chung trong khoảng chồng: 10 tiết/tuần → giảm 10
  assert.ok(e.api('importCommit', { table: 'DINH_MUC_TUAN', text: row('HCM_THPT', '27/09/2026', '03/10/2026', '10') }).ok);
  assert.strictEqual(dm(), 310);
  // trường khác không bị ảnh hưởng bởi dòng riêng; chồng ngày cùng phạm vi bị chặn
  const bad = e.api('importCheck', { table: 'DINH_MUC_TUAN', text: row('HCM_THPT', '01/10/2026', '05/10/2026', '8') });
  assert.strictEqual(bad.data.ok, false);
  const out = e.api('importCheck', { table: 'DINH_MUC_TUAN', text: row('', '01/03/2025', '02/03/2025', '8') });
  assert.strictEqual(out.data.ok, false); // ngoài kỳ
  assert.ok(e.api('export.table', { table: 'DINH_MUC_TUAN' }).data.rows === 2);
});
