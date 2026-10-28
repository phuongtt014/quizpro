'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { world, tsv, j } = require('./world');

test('Mẫu nhập CSV: mọi bảng nhập được đều có mẫu; dòng ví dụ vượt qua chính bộ kiểm tra nghiêm ngặt', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  const sch = e.api('schema').data.tables;
  const importable = Object.keys(sch).filter(t => sch[t].canImport);
  assert.ok(importable.length >= 18, importable.join());
  for (const t of importable) {
    const ctx = sch[t].ctx ? { de_an_ma: 'DA01-2026' } : undefined;
    const tpl = e.api('import.template', { table: t, ctx });
    assert.ok(tpl.ok, t + ' ' + JSON.stringify(tpl));
    assert.strictEqual(tpl.data.header.length, tpl.data.example.length, t);
    assert.deepStrictEqual(j(tpl.data.header), j(sch[t].spec.map(s => s.label)), t + ': tiêu đề mẫu = các cột của bảng');
    assert.ok(tpl.data.tsv.split('\n').length === 2 && tpl.data.csv.split('\n').length === 2, t);
    // dòng ví dụ phải hợp lệ khi nhập (chế độ cập nhật để không vướng "đã tồn tại")
    const chk = e.api('importCheck', { table: t, ctx, text: tpl.data.tsv, mode: 'upsert' });
    assert.ok(chk.ok && chk.data.ok, t + ': ' + JSON.stringify(chk.data && chk.data.errors));
    assert.strictEqual(chk.data.total, 1, t);
    // và file .csv (có dấu phẩy trong số thập phân/ô) cũng đọc đúng
    const chk2 = e.api('importCheck', { table: t, ctx, text: tpl.data.csv, mode: 'upsert' });
    assert.ok(chk2.data.ok, t + ' (csv): ' + JSON.stringify(chk2.data.errors));
  }
});

test('Mẫu nhập CSV dùng mã thật đang có trong hệ thống; hai cột cùng tham chiếu lấy hai mã khác nhau', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  const q = e.api('import.template', { table: 'QUA_TRINH_NGACH' }).data;
  const row = Object.fromEntries(q.header.map((h, i) => [h, q.example[i]]));
  assert.strictEqual(row['Mã nhân sự'], 'NV001');
  assert.strictEqual(row['Đối tượng tính lương'], 'GV còn lại');
  assert.ok(['GV1', 'GV2', 'GV3'].includes(row['Ngạch']) || row['Ngạch'].length > 0);
  const u = e.api('import.template', { table: 'UY_QUYEN' }).data;
  assert.notStrictEqual(u.example[0], u.example[1]);
  const t = e.api('import.template', { table: 'THU_NHAP_NEN' }).data;
  assert.deepStrictEqual(j(t.header), ['Mã nhân sự', 'Thu nhập/tháng', 'Hỗ trợ GVCN', 'Hỗ trợ khác', 'Hiệu lực từ', 'Hiệu lực đến', 'Ghi chú']);
});

test('Mẫu nhập CSV: định dạng .csv đúng chuẩn (trích dẫn dấu phẩy), bảng chỉ đọc/không quyền bị từ chối', () => {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  const c = e.api('import.template', { table: 'DEAN_NGACH', ctx: { de_an_ma: 'DA01-2026' } }).data.csv;
  assert.match(c, /"1,2"/); // số thập phân có dấu phẩy được bọc ngoặc kép
  assert.strictEqual(e.api('import.template', { table: 'THU_NHAP_MOI' }).code, 'BAD_REQUEST');
  assert.strictEqual(e.api('import.template', { table: 'DEAN_NGACH' }).code, 'BAD_REQUEST'); // thiếu ngữ cảnh đề án
  assert.strictEqual(e.api('import.template', { table: 'KHONG_CO' }).code, 'NOT_FOUND');
  e.as('gv.hcm@vaschools.edu.vn'); // Giáo vụ có declare.edit nhưng không có quyền nhập nhân sự
  assert.ok(e.api('import.template', { table: 'KHAI_BAO' }).ok);
  assert.strictEqual(e.api('import.template', { table: 'NHAN_SU' }).code, 'FORBIDDEN');
});
