'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { world, tsv, j } = require('./world');

const DC = '2025-2026-DC1';

function base() {
  const { e } = world();
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2025-2026', '01/09/2025', '31/05/2026']) }).ok);
  assert.ok(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, row: { chi_nhanh_ma: 'HN', lcb: '6000000', ltb: '100000' } }).ok);
  return e;
}
const kyDc = (e) => assert.ok(e.api('save', { table: 'KY_LUONG', row: { ma: DC, nam_hoc_ma: '2025-2026', hoc_ky: 'DC1', loai: 'Điều chỉnh', tu_ngay: '01/03/2026', den_ngay: '01/03/2026' } }).ok);

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
  // kiểm tra đầu vào, phân quyền
  assert.strictEqual(sim({}).code, 'BAD_REQUEST');
  assert.strictEqual(sim({ lcb_pct: '500' }).code, 'BAD_REQUEST');
  assert.strictEqual(sim({ param_key: 'khong_co', param_value: '1' }).code, 'BAD_REQUEST');
  assert.strictEqual(sim({ param_key: 'tn_toi_thieu', param_value: '' }).code, 'BAD_REQUEST');
  e.as('ht.hn@vaschools.edu.vn'); // chỉ có calc.view
  assert.strictEqual(sim({ lcb_pct: '10' }).code, 'FORBIDDEN');
});
