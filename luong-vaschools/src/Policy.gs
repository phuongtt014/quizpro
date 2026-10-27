/**
 * Đề án có phiên bản. Mỗi phiên bản là một gói tham số đầy đủ (LCB/LTB, ngạch, hỗ trợ,
 * quy đổi, trần, tham số). Bản đã "Ban hành" không sửa được: muốn đổi phải nhân bản thành
 * phiên bản mới -> lịch sử cũ giữ nguyên, các kỳ lương cũ vẫn tham chiếu đúng phiên bản của nó.
 */
var Policy = {
  childTables: function () {
    return Object.keys(SCHEMA).filter(function (t) { return SCHEMA[t].ctx === 'de_an_ma'; });
  },

  /** Phiên bản đề án đang hiệu lực tại một ngày (null nếu không có). */
  effective: function (dateIso) {
    var list = Db.filter('DEAN', function (d) {
      return d.trang_thai === 'Ban hành' && d.hieu_luc_tu <= dateIso && (!d.hieu_luc_den || d.hieu_luc_den >= dateIso);
    });
    list.sort(function (a, b) { return a.hieu_luc_tu < b.hieu_luc_tu ? 1 : -1; });
    return list[0] || null;
  },

  /** Gói tham số của một phiên bản, dạng dễ tra cứu cho bộ tính lương (GĐ4). */
  bundle: function (ma) {
    var of = function (t) { return Db.filter(t, function (r) { return r.de_an_ma === ma; }); };
    var b = { dean: Db.find('DEAN', function (d) { return d.ma === ma; }), luong: {}, ngach: {}, hangTruong: {}, quyDoi: {}, tran: [], param: {} };
    of('DEAN_THAMSO').forEach(function (r) { b.luong[r.chi_nhanh_ma] = { lcb: r.lcb, ltb: r.ltb }; });
    of('DEAN_NGACH').forEach(function (r) { b.ngach[r.ngach_ma] = r; });
    of('DEAN_HANGTRUONG').forEach(function (r) { b.hangTruong[r.hang] = r; });
    of('DEAN_QUYDOI').forEach(function (r) { b.quyDoi[r.ma] = r; });
    b.tran = of('DEAN_TRAN');
    of('DEAN_PARAM').forEach(function (r) { b.param[r.khoa] = r.gia_tri; });
    return b;
  },

  /** Danh sách vấn đề cần xử lý trước khi ban hành (rỗng = sẵn sàng). */
  checkReady: function (ma) {
    var issues = [], d = Db.find('DEAN', function (x) { return x.ma === ma; });
    if (!d) return ['Không tìm thấy đề án'];
    var b = Policy.bundle(ma);
    Db.all('CHI_NHANH').filter(function (c) { return c.trang_thai === 'Hoạt động'; }).forEach(function (c) {
      if (!b.luong[c.ma]) issues.push('Chưa có LCB/LTB cho chi nhánh ' + c.ma);
    });
    if (!Object.keys(b.ngach).length) issues.push('Chưa có bảng hệ số ngạch - bậc');
    [1, 2, 3].forEach(function (h) { if (!b.hangTruong[h]) issues.push('Thiếu hệ số hỗ trợ cho trường hạng ' + h); });
    if (!Object.keys(b.quyDoi).length) issues.push('Chưa có bảng quy đổi trách nhiệm');
    if (!b.tran.length) issues.push('Chưa có bảng trần tăng thu nhập');
    PARAMS.forEach(function (p) { if (b.param[p.k] === undefined) issues.push('Thiếu tham số "' + p.k + '" (' + p.l + ')'); });
    Db.all('NGACH_DM').filter(function (n) { return n.trang_thai === 'Hoạt động'; }).forEach(function (n) {
      if (!b.ngach[n.ma]) issues.push('Ngạch ' + n.ma + ' đang hoạt động nhưng chưa có hệ số trong đề án này');
    });
    return issues;
  },

  /** Nhân bản một phiên bản (kèm toàn bộ bảng con) thành bản Nháp mới. Gọi trong Db.tx(). */
  clone: function (user, srcMa, o) {
    var src = Db.find('DEAN', function (d) { return d.ma === srcMa; });
    if (!src) throw new AppError('NOT_FOUND', 'Không tìm thấy đề án nguồn');
    var v = Validate.rows('DEAN', [{ n: 1, vals: {
      ma: o.ma || '', so_hieu: o.so_hieu || '', ten: o.ten || '', hieu_luc_tu: o.hieu_luc_tu || '', hieu_luc_den: '', ghi_chu: 'Nhân bản từ ' + srcMa
    } }], {}, { mode: 'insert' });
    if (!v.ok) throw new AppError('VALIDATION', v.errors[0].msg, v.errors);
    Db.insertMany('DEAN', [v.rows[0]], user.email);
    var n = 0;
    Policy.childTables().forEach(function (t) {
      var rows = Db.filter(t, function (r) { return r.de_an_ma === srcMa; }).map(function (r) {
        var c = {};
        SCHEMA[t].cols.forEach(function (col) { c[col.k] = r[col.k]; });
        c.de_an_ma = o.ma;
        return c;
      });
      Db.insertMany(t, rows, user.email);
      n += rows.length;
    });
    Audit.log(user, 'NHAN_BAN_DE_AN', 'DEAN', o.ma, { tu: srcMa, so_dong: n });
    return { ma: o.ma, copied: n };
  },

  /** Ban hành bản Nháp: kiểm tra đủ dữ liệu, tự đóng hiệu lực phiên bản trước. Gọi trong Db.tx(). */
  publish: function (user, ma) {
    var d = Db.find('DEAN', function (x) { return x.ma === ma; });
    if (!d) throw new AppError('NOT_FOUND', 'Không tìm thấy đề án');
    if (d.trang_thai !== 'Nháp') throw new AppError('STATE', 'Chỉ ban hành được bản Nháp');
    var issues = Policy.checkReady(ma);
    if (issues.length) throw new AppError('NOT_READY', 'Đề án chưa đủ điều kiện ban hành (' + issues.length + ' vấn đề)', issues);

    var closes = [];
    Db.filter('DEAN', function (p) { return p.trang_thai === 'Ban hành' && p.ma !== ma; }).forEach(function (p) {
      var pEnd = p.hieu_luc_den || Util.MAX_DATE;
      if (pEnd < d.hieu_luc_tu) return;
      if (p.hieu_luc_tu >= d.hieu_luc_tu) {
        throw new AppError('OVERLAP', 'Phiên bản ' + p.ma + ' có hiệu lực từ ' + Util.displayDate(p.hieu_luc_tu) + ', không sớm hơn phiên bản này (' + Util.displayDate(d.hieu_luc_tu) + ')');
      }
      closes.push({ id: p.id, patch: { hieu_luc_den: Util.addDays(d.hieu_luc_tu, -1) } });
    });
    Db.updateMany('DEAN', closes, user.email);
    Db.updateMany('DEAN', [{ id: d.id, patch: { trang_thai: 'Ban hành' } }], user.email);
    Audit.log(user, 'BAN_HANH_DE_AN', 'DEAN', ma, { dong_phien_ban_truoc: closes.length });
    Notify.queue({
      to: Auth.usersWith('policy.view'), title: 'Đề án ' + d.so_hieu + ' đã được ban hành',
      body: 'Phiên bản ' + ma + ' có hiệu lực từ ' + Util.displayDate(d.hieu_luc_tu) + '.', link: 'dean', type: 'Đề án'
    });
    return { ma: ma };
  }
};
