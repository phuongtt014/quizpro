'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createEnv } = require('./harness');

const j = (x) => JSON.parse(JSON.stringify(x));
const E = () => createEnv().ctx.Engine;
const P = { dinh_muc_tieu_hoc: 24, dinh_muc_khac: 20, he_so_quy_doi_dac_thu: 1.5, he_so_tiet_trach_nhiem: 1,
  tn_he_so_tn2: 0.02, tn_he_so_tn3: 0.03, tn_he_so_tn4: 0.04, tn_toi_thieu: 3, vuot_khung_he_so: 0.01, vuot_khung_nam: 5,
  kpi_tiet_th_so_tiet: 96, kpi_tiet_th_he_so: 0.7, kpi_tiet_khac_so_tiet: 80 };
const TRAN = [{ nam: 2026, tn_tu: 0, tn_den: 5, ty_le: 0.05 }, { nam: 2026, tn_tu: 5, tn_den: 10, ty_le: 0.1 }, { nam: 2026, tn_tu: 10, tn_den: '', ty_le: 0.15 }];
const d = (loai, so, dv, tu, den, extra) => Object.assign({ loai, so_luong: so, don_vi: dv, tu_ngay: tu, den_ngay: den, dac_thu: 'Không' }, extra);

test('Quy đổi ra số tiết: tuần, tháng, ngày, môn đặc thù', () => {
  const e = E();
  assert.strictEqual(e.daysInclusive('2026-09-07', '2026-12-27'), 112);
  assert.strictEqual(e.tietOf(d('Thực dạy', 22, 'Tiết/Tuần', '2026-09-07', '2026-12-27'), P), 352);
  assert.strictEqual(e.tietOf(d('Thực dạy', 30, 'Tiết/Tháng', '2026-09-01', '2026-09-30'), P), 30);
  assert.strictEqual(e.tietOf(d('Trách nhiệm', 2, 'Tiết/Ngày', '2026-09-01', '2026-09-10'), P), 20);
  assert.strictEqual(e.tietOf(d('Thực dạy', 10, 'Tiết/Tuần', '2026-09-07', '2026-09-13', { dac_thu: 'Có' }), P), 15);
});

test('Phân bổ phụ trội: lấp đầy giỏ trách nhiệm trước', () => {
  const e = E();
  assert.deepStrictEqual(j(e.allocate(300, 40, 320)), { tong: 20, ptTN: 20, ptGD: 0 });
  assert.deepStrictEqual(j(e.allocate(352, 64, 320)), { tong: 96, ptTN: 64, ptGD: 32 });
  assert.deepStrictEqual(j(e.allocate(100, 10, 320)), { tong: 0, ptTN: 0, ptGD: 0 });
});

test('Quyết toán: GV còn lại, định mức tự động 20 tiết/tuần x số tuần, thành tiền theo HS tiết', () => {
  const e = E();
  const r = j(e.settle({ decls: [d('Thực dạy', 22, 'Tiết/Tuần', '2026-09-07', '2026-12-27'), d('Trách nhiệm', 4, 'Tiết/Tuần', '2026-09-07', '2026-12-27')],
    doiTuong: 'GV còn lại', soTuan: 16, param: P, ltb: 100000, hsTiet: 1.1 }));
  assert.deepStrictEqual([r.thuc_day, r.trach_nhiem, r.dinh_muc, r.tong_pt, r.pt_trach_nhiem, r.pt_giang_day], [352, 64, 320, 96, 64, 32]);
  assert.strictEqual(r.tien_pt, 64 * 100000 + 32 * 1.1 * 100000); // 9.920.000
  // GV Tiểu học nhiều môn dùng định mức 24; đối tượng khác định mức 0; có khai báo định mức thì dùng khai báo
  assert.strictEqual(j(e.settle({ decls: [d('Thực dạy', 22, 'Tiết/Tuần', '2026-09-07', '2026-12-27')], doiTuong: 'GV Tiểu học nhiều môn', soTuan: 16, param: P, ltb: 1, hsTiet: 1 })).dinh_muc, 384);
  assert.strictEqual(j(e.settle({ decls: [d('Trách nhiệm', 1, 'Tiết/Tuần', '2026-09-07', '2026-09-13')], doiTuong: 'Quản lý', soTuan: 16, param: P, ltb: 1, hsTiet: 1 })).dinh_muc, 0);
  const explicit = j(e.settle({ decls: [d('Thực dạy', 22, 'Tiết/Tuần', '2026-09-07', '2026-12-27'), d('Định mức', 10, 'Tiết/Tuần', '2026-09-07', '2026-12-27')], doiTuong: 'GV còn lại', soTuan: 16, param: P, ltb: 1, hsTiet: 1 }));
  assert.strictEqual(explicit.dinh_muc, 160);
  // Ngạch không có HS tiết -> dùng 1,0 và ghi chú
  assert.match(j(e.settle({ decls: [d('Thực dạy', 30, 'Tiết/Tuần', '2026-09-07', '2026-09-13')], doiTuong: 'Quản lý', soTuan: 1, param: P, ltb: 1, hsTiet: null })).ghi_chu, /HS tiết/);
});

test('Thu nhập mới (đề án bật cộng phụ trội BQ vào thu nhập): GV còn lại, KPI tiết dạy, trần 10% theo thâm niên 7 năm', () => {
  const e = E();
  const P1 = Object.assign({}, P, { pt_vao_thu_nhap: 1 });
  const r = j(e.income({ doiTuong: 'GV còn lại', ngach: { hs_chuc_danh: 1.1, hs_kpi: '', hs_tiet: 1.1, nhom_tham_nien: 'TN2', vuot_khung: 'Không', ho_tro_hang_truong: '' },
    tenure: 7, holdYears: 7, kiemNhiem: [], hangTruong: null, lcb: 6000000, ltb: 100000, param: P1, tran: TRAN, namXet: 2027,
    thuNhapHienTai: 15000000, tienPt: 9920000, soThang: 5 }));
  assert.strictEqual(r.hs_tn, 0.14);
  assert.strictEqual(r.luong_chuc_danh, 6600000);
  assert.strictEqual(r.luong_kpi, 8800000);
  assert.strictEqual(r.ho_tro, 840000 + 1984000);
  assert.strictEqual(r.pa_moi, 18224000);
  assert.strictEqual(r.ty_le_tran, 0.1);
  assert.strictEqual(r.max_income, 16500000);
  assert.strictEqual(r.chinh_thuc, 16500000);
  assert.match(r.ghi_chu, /trần 10%/);
  assert.strictEqual(r.luong_nen, 16500000 - 1984000); // mốc không gồm phụ trội
  assert.strictEqual(r.chi_phi_thang, 16500000);
});

test('Thu nhập mới (mặc định): phụ trội bình quân KHÔNG vào thu nhập, chỉ vào chi phí; mốc = mức chính thức', () => {
  const e = E();
  const r = j(e.income({ doiTuong: 'GV còn lại', ngach: { hs_chuc_danh: 1.1, hs_kpi: '', hs_tiet: 1.1, nhom_tham_nien: 'TN2', vuot_khung: 'Không', ho_tro_hang_truong: '' },
    tenure: 7, holdYears: 7, kiemNhiem: [], hangTruong: null, lcb: 6000000, ltb: 100000, param: P, tran: TRAN, namXet: 2027,
    thuNhapHienTai: 15000000, tienPt: 9920000, soThang: 5 }));
  assert.strictEqual(r.ho_tro, 840000);            // chỉ thâm niên
  assert.strictEqual(r.ho_tro_pt, 1984000);        // phụ trội bình quân/tháng vẫn được tính để báo cáo
  assert.strictEqual(r.pa_moi, 6600000 + 840000 + 8800000);
  assert.strictEqual(r.chinh_thuc, 16240000);
  assert.strictEqual(r.luong_nen, 16240000);
  assert.strictEqual(r.chi_phi_thang, 16240000 + 1984000);
});

test('Thu nhập mới: Phó hiệu trưởng (không dạy) có hỗ trợ hạng trường, vượt khung, KPI theo hệ số; kiêm nhiệm', () => {
  const e = E();
  const base = { doiTuong: 'Quản lý', ngach: { hs_chuc_danh: 2.3, hs_kpi: 1.5, hs_tiet: 1.4, nhom_tham_nien: 'TN3', vuot_khung: 'Có', ho_tro_hang_truong: 'Phó hiệu trưởng' },
    tenure: 6, holdYears: 5, kiemNhiem: [], hangTruong: { hs_hieu_truong: 0.3, hs_pho_hieu_truong: 0.3 }, lcb: 6000000, ltb: 100000, param: P,
    tran: TRAN, namXet: 2026, thuNhapHienTai: 24000000, tienPt: 0, soThang: 5 };
  let r = j(e.income(base));
  assert.deepStrictEqual([r.hs_tn, r.hs_vk, r.hs_bgh], [0.18, 0.05, 0.3]);
  assert.strictEqual(r.luong_chuc_danh, 13800000);
  assert.strictEqual(r.luong_kpi, 9000000);
  assert.strictEqual(r.pa_moi, 25980000);
  assert.strictEqual(r.chinh_thuc, 25980000);
  r = j(e.income(Object.assign({}, base, { kiemNhiem: [{ hs_kpi: 0.8, ti_le: 0.5 }] })));
  assert.strictEqual(r.hs_kn, 0.4);
  assert.strictEqual(r.pa_moi, 25980000 + 2400000);
  // chưa đủ 5 năm giữ ngạch thì không có vượt khung; thiếu hạng trường thì ghi chú
  r = j(e.income(Object.assign({}, base, { holdYears: 4, hangTruong: null })));
  assert.strictEqual(r.hs_vk, 0);
  assert.match(r.ghi_chu, /hạng trường/);
});

test('Bảo vệ lương: không ai thấp hơn thu nhập hiện tại; thiếu dữ liệu thì không áp trần', () => {
  const e = E();
  const base = { doiTuong: 'Quản lý', ngach: { hs_chuc_danh: 1.2, hs_kpi: 0.8, nhom_tham_nien: 'TN4' }, tenure: 2, holdYears: 2, kiemNhiem: [], hangTruong: null,
    lcb: 6000000, ltb: 100000, param: P, tran: TRAN, namXet: 2026, tienPt: 0, soThang: 5 };
  let r = j(e.income(Object.assign({}, base, { thuNhapHienTai: 20000000 })));
  assert.strictEqual(r.chinh_thuc, 20000000);
  assert.match(r.ghi_chu, /giữ mức thu nhập/);
  r = j(e.income(Object.assign({}, base, { thuNhapHienTai: null })));
  assert.strictEqual(r.chinh_thuc, r.pa_moi);
  assert.match(r.ghi_chu, /Chưa có thu nhập hiện tại/);
  assert.strictEqual(e.capRate(TRAN, 2026, 4), 0.05);
  assert.strictEqual(e.capRate(TRAN, 2026, 10), 0.15);
  assert.strictEqual(e.capRate(TRAN, 2025, 4), null);
  assert.strictEqual(e.capRate(TRAN, 2030, 12), 0.15); // dùng năm gần nhất không vượt quá
});

test('Giữ ngạch liên tục: nối các bản ghi liền kề cùng ngạch', () => {
  const { ctx } = createEnv();
  const hist = [{ ngach_ma: 'GV3', hieu_luc_tu: '2019-09-01', hieu_luc_den: '2023-08-31' }, { ngach_ma: 'GV3', hieu_luc_tu: '2023-09-01', hieu_luc_den: '' }];
  assert.strictEqual(ctx.Calc.holdYears(hist, '2027-01-15'), 7);
  const gap = [{ ngach_ma: 'GV3', hieu_luc_tu: '2019-09-01', hieu_luc_den: '2023-06-30' }, { ngach_ma: 'GV3', hieu_luc_tu: '2023-09-01', hieu_luc_den: '' }];
  assert.strictEqual(ctx.Calc.holdYears(gap, '2027-01-15'), 3);
});
