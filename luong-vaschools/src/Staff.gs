/** Nghiệp vụ nhân sự: ngạch hiện tại, thâm niên (số năm tròn). */
var Staff = {
  /** Bản ghi quá trình có hiệu lực tại ngày date (null nếu không). */
  at: function (table, maNv, date, extra) {
    return Db.find(table, function (r) {
      return r.ma_nv === maNv && r.hieu_luc_tu <= date && (!r.hieu_luc_den || r.hieu_luc_den >= date) && (!extra || extra(r));
    });
  },

  tenure: function (ngayVaoLam, date) { return Util.fullYears(ngayVaoLam, date); },

  /**
   * Trường và đối tượng tính lương KHÔNG nằm ở hồ sơ mà ở từng dòng "Quá trình ngạch bậc" (có hiệu lực theo thời gian).
   * Với mỗi nhân sự trả về dòng quá trình đang hiệu lực tại ngày date; nếu không có thì dòng gần nhất bắt đầu trước đó,
   * nếu vẫn không có thì dòng sớm nhất. Nhân sự chưa có dòng nào thì không có mục.
   */
  units: function (date) {
    date = date || Util.todayIso();
    var by = {}, out = {};
    Db.all('QUA_TRINH_NGACH').forEach(function (q) { (by[q.ma_nv] = by[q.ma_nv] || []).push(q); });
    Object.keys(by).forEach(function (k) {
      var pick = null;
      by[k].forEach(function (q) { if (q.hieu_luc_tu <= date && (!q.hieu_luc_den || q.hieu_luc_den >= date)) pick = q; });
      if (!pick) by[k].forEach(function (q) { if (q.hieu_luc_tu <= date && (!pick || q.hieu_luc_tu > pick.hieu_luc_tu)) pick = q; });
      if (!pick) by[k].forEach(function (q) { if (!pick || q.hieu_luc_tu < pick.hieu_luc_tu) pick = q; });
      out[k] = pick;
    });
    return out;
  },

  /** Thêm cột tính toán cho danh sách NHAN_SU (ngạch hiện tại). */
  decorate: function (rows) {
    var names = {}, u = Staff.units(Util.todayIso());
    Db.all('NGACH_DM').forEach(function (n) { names[n.ma] = n.ten; });
    return rows.map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      var cur = u[r.ma_nv];
      o.ngach_hien_tai = cur && cur.hieu_luc_tu <= Util.todayIso() && (!cur.hieu_luc_den || cur.hieu_luc_den >= Util.todayIso()) ? names[cur.ngach_ma] || cur.ngach_ma : '';
      return o;
    });
  },

  /** Quá trình ngạch bậc: thêm họ tên và thâm niên tại NGÀY HIỆU LỰC BẮT ĐẦU (số năm tròn từ ngày vào làm). */
  decorateHistory: function (rows) {
    var by = {};
    Db.all('NHAN_SU').forEach(function (s) { by[s.ma_nv] = s; });
    return rows.map(function (r) {
      var o = {}, s = by[r.ma_nv];
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      o.ho_ten = s ? s.ho_ten : '';
      o.tham_nien = s && s.ngay_vao_lam && r.hieu_luc_tu ? Util.fullYears(s.ngay_vao_lam, r.hieu_luc_tu) : '';
      return o;
    });
  },

  /** Thu nhập hiện tại: thêm họ tên và tổng (lương + hỗ trợ GVCN + hỗ trợ khác). */
  incomeTotal: function (r) { return (Number(r.thu_nhap) || 0) + (Number(r.ho_tro_gvcn) || 0) + (Number(r.ho_tro_khac) || 0); },
  decorateIncome: function (rows) {
    var by = {};
    Db.all('NHAN_SU').forEach(function (s) { by[s.ma_nv] = s; });
    return rows.map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      o.ho_ten = by[r.ma_nv] ? by[r.ma_nv].ho_ten : '';
      o.tong_thu_nhap = Staff.incomeTotal(r);
      return o;
    });
  }
};
