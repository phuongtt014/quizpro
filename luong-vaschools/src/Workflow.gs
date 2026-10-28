/**
 * Quy trình đề xuất - xét duyệt - phê duyệt nhiều bậc, cấu hình bằng dữ liệu (bảng WORKFLOW_STEP).
 * - Mỗi loại phiếu có quy trình mặc định (trường để trống) và có thể ghi đè riêng cho từng trường.
 * - Khi gửi phiếu, quy trình được chụp lại (snapshot): sửa cấu hình sau đó không làm đổi phiếu đang chạy.
 * - Người duyệt = có vai trò của bước với đúng phạm vi (cùng trường/chi nhánh/toàn hệ thống), hoặc được ủy quyền.
 * - Không ai được duyệt phiếu do chính mình tạo. ADMIN có thể "duyệt thay" (bắt buộc ghi chú, có nhật ký).
 */
var Workflow = (function () {
  var APPLY = {};

  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function parse(s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } }

  /** Quy trình áp dụng cho loại phiếu + trường: ưu tiên cấu hình riêng của trường, sau đó mặc định. */
  function steps(loai, truong) {
    var all = Db.filter('WORKFLOW_STEP', function (s) { return s.loai_phieu === loai; });
    var pick = truong ? all.filter(function (s) { return s.truong_ma === truong; }) : [];
    if (!pick.length) pick = all.filter(function (s) { return s.truong_ma === ''; });
    if (!pick.length) throw new AppError('NO_WORKFLOW', 'Chưa cấu hình quy trình duyệt cho loại phiếu "' + loai + '". Vào Hệ thống → Quy trình duyệt.');
    pick.sort(function (a, b) { return a.thu_tu - b.thu_tu; });
    pick.forEach(function (s, i) {
      if (s.thu_tu !== i + 1) throw new AppError('BAD_WORKFLOW', 'Quy trình "' + loai + '"' + (pick[0].truong_ma ? ' của trường ' + pick[0].truong_ma : ' mặc định') + ' phải đánh số bước liên tục 1, 2, 3…');
    });
    return pick.map(function (s) {
      return { thu_tu: s.thu_tu, ten_buoc: s.ten_buoc, hanh_dong: s.hanh_dong, vai_tro: s.vai_tro, pham_vi: s.pham_vi, han_ngay: s.han_ngay };
    });
  }

  function grantMatches(g, step, phieu) {
    if (g.role !== step.vai_tro && g.role_ma !== step.vai_tro) return false;
    var sc = g.scope || g.pham_vi, code = g.code !== undefined ? g.code : g.pham_vi_ma;
    if (step.pham_vi === 'Toàn hệ thống') return sc === 'Toàn hệ thống';
    if (step.pham_vi === 'Cùng chi nhánh') return sc === 'Toàn hệ thống' || (sc === 'Chi nhánh' && code === phieu.chi_nhanh_ma);
    return sc === 'Toàn hệ thống' || (sc === 'Trường' && code === phieu.truong_ma);
  }

  function activeGrant(g, today) { return (!g.hieu_luc_tu || g.hieu_luc_tu <= today) && (!g.hieu_luc_den || g.hieu_luc_den >= today); }

  /** Email những người có thể xử lý bước này (trực tiếp hoặc được ủy quyền). */
  function approvers(step, phieu) {
    var today = Util.todayIso(), direct = [];
    var activeUsers = {};
    Db.all('USERS').forEach(function (u) { if (u.trang_thai === 'Hoạt động') activeUsers[u.email] = true; });
    Db.all('USER_ROLES').forEach(function (g) {
      if (activeUsers[g.email] && activeGrant(g, today) && g.role_ma === step.vai_tro && grantMatches({ role_ma: g.role_ma, pham_vi: g.pham_vi, pham_vi_ma: g.pham_vi_ma }, step, phieu)) direct.push(g.email);
    });
    direct = Util.uniq(direct);
    var delegated = [];
    Db.all('UY_QUYEN').forEach(function (d) {
      if (d.hieu_luc_tu <= today && d.hieu_luc_den >= today && (!d.loai_phieu || d.loai_phieu === phieu.loai_phieu) &&
        direct.indexOf(d.tu_email) >= 0 && activeUsers[d.den_email]) delegated.push({ email: d.den_email, from: d.tu_email });
    });
    return { direct: direct.filter(function (e) { return e !== phieu.nguoi_tao; }),
      delegated: delegated.filter(function (d) { return d.email !== phieu.nguoi_tao; }) };
  }

  /** Quyền xử lý của user với bước hiện tại: { ok, mode: 'truc_tiep'|'uy_quyen'|'admin', from } */
  function authority(user, phieu) {
    if (phieu.trang_thai !== 'Đang duyệt' || user.email === phieu.nguoi_tao) return { ok: false };
    var step = parse(phieu.quy_trinh, [])[phieu.buoc_hien_tai - 1];
    if (!step) return { ok: false };
    var a = approvers(step, phieu);
    if (a.direct.indexOf(user.email) >= 0) return { ok: true, mode: 'truc_tiep', step: step };
    var d = a.delegated.filter(function (x) { return x.email === user.email; })[0];
    if (d) return { ok: true, mode: 'uy_quyen', from: d.from, step: step };
    if (user.isAdmin) return { ok: true, mode: 'admin', step: step };
    return { ok: false };
  }

  function log(phieu, buoc, action, email, note) {
    Db.insertMany('PHIEU_LOG', [{ ma_phieu: phieu.ma_phieu, buoc: buoc, hanh_dong: action, email: email, ghi_chu: note || '', ts: Util.nowIso() }], email);
  }

  function notifyStep(phieu, stepNo) {
    var step = parse(phieu.quy_trinh, [])[stepNo - 1];
    var a = approvers(step, phieu);
    var to = a.direct.concat(a.delegated.map(function (d) { return d.email; }));
    Notify.queue({ to: to, title: 'Phiếu chờ ' + step.hanh_dong.toLowerCase() + ': ' + phieu.tieu_de,
      body: phieu.ma_phieu + ' · ' + step.ten_buoc + '. Vui lòng xử lý trong mục Phiếu duyệt.', link: 'phieu', type: 'Phiếu duyệt' });
    return to.length;
  }

  /** Tạo & gửi phiếu. o = { loai, tieu_de, truong_ma, chi_nhanh_ma, ky_ma, payload }. Gọi trong Db.tx(). */
  function create(user, o) {
    var chain = steps(o.loai, o.truong_ma || '');
    chain.forEach(function (s) {
      if (s.pham_vi === 'Cùng trường' && !o.truong_ma) throw new AppError('BAD_REQUEST', 'Bước "' + s.ten_buoc + '" cần phiếu gắn với một trường');
    });
    var n = Db.all('PHIEU').length + 1;
    var row = { ma_phieu: 'PH-' + Util.todayIso().slice(0, 4) + '-' + pad(n, 4), loai_phieu: o.loai, tieu_de: o.tieu_de,
      chi_nhanh_ma: o.chi_nhanh_ma || '', truong_ma: o.truong_ma || '', ky_ma: o.ky_ma || '', nguoi_tao: user.email,
      trang_thai: 'Đang duyệt', buoc_hien_tai: 1, so_buoc: chain.length, quy_trinh: JSON.stringify(chain), noi_dung: JSON.stringify(o.payload || {}) };
    var ins = Db.insertMany('PHIEU', [row], user.email)[0];
    log(ins, 0, 'Gửi', user.email, '');
    var cnt = notifyStep(ins, 1);
    Audit.log(user, 'TAO_PHIEU', 'PHIEU', ins.ma_phieu, { loai: o.loai, so_buoc: chain.length, nguoi_duyet_buoc_1: cnt });
    return ins;
  }

  function setStatus(phieu, status, extra) {
    var patch = { trang_thai: status };
    Object.keys(extra || {}).forEach(function (k) { patch[k] = extra[k]; });
    Db.updateMany('PHIEU', [{ id: phieu.id, patch: patch }], 'system');
  }

  APPLY['Khai báo'] = {
    approve: function (p) { setLines('KHAI_BAO', p.ma_phieu, 'Chờ duyệt', 'Đã duyệt'); setLines('HE_KHAI_BAO', p.ma_phieu, 'Chờ duyệt', 'Đã duyệt'); },
    revert: function (p) { setLines('KHAI_BAO', p.ma_phieu, 'Chờ duyệt', 'Nháp', true); setLines('HE_KHAI_BAO', p.ma_phieu, 'Chờ duyệt', 'Nháp', true); }
  };
  APPLY['Quyết toán kỳ'] = {
    approve: function (p) {
      setLines('QUYET_TOAN', p.ma_phieu, 'Chờ chốt', 'Đã chốt');
      setLines('THU_NHAP_MOI', p.ma_phieu, 'Chờ chốt', 'Đã chốt');
      setLines('HE_THU_NHAP', p.ma_phieu, 'Chờ chốt', 'Đã chốt');
      var r = Calc.promoteBaseline(p);
      return r.created ? ' Đã tạo ' + r.created + ' mốc "Thu nhập hiện tại" hiệu lực từ ' + Util.displayDate(r.date) + ' làm cơ sở cho đợt sau' +
        (r.skipped.length ? ' (bỏ qua ' + r.skipped.length + ': ' + r.skipped.slice(0, 3).join('; ') + ')' : '') + '.' : '';
    },
    revert: function (p) {
      setLines('QUYET_TOAN', p.ma_phieu, 'Chờ chốt', 'Tạm tính', true); setLines('THU_NHAP_MOI', p.ma_phieu, 'Chờ chốt', 'Tạm tính', true);
      setLines('HE_THU_NHAP', p.ma_phieu, 'Chờ chốt', 'Tạm tính', true);
    }
  };
  APPLY['Đề xuất ngạch'] = {
    approve: function (p) {
      var d = parse(p.noi_dung, {}), vals = d.row;
      var res = Validate.rows('QUA_TRINH_NGACH', [{ n: 1, vals: vals }], {}, { mode: 'insert', autoClose: true });
      if (!res.ok) throw new AppError('VALIDATION', 'Không áp dụng được đề xuất ngạch: ' + res.errors[0].msg, res.errors);
      Db.updateMany('QUA_TRINH_NGACH', res.closes.map(function (c) { return { id: c.id, patch: { hieu_luc_den: c.den } }; }), 'system');
      var row = {};
      SCHEMA.QUA_TRINH_NGACH.cols.forEach(function (c) { row[c.k] = res.rows[0][c.k]; });
      Db.insertMany('QUA_TRINH_NGACH', [row], p.nguoi_tao);
    },
    revert: function () {}
  };
  APPLY['Khác'] = { approve: function () {}, revert: function () {} };

  /** Đổi trạng thái các dòng gắn với phiếu; clearLink=true thì gỡ liên kết phiếu (khi trả lại/hủy). */
  function setLines(table, maPhieu, from, to, clearLink) {
    var ups = Db.filter(table, function (r) { return r.phieu_ma === maPhieu && r.trang_thai === from; }).map(function (r) {
      return { id: r.id, patch: clearLink ? { trang_thai: to, phieu_ma: '' } : { trang_thai: to } };
    });
    Db.updateMany(table, ups, 'system');
  }

  /** action: 'Duyệt' | 'Trả lại'. Gọi trong Db.tx(). */
  function act(user, id, action, note) {
    var p = Db.get('PHIEU', id);
    if (!p) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu');
    var au = authority(user, p);
    if (!au.ok) throw new AppError('FORBIDDEN', p.trang_thai !== 'Đang duyệt' ? 'Phiếu không còn ở trạng thái chờ duyệt' : (user.email === p.nguoi_tao ? 'Không được duyệt phiếu do chính mình tạo' : 'Bạn không phải người xử lý bước hiện tại'));
    if ((au.mode === 'admin' || action === 'Trả lại') && !note) throw new AppError('BAD_REQUEST', au.mode === 'admin' && action === 'Duyệt' ? 'Duyệt thay cần ghi rõ lý do' : 'Trả lại cần ghi rõ lý do');
    var label = action + (au.mode === 'uy_quyen' ? ' (ủy quyền bởi ' + au.from + ')' : (au.mode === 'admin' ? ' (duyệt thay)' : ''));

    if (action === 'Trả lại') {
      APPLY[p.loai_phieu].revert(p);
      log(p, p.buoc_hien_tai, label, user.email, note);
      setStatus(p, 'Trả lại');
      Notify.queue({ to: [p.nguoi_tao], title: 'Phiếu bị trả lại: ' + p.tieu_de, body: p.ma_phieu + ': ' + note, link: 'phieu', type: 'Phiếu duyệt' });
    } else if (action === 'Duyệt') {
      if (p.buoc_hien_tai >= p.so_buoc) {
        var extra = APPLY[p.loai_phieu].approve(p) || ''; // lỗi ở đây thì phiếu giữ nguyên ở bước cuối
        log(p, p.buoc_hien_tai, label, user.email, note);
        setStatus(p, 'Đã duyệt');
        Notify.queue({ to: [p.nguoi_tao], title: 'Phiếu đã được duyệt: ' + p.tieu_de, body: p.ma_phieu + extra, link: 'phieu', type: 'Phiếu duyệt' });
      } else {
        log(p, p.buoc_hien_tai, label, user.email, note);
        setStatus(p, 'Đang duyệt', { buoc_hien_tai: p.buoc_hien_tai + 1 });
        var next = Db.get('PHIEU', id);
        notifyStep(next, next.buoc_hien_tai);
      }
    } else throw new AppError('BAD_REQUEST', 'Hành động không hợp lệ');
    Audit.log(user, 'XU_LY_PHIEU', 'PHIEU', p.ma_phieu, { hanh_dong: label, buoc: p.buoc_hien_tai });
    return Db.get('PHIEU', id);
  }

  function cancel(user, id) {
    var p = Db.get('PHIEU', id);
    if (!p) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu');
    if (p.nguoi_tao !== user.email && !user.isAdmin) throw new AppError('FORBIDDEN', 'Chỉ người tạo mới hủy được phiếu');
    if (p.trang_thai !== 'Đang duyệt') throw new AppError('STATE', 'Chỉ hủy được phiếu đang chờ duyệt');
    APPLY[p.loai_phieu].revert(p);
    log(p, p.buoc_hien_tai, 'Hủy', user.email, '');
    setStatus(p, 'Đã hủy');
    Audit.log(user, 'HUY_PHIEU', 'PHIEU', p.ma_phieu, {});
  }

  return { steps: steps, create: create, act: act, cancel: cancel, authority: authority, approvers: approvers, parse: parse };
})();
