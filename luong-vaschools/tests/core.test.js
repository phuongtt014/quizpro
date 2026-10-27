'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createEnv } = require('./harness');

const j = (x) => JSON.parse(JSON.stringify(x));
const NBSP = ' ';

function fresh(email) { const e = createEnv({ email }); e.install(); return e; }
const tsv = (...rows) => rows.map(r => r.join('\t')).join('\n');

test('Csv: TSV, CSV có ngoặc kép, BOM, không trim', () => {
  const { ctx } = createEnv();
  let r = j(ctx.Csv.parse('a\tb\n 1 \t2\n'));
  assert.strictEqual(r.delim, '\t');
  assert.deepStrictEqual(r.rows[1].cells, [' 1 ', '2']);
  r = j(ctx.Csv.parse('﻿ma,ten\r\nA,"Xin ""chào"", bạn"\r\n'));
  assert.deepStrictEqual(r.rows[0].cells, ['ma', 'ten']);
  assert.deepStrictEqual(r.rows[1].cells, ['A', 'Xin "chào", bạn']);
  r = j(ctx.Csv.parse('a,b\n"x\ny",z'));
  assert.strictEqual(r.rows[1].cells[0], 'x\ny');
});

test('Strict.checkCell: bắt khoảng trắng thừa, NBSP, ký tự ẩn, NFD, 2 dấu cách', () => {
  const { ctx } = createEnv();
  const c = (s) => ctx.Strict.checkCell(s);
  assert.strictEqual(c('Giáo viên 1'), null);
  assert.match(c('HCM '), /thừa/);
  assert.match(c(' HCM'), /thừa/);
  assert.match(c('Giáo' + NBSP + 'viên'), /U\+00A0/);
  assert.match(c('a​b'), /U\+200B/);
  assert.match(c('Giáo viên'), /NFC/);
  assert.match(c('Giáo  viên'), /2 khoảng trắng/);
  assert.strictEqual(ctx.Strict.show('HCM ' + NBSP), 'HCM·[U+00A0]');
});

test('Strict.parseValue: số, tiền, %, ngày, enum', () => {
  const { ctx } = createEnv();
  const p = (col, raw) => j(ctx.Strict.parseValue(col, raw, { refSet: () => ({ A: true }) }));
  assert.deepStrictEqual(p({ t: 'num' }, '1,1'), { v: 1.1 });
  assert.ok(p({ t: 'num' }, '1.234,5').e);
  assert.deepStrictEqual(p({ t: 'money' }, '6.000.000'), { v: 6000000 });
  assert.deepStrictEqual(p({ t: 'money' }, '6000000'), { v: 6000000 });
  assert.ok(p({ t: 'money' }, '6,0').e);
  assert.deepStrictEqual(p({ t: 'pct' }, '5%'), { v: 0.05 });
  assert.deepStrictEqual(p({ t: 'pct' }, '0,05'), { v: 0.05 });
  assert.ok(p({ t: 'pct' }, '5').e);
  assert.deepStrictEqual(p({ t: 'date' }, '01/03/2026'), { v: '2026-03-01' });
  assert.deepStrictEqual(p({ t: 'date' }, '2026-03-01'), { v: '2026-03-01' });
  assert.ok(p({ t: 'date' }, '31/02/2026').e);
  assert.match(p({ t: 'enum', values: ['Nam', 'Nữ'] }, 'nu').e, /Nữ/);
  assert.match(p({ t: 'ref', ref: 'X.a' }, 'a').e, /"A"/);
  assert.ok(p({ t: 'email' }, 'A@x.vn').e);
});

test('Util: thâm niên tính số năm tròn (4 năm 11 tháng = 4)', () => {
  const { ctx } = createEnv();
  assert.strictEqual(ctx.Util.fullYears('2021-03-15', '2026-02-14'), 4);
  assert.strictEqual(ctx.Util.fullYears('2021-03-15', '2026-03-15'), 5);
  assert.strictEqual(ctx.Util.fullYears('2026-03-15', '2026-03-14'), 0);
  assert.strictEqual(ctx.Util.addDays('2026-03-01', -1), '2026-02-28');
});

test('Cài đặt: tạo đủ sheet và nạp dữ liệu đề án HP.ĐA.01', () => {
  const e = fresh();
  const n = j(e.run('({ngach: Db.all("NGACH_DM").length, dn: Db.all("DEAN_NGACH").length, qd: Db.all("DEAN_QUYDOI").length, tran: Db.all("DEAN_TRAN").length, par: Db.all("DEAN_PARAM").length})'));
  assert.deepStrictEqual(n, { ngach: 31, dn: 31, qd: 10, tran: 3, par: 15 });
  const b = j(e.run('Policy.bundle("DA01-2026")'));
  assert.deepStrictEqual(b.luong.HCM, { lcb: 6000000, ltb: 100000 });
  assert.strictEqual(b.ngach.GV3.hs_tiet, 1.3);
  assert.strictEqual(b.ngach.HT.hs_kpi, 1.8);
  assert.strictEqual(b.hangTruong[1].hs_hieu_truong, 0.6);
  assert.strictEqual(b.param.dinh_muc_tieu_hoc, 24);
  assert.strictEqual(j(e.run('Policy.effective("2026-03-01")')).ma, 'DA01-2026');
  assert.strictEqual(e.run('Policy.effective("2026-02-28")'), null);
  assert.deepStrictEqual(j(e.run('Policy.checkReady("DA01-2026")')), []);
});

test('Dữ liệu seed vượt qua chính bộ kiểm tra nghiêm ngặt', () => {
  const e = fresh();
  for (const t of ['CHI_NHANH', 'NGACH_DM', 'DEAN', 'DEAN_THAMSO', 'DEAN_NGACH', 'DEAN_HANGTRUONG', 'DEAN_QUYDOI', 'DEAN_TRAN', 'DEAN_PARAM']) {
    const res = j(e.run(`(function(){
      var T = SCHEMA["${t}"], rows = Db.all("${t}").map(function(r, i){
        var v = {}; T.cols.forEach(function(c){ v[c.k] = r[c.k] === "" ? "" : String(r[c.k]); });
        if (T.cols.some(function(c){return c.t==="pct";})) T.cols.forEach(function(c){ if(c.t==="pct") v[c.k] = String(r[c.k]); });
        return { n: i + 2, vals: v };
      });
      var res = Validate.rows("${t}", rows, T.ctx ? { de_an_ma: "DA01-2026" } : {}, { mode: "upsert", system: true });
      return { ok: res.ok, errors: res.errors.slice(0, 3) };
    })()`));
    assert.strictEqual(res.ok, true, t + ': ' + JSON.stringify(res.errors));
  }
});

test('Nhập CSV chi nhánh: dữ liệu sạch được nhập, nhiều chi nhánh một lần', () => {
  const e = fresh();
  const text = tsv(['Mã chi nhánh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['HN', 'Hà Nội', 'Hà Nội'], ['DN', 'Đà Nẵng', 'Đà Nẵng'], ['CT', 'Cần Thơ', 'Cần Thơ']);
  const chk = e.api('importCheck', { table: 'CHI_NHANH', text });
  assert.ok(chk.ok && chk.data.ok, JSON.stringify(chk));
  assert.strictEqual(chk.data.inserts, 3);
  const r = e.api('importCommit', { table: 'CHI_NHANH', text });
  assert.strictEqual(r.data.inserted, 3);
  assert.strictEqual(j(e.run('Db.all("CHI_NHANH").map(function(c){return c.ma;})')).join(), 'HCM,HN,DN,CT');
  assert.strictEqual(j(e.run('Db.find("CHI_NHANH", function(c){return c.ma==="HN";}).trang_thai')), 'Hoạt động');
});

test('Nhập CSV: khoảng trắng thừa/NBSP/sai danh mục -> báo lỗi và KHÔNG nhập dòng nào', () => {
  const e = fresh();
  e.api('importCommit', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['HN', 'Hà Nội', 'Hà Nội']) });
  const before = j(e.run('Db.all("TRUONG").length'));
  const text = tsv(
    ['Mã trường', 'Tên trường', 'Chi nhánh', 'Cấp học'],
    ['HN_TH', 'Tiểu học Hà Nội', 'HN', 'Tiểu học'],
    ['HN_THCS', 'THCS Hà Nội', 'HN ', 'THCS'],
    ['HN_THPT', 'THPT' + NBSP + 'Hà Nội', 'HN', 'THPT'],
    ['HN_X', 'Trường X', 'HN', 'thcs'],
    ['HN_Y', 'Trường Y', 'XX', 'THCS']);
  const r = e.api('importCheck', { table: 'TRUONG', text });
  assert.ok(r.ok);
  assert.strictEqual(r.data.ok, false);
  const msgs = r.data.errors.map(x => `${x.n}|${x.field}|${x.msg}`);
  assert.ok(msgs.some(m => m.startsWith('3|chi_nhanh_ma|') && /thừa/.test(m)), msgs.join('\n'));
  assert.ok(msgs.some(m => m.startsWith('4|ten|') && /U\+00A0/.test(m)));
  assert.ok(msgs.some(m => m.startsWith('5|cap_hoc|') && /THCS/.test(m)));
  assert.ok(msgs.some(m => m.startsWith('6|chi_nhanh_ma|')));
  const shown = r.data.errors.find(x => x.n === 3).value;
  assert.strictEqual(shown, 'HN·');
  const c = e.api('importCommit', { table: 'TRUONG', text });
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.code, 'VALIDATION');
  assert.strictEqual(j(e.run('Db.all("TRUONG").length')), before);
});

test('Nhập CSV: tiêu đề sai/thiếu/lặp được báo, trùng khóa với file và với dữ liệu có sẵn', () => {
  const e = fresh();
  let r = e.api('importCheck', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Tên chi nhánh ', 'Tỉnh/Thành phố'], ['A1', 'x', 'y']) });
  assert.match(r.data.errors[0].msg, /thừa/);
  r = e.api('importCheck', { table: 'CHI_NHANH', text: tsv(['Ma chi nhanh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['A1', 'x', 'y']) });
  assert.match(r.data.errors[0].msg, /Ý bạn là "Mã chi nhánh"/);
  r = e.api('importCheck', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Tên chi nhánh'], ['A1', 'x']) });
  assert.ok(r.data.errors.some(x => /Thiếu cột bắt buộc/.test(x.msg)));
  r = e.api('importCheck', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Mã chi nhánh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['A1', 'A1', 'x', 'y']) });
  assert.ok(r.data.errors.some(x => /lặp/.test(x.msg)));
  r = e.api('importCheck', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['HCM', 'x', 'y'], ['B1', 'x', 'y'], ['B1', 'x', 'y']) });
  assert.ok(r.data.errors.some(x => x.n === 2 && /Đã tồn tại/.test(x.msg)));
  assert.ok(r.data.errors.some(x => x.n === 4 && /Trùng khóa/.test(x.msg)));
  r = e.api('importCheck', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['HCM', 'Hồ Chí Minh mới', 'TP. Hồ Chí Minh']), mode: 'upsert' });
  assert.ok(r.data.ok && r.data.updates === 1);
});

function seedOrg(e) {
  e.api('importCommit', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['HN', 'Hà Nội', 'Hà Nội']) });
  const r = e.api('importCommit', { table: 'TRUONG', text: tsv(['Mã trường', 'Tên trường', 'Chi nhánh', 'Cấp học'],
    ['HCM_THPT', 'THPT HCM', 'HCM', 'THPT'], ['HN_THCS', 'THCS Hà Nội', 'HN', 'THCS'], ['HN_THPT', 'THPT Hà Nội', 'HN', 'THPT']) });
  assert.ok(r.ok, JSON.stringify(r));
}
const NS_HEAD = ['Mã nhân sự', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Email', 'Ngày vào làm', 'Chi nhánh', 'Trường', 'Đối tượng tính lương'];
const nsRow = (ma, ten, email, cn, tr, vao = '01/09/2019', dt = 'GV còn lại') => [ma, ten, '15/05/1990', 'Nữ', email, vao, cn, tr, dt];

test('Nhân sự: import, kiểm tra chéo trường–chi nhánh, email trùng, thâm niên & ngạch hiện tại', () => {
  const e = fresh();
  seedOrg(e);
  const bad = tsv(NS_HEAD,
    nsRow('NV001', 'Nguyễn Thị A', 'a@vaschools.edu.vn', 'HN', 'HN_THCS'),
    nsRow('NV002', 'Trần Văn B', 'b@vaschools.edu.vn', 'HN', 'HCM_THPT'),
    nsRow('NV003', 'Lê C', 'a@vaschools.edu.vn', 'HN', 'HN_THPT'));
  let r = e.api('importCheck', { table: 'NHAN_SU', text: bad });
  assert.ok(r.data.errors.some(x => x.n === 3 && /không phải "HN"/.test(x.msg)), JSON.stringify(r.data.errors));
  assert.ok(r.data.errors.some(x => x.n === 4 && x.field === 'email' && /Trùng/.test(x.msg)));
  const good = tsv(NS_HEAD,
    nsRow('NV001', 'Nguyễn Thị A', 'a@vaschools.edu.vn', 'HN', 'HN_THCS', '15/03/2021'),
    nsRow('NV002', 'Trần Văn B', 'b@vaschools.edu.vn', 'HN', 'HN_THPT'));
  r = e.api('importCommit', { table: 'NHAN_SU', text: good });
  assert.strictEqual(r.data.inserted, 2);

  const ng = tsv(['Mã nhân sự', 'Ngạch', 'Hiệu lực từ', 'Hiệu lực đến', 'Số quyết định'],
    ['NV001', 'GV1', '15/03/2021', '28/02/2026', 'QĐ-1'], ['NV001', 'GV2', '01/03/2026', '', 'QĐ-2']);
  r = e.api('importCommit', { table: 'QUA_TRINH_NGACH', text: ng });
  assert.strictEqual(r.data.inserted, 2, JSON.stringify(r));
  const list = e.api('list', { table: 'NHAN_SU', q: 'nguyen thi a' });
  assert.strictEqual(list.data.total, 1);
  assert.strictEqual(list.data.rows[0].ngach_hien_tai, 'Giáo viên 2');
  assert.ok(list.data.rows[0].tham_nien >= 5);
});

test('Quá trình ngạch: chồng chéo bị chặn; form tự đóng bản ghi cũ', () => {
  const e = fresh();
  seedOrg(e);
  e.api('importCommit', { table: 'NHAN_SU', text: tsv(NS_HEAD, nsRow('NV001', 'Nguyễn Thị A', 'a@vaschools.edu.vn', 'HN', 'HN_THCS')) });
  const hd = ['Mã nhân sự', 'Ngạch', 'Hiệu lực từ', 'Hiệu lực đến'];
  assert.ok(e.api('importCommit', { table: 'QUA_TRINH_NGACH', text: tsv(hd, ['NV001', 'GV1', '01/09/2019', '']) }).ok);
  let r = e.api('importCheck', { table: 'QUA_TRINH_NGACH', text: tsv(hd, ['NV001', 'GV2', '01/03/2026', '']) });
  assert.ok(r.data.errors.some(x => /trùng/.test(x.msg)), JSON.stringify(r.data.errors));
  r = e.api('importCheck', { table: 'QUA_TRINH_NGACH', text: tsv(hd, ['NV001', 'GV2', '01/03/2026', '31/12/2025']) });
  assert.ok(r.data.errors.some(x => /Hiệu lực đến phải/.test(x.msg)));

  r = e.api('save', { table: 'QUA_TRINH_NGACH', row: { ma_nv: 'NV001', ngach_ma: 'GV2', hieu_luc_tu: '01/03/2026', hieu_luc_den: '' }, autoClose: false });
  assert.strictEqual(r.ok, false);
  r = e.api('save', { table: 'QUA_TRINH_NGACH', row: { ma_nv: 'NV001', ngach_ma: 'GV2', hieu_luc_tu: '01/03/2026', hieu_luc_den: '' }, autoClose: true });
  assert.ok(r.ok, JSON.stringify(r));
  const rows = j(e.run('Db.all("QUA_TRINH_NGACH").map(function(x){return x.ngach_ma+":"+x.hieu_luc_tu+">"+x.hieu_luc_den;})'));
  assert.deepStrictEqual(rows, ['GV1:2019-09-01>2026-02-28', 'GV2:2026-03-01>']);
});

test('Đề án: nhân bản, sửa bản nháp, ban hành tự đóng bản cũ, khóa bản đã ban hành', () => {
  const e = fresh();
  let r = e.api('save', { table: 'DEAN_PARAM', ctx: { de_an_ma: 'DA01-2026' }, row: { khoa: 'dinh_muc_khac', gia_tri: '21' } });
  assert.strictEqual(r.code, 'LOCKED');
  r = e.api('dean.clone', { src: 'DA01-2026', ma: 'DA02-2027', so_hieu: 'HP.ĐA.02', ten: 'Đề án 2027', hieu_luc_tu: '01/09/2027' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(r.data.copied > 60);

  // Đổi LCB ở bản nháp, bản cũ giữ nguyên
  const row = e.api('list', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA02-2027' } }).data.rows[0];
  r = e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA02-2027' }, id: row.id, row: { chi_nhanh_ma: 'HCM', lcb: '6.500.000', ltb: '110000' } });
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(j(e.run('Policy.bundle("DA01-2026").luong.HCM.lcb')), 6000000);
  assert.strictEqual(j(e.run('Policy.bundle("DA02-2027").luong.HCM.lcb')), 6500000);

  // Thêm chi nhánh mới thì chưa ban hành được cho tới khi có LCB
  e.api('importCommit', { table: 'CHI_NHANH', text: tsv(['Mã chi nhánh', 'Tên chi nhánh', 'Tỉnh/Thành phố'], ['HN', 'Hà Nội', 'Hà Nội']) });
  r = e.api('dean.publish', { ma: 'DA02-2027' });
  assert.strictEqual(r.code, 'NOT_READY');
  assert.ok(r.details.some(x => /HN/.test(x)));
  e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA02-2027' }, row: { chi_nhanh_ma: 'HN', lcb: '6200000', ltb: '105000' } });
  r = e.api('dean.publish', { ma: 'DA02-2027' });
  assert.ok(r.ok, JSON.stringify(r));

  const d = j(e.run('Db.all("DEAN").map(function(x){return x.ma+":"+x.trang_thai+":"+x.hieu_luc_tu+">"+x.hieu_luc_den;})'));
  assert.deepStrictEqual(d, ['DA01-2026:Ban hành:2026-03-01>2027-08-31', 'DA02-2027:Ban hành:2027-09-01>']);
  assert.strictEqual(j(e.run('Policy.effective("2027-08-31").ma')), 'DA01-2026');
  assert.strictEqual(j(e.run('Policy.effective("2027-09-01").ma')), 'DA02-2027');
  const thamsoId = j(e.run('Db.find("DEAN_THAMSO",function(x){return x.de_an_ma==="DA02-2027"&&x.chi_nhanh_ma==="HN";}).id'));
  assert.strictEqual(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA02-2027' }, id: thamsoId, row: { chi_nhanh_ma: 'HN', lcb: '1', ltb: '1' } }).code, 'LOCKED');
  assert.strictEqual(e.api('remove', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA02-2027' }, id: thamsoId }).code, 'LOCKED');
  assert.strictEqual(e.api('save', { table: 'DEAN_NGACH', ctx: { de_an_ma: 'DA02-2027' }, row: { ngach_ma: 'GV1', hs_chuc_danh: '9' } }).code, 'LOCKED');
  assert.strictEqual(e.api('remove', { table: 'DEAN', id: j(e.run('Db.all("DEAN")[1].id')) }).code, 'LOCKED');
  // thông báo trong ứng dụng + email
  assert.ok(e.api('notify.list').data.items.some(n => /ban hành/.test(n.title)));
  assert.ok(e.mails.length >= 1 && /ban hành/.test(e.mails[0].subject));
});

test('Đề án: xóa bản nháp xóa luôn bảng con; không ban hành bản nháp hiệu lực trước bản đang chạy', () => {
  const e = fresh();
  e.api('dean.clone', { src: 'DA01-2026', ma: 'NHAP1', so_hieu: 'X', ten: 'Nháp', hieu_luc_tu: '01/01/2026' });
  let r = e.api('dean.publish', { ma: 'NHAP1' });
  assert.strictEqual(r.code, 'OVERLAP');
  r = e.api('remove', { table: 'DEAN', id: j(e.run('Db.find("DEAN",function(x){return x.ma==="NHAP1";}).id')) });
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(j(e.run('Db.all("DEAN_NGACH").filter(function(x){return x.de_an_ma==="NHAP1";}).length')), 0);
  assert.strictEqual(j(e.run('Db.all("DEAN_NGACH").filter(function(x){return x.de_an_ma==="DA01-2026";}).length')), 31);
});

test('Phân quyền theo phạm vi: Hiệu trưởng chỉ thấy/ghi nhân sự trường mình; nhân sự chỉ thấy mình', () => {
  const e = fresh();
  seedOrg(e);
  e.api('importCommit', { table: 'NHAN_SU', text: tsv(NS_HEAD,
    nsRow('NV001', 'A', 'a@vaschools.edu.vn', 'HN', 'HN_THCS'),
    nsRow('NV002', 'B', 'b@vaschools.edu.vn', 'HN', 'HN_THPT'),
    nsRow('NV003', 'C', 'c@vaschools.edu.vn', 'HCM', 'HCM_THPT')) });
  e.api('importCommit', { table: 'THU_NHAP_NEN', text: tsv(['Mã nhân sự', 'Thu nhập/tháng', 'Hiệu lực từ'], ['NV001', '15.000.000', '01/01/2026'], ['NV002', '18.000.000', '01/01/2026']) });
  e.api('importCommit', { table: 'USERS', text: tsv(['Email', 'Họ tên', 'Mã nhân sự'], ['ht.hn@vaschools.edu.vn', 'HT Hà Nội', 'NV001'], ['nv2@vaschools.edu.vn', 'B', 'NV002'], ['x@vaschools.edu.vn', 'X', '']) });
  const g = tsv(['Email', 'Vai trò', 'Phạm vi dữ liệu', 'Mã chi nhánh/trường'],
    ['ht.hn@vaschools.edu.vn', 'PRINCIPAL', 'Trường', 'HN_THCS'], ['nv2@vaschools.edu.vn', 'EMPLOYEE', 'Cá nhân', '']);
  const rg = e.api('importCommit', { table: 'USER_ROLES', text: g });
  assert.ok(rg.ok, JSON.stringify(rg));

  e.as('ht.hn@vaschools.edu.vn');
  let r = e.api('list', { table: 'NHAN_SU' });
  assert.deepStrictEqual(j(r.data.rows.map(x => x.ma_nv)), ['NV001']);
  r = e.api('list', { table: 'THU_NHAP_NEN' });
  assert.deepStrictEqual(j(r.data.rows.map(x => x.ma_nv)), ['NV001']);
  assert.strictEqual(e.api('save', { table: 'NHAN_SU', row: { ma_nv: 'NV009', ho_ten: 'Z', ngay_sinh: '01/01/1990', gioi_tinh: 'Nam', ngay_vao_lam: '01/09/2020', chi_nhanh_ma: 'HN', truong_ma: 'HN_THPT', doi_tuong: 'GV còn lại' } }).ok, false);
  assert.strictEqual(e.api('list', { table: 'USERS' }).code, 'FORBIDDEN');
  assert.strictEqual(e.api('list', { table: 'AUDIT_LOG' }).code, 'FORBIDDEN');
  assert.strictEqual(e.api('dean.publish', { ma: 'DA01-2026' }).code, 'FORBIDDEN');
  assert.strictEqual(e.api('save', { table: 'THU_NHAP_NEN', row: { ma_nv: 'NV001', thu_nhap: '1', hieu_luc_tu: '01/01/2030' } }).code, 'FORBIDDEN');

  e.as('nv2@vaschools.edu.vn');
  r = e.api('list', { table: 'NHAN_SU' });
  assert.deepStrictEqual(j(r.data.rows.map(x => x.ma_nv)), ['NV002']);
  assert.deepStrictEqual(j(e.api('list', { table: 'THU_NHAP_NEN' }).data.rows.map(x => x.thu_nhap)), [18000000]);
  assert.strictEqual(e.api('save', { table: 'NHAN_SU', id: r.data.rows[0].id, row: { ho_ten: 'Sửa' } }).code, 'FORBIDDEN');

  e.as('x@vaschools.edu.vn'); // có tài khoản nhưng chưa có vai trò
  assert.strictEqual(e.api('list', { table: 'NHAN_SU' }).code, 'FORBIDDEN');
  e.as('la@gmail.com'); // không có trong hệ thống
  assert.strictEqual(e.api('me').code, 'FORBIDDEN');
  e.as('');
  assert.strictEqual(e.api('me').code, 'FORBIDDEN');
});

test('Ma trận quyền: đổi quyền vai trò có hiệu lực; ADMIN không chỉnh được; không gỡ admin cuối', () => {
  const e = fresh();
  assert.strictEqual(e.api('roles.save', { role: 'ADMIN', perms: [] }).code, 'LOCKED');
  assert.strictEqual(e.api('roles.save', { role: 'HR_STAFF', perms: ['khong.co'] }).code, 'BAD_REQUEST');
  assert.ok(e.api('roles.save', { role: 'HR_STAFF', perms: ['staff.view'] }).ok);
  assert.deepStrictEqual(j(e.run('Db.filter("ROLE_PERMS",function(x){return x.role_ma==="HR_STAFF";}).map(function(x){return x.quyen;})')), ['staff.view']);
  const id = j(e.run('Db.all("USER_ROLES")[0].id'));
  assert.strictEqual(e.api('remove', { table: 'USER_ROLES', id }).code, 'LAST_ADMIN');
});

test('Xóa có kiểm tra tham chiếu; khóa không đổi mã đã tạo', () => {
  const e = fresh();
  seedOrg(e);
  const cn = j(e.run('Db.find("CHI_NHANH",function(x){return x.ma==="HN";}).id'));
  let r = e.api('remove', { table: 'CHI_NHANH', id: cn });
  assert.strictEqual(r.code, 'IN_USE');
  assert.match(r.error, /Trường/);
  r = e.api('save', { table: 'CHI_NHANH', id: cn, row: { ma: 'HN2', ten: 'Hà Nội', tinh: 'Hà Nội' } });
  assert.strictEqual(r.code, 'LOCKED_KEY');
  r = e.api('save', { table: 'CHI_NHANH', id: cn, row: { ma: 'HN', ten: 'Hà Nội (mới)', tinh: 'Hà Nội' } });
  assert.ok(r.ok, JSON.stringify(r));
});

test('Hạng trường: số lớp phải khớp hạng theo đề án', () => {
  const e = fresh();
  seedOrg(e);
  e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2026-2027', '01/09/2026', '31/05/2027']) });
  let r = e.api('save', { table: 'TRUONG_HANG', row: { truong_ma: 'HN_THCS', nam_hoc_ma: '2026-2027', hang: '1', so_lop: '20' } });
  assert.match(r.error, /hạng trường phải là 2/);
  r = e.api('save', { table: 'TRUONG_HANG', row: { truong_ma: 'HN_THCS', nam_hoc_ma: '2026-2027', hang: '2', so_lop: '20' } });
  assert.ok(r.ok, JSON.stringify(r));
  r = e.api('importCommit', { table: 'KY_LUONG', text: tsv(['Mã kỳ', 'Năm học', 'Học kỳ', 'Từ ngày', 'Đến ngày', 'Số tuần quy định'],
    ['2026-2027-HK1', '2026-2027', 'HK1', '01/09/2026', '15/01/2027', '18']) });
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(j(e.run('Db.all("KY_LUONG")[0].so_thang_chia')), 5);
});

test('Nhật ký ghi lại thay đổi; email lỗi không làm hỏng thao tác', () => {
  const e = fresh();
  e.failMail = true;
  const r = e.api('dean.clone', { src: 'DA01-2026', ma: 'DA02', so_hieu: 'X', ten: 'Y', hieu_luc_tu: '01/09/2027' });
  assert.ok(r.ok);
  e.failMail = false;
  const acts = j(e.run('Db.all("AUDIT_LOG").map(function(x){return x.hanh_dong;})'));
  assert.ok(acts.includes('KHOI_TAO') && acts.includes('NHAN_BAN_DE_AN'));
});

test('Email lỗi được ghi nhật ký, giao diện vẫn thành công', () => {
  const e = fresh();
  e.api('dean.clone', { src: 'DA01-2026', ma: 'DA02', so_hieu: 'X', ten: 'Y', hieu_luc_tu: '01/09/2027' });
  e.api('dean.check', { ma: 'DA02' });
  e.failMail = true;
  const r = e.api('dean.publish', { ma: 'DA02' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(j(e.run('Db.all("AUDIT_LOG").map(function(x){return x.hanh_dong;})')).includes('EMAIL_LOI'));
  assert.ok(e.api('notify.list').data.items.length >= 1);
});

test('Hàm cài đặt chỉ chủ dự án chạy được', () => {
  const e = createEnv({ email: 'ai.do@vaschools.edu.vn' });
  assert.throws(() => e.run('setupInstall()'), /chủ dự án/);
});
