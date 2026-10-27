/** Nghiệp vụ nhân sự: ngạch hiện tại, thâm niên (số năm tròn). */
var Staff = {
  /** Bản ghi quá trình có hiệu lực tại ngày date (null nếu không). */
  at: function (table, maNv, date, extra) {
    return Db.find(table, function (r) {
      return r.ma_nv === maNv && r.hieu_luc_tu <= date && (!r.hieu_luc_den || r.hieu_luc_den >= date) && (!extra || extra(r));
    });
  },

  tenure: function (ngayVaoLam, date) { return Util.fullYears(ngayVaoLam, date); },

  /** Thêm cột tính toán cho danh sách NHAN_SU (ngạch hiện tại, thâm niên). */
  decorate: function (rows) {
    var today = Util.todayIso(), names = {}, cur = {};
    Db.all('NGACH_DM').forEach(function (n) { names[n.ma] = n.ten; });
    Db.all('QUA_TRINH_NGACH').forEach(function (q) {
      if (q.hieu_luc_tu <= today && (!q.hieu_luc_den || q.hieu_luc_den >= today)) cur[q.ma_nv] = q.ngach_ma;
    });
    return rows.map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      o.ngach_hien_tai = cur[r.ma_nv] ? names[cur[r.ma_nv]] || cur[r.ma_nv] : '';
      var end = r.ngay_nghi_viec && r.ngay_nghi_viec < today ? r.ngay_nghi_viec : today;
      o.tham_nien = r.ngay_vao_lam ? Staff.tenure(r.ngay_vao_lam, end) : '';
      return o;
    });
  }
};
