'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createEnv } = require('./harness');
const { world, tsv, j } = require('./world');

const GEN = [{ nam: 2026, tn_tu: 0, tn_den: 5, ty_le: 0.05 }, { nam: 2026, tn_tu: 5, tn_den: 10, ty_le: 0.1 }, { nam: 2026, tn_tu: 10, tn_den: '', ty_le: 0.15 }];
const own = (extra) => Object.assign({ truong_ma: 'HCM_THPT', nam: 2026, tn_tu: 0, tn_den: '', ty_le: 0.03 }, extra);

test('Trần theo trường: trần riêng thắng trần chung; thiếu khoảng thì lùi về trần chung; năm xét chọn năm gần nhất', () => {
  const E = createEnv().ctx.Engine;
  const rate = (t, nam, tn, tr) => E.capRate(t, nam, tn, tr);
  assert.strictEqual(rate(GEN.concat([own()]), 2026, 7, 'HCM_THPT'), 0.03);
  assert.strictEqual(rate(GEN.concat([own()]), 2026, 7, 'HN_THPT'), 0.1);   // trường khác dùng trần chung
  assert.strictEqual(rate(GEN.concat([own()]), 2026, 7, ''), 0.1);
  assert.strictEqual(rate(GEN.concat([own({ tn_den: 5, ty_le: 0.02 })]), 2026, 7, 'HCM_THPT'), 0.1); // trần riêng không phủ thâm niên 7
  assert.strictEqual(rate(GEN.concat([own({ nam: 2027, ty_le: 0.08 })]), 2026, 7, 'HCM_THPT'), 0.1);  // trần riêng chỉ có từ 2027
  assert.strictEqual(rate(GEN.concat([own({ nam: 2027, ty_le: 0.08 })]), 2028, 7, 'HCM_THPT'), 0.08); // năm 2028 dùng bộ gần nhất của trường
  assert.strictEqual(E.capRateInfo(GEN.concat([own()]), 2026, 7, 'HCM_THPT').own, true);
  assert.strictEqual(E.capRateInfo(GEN, 2026, 7, 'HCM_THPT').own, false);
});

function dcSetup() {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2025-2026', '01/09/2025', '31/05/2026']) }).ok);
  assert.ok(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, row: { chi_nhanh_ma: 'HN', lcb: '6000000', ltb: '100000' } }).ok);
  assert.ok(e.api('save', { table: 'KY_LUONG', row: { ma: '2025-2026-DC1', nam_hoc_ma: '2025-2026', hoc_ky: 'DC1', loai: 'Điều chỉnh', tu_ngay: '01/03/2026', den_ngay: '01/03/2026' } }).ok);
  return e;
}
const ctx = { de_an_ma: 'DA01-2026' };

test('Thêm trần riêng cho trường vào đề án đã ban hành (chỉ thêm); sửa/xóa bị khóa; chồng khoảng bị chặn', () => {
  const e = dcSetup();
  const row = { truong_ma: 'HCM_THPT', nam: '2026', tn_tu: '5', tn_den: '10', ty_le: '3%' };
  assert.ok(e.api('save', { table: 'DEAN_TRAN', ctx, row }).ok);
  const list = e.api('list', { table: 'DEAN_TRAN', ctx });
  assert.strictEqual(list.data.appendOnly, true);
  const mine = list.data.rows.find(r => r.truong_ma === 'HCM_THPT');
  assert.strictEqual(e.api('save', { table: 'DEAN_TRAN', ctx, id: mine.id, row: Object.assign({}, row, { ty_le: '4%' }) }).code, 'LOCKED');
  assert.strictEqual(e.api('remove', { table: 'DEAN_TRAN', ctx, id: mine.id }).code, 'LOCKED');
  // chồng khoảng [5,10) với [7,12) cùng trường-năm
  const bad = e.api('save', { table: 'DEAN_TRAN', ctx, row: Object.assign({}, row, { tn_tu: '7', tn_den: '12' }) });
  assert.match(bad.error, /chồng/);
  // nhưng khác trường hoặc khác năm thì được
  assert.ok(e.api('save', { table: 'DEAN_TRAN', ctx, row: Object.assign({}, row, { truong_ma: 'HN_THPT', tn_tu: '7', tn_den: '12' }) }).ok);
  assert.ok(e.api('save', { table: 'DEAN_TRAN', ctx, row: Object.assign({}, row, { nam: '2027', tn_tu: '7', tn_den: '12' }) }).ok);
  // CSV: hai dòng chồng nhau trong file
  const imp = e.api('importCheck', { table: 'DEAN_TRAN', ctx, text: tsv(['Trường', 'Năm áp dụng', 'Thâm niên từ (năm)', 'Đến dưới (năm)', 'Tỷ lệ tăng tối đa'],
    ['HN_THPT', '2028', '0', '5', '2%'], ['HN_THPT', '2028', '3', '8', '2%']) });
  assert.ok(imp.data.errors.some(x => /chồng với dòng/.test(x.msg)));
  // trần chung (không trường) trùng khoảng với trần chung đã có
  assert.match(e.api('save', { table: 'DEAN_TRAN', ctx, row: { truong_ma: '', nam: '2026', tn_tu: '6', tn_den: '8', ty_le: '9%' } }).error, /chồng/);
});

test('Tính thu nhập: trường có trần riêng bị khống chế theo trần riêng, trường khác theo trần chung', () => {
  const e = dcSetup();
  assert.ok(e.api('save', { table: 'DEAN_TRAN', ctx, row: { truong_ma: 'HCM_THPT', nam: '2026', tn_tu: '5', tn_den: '10', ty_le: '3%' } }).ok);
  e.as('tro.ly@vaschools.edu.vn');
  assert.ok(e.api('calc.run', { ky_ma: '2025-2026-DC1' }).ok);
  const a = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: '2025-2026-DC1', ma_nv: 'NV001' } }).data.rows[0]; // HCM_THPT, thâm niên 6
  const b = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: '2025-2026-DC1', ma_nv: 'NV002' } }).data.rows[0]; // HN_THPT
  assert.deepStrictEqual([a.ty_le_tran, a.max_income, a.chinh_thuc, a.pa_moi], [0.03, 15450000, 15450000, 16120000]);
  assert.match(a.ghi_chu, /trần 3% \(trần riêng của trường\)/);
  assert.deepStrictEqual([b.ty_le_tran, b.max_income, b.chinh_thuc], [0.1, 16500000, 16120000]);
  assert.doesNotMatch(b.ghi_chu, /riêng/);
});

test('Sao chép trần sang năm mới (chung và từng trường); không nhân đôi; vẫn chỉnh được sau khi sao chép', () => {
  const e = dcSetup();
  assert.ok(e.api('save', { table: 'DEAN_TRAN', ctx, row: { truong_ma: 'HCM_THPT', nam: '2026', tn_tu: '5', tn_den: '10', ty_le: '3%' } }).ok);
  let r = e.api('tran.copy', { de_an_ma: 'DA01-2026', from_nam: 2026, to_nam: 2027 });
  assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(r.data.copied, 4);
  assert.strictEqual(e.api('tran.copy', { de_an_ma: 'DA01-2026', from_nam: 2026, to_nam: 2027 }).code, 'EMPTY');
  assert.strictEqual(e.api('tran.copy', { de_an_ma: 'DA01-2026', from_nam: 2030, to_nam: 2031 }).code, 'EMPTY');
  assert.strictEqual(e.api('tran.copy', { de_an_ma: 'DA01-2026', from_nam: 2026, to_nam: 2026 }).code, 'BAD_REQUEST');
  const rows = j(e.run('Db.filter("DEAN_TRAN",function(x){return x.nam===2027;}).map(function(x){return (x.truong_ma||"*")+":"+x.tn_tu+">"+x.tn_den+"="+x.ty_le;})'));
  assert.deepStrictEqual(rows.sort(), ['*:0>5=0.05', '*:10>=0.15', '*:5>10=0.1', 'HCM_THPT:5>10=0.03'].sort());
  // người không có quyền soạn đề án không sao chép được
  e.as('ht.hcm@vaschools.edu.vn');
  assert.strictEqual(e.api('tran.copy', { de_an_ma: 'DA01-2026', from_nam: 2026, to_nam: 2028 }).code, 'FORBIDDEN');
});
