'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { world, tsv, j } = require('./world');

const reads = (e) => { const r = e.reads, n = e.sheetReads; return { n, r: Object.assign({}, r) }; };
const reset = (e) => { e.sheetReads = 0; e.reads = {}; };

test('Bộ nhớ đệm: lần đầu đọc trang tính, các lần sau (lượt chạy mới) không đọc lại', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  e.api('list', { table: 'NHAN_SU' }); // làm nóng đệm
  reset(e);
  const r = e.api('list', { table: 'NHAN_SU' });
  assert.ok(r.ok);
  assert.strictEqual(r.data.total, 2);
  assert.deepStrictEqual(reads(e), { n: 0, r: {} });
  assert.ok(typeof r.ms === 'number');
});

test('Ghi dữ liệu chỉ làm mới bảng bị ghi; người khác thấy ngay dữ liệu mới', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  e.api('list', { table: 'CHI_NHANH' }); e.api('list', { table: 'TRUONG' });
  e.as('tro.ly@vaschools.edu.vn');
  assert.strictEqual(e.api('list', { table: 'CHI_NHANH' }).data.total, 2); // tro.ly nạp đệm
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('save', { table: 'CHI_NHANH', row: { ma: 'DN', ten: 'Đà Nẵng', tinh: 'Đà Nẵng' } }).ok);
  reset(e);
  assert.strictEqual(e.api('list', { table: 'TRUONG' }).data.total, 2);
  assert.deepStrictEqual(reads(e), { n: 0, r: {} });            // bảng khác vẫn từ đệm
  reset(e);
  e.as('tro.ly@vaschools.edu.vn');
  assert.strictEqual(e.api('list', { table: 'CHI_NHANH' }).data.total, 3); // người khác thấy ngay bản ghi mới
  assert.deepStrictEqual(reads(e).r, { CHI_NHANH: 1 });                    // và chỉ đọc lại đúng bảng đó
  reset(e);
  e.api('list', { table: 'CHI_NHANH' });
  assert.strictEqual(reads(e).n, 0);                                        // lần sau lại từ đệm
});

test('Sửa và xóa cũng làm mới đệm', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  const id = j(e.api('list', { table: 'CHI_NHANH' }).data.rows.find(x => x.ma === 'HN').id);
  assert.ok(e.api('save', { table: 'CHI_NHANH', id, row: { ma: 'HN', ten: 'Hà Nội (mới)', tinh: 'Hà Nội' } }).ok);
  assert.strictEqual(e.api('list', { table: 'CHI_NHANH' }).data.rows.find(x => x.ma === 'HN').ten, 'Hà Nội (mới)');
  assert.ok(e.api('save', { table: 'CHI_NHANH', row: { ma: 'ZZ', ten: 'Tạm', tinh: 'Tạm' } }).ok);
  const zz = e.api('list', { table: 'CHI_NHANH' }).data.rows.find(x => x.ma === 'ZZ').id;
  assert.ok(e.api('remove', { table: 'CHI_NHANH', id: zz }).ok);
  assert.ok(!e.api('list', { table: 'CHI_NHANH' }).data.rows.some(x => x.ma === 'ZZ'));
  assert.strictEqual(e.api('list', { table: 'CHI_NHANH' }).data.total, 2);
});

test('Bảng lớn vượt giới hạn 100KB/khóa được chia khối; đọc lại từ đệm đủ và đúng', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  e.run(`Db.tx(function(){ var rows=[]; for (var i=0;i<900;i++) rows.push({ma_nv:"X"+i, ho_ten:"Nhân sự số "+i+" Nguyễn Thị Hương", ngay_sinh:"1990-01-01", gioi_tinh:"Nữ",
    email:"x"+i+"@vaschools.edu.vn", dien_thoai:"", ngay_vao_lam:"2020-09-01", chi_nhanh_ma:"HCM", truong_ma:"HCM_THPT", to_chuyen_mon:"Tổ Toán", doi_tuong:"GV còn lại",
    trang_thai:"Đang làm việc", ngay_nghi_viec:""}); Db.insertMany("NHAN_SU", rows, "t"); })`);
  assert.strictEqual(e.api('list', { table: 'NHAN_SU' }).data.total, 902);
  const chunks = [...e.cache.keys()].filter(k => k.startsWith('d:NHAN_SU:')).length;
  assert.ok(chunks >= 5, 'số khối: ' + chunks);
  reset(e);
  const r = e.api('list', { table: 'NHAN_SU', q: 'Nhân sự số 899' });
  assert.strictEqual(r.data.total, 1);
  assert.strictEqual(r.data.rows[0].email, 'x899@vaschools.edu.vn');
  assert.strictEqual(reads(e).n, 0);
});

test('Đệm hỏng/không khả dụng: ứng dụng vẫn chạy đúng (chỉ chậm hơn)', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  e.cacheFail = true;
  reset(e);
  const r = e.api('list', { table: 'NHAN_SU' });
  assert.ok(r.ok);
  assert.strictEqual(r.data.total, 2);
  assert.ok(reads(e).n >= 4);
  assert.ok(e.api('save', { table: 'CHI_NHANH', row: { ma: 'DN', ten: 'Đà Nẵng', tinh: 'Đà Nẵng' } }).ok);
  e.cacheFail = false;
  assert.strictEqual(e.api('list', { table: 'CHI_NHANH' }).data.total, 3);
});

test('Sửa trực tiếp trong Google Sheet cần "cache.flush"; chỉ người có quyền thiết lập được xóa đệm', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  e.api('list', { table: 'CHI_NHANH' });
  const sheet = e.sheet('CHI_NHANH'), head = sheet.data[0], col = head.indexOf('ten');
  sheet.data[1][col] = 'Sửa tay trong Sheet';
  assert.notStrictEqual(e.api('list', { table: 'CHI_NHANH' }).data.rows[0].ten, 'Sửa tay trong Sheet'); // đệm chưa biết
  e.as('ht.hcm@vaschools.edu.vn');
  assert.strictEqual(e.api('cache.flush').code, 'FORBIDDEN');
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('cache.flush').ok);
  assert.strictEqual(e.api('list', { table: 'CHI_NHANH' }).data.rows[0].ten, 'Sửa tay trong Sheet');
});

test('boot gộp me + schema; batch gộp nhiều thao tác đọc nhưng vẫn kiểm tra quyền từng mục', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  const b = e.api('boot');
  assert.ok(b.ok && b.data.me.email === 'admin@vaschools.edu.vn' && b.data.schema.tables.NHAN_SU);
  const r = e.api('batch', { calls: [{ name: 'list', payload: { table: 'CHI_NHANH' } }, { name: 'list', payload: { table: 'TRUONG' } },
    { name: 'save', payload: { table: 'CHI_NHANH', row: { ma: 'XX', ten: 'x', tinh: 'x' } } }, { name: 'list', payload: { table: 'USERS' } }] });
  assert.ok(r.ok);
  assert.deepStrictEqual(j(r.data.map(x => x.ok)), [true, true, false, true]);
  assert.strictEqual(r.data[0].data.total, 2);
  assert.match(r.data[2].error, /Không cho phép/);
  assert.strictEqual(j(e.run('Db.all("CHI_NHANH").some(function(x){return x.ma==="XX";})')), false);
  e.as('ht.hcm@vaschools.edu.vn'); // hiệu trưởng không có quyền xem người dùng
  const r2 = e.api('batch', { calls: [{ name: 'list', payload: { table: 'USERS' } }, { name: 'list', payload: { table: 'TRUONG' } }] });
  assert.deepStrictEqual(j(r2.data.map(x => x.ok)), [false, true]);
  assert.strictEqual(r2.data[0].code, 'FORBIDDEN');
});

test('Số lần đọc trang tính giảm mạnh sau khi làm nóng đệm (mở tab, khởi động, tổng quan)', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('cache.flush').ok);
  const count = (name, p) => { reset(e); e.api(name, p); return reads(e).n; };
  const coldCount = (name, p) => { e.api('cache.flush'); return count(name, p); };
  const cold = { list: coldCount('list', { table: 'NHAN_SU' }), boot: coldCount('boot'), dash: coldCount('dashboard') };
  count('list', { table: 'NHAN_SU' }); count('boot'); count('dashboard');
  const warm = { list: count('list', { table: 'NHAN_SU' }), boot: count('boot'), dash: count('dashboard') };
  assert.ok(cold.list >= 4 && cold.boot >= 8 && cold.dash >= 8, JSON.stringify(cold));
  assert.deepStrictEqual(warm, { list: 0, boot: 0, dash: 0 });
});

test('Trong cùng một giao dịch: ghi rồi đọc lại bảng đó luôn thấy dữ liệu mới (không lấy bản cũ từ đệm)', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  e.api('list', { table: 'CHI_NHANH' }); // đệm đã có bản cũ
  const out = j(e.run(`(function(){ Db.reset(); var seen = [];
    Db.tx(function(){
      seen.push(Db.all("CHI_NHANH").length);
      Db.insertMany("CHI_NHANH", [{ma:"T1",ten:"Thử 1",tinh:"x",trang_thai:"Hoạt động"}], "t");
      seen.push(Db.all("CHI_NHANH").length);
      Db.removeMany("CHI_NHANH", Db.filter("CHI_NHANH", function(r){return r.ma==="T1";}).map(function(r){return r.id;}));
      seen.push(Db.all("CHI_NHANH").length);
    });
    return seen; })()`));
  assert.deepStrictEqual(out, [2, 3, 2]);
  assert.strictEqual(e.api('list', { table: 'CHI_NHANH' }).data.total, 2);
});

test('Đệm hỏng đúng lúc ghi không để lại dữ liệu cũ: phiên bản nằm ở nơi bền vững', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  e.api('list', { table: 'CHI_NHANH' });
  e.cacheFail = true;
  assert.ok(e.api('save', { table: 'CHI_NHANH', row: { ma: 'DN', ten: 'Đà Nẵng', tinh: 'Đà Nẵng' } }).ok);
  e.cacheFail = false;
  assert.strictEqual(e.api('list', { table: 'CHI_NHANH' }).data.total, 3);
});
