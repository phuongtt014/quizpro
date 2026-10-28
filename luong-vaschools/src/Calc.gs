/**
 * Điều phối tính quyết toán phụ trội và thu nhập mới cho một kỳ: đọc dữ liệu, gọi Engine, ghi kết quả
 * (kèm phiên bản đề án đã dùng). Kết quả "Chờ chốt/Đã chốt" không bị ghi đè.
 * Quy ước: dùng phiên bản đề án hiệu lực vào NGÀY CUỐI KỲ; ngạch, kiêm nhiệm, thâm niên tính tại ngày cuối kỳ;
 * thu nhập hiện tại lấy tại ngày đầu kỳ.
 */
var Calc = (function () {
  function groupBy(rows, key) {
    var m = {};
    rows.forEach(function (r) { (m[r[key]] = m[r[key]] || []).push(r); });
    return m;
  }

  function activeAt(r, d) { return r.hieu_luc_tu <= d && (!r.hieu_luc_den || r.hieu_luc_den >= d); }

  /** Số năm tròn giữ liên tục một ngạch, tính đến ngày d (nối các bản ghi liền kề cùng ngạch). */
  function holdYears(hist, d) {
    var cur = hist.filter(function (r) { return activeAt(r, d); })[0];
    if (!cur) return 0;
    var start = cur.hieu_luc_tu, moved = true;
    while (moved) {
      moved = false;
      for (var i = 0; i < hist.length; i++) {
        if (hist[i].ngach_ma === cur.ngach_ma && hist[i].hieu_luc_den && Util.addDays(hist[i].hieu_luc_den, 1) === start) {
          start = hist[i].hieu_luc_tu; moved = true;
        }
      }
    }
    return Util.fullYears(start, d);
  }

  /**
   * Tính cho một kỳ. Hai loại kỳ:
   *  - 'Học kỳ': tính phụ trội từ khai báo, và thu nhập mới (gồm hỗ trợ dự kiến = phụ trội / số tháng).
   *  - 'Điều chỉnh': đợt tính thu nhập mới tại một ngày hiệu lực (đổi đề án/ngạch bậc), không cần khai báo;
   *    hỗ trợ dự kiến lấy từ phụ trội của kỳ chọn ở cột "Lấy phụ trội từ kỳ" (nếu có).
   * gom: 'da_duyet' (mặc định, dùng để chốt) hoặc 'tat_ca' (tính thử cả dòng Nháp/Chờ duyệt, không chốt được).
   */
  function run(user, kyMa, truongMa, gom) {
    gom = gom === 'tat_ca' ? 'tat_ca' : 'da_duyet';
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === kyMa; });
    if (!ky) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ ' + kyMa);
    if (ky.trang_thai !== 'Mở') throw new AppError('LOCKED', 'Kỳ ' + kyMa + ' đã chốt');
    var isAdj = ky.loai === 'Điều chỉnh';
    var dean = Policy.effective(ky.den_ngay);
    if (!dean) throw new AppError('NO_POLICY', 'Không có đề án đang hiệu lực vào ngày ' + Util.displayDate(ky.den_ngay));
    var b = Policy.bundle(dean.ma), warnings = [], namXet = +ky.den_ngay.slice(0, 4);

    var hang = {};
    Db.all('TRUONG_HANG').forEach(function (h) { if (h.nam_hoc_ma === ky.nam_hoc_ma) hang[h.truong_ma] = h; });
    var declsBy = isAdj ? {} : groupBy(Db.filter('KHAI_BAO', function (d) {
      return d.ky_ma === kyMa && (gom === 'tat_ca' || d.trang_thai === 'Đã duyệt');
    }), 'ma_nv');
    var ngachBy = groupBy(Db.all('QUA_TRINH_NGACH'), 'ma_nv');
    var knBy = groupBy(Db.all('QUA_TRINH_KIEMNHIEM'), 'ma_nv');
    var tnBy = groupBy(Db.all('THU_NHAP_NEN'), 'ma_nv');
    var ngachName = {};
    Db.all('NGACH_DM').forEach(function (n) { ngachName[n.ma] = n.ten; });

    // Đợt điều chỉnh: lấy tiền phụ trội của kỳ học kỳ được chọn (nếu có) để tính "hỗ trợ dự kiến"
    var ptBy = {}, ptSoThang = ky.so_thang_chia;
    if (isAdj) {
      if (ky.ky_phu_troi) {
        var kyPT = Db.find('KY_LUONG', function (k) { return k.ma === ky.ky_phu_troi; });
        if (kyPT) ptSoThang = kyPT.so_thang_chia;
        Db.filter('QUYET_TOAN', function (r) { return r.ky_ma === ky.ky_phu_troi; }).forEach(function (r) { ptBy[r.ma_nv] = r.tien_pt; });
      } else warnings.push('Đợt điều chỉnh chưa chọn "Lấy phụ trội từ kỳ": hỗ trợ dự kiến từ phụ trội tạm tính = 0');
    }

    var locked = {};
    Db.all('QUYET_TOAN').concat(Db.all('THU_NHAP_MOI')).forEach(function (r) {
      if (r.ky_ma === kyMa && r.trang_thai !== 'Tạm tính') locked[r.ma_nv] = true;
    });

    var staff = Db.filter('NHAN_SU', function (s) {
      if (truongMa && s.truong_ma !== truongMa) return false;
      if (s.ngay_vao_lam > ky.den_ngay) return false;
      if (s.ngay_nghi_viec && s.ngay_nghi_viec < ky.tu_ngay) return false;
      return Auth.canRow(user, 'calc.run', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv });
    });
    if (!staff.length) throw new AppError('EMPTY', 'Không có nhân sự nào trong phạm vi để tính');

    var qt = [], tm = [], skippedLocked = 0, unapproved = 0;
    staff.forEach(function (s) {
      if (locked[s.ma_nv]) { skippedLocked++; return; }
      var tag = s.ma_nv + ' (' + s.ho_ten + ')';
      var hist = ngachBy[s.ma_nv] || [];
      var cur = hist.filter(function (r) { return activeAt(r, ky.den_ngay); })[0];
      if (!cur) { warnings.push(tag + ': chưa có ngạch hiệu lực tại ' + Util.displayDate(ky.den_ngay)); return; }
      var g = b.ngach[cur.ngach_ma];
      if (!g) { warnings.push(tag + ': ngạch ' + cur.ngach_ma + ' chưa có hệ số trong đề án ' + dean.ma); return; }
      var lw = b.luong[s.chi_nhanh_ma];
      if (!lw) { warnings.push(tag + ': đề án ' + dean.ma + ' chưa có LCB/LTB cho chi nhánh ' + s.chi_nhanh_ma); return; }
      var who = { ho_ten: s.ho_ten, chi_nhanh_ma: s.chi_nhanh_ma, truong_ma: s.truong_ma, doi_tuong: s.doi_tuong };

      var decls = declsBy[s.ma_nv] || [], settle = { tien_pt: 0 }, nguon = 'Đã duyệt';
      if (decls.length) {
        if (decls.some(function (d) { return d.trang_thai !== 'Đã duyệt'; })) { nguon = 'Gồm dòng chưa duyệt'; unapproved++; }
        settle = Engine.settle({ decls: decls, doiTuong: s.doi_tuong, soTuan: ky.so_tuan, param: b.param, ltb: lw.ltb, hsTiet: g.hs_tiet === '' ? null : g.hs_tiet });
        var row = { ky_ma: kyMa, ma_nv: s.ma_nv, de_an_ma: dean.ma, nguon: nguon, trang_thai: 'Tạm tính', phieu_ma: '' };
        Object.keys(who).forEach(function (k) { row[k] = who[k]; });
        Object.keys(settle).forEach(function (k) { row[k] = settle[k]; });
        qt.push(row);
      }

      var kn = (knBy[s.ma_nv] || []).filter(function (r) { return activeAt(r, ky.den_ngay); }).map(function (r) {
        var kg = b.ngach[r.ngach_ma];
        if (!kg) warnings.push(tag + ': ngạch kiêm nhiệm ' + r.ngach_ma + ' chưa có hệ số trong đề án');
        return { hs_kpi: kg ? kg.hs_kpi : 0, ti_le: r.ti_le };
      });
      var curInc = (tnBy[s.ma_nv] || []).filter(function (r) { return activeAt(r, ky.tu_ngay); })[0];
      var tienPt = isAdj ? (ptBy[s.ma_nv] || 0) : settle.tien_pt;
      var inc = Engine.income({
        doiTuong: s.doi_tuong, ngach: g, tenure: Util.fullYears(s.ngay_vao_lam, ky.den_ngay),
        holdYears: holdYears(hist.filter(function (r) { return r.ngach_ma === cur.ngach_ma; }), ky.den_ngay),
        kiemNhiem: kn, hangTruong: s.truong_ma ? b.hangTruong[(hang[s.truong_ma] || {}).hang] || null : null,
        lcb: lw.lcb, ltb: lw.ltb, param: b.param, tran: b.tran, namXet: namXet,
        thuNhapHienTai: curInc ? curInc.thu_nhap : null, tienPt: tienPt, soThang: isAdj ? ptSoThang : ky.so_thang_chia
      });
      var irow = { ky_ma: kyMa, ma_nv: s.ma_nv, de_an_ma: dean.ma, ngay_vao_lam: s.ngay_vao_lam, ngach_ma: cur.ngach_ma,
        ngach_ten: ngachName[cur.ngach_ma] || cur.ngach_ma, tham_nien: Util.fullYears(s.ngay_vao_lam, ky.den_ngay),
        nguon: nguon, trang_thai: 'Tạm tính', phieu_ma: '' };
      Object.keys(who).forEach(function (k) { irow[k] = who[k]; });
      Object.keys(inc).forEach(function (k) { irow[k] = inc[k]; });
      if (!s.truong_ma && g.ho_tro_hang_truong) irow.ghi_chu = (irow.ghi_chu ? irow.ghi_chu + '; ' : '') + 'Nhân sự chưa gắn trường';
      tm.push(irow);
    });

    var inScope = {};
    staff.forEach(function (s) { inScope[s.ma_nv] = true; });
    ['QUYET_TOAN', 'THU_NHAP_MOI'].forEach(function (t) {
      Db.removeMany(t, Db.filter(t, function (r) { return r.ky_ma === kyMa && r.trang_thai === 'Tạm tính' && inScope[r.ma_nv]; }).map(function (r) { return r.id; }));
    });
    Db.insertMany('QUYET_TOAN', qt, user.email);
    Db.insertMany('THU_NHAP_MOI', tm, user.email);
    Audit.log(user, 'CHAY_QUYET_TOAN', 'QUYET_TOAN', kyMa, { truong: truongMa || '', de_an: dean.ma, gom: gom, loai: ky.loai || 'Học kỳ',
      quyet_toan: qt.length, thu_nhap_moi: tm.length, bo_qua_da_chot: skippedLocked, canh_bao: warnings.length });
    return { de_an: dean.ma, loai: ky.loai || 'Học kỳ', settled: qt.length, incomes: tm.length, skippedLocked: skippedLocked,
      unapproved: unapproved, warnings: warnings };
  }

  return { run: run, holdYears: holdYears };
})();
