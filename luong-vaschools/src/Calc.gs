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

  /**
   * Ngày dùng để lấy "Thu nhập hiện tại" làm mốc so sánh trần. Mốc của một kỳ là kết quả của đợt Điều chỉnh LIỀN KỀ TRƯỚC
   * (hoặc chính đợt đó nếu nó là đợt mới nhất): lấy mốc đang có hiệu lực vào NGÀY LIỀN TRƯỚC ngày hiệu lực của đợt Điều chỉnh gần nhất.
   * Nhờ vậy các học kỳ trong cùng một năm không so với kết quả vừa chốt của chính năm đó (không cộng dồn trần).
   */
  function baselineDate(ky) {
    var last = '';
    Db.all('KY_LUONG').forEach(function (k) {
      if (k.loai === 'Điều chỉnh' && k.den_ngay <= ky.tu_ngay && k.den_ngay > last) last = k.den_ngay;
    });
    return last ? Util.addDays(last, -1) : ky.tu_ngay;
  }

  /**
   * Khi chốt một đợt Điều chỉnh: mức lương chính thức (không gồm phụ trội) của từng người trở thành "Thu nhập hiện tại" mới,
   * hiệu lực từ ngày hiệu lực của đợt, tự kết thúc mốc cũ vào ngày liền trước. Không ghi đè mốc đã có cùng ngày. Gọi trong Db.tx().
   */
  function promoteBaseline(phieu) {
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === phieu.ky_ma; });
    if (!ky || ky.loai !== 'Điều chỉnh') return { created: 0, skipped: [] };
    var date = ky.den_ngay, hist = groupBy(Db.all('THU_NHAP_NEN'), 'ma_nv'), ups = [], ins = [], skipped = [];
    Db.filter('THU_NHAP_MOI', function (r) { return r.phieu_ma === phieu.ma_phieu && r.ky_ma === ky.ma; }).forEach(function (r) {
      var luong = Math.round(r.luong_nen !== '' && r.luong_nen !== undefined ? r.luong_nen : r.chinh_thuc);
      if (!(luong > 0)) { skipped.push(r.ma_nv + ': không có mức lương hợp lệ'); return; }
      var rows = hist[r.ma_nv] || [];
      if (rows.some(function (h) { return h.hieu_luc_tu === date; })) { skipped.push(r.ma_nv + ': đã có mốc hiệu lực ' + Util.displayDate(date) + ', giữ nguyên'); return; }
      var later = rows.filter(function (h) { return h.hieu_luc_tu > date; }).map(function (h) { return h.hieu_luc_tu; }).sort()[0];
      rows.forEach(function (h) {
        if (h.hieu_luc_tu < date && (!h.hieu_luc_den || h.hieu_luc_den >= date)) ups.push({ id: h.id, patch: { hieu_luc_den: Util.addDays(date, -1) } });
      });
      ins.push({ ma_nv: r.ma_nv, thu_nhap: luong, ho_tro_gvcn: 0, ho_tro_khac: 0, hieu_luc_tu: date, hieu_luc_den: later ? Util.addDays(later, -1) : '',
        ghi_chu: 'Từ chốt ' + ky.ma + ' (' + phieu.ma_phieu + ')' });
    });
    Db.updateMany('THU_NHAP_NEN', ups, 'system');
    Db.insertMany('THU_NHAP_NEN', ins, 'system');
    Audit.log(null, 'TAO_MOC_THU_NHAP', 'THU_NHAP_NEN', ky.ma, { phieu: phieu.ma_phieu, hieu_luc_tu: date, tao_moi: ins.length, bo_qua: skipped });
    return { created: ins.length, skipped: skipped, date: date };
  }

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
  function getKy(kyMa) {
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === kyMa; });
    if (!ky) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ ' + kyMa);
    return ky;
  }

  function checkOverrides(ov) {
    var o = {};
    ['lcb_pct', 'ltb_pct', 'tran_diem'].forEach(function (k) {
      if (ov[k] === undefined || ov[k] === '' || ov[k] === null) return;
      var v = Number(String(ov[k]).replace(',', '.'));
      if (!isFinite(v) || v < -100 || v > 100) throw new AppError('BAD_REQUEST', 'Giá trị "' + k + '" phải là số từ -100 đến 100');
      o[k] = v;
    });
    if (ov.param_key) {
      if (!PARAMS.some(function (x) { return x.k === ov.param_key; })) throw new AppError('BAD_REQUEST', 'Tham số không hợp lệ: ' + ov.param_key);
      var pv = Number(String(ov.param_value).replace(',', '.'));
      if (ov.param_value === '' || !isFinite(pv) || pv < 0) throw new AppError('BAD_REQUEST', 'Nhập giá trị số ≥ 0 cho tham số ' + ov.param_key);
      o.param = {}; o.param[ov.param_key] = pv;
    }
    return o;
  }

  /** Áp kịch bản mô phỏng lên BẢN SAO gói đề án (không động tới dữ liệu thật). */
  function applyOverrides(b, ov) {
    var lp = 1 + (ov.lcb_pct || 0) / 100, tp = 1 + (ov.ltb_pct || 0) / 100;
    Object.keys(b.luong).forEach(function (cn) { b.luong[cn] = { lcb: Math.round(b.luong[cn].lcb * lp), ltb: Math.round(b.luong[cn].ltb * tp) }; });
    if (ov.param) Object.keys(ov.param).forEach(function (k) { b.param[k] = ov.param[k]; });
    if (ov.tran_diem) {
      b.tran = b.tran.map(function (r) {
        var c = {};
        Object.keys(r).forEach(function (k) { c[k] = r[k]; });
        c.ty_le = Math.max(0, Math.round((r.ty_le + ov.tran_diem / 100) * 1e6) / 1e6);
        return c;
      });
    }
  }

  /** Tính trong bộ nhớ (không ghi) phụ trội + thu nhập mới của kỳ Học kỳ/Điều chỉnh. ov: kịch bản mô phỏng (tùy chọn). */
  function build(user, ky, truongMa, gom, ov) {
    ov = ov || {};
    var kyMa = ky.ma;
    var isAdj = ky.loai === 'Điều chỉnh';
    var dean = Policy.effective(ky.den_ngay);
    if (!dean) throw new AppError('NO_POLICY', 'Không có đề án đang hiệu lực vào ngày ' + Util.displayDate(ky.den_ngay));
    var b = Policy.bundle(dean.ma), warnings = [], namXet = +ky.den_ngay.slice(0, 4);
    applyOverrides(b, ov);

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

    var refDate = baselineDate(ky);
    var locked = {};
    if (!ov.ignoreLocked) {
      Db.all('QUYET_TOAN').concat(Db.all('THU_NHAP_MOI')).forEach(function (r) {
        if (r.ky_ma === kyMa && r.trang_thai !== 'Tạm tính') locked[r.ma_nv] = true;
      });
    }

    // Trường và đối tượng của mỗi người lấy từ dòng "Quá trình ngạch bậc" đang hiệu lực tại ngày cuối kỳ.
    var recAt = function (ma) { return (ngachBy[ma] || []).filter(function (r) { return activeAt(r, ky.den_ngay); })[0] || null; };
    var staff = Db.filter('NHAN_SU', function (s) {
      var rec = recAt(s.ma_nv), tr = rec ? rec.truong_ma : '';
      if (truongMa && tr !== truongMa) return false;
      if (s.ngay_vao_lam > ky.den_ngay) return false;
      if (s.ngay_nghi_viec && s.ngay_nghi_viec < ky.tu_ngay) return false;
      return Auth.canRow(user, 'calc.run', { cn: s.chi_nhanh_ma, tr: tr, nv: s.ma_nv });
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
      if (!cur.doi_tuong) { warnings.push(tag + ': dòng quá trình ngạch bậc chưa có "Đối tượng tính lương"'); return; }
      var who = { ho_ten: s.ho_ten, chi_nhanh_ma: s.chi_nhanh_ma, truong_ma: cur.truong_ma, doi_tuong: cur.doi_tuong };

      var decls = declsBy[s.ma_nv] || [], settle = { tien_pt: 0 }, nguon = 'Đã duyệt';
      if (decls.length) {
        if (decls.some(function (d) { return d.trang_thai !== 'Đã duyệt'; })) { nguon = 'Gồm dòng chưa duyệt'; unapproved++; }
        settle = Engine.settle({ decls: decls, doiTuong: cur.doi_tuong, soTuan: ky.so_tuan, param: b.param, ltb: lw.ltb, hsTiet: g.hs_tiet === '' ? null : g.hs_tiet });
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
      var curInc = (tnBy[s.ma_nv] || []).filter(function (r) { return activeAt(r, refDate); })[0];
      var tienPt = isAdj ? (ptBy[s.ma_nv] || 0) : settle.tien_pt;
      var inc = Engine.income({
        doiTuong: cur.doi_tuong, ngach: g, tenure: Util.fullYears(s.ngay_vao_lam, ky.den_ngay),
        holdYears: holdYears(hist.filter(function (r) { return r.ngach_ma === cur.ngach_ma; }), ky.den_ngay),
        kiemNhiem: kn, hangTruong: cur.truong_ma ? b.hangTruong[(hang[cur.truong_ma] || {}).hang] || null : null,
        lcb: lw.lcb, ltb: lw.ltb, param: b.param, tran: b.tran, namXet: namXet, truongMa: cur.truong_ma,
        thuNhapHienTai: curInc ? Staff.incomeTotal(curInc) : null, tienPt: tienPt, soThang: isAdj ? ptSoThang : ky.so_thang_chia
      });
      var irow = { ky_ma: kyMa, ma_nv: s.ma_nv, de_an_ma: dean.ma, ngay_vao_lam: s.ngay_vao_lam, ngach_ma: cur.ngach_ma,
        ngach_ten: ngachName[cur.ngach_ma] || cur.ngach_ma, tham_nien: Util.fullYears(s.ngay_vao_lam, ky.den_ngay),
        nguon: nguon, trang_thai: 'Tạm tính', phieu_ma: '' };
      Object.keys(who).forEach(function (k) { irow[k] = who[k]; });
      Object.keys(inc).forEach(function (k) { irow[k] = inc[k]; });
      if (curInc) { irow.hien_tai_gvcn = Number(curInc.ho_tro_gvcn) || 0; irow.hien_tai_khac = Number(curInc.ho_tro_khac) || 0; }
      if (!cur.truong_ma && g.ho_tro_hang_truong) irow.ghi_chu = (irow.ghi_chu ? irow.ghi_chu + '; ' : '') + 'Nhân sự chưa gắn trường';
      tm.push(irow);
    });

    return { dean: dean, qt: qt, tm: tm, warnings: warnings, skippedLocked: skippedLocked, unapproved: unapproved, staff: staff };
  }

  function replaceTemporary(tables, kyMa, inScope) {
    Object.keys(tables).forEach(function (t) {
      Db.removeMany(t, Db.filter(t, function (r) { return r.ky_ma === kyMa && r.trang_thai === 'Tạm tính' && inScope[r.ma_nv]; }).map(function (r) { return r.id; }));
    });
  }

  /**
   * Tính và LƯU kết quả tạm tính cho một kỳ (Học kỳ hoặc Điều chỉnh).
   * gom: 'da_duyet' (mặc định, dùng để chốt) hoặc 'tat_ca' (tính thử cả dòng Nháp/Chờ duyệt, không chốt được).
   */
  function run(user, kyMa, truongMa, gom) {
    gom = gom === 'tat_ca' ? 'tat_ca' : 'da_duyet';
    var ky = getKy(kyMa);
    if (ky.trang_thai !== 'Mở') throw new AppError('LOCKED', 'Kỳ ' + kyMa + ' đã chốt');
    var inScope = {}, out;
    var r = build(user, ky, truongMa, gom, null);
    r.staff.forEach(function (s) { inScope[s.ma_nv] = true; });
    replaceTemporary({ QUYET_TOAN: 1, THU_NHAP_MOI: 1 }, kyMa, inScope);
    Db.insertMany('QUYET_TOAN', r.qt, user.email);
    Db.insertMany('THU_NHAP_MOI', r.tm, user.email);
    Audit.log(user, 'CHAY_QUYET_TOAN', 'QUYET_TOAN', kyMa, { truong: truongMa || '', de_an: r.dean.ma, gom: gom, loai: ky.loai || 'Học kỳ',
      quyet_toan: r.qt.length, thu_nhap_moi: r.tm.length, bo_qua_da_chot: r.skippedLocked, canh_bao: r.warnings.length });
    out = { de_an: r.dean.ma, loai: ky.loai || 'Học kỳ', settled: r.qt.length, incomes: r.tm.length, skippedLocked: r.skippedLocked, unapproved: r.unapproved, warnings: r.warnings };
    return out;
  }

  /**
   * Mô phỏng: tính cùng một kỳ hai lần trong bộ nhớ (hiện hành và theo kịch bản) rồi so sánh theo nhóm. KHÔNG ghi gì và
   * tính cả nhân sự đã chốt. Kịch bản: lcb_pct, ltb_pct (% đổi LCB/LTB), tran_diem (cộng điểm % vào mọi tỷ lệ trần), một tham số đề án.
   */
  function simulate(user, kyMa, truongMa, rawOv, group, gom) {
    var ky = getKy(kyMa);
    var ov = checkOverrides(rawOv || {});
    if (!Object.keys(ov).length) throw new AppError('BAD_REQUEST', 'Hãy nhập ít nhất một thay đổi để mô phỏng');
    gom = gom === 'tat_ca' ? 'tat_ca' : 'da_duyet';
    var simOv = { ignoreLocked: true };
    Object.keys(ov).forEach(function (k) { simOv[k] = ov[k]; });
    var base = build(user, ky, truongMa, gom, { ignoreLocked: true }), sim = build(user, ky, truongMa, gom, simOv);
    var A = Report.aggregate(base.tm, group || 'chi_nhanh'), B = Report.aggregate(sim.tm, group || 'chi_nhanh');
    var map = {};
    function put(g, side) {
      var o = map[g.key] = map[g.key] || { key: g.key, label: g.label, so_nv: 0, base: { chinh: 0, chi_phi: 0 }, sim: { chinh: 0, chi_phi: 0 } };
      o[side] = { chinh: g.chinh_thuc, chi_phi: g.chi_phi_thang };
      o.so_nv = Math.max(o.so_nv, g.so_nv);
    }
    function cmp(o) {
      var bc = o.base.chinh, sc = o.sim.chinh;
      return { key: o.key, label: o.label, so_nv: o.so_nv, base_chinh_thuc: bc, sim_chinh_thuc: sc, delta: sc - bc,
        pct: bc > 0 ? Math.round((sc - bc) / bc * 10000) / 100 : null,
        base_chi_phi: o.base.chi_phi, sim_chi_phi: o.sim.chi_phi, delta_chi_phi: o.sim.chi_phi - o.base.chi_phi };
    }
    A.groups.forEach(function (g) { put(g, 'base'); });
    B.groups.forEach(function (g) { put(g, 'sim'); });
    var groups = Object.keys(map).sort().map(function (k) { return cmp(map[k]); });
    var total = cmp({ key: 'ALL', label: 'TỔNG CỘNG', so_nv: A.total.so_nv, base: { chinh: A.total.chinh_thuc, chi_phi: A.total.chi_phi_thang },
      sim: { chinh: B.total.chinh_thuc, chi_phi: B.total.chi_phi_thang } });
    return { de_an: sim.dean.ma, ky: { ma: ky.ma, loai: ky.loai || 'Học kỳ' }, kich_ban: ov, groups: groups, total: total,
      nhan_su_tinh_duoc: sim.tm.length, canh_bao: sim.warnings.slice(0, 50), so_canh_bao: sim.warnings.length };
  }

  return { run: run, simulate: simulate, holdYears: holdYears, baselineDate: baselineDate, promoteBaseline: promoteBaseline };
})();
