/**
 * Bộ tính toán thuần (không đọc dữ liệu): tính phụ trội/quyết toán và thu nhập mới
 * theo PRD & Đề án HP.ĐA.01. Mọi hằng số đến từ gói tham số của phiên bản đề án (param, tran...).
 */
var Engine = (function () {
  function round(n, d) { var f = Math.pow(10, d || 0); return Math.round(n * f) / f; }
  function num(v) { return v === '' || v === null || v === undefined ? 0 : Number(v); }

  /** Số ngày giữa hai ngày ISO, tính cả hai đầu. */
  function daysInclusive(tu, den) {
    var a = tu.split('-'), b = den.split('-');
    return Math.round((Date.UTC(+b[0], +b[1] - 1, +b[2]) - Date.UTC(+a[0], +a[1] - 1, +a[2])) / 86400000) + 1;
  }

  /** Quy đổi một dòng khai báo ra tổng số tiết tuyệt đối (PRD 2.1; môn đặc thù nhân hệ số quy đổi). */
  function tietOf(d, param) {
    var days = daysInclusive(d.tu_ngay, d.den_ngay), so = num(d.so_luong), t;
    if (d.don_vi === 'Tiết/Tuần') t = so * (days / 7);
    else if (d.don_vi === 'Tiết/Tháng') t = so * (days / 30);
    else t = so * days;
    if (d.loai === 'Thực dạy' && d.dac_thu === 'Có') t *= num(param.he_so_quy_doi_dac_thu) || 1;
    return t;
  }

  /** Phân bổ phụ trội: ưu tiên lấp đầy giỏ trách nhiệm (đề án mục VI.1.b). */
  function allocate(thucDay, trachNhiem, dinhMuc) {
    var tong = thucDay + trachNhiem - dinhMuc;
    if (tong <= 0) return { tong: 0, ptTN: 0, ptGD: 0 };
    if (tong <= trachNhiem) return { tong: tong, ptTN: tong, ptGD: 0 };
    return { tong: tong, ptTN: trachNhiem, ptGD: tong - trachNhiem };
  }

  /**
   * input: { decls (đã duyệt, trong kỳ), doiTuong, soTuan, param, ltb, hsTiet (null nếu ngạch không có) }
   */
  function settle(input) {
    var p = input.param, th = 0, tn = 0, dm = 0, notes = [];
    input.decls.forEach(function (d) {
      var t = tietOf(d, p);
      if (d.loai === 'Thực dạy') th += t; else if (d.loai === 'Trách nhiệm') tn += t; else dm += t;
    });
    if (dm === 0) {
      if (input.doiTuong === 'GV Tiểu học nhiều môn') dm = input.soTuan * num(p.dinh_muc_tieu_hoc);
      else if (input.doiTuong === 'GV còn lại') dm = input.soTuan * num(p.dinh_muc_khac);
    }
    var hs = input.hsTiet;
    if (hs === null || hs === undefined || hs === '' || hs === 0) { hs = 1; notes.push('Ngạch không có HS tiết, tạm dùng 1,0'); }
    var a = allocate(th, tn, dm);
    var hsTN = num(p.he_so_tiet_trach_nhiem) || 1;
    var tien = a.ptTN * hsTN * input.ltb + a.ptGD * hs * input.ltb;
    return {
      thuc_day: round(th, 4), trach_nhiem: round(tn, 4), dinh_muc: round(dm, 4), tong_pt: round(a.tong, 4),
      pt_trach_nhiem: round(a.ptTN, 4), pt_giang_day: round(a.ptGD, 4), hs_tiet: hs, ltb: input.ltb,
      tien_pt: Math.round(tien), ghi_chu: notes.join('; ')
    };
  }

  /** Tỷ lệ trần theo năm áp dụng và thâm niên; null nếu đề án không có dòng phù hợp. */
  function capRate(tran, nam, tenure) {
    var years = tran.map(function (r) { return r.nam; }).filter(function (y) { return y <= nam; });
    if (!years.length) return null;
    var y = Math.max.apply(null, years), rate = null;
    tran.forEach(function (r) {
      if (r.nam === y && tenure >= r.tn_tu && (r.tn_den === '' || r.tn_den === null || tenure < r.tn_den)) rate = r.ty_le;
    });
    return rate;
  }

  /**
   * input: { doiTuong, ngach (dòng DEAN_NGACH), tenure, holdYears, kiemNhiem: [{ hs_kpi, ti_le }],
   *   hangTruong (dòng DEAN_HANGTRUONG | null), lcb, ltb, param, tran, namXet, thuNhapHienTai (số | null),
   *   tienPt, soThang }
   */
  function income(input) {
    var p = input.param, g = input.ngach, notes = [];
    var hsCD = num(g.hs_chuc_danh), hsKPI = num(g.hs_kpi), hsTiet = num(g.hs_tiet);

    var rate = g.nhom_tham_nien ? num(p['tn_he_so_' + g.nhom_tham_nien.toLowerCase()]) : 0;
    var hsTN = input.tenure >= num(p.tn_toi_thieu) ? input.tenure * rate : 0;

    var hsVK = g.vuot_khung === 'Có' && input.holdYears >= num(p.vuot_khung_nam) ? num(p.vuot_khung_he_so) * input.holdYears : 0;

    var hsBGH = 0;
    if (g.ho_tro_hang_truong) {
      if (!input.hangTruong) notes.push('Chưa khai báo hạng trường nên chưa tính hỗ trợ hạng trường');
      else hsBGH = num(g.ho_tro_hang_truong === 'Hiệu trưởng' ? input.hangTruong.hs_hieu_truong : input.hangTruong.hs_pho_hieu_truong);
    }
    var hsKN = input.kiemNhiem.reduce(function (s, k) { return s + num(k.hs_kpi) * num(k.ti_le); }, 0);

    var luongCD = input.lcb * hsCD;
    var troCap = input.lcb * (hsTN + hsBGH + hsKN + hsVK);
    var hoTroDK = input.soThang > 0 ? input.tienPt / input.soThang : 0;

    var kpiTiet = 0;
    if (input.doiTuong === 'GV Tiểu học nhiều môn') kpiTiet = input.ltb * hsTiet * num(p.kpi_tiet_th_so_tiet) * num(p.kpi_tiet_th_he_so);
    else if (input.doiTuong === 'GV còn lại') kpiTiet = input.ltb * hsTiet * num(p.kpi_tiet_khac_so_tiet);
    var luongKPI = kpiTiet > 0 ? kpiTiet : input.lcb * hsKPI;

    var pa = luongCD + troCap + hoTroDK + luongKPI;

    var cur = input.thuNhapHienTai, tran = null, max = null, official = pa;
    if (cur === null || cur === undefined) {
      notes.push('Chưa có thu nhập hiện tại: không áp trần/bảo vệ lương');
    } else {
      tran = capRate(input.tran, input.namXet, input.tenure);
      if (tran === null) notes.push('Đề án chưa có trần cho năm ' + input.namXet + ': không áp trần');
      else { max = cur * (1 + tran); if (pa > max) { official = max; notes.push('Bị khống chế bởi trần ' + round(tran * 100, 2) + '%'); } }
      if (official < cur) { official = cur; notes.push('Hỗ trợ giữ mức thu nhập'); }
    }
    return {
      hs_cd: hsCD, hs_tn: round(hsTN, 4), hs_vk: round(hsVK, 4), hs_bgh: hsBGH, hs_kn: round(hsKN, 4), hs_kpi: hsKPI,
      luong_chuc_danh: Math.round(luongCD), ho_tro: Math.round(troCap + hoTroDK), ho_tro_pt: Math.round(hoTroDK), luong_kpi: Math.round(luongKPI),
      pa_moi: Math.round(pa), thu_nhap_hien_tai: cur === null || cur === undefined ? '' : cur,
      ty_le_tran: tran === null ? '' : tran, max_income: max === null ? '' : Math.round(max),
      chinh_thuc: Math.round(official),
      chenh_lech: cur === null || cur === undefined ? '' : Math.round(official) - cur, tien_pt: Math.round(input.tienPt || 0),
      ghi_chu: notes.join('; ')
    };
  }

  return { daysInclusive: daysInclusive, tietOf: tietOf, allocate: allocate, settle: settle, income: income, capRate: capRate };
})();
