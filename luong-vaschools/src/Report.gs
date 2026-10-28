/**
 * Báo cáo trên kết quả đã tính: bảng tổng hợp thu nhập toàn công ty (theo chi nhánh/trường/đối tượng/ngạch),
 * xuất bảng để dán vào Excel, và chi tiết phụ trội từng người. Luôn lọc theo phạm vi dữ liệu của người xem.
 */
var Report = (function () {
  function scopedRows(user, table, kyMa) {
    var sf = Auth.scopeFn(table), global = Auth.hasGlobal(user, 'calc.view');
    return Db.filter(table, function (r) {
      return r.ky_ma === kyMa && (global || !sf || Auth.canRow(user, 'calc.view', sf(r)));
    });
  }

  function nameMap(table) {
    var m = {};
    Db.all(table).forEach(function (r) { m[r.ma] = r.ten; });
    return m;
  }

  function isNum(v) { return typeof v === 'number'; }

  var GROUPS = {
    tat_ca: function () { return { key: 'ALL', label: 'Toàn công ty' }; },
    chi_nhanh: function (r, n) { return { key: r.chi_nhanh_ma, label: n.cn[r.chi_nhanh_ma] || r.chi_nhanh_ma }; },
    truong: function (r, n) { return { key: r.truong_ma || '~', label: r.truong_ma ? (n.tr[r.truong_ma] || r.truong_ma) : '(chưa gắn trường)' }; },
    chi_nhanh_truong: function (r, n) {
      return { key: r.chi_nhanh_ma + '/' + (r.truong_ma || '~'),
        label: (n.cn[r.chi_nhanh_ma] || r.chi_nhanh_ma) + ' › ' + (r.truong_ma ? (n.tr[r.truong_ma] || r.truong_ma) : '(chưa gắn trường)') };
    },
    doi_tuong: function (r) { return { key: r.doi_tuong, label: r.doi_tuong }; },
    ngach: function (r) { return { key: r.ngach_ma, label: r.ngach_ten || r.ngach_ma }; }
  };

  function blank() {
    return { so_nv: 0, hien_tai: 0, so_co_hien_tai: 0, chinh_thuc: 0, chinh_thuc_ss: 0, pa_moi: 0, tien_pt: 0, pt_bq: 0, chi_phi: 0, giu_luong: 0, bi_tran: 0, chua_chot: 0 };
  }

  function add(a, r) {
    a.so_nv++;
    a.chinh_thuc += r.chinh_thuc || 0;
    a.pa_moi += r.pa_moi || 0;
    a.tien_pt += r.tien_pt || 0;
    a.pt_bq += r.ho_tro_pt || 0;
    a.chi_phi += isNum(r.chi_phi_thang) ? r.chi_phi_thang : (r.chinh_thuc || 0);
    if (isNum(r.thu_nhap_hien_tai)) { a.hien_tai += r.thu_nhap_hien_tai; a.so_co_hien_tai++; a.chinh_thuc_ss += r.chinh_thuc || 0; }
    if (/giữ mức thu nhập/.test(r.ghi_chu)) a.giu_luong++;
    if (/trần/.test(r.ghi_chu)) a.bi_tran++;
    if (r.trang_thai !== 'Đã chốt') a.chua_chot++;
  }

  function finish(label, key, a) {
    var tang = a.chinh_thuc_ss - a.hien_tai;
    return { key: key, label: label, so_nv: a.so_nv, hien_tai: a.hien_tai, so_co_hien_tai: a.so_co_hien_tai, pa_moi: a.pa_moi, chinh_thuc: a.chinh_thuc,
      tang: tang, pct_tang: a.hien_tai > 0 ? Math.round(tang / a.hien_tai * 10000) / 100 : null, tien_pt: a.tien_pt,
      quy_nam: a.chinh_thuc * 12, pt_binh_quan: a.pt_bq, chi_phi_thang: a.chi_phi, chi_phi_nam: a.chi_phi * 12, giu_luong: a.giu_luong, bi_tran: a.bi_tran, chua_chot: a.chua_chot };
  }

  /** Gom các dòng kết quả thành nhóm + dòng tổng. Dùng chung cho tổng hợp thật và mô phỏng. */
  function aggregate(rows, group) {
    var keyFn = GROUPS[group || 'chi_nhanh'];
    if (!keyFn) throw new AppError('BAD_REQUEST', 'Nhóm tổng hợp không hợp lệ');
    var n = { cn: nameMap('CHI_NHANH'), tr: nameMap('TRUONG') }, map = {}, order = [], all = blank();
    rows.forEach(function (r) {
      var g = keyFn(r, n);
      if (!map[g.key]) { map[g.key] = { label: g.label, a: blank() }; order.push(g.key); }
      add(map[g.key].a, r); add(all, r);
    });
    order.sort();
    return { groups: order.map(function (k) { return finish(map[k].label, k, map[k].a); }), total: finish('TỔNG CỘNG', 'ALL', all) };
  }

  function missingCount(user, ky, have) {
    var global = Auth.hasGlobal(user, 'calc.view');
    return Db.filter('NHAN_SU', function (s) {
      if (have[s.ma_nv] || s.ngay_vao_lam > ky.den_ngay || (s.ngay_nghi_viec && s.ngay_nghi_viec < ky.tu_ngay)) return false;
      return global || Auth.canRow(user, 'calc.view', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv });
    }).length;
  }

  /** Bảng tổng hợp theo nhóm + dòng tổng toàn bộ phạm vi người xem. */
  function summary(user, kyMa, group) {
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === kyMa; });
    if (!ky) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ ' + kyMa);
    var rows = scopedRows(user, 'THU_NHAP_MOI', kyMa), agg = aggregate(rows, group), have = {};
    rows.forEach(function (r) { have[r.ma_nv] = true; });
    return { ky: { ma: ky.ma, loai: ky.loai || 'Học kỳ', den_ngay: ky.den_ngay, trang_thai: ky.trang_thai },
      de_an: rows.length ? rows[0].de_an_ma : '', group: group || 'chi_nhanh', groups: agg.groups, total: agg.total, chua_tinh: missingCount(user, ky, have) };
  }

  function cell(v) { return v === undefined || v === null ? '' : String(v).replace(/[\t\r\n]+/g, ' '); }
  function pct(v) { return v === '' || v === undefined ? '' : (Math.round(v * 10000) / 100) + '%'; }

  /** Văn bản TSV để dán thẳng vào Excel/Google Sheets. */
  function exportTable(user, kyMa, which) {
    var head, map, rows;
    if (which === 'phu_troi') {
      head = ['Mã NV', 'Họ tên', 'Chi nhánh', 'Trường', 'Đối tượng', 'Thực dạy (tiết)', 'Trách nhiệm (tiết)', 'Định mức (tiết)', 'Tổng phụ trội', 'PT trách nhiệm',
        'PT giảng dạy', 'HS tiết', 'LTB', 'Tiền phụ trội', 'Trạng thái', 'Nguồn', 'Ghi chú'];
      map = function (r) {
        return [r.ma_nv, r.ho_ten, r.chi_nhanh_ma, r.truong_ma, r.doi_tuong, r.thuc_day, r.trach_nhiem, r.dinh_muc, r.tong_pt, r.pt_trach_nhiem, r.pt_giang_day,
          r.hs_tiet, r.ltb, r.tien_pt, r.trang_thai, r.nguon, r.ghi_chu];
      };
      rows = scopedRows(user, 'QUYET_TOAN', kyMa);
    } else {
      head = ['Mã NV', 'Họ tên', 'Chi nhánh', 'Trường', 'Đối tượng', 'Ngày vào làm', 'Ngạch', 'Thâm niên (năm)', 'HS chức danh', 'HS thâm niên', 'HS vượt khung',
        'HS hạng trường', 'HS kiêm nhiệm', 'HS KPI', 'Lương chức danh', 'Các khoản hỗ trợ', 'Phụ trội bình quân/tháng', 'Lương KPI', 'Phương án mới',
        'Thu nhập hiện tại', 'Trần tăng', 'Mức tối đa', 'Mức chính thức', 'Chênh lệch', 'Lương làm mốc đợt sau', 'Chi phí/tháng (lương + phụ trội BQ)', 'Tiền phụ trội cả kỳ', 'Trạng thái', 'Nguồn', 'Ghi chú'];
      map = function (r) {
        return [r.ma_nv, r.ho_ten, r.chi_nhanh_ma, r.truong_ma, r.doi_tuong, Util.displayDate(r.ngay_vao_lam), r.ngach_ten, r.tham_nien, r.hs_cd, r.hs_tn, r.hs_vk,
          r.hs_bgh, r.hs_kn, r.hs_kpi, r.luong_chuc_danh, r.ho_tro, r.ho_tro_pt, r.luong_kpi, r.pa_moi, r.thu_nhap_hien_tai, pct(r.ty_le_tran), r.max_income,
          r.chinh_thuc, r.chenh_lech, r.luong_nen, r.chi_phi_thang, r.tien_pt, r.trang_thai, r.nguon, r.ghi_chu];
      };
      rows = scopedRows(user, 'THU_NHAP_MOI', kyMa);
    }
    rows.sort(function (a, b) { return (a.chi_nhanh_ma + a.truong_ma + a.ma_nv) < (b.chi_nhanh_ma + b.truong_ma + b.ma_nv) ? -1 : 1; });
    var lines = [head.join('\t')].concat(rows.map(function (r) { return map(r).map(cell).join('\t'); }));
    return { text: lines.join('\n'), rows: rows.length };
  }

  /** Chi tiết từng dòng khai báo đã quy đổi ra tiết cho một nhân sự trong kỳ, kèm kết quả phụ trội. */
  function ptDetail(user, kyMa, maNv) {
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === kyMa; });
    var s = Db.find('NHAN_SU', function (x) { return x.ma_nv === maNv; });
    if (!ky || !s) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ hoặc nhân sự');
    if (!Auth.canRow(user, 'calc.view', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv })) throw new AppError('FORBIDDEN', 'Nhân sự nằm ngoài phạm vi của bạn');
    var dean = Policy.effective(ky.den_ngay), param = dean ? Policy.bundle(dean.ma).param : {};
    var lines = Db.filter('KHAI_BAO', function (d) { return d.ky_ma === kyMa && d.ma_nv === maNv; }).map(function (d) {
      return { loai: d.loai, noi_dung: d.noi_dung, so_luong: d.so_luong, don_vi: d.don_vi, dac_thu: d.dac_thu, tu: d.tu_ngay, den: d.den_ngay,
        ngay: Engine.daysInclusive(d.tu_ngay, d.den_ngay), tiet: Math.round(Engine.tietOf(d, param) * 100) / 100, trang_thai: d.trang_thai, phieu: d.phieu_ma };
    });
    var qt = Db.find('QUYET_TOAN', function (r) { return r.ky_ma === kyMa && r.ma_nv === maNv; });
    return { ho_ten: s.ho_ten, doi_tuong: s.doi_tuong, so_tuan: ky.so_tuan, lines: lines, ketqua: qt || null };
  }

  return { summary: summary, aggregate: aggregate, exportTable: exportTable, ptDetail: ptDetail };
})();
