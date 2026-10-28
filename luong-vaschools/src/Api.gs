/**
 * Điểm vào của Web App. Chỉ các hàm toàn cục dưới đây được trình duyệt gọi.
 * Mọi thao tác đi qua apiCall -> kiểm tra đăng nhập -> kiểm tra quyền/phạm vi -> nghiệp vụ.
 */
function doGet() {
  var user = Auth.current();
  var t = HtmlService.createTemplateFromFile(user ? 'Index' : 'Denied');
  t.email = Auth.email();
  return t.evaluate().setTitle('Hệ thống Lương VASchools')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function apiCall(name, payload) {
  try {
    var h = Api.handlers[name];
    if (!h) throw new AppError('NOT_FOUND', 'API không tồn tại: ' + name);
    var user = Auth.current();
    if (!user) throw new AppError('FORBIDDEN', 'Tài khoản chưa được cấp quyền sử dụng hệ thống');
    var data = h(payload || {}, user);
    Notify.flush();
    return { ok: true, data: data };
  } catch (e) {
    Notify.discard();
    if (e instanceof AppError) return { ok: false, code: e.code, error: e.message, details: e.details };
    console.error(e && e.stack ? e.stack : e);
    return { ok: false, code: 'ERROR', error: 'Lỗi hệ thống: ' + (e && e.message ? e.message : e) };
  }
}

var Api = (function () {
  var PAGE = 300;

  function table(name) {
    var T = SCHEMA[name];
    if (!T || T.internal) throw new AppError('NOT_FOUND', 'Bảng không tồn tại: ' + name);
    return T;
  }

  function assertDraft(ma) {
    var d = ma && Db.find('DEAN', function (x) { return x.ma === ma; });
    if (!d) throw new AppError('NOT_FOUND', 'Không tìm thấy đề án');
    if (d.trang_thai !== 'Nháp') throw new AppError('LOCKED', 'Đề án đã ban hành nên không thể sửa. Hãy nhân bản thành phiên bản mới rồi chỉnh sửa.');
  }

  /**
   * Bản Nháp sửa tự do. Bản đã Ban hành khóa hoàn toàn, TRỪ việc thêm mới LCB/LTB cho chi nhánh chưa có
   * (chi nhánh mở sau khi ban hành): chỉ thêm, không sửa/xóa nên không làm đổi kết quả cũ.
   */
  function dean(ma) {
    var d = ma && Db.find('DEAN', function (x) { return x.ma === ma; });
    if (!d) throw new AppError('NOT_FOUND', 'Không tìm thấy đề án');
    return d;
  }
  var APPEND_ONLY = { DEAN_THAMSO: 'LCB/LTB của chi nhánh mới', DEAN_TRAN: 'trần của năm/trường mới' };
  function assertDeanWritable(table, ma, appendOnly) {
    var d = dean(ma);
    if (d.trang_thai === 'Nháp') return;
    if (appendOnly && APPEND_ONLY[table] && d.trang_thai === 'Ban hành') return;
    throw new AppError('LOCKED', 'Đề án đã ban hành nên không thể sửa. Hãy nhân bản thành phiên bản mới rồi chỉnh sửa.' +
      (APPEND_ONLY[table] ? ' (Riêng ' + APPEND_ONLY[table] + ' thì được thêm mới.)' : ''));
  }

  function stripRow(T, r, forUpdate) {
    var o = {};
    T.cols.forEach(function (c) {
      if (forUpdate && c.ro) return;
      o[c.k] = r[c.k];
    });
    return o;
  }

  function pickClient(T, r) {
    var o = { id: r.id, updated_at: r.updated_at };
    T.cols.forEach(function (c) { o[c.k] = r[c.k]; });
    (T.computed || []).forEach(function (c) { o[c.k] = r[c.k]; });
    return o;
  }

  /** Mọi bảng khác đang tham chiếu tới bản ghi này? (chặn xóa làm mồ côi dữ liệu) */
  function referencedBy(t, row) {
    var hits = [];
    Object.keys(SCHEMA).forEach(function (ot) {
      SCHEMA[ot].cols.forEach(function (c) {
        if (!c.ref) return;
        var p = c.ref.split('.');
        if (p[0] !== t) return;
        if (ot === t) return;
        if (Db.all(ot).some(function (x) { return x[c.k] === row[p[1]]; })) hits.push(SCHEMA[ot].label);
      });
    });
    return Util.uniq(hits);
  }

  function labelOf(r) {
    if (r.hoc_ky) return (r.loai || 'Học kỳ') + ' · ' + Util.displayDate(r.tu_ngay) + (r.den_ngay !== r.tu_ngay ? ' – ' + Util.displayDate(r.den_ngay) : '');
    return r.ten || r.ho_ten || r.ma || '';
  }

  function clientSchema(user) {
    var tables = {}, refs = {};
    Object.keys(SCHEMA).forEach(function (t) {
      var T = SCHEMA[t];
      if (T.internal) return;
      if (!Auth.can(user, T.perm.r)) return;
      tables[t] = {
        label: T.label, group: T.group, cols: T.cols, key: T.key, ctx: T.ctx || null, hidden: !!T.hidden,
        readonly: !!T.readonly, temporal: !!T.temporal, computed: T.computed || [],
        canWrite: !T.readonly && Auth.can(user, T.perm.w),
        canImport: !T.readonly && !T.noImport && Auth.can(user, T.perm.i || T.perm.w),
        spec: T.readonly ? [] : Validate.spec(t)
      };
      T.cols.forEach(function (c) {
        if (c.t !== 'ref' || refs[c.ref] !== undefined) return;
        var p = c.ref.split('.'), rows = Db.all(p[0]), RT = SCHEMA[p[0]];
        if (rows.length > 300 || !Auth.can(user, RT.perm.r)) { refs[c.ref] = null; return; }
        var sf = Auth.scopeFn(p[0]);
        if (sf && !Auth.hasGlobal(user, RT.perm.r)) rows = rows.filter(function (r) { return Auth.canRow(user, RT.perm.r, sf(r)); });
        refs[c.ref] = rows.map(function (r) { return { v: String(r[p[1]]), l: labelOf(r) }; });
      });
    });
    return { tables: tables, refs: refs, perms: PERMS, params: PARAMS };
  }

  function resolveWriteCtx(T, p) {
    var ctx = p.ctx || {};
    if (T.ctx) assertDeanWritable(p.table, ctx[T.ctx], !p.id);
    return ctx;
  }

  function validationError(res, headline) {
    return new AppError('VALIDATION', headline || (res.errors[0].msg + (res.errors.length > 1 ? ' (và ' + (res.errors.length - 1) + ' lỗi khác)' : '')), res.errors);
  }

  function stepOf(p) { return Workflow.parse(p.quy_trinh, [])[p.buoc_hien_tai - 1] || null; }

  function phieuRow(p, user) {
    var st = stepOf(p), au = user ? Workflow.authority(user, p) : { ok: false };
    return { id: p.id, ma: p.ma_phieu, loai: p.loai_phieu, tieu_de: p.tieu_de, truong: p.truong_ma, ky: p.ky_ma, nguoi_tao: p.nguoi_tao,
      trang_thai: p.trang_thai, buoc: p.buoc_hien_tai, so_buoc: p.so_buoc, buoc_ten: p.trang_thai === 'Đang duyệt' && st ? st.ten_buoc : '',
      at: p.created_at, can_act: !!au.ok };
  }

  function canSee(user, p) {
    if (user.isAdmin || p.nguoi_tao === user.email) return true;
    if (Auth.canRow(user, 'phieu.view', { cn: p.chi_nhanh_ma, tr: p.truong_ma })) return true;
    return Workflow.parse(p.quy_trinh, []).some(function (st) {
      var a = Workflow.approvers(st, p);
      return a.direct.indexOf(user.email) >= 0 || a.delegated.some(function (d) { return d.email === user.email; });
    });
  }

  function staffName() {
    var m = {};
    Db.all('NHAN_SU').forEach(function (s) { m[s.ma_nv] = s.ho_ten; });
    return m;
  }

  function phieuItems(p) {
    var names = staffName(), rows = [], head = [];
    if (p.loai_phieu === 'Khai báo') {
      head = ['Mã NV', 'Họ tên', 'Loại', 'Nội dung', 'Số lượng', 'Thời gian'];
      rows = Db.filter('KHAI_BAO', function (r) { return r.phieu_ma === p.ma_phieu; }).map(function (r) {
        return [r.ma_nv, names[r.ma_nv] || '', r.loai, r.noi_dung, r.so_luong + ' ' + r.don_vi + (r.dac_thu === 'Có' ? ' (đặc thù)' : ''), Util.displayDate(r.tu_ngay) + ' – ' + Util.displayDate(r.den_ngay)];
      }).concat(Db.filter('HE_KHAI_BAO', function (r) { return r.phieu_ma === p.ma_phieu; }).map(function (r) {
        return [r.ma_nv, names[r.ma_nv] || '', 'Lương hè', 'Ngày vào trường (x) / ngày sẵn sàng (y)', r.so_ngay_lam + ' / ' + r.so_ngay_san_sang, r.ky_ma];
      }));
    } else if (p.loai_phieu === 'Quyết toán kỳ') {
      head = ['Mã NV', 'Họ tên', 'Thu nhập hiện tại', 'Mức chính thức', 'Ghi chú'];
      var money = function (v) { return v === '' ? '' : Number(v).toLocaleString('vi-VN'); };
      rows = Db.filter('THU_NHAP_MOI', function (r) { return r.phieu_ma === p.ma_phieu; }).map(function (r) {
        return [r.ma_nv, names[r.ma_nv] || '', money(r.thu_nhap_hien_tai), money(r.chinh_thuc), r.ghi_chu];
      }).concat(Db.filter('HE_THU_NHAP', function (r) { return r.phieu_ma === p.ma_phieu; }).map(function (r) {
        return [r.ma_nv, names[r.ma_nv] || '', money(r.thu_nhap_thang), money(r.tong_he) + ' (lương hè)', r.ghi_chu];
      }));
    } else if (p.loai_phieu === 'Đề xuất ngạch') {
      var d = Workflow.parse(p.noi_dung, {}).row || {};
      head = ['Mã NV', 'Họ tên', 'Ngạch đề xuất', 'Hiệu lực từ', 'Số quyết định', 'Lý do'];
      rows = [[d.ma_nv, names[d.ma_nv] || '', d.ngach_ma, d.hieu_luc_tu, d.so_quyet_dinh || '', d.ly_do || '']];
    } else {
      head = ['Nội dung'];
      rows = [[Workflow.parse(p.noi_dung, {}).noi_dung || '']];
    }
    return { head: head, rows: rows.slice(0, 500), total: rows.length };
  }

  function pendingFor(user) {
    return Db.filter('PHIEU', function (p) { return p.trang_thai === 'Đang duyệt'; })
      .filter(function (p) { var a = Workflow.authority(user, p); return a.ok && a.mode !== 'admin'; });
  }

  function findKy(ma, needOpen) {
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === ma; });
    if (!ky) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ ' + ma);
    if (needOpen && ky.trang_thai !== 'Mở') throw new AppError('LOCKED', 'Kỳ ' + ma + ' đã chốt');
    return ky;
  }
  function findTruong(ma) {
    var t = Db.find('TRUONG', function (x) { return x.ma === ma; });
    if (!t) throw new AppError('NOT_FOUND', 'Chọn trường hợp lệ');
    return t;
  }

  var handlers = {
    me: function (p, user) {
      return { email: user.email, name: user.name, ma_nv: user.ma_nv, perms: user.perms, isAdmin: user.isAdmin,
        unread: Notify.unread(user.email) };
    },

    schema: function (p, user) { return clientSchema(user); },

    dashboard: function (p, user) {
      var cnt = function (t, pred) { return Db.all(t).filter(pred || function () { return true; }).length; };
      var dean = Policy.effective(Util.todayIso());
      var checklist = [
        { ok: cnt('CHI_NHANH') > 0, text: 'Khai báo chi nhánh', route: 'setup/CHI_NHANH' },
        { ok: cnt('TRUONG') > 0, text: 'Khai báo trường', route: 'setup/TRUONG' },
        { ok: cnt('NAM_HOC') > 0, text: 'Khai báo năm học và kỳ quyết toán', route: 'setup/NAM_HOC' },
        { ok: !!dean, text: 'Có đề án đang hiệu lực', route: 'dean' },
        { ok: cnt('NHAN_SU') > 0, text: 'Nhập hồ sơ nhân sự', route: 'staff/NHAN_SU' },
        { ok: cnt('USERS') > 1, text: 'Tạo tài khoản và gán vai trò cho người dùng', route: 'admin/USERS' }
      ];
      var staffVisible = Auth.can(user, 'staff.view');
      return {
        checklist: checklist,
        pending: pendingFor(user).length,
        dean: dean ? { ma: dean.ma, so_hieu: dean.so_hieu, tu: dean.hieu_luc_tu } : null,
        counts: {
          chi_nhanh: cnt('CHI_NHANH', function (r) { return r.trang_thai === 'Hoạt động'; }),
          truong: cnt('TRUONG', function (r) { return r.trang_thai === 'Hoạt động'; }),
          nhan_su: staffVisible ? cnt('NHAN_SU', function (r) { return r.trang_thai === 'Đang làm việc'; }) : null
        }
      };
    },

    list: function (p, user) {
      var T = table(p.table);
      Auth.require(user, T.perm.r);
      var ctx = p.ctx || {}, rows = Db.all(p.table);
      if (T.ctx) {
        if (!ctx[T.ctx]) throw new AppError('BAD_REQUEST', 'Thiếu ngữ cảnh đề án');
        rows = rows.filter(function (r) { return r[T.ctx] === ctx[T.ctx]; });
      }
      if (p.filter) {
        Object.keys(p.filter).forEach(function (k) {
          if (!T.cols.some(function (c) { return c.k === k; })) return;
          rows = rows.filter(function (r) { return String(r[k]) === String(p.filter[k]); });
        });
      }
      var sf = Auth.scopeFn(p.table);
      if (sf && !Auth.hasGlobal(user, T.perm.r)) rows = rows.filter(function (r) { return Auth.canRow(user, T.perm.r, sf(r)); });
      if (p.q) {
        var q = Strict.norm(p.q);
        rows = rows.filter(function (r) {
          return T.cols.some(function (c) { return r[c.k] !== '' && Strict.norm(r[c.k]).indexOf(q) >= 0; });
        });
      }
      if (T.desc) rows = rows.slice().reverse();
      var total = rows.length, page = Math.max(0, p.page || 0);
      rows = rows.slice(page * PAGE, page * PAGE + PAGE);
      if (p.table === 'NHAN_SU') rows = Staff.decorate(rows);
      if (p.table === 'NGACH_DM') rows = Policy.decorateNgach(rows);
      var locked = false, appendOnly = false;
      if (T.ctx) {
        var d = Db.find('DEAN', function (x) { return x.ma === ctx[T.ctx]; });
        locked = !d || d.trang_thai !== 'Nháp';
        appendOnly = locked && !!d && !!APPEND_ONLY[p.table] && d.trang_thai === 'Ban hành';
      }
      return { rows: rows.map(function (r) { return pickClient(T, r); }), total: total, page: page, pageSize: PAGE, locked: locked, appendOnly: appendOnly };
    },

    save: function (p, user) {
      var T = table(p.table);
      if (T.readonly) throw new AppError('FORBIDDEN', 'Bảng chỉ đọc');
      Auth.require(user, T.perm.w);
      var out;
      Db.tx(function () {
        var ctx = resolveWriteCtx(T, p), old = null;
        if (p.id) {
          old = Db.get(p.table, p.id);
          if (!old || (T.ctx && old[T.ctx] !== ctx[T.ctx])) throw new AppError('NOT_FOUND', 'Không tìm thấy bản ghi');
          var sf = Auth.scopeFn(p.table);
          if (sf && !Auth.canRow(user, T.perm.w, sf(old))) throw new AppError('FORBIDDEN', 'Bản ghi nằm ngoài phạm vi dữ liệu của bạn');
        }
        if (old && T.guard) { var gm = T.guard(old); if (gm) throw new AppError('LOCKED', gm); }
        var res = Validate.rows(p.table, [{ n: 1, vals: p.row || {} }], ctx,
          { mode: 'insert', selfId: p.id, user: user, autoClose: !!p.autoClose && !p.id });
        if (!res.ok) throw validationError(res);
        var row = res.rows[0];
        if (old) {
          if (T.lockKey) T.key.forEach(function (k) {
            if (String(old[k]) !== String(row[k])) throw new AppError('LOCKED_KEY', 'Không đổi được "' + k + '" của bản ghi đã tạo (đang được các bảng khác tham chiếu). Hãy tạo bản ghi mới.');
          });
          if (p.table === 'DEAN' && old.trang_thai !== 'Nháp' && (old.hieu_luc_tu !== row.hieu_luc_tu || old.hieu_luc_den !== row.hieu_luc_den)) {
            throw new AppError('LOCKED', 'Đề án đã ban hành: không đổi được thời gian hiệu lực.');
          }
          Db.updateMany(p.table, [{ id: old.id, patch: stripRow(T, row, true) }], user.email);
          Audit.log(user, 'SUA', p.table, old.id, { truoc: stripRow(T, old), sau: stripRow(T, row) });
          out = { id: old.id };
        } else {
          if (res.closes.length) {
            Db.updateMany(p.table, res.closes.map(function (c) { return { id: c.id, patch: { hieu_luc_den: c.den } }; }), user.email);
          }
          var ins = Db.insertMany(p.table, [stripRow(T, row)], user.email)[0];
          Audit.log(user, 'THEM', p.table, ins.id, { ban_ghi: stripRow(T, row), da_dong: res.closes });
          out = { id: ins.id };
        }
      });
      return out;
    },

    remove: function (p, user) {
      var T = table(p.table);
      if (T.readonly) throw new AppError('FORBIDDEN', 'Bảng chỉ đọc');
      Auth.require(user, T.perm.w);
      Db.tx(function () {
        var ctx = p.ctx || {};
        if (T.ctx) assertDeanWritable(p.table, ctx[T.ctx], false);
        var row = Db.get(p.table, p.id);
        if (!row || (T.ctx && row[T.ctx] !== ctx[T.ctx])) throw new AppError('NOT_FOUND', 'Không tìm thấy bản ghi');
        var sf = Auth.scopeFn(p.table);
        if (sf && !Auth.canRow(user, T.perm.w, sf(row))) throw new AppError('FORBIDDEN', 'Bản ghi nằm ngoài phạm vi dữ liệu của bạn');
        if (T.guard) { var gm = T.guard(row); if (gm) throw new AppError('LOCKED', gm); }

        if (p.table === 'DEAN') {
          if (row.trang_thai !== 'Nháp') throw new AppError('LOCKED', 'Chỉ xóa được đề án ở trạng thái Nháp');
          Policy.childTables().forEach(function (t) {
            Db.removeMany(t, Db.filter(t, function (r) { return r.de_an_ma === row.ma; }).map(function (r) { return r.id; }));
          });
        } else {
          var refs = referencedBy(p.table, row);
          if (refs.length) throw new AppError('IN_USE', 'Không xóa được vì đang được dùng ở: ' + refs.join(', ') + '. Hãy chuyển trạng thái sang Ngừng/Đã nghỉ việc thay vì xóa.');
        }
        if (p.table === 'USER_ROLES' && row.role_ma === 'ADMIN' && row.pham_vi === 'Toàn hệ thống') {
          var admins = Db.filter('USER_ROLES', function (g) { return g.role_ma === 'ADMIN' && g.pham_vi === 'Toàn hệ thống'; });
          if (admins.length <= 1) throw new AppError('LAST_ADMIN', 'Không thể gỡ quản trị viên cuối cùng');
        }
        Db.removeMany(p.table, [row.id]);
        Audit.log(user, 'XOA', p.table, row.id, stripRow(T, row));
      });
      return {};
    },

    importCheck: function (p, user) {
      var T = table(p.table);
      Auth.require(user, T.perm.i || T.perm.w);
      if (T.ctx && !(p.ctx && p.ctx[T.ctx])) throw new AppError('BAD_REQUEST', 'Thiếu ngữ cảnh đề án');
      var res = Validate.importText(p.table, p.text, p.ctx || {}, { mode: p.mode || 'insert', user: user });
      return { ok: res.ok, errors: res.errors.slice(0, 500), total: res.total || 0, inserts: res.inserts || 0, updates: res.updates || 0,
        truncated: !!res.truncated, locked: T.ctx ? (function () {
          var d = Db.find('DEAN', function (x) { return x.ma === p.ctx[T.ctx]; });
          if (!d) return true;
          return d.trang_thai !== 'Nháp' && !(APPEND_ONLY[p.table] && d.trang_thai === 'Ban hành' && (p.mode || 'insert') === 'insert');
        })() : false };
    },

    importCommit: function (p, user) {
      var T = table(p.table);
      Auth.require(user, T.perm.i || T.perm.w);
      var res, ins = 0, upd = 0;
      Db.tx(function () {
        if (T.ctx) assertDeanWritable(p.table, (p.ctx || {})[T.ctx], (p.mode || 'insert') === 'insert');
        res = Validate.importText(p.table, p.text, p.ctx || {}, { mode: p.mode || 'insert', user: user });
        if (!res.ok) return;
        var inserts = [], updates = [];
        res.rows.forEach(function (r) {
          if (r.__update) updates.push({ id: r.__update, patch: stripRow(T, r, true) });
          else inserts.push(stripRow(T, r));
        });
        Db.insertMany(p.table, inserts, user.email);
        Db.updateMany(p.table, updates, user.email);
        ins = inserts.length; upd = updates.length;
        Audit.log(user, 'NHAP_CSV', p.table, '', { ctx: p.ctx || {}, them: ins, capnhat: upd });
      });
      if (!res.ok) throw new AppError('VALIDATION', 'Dữ liệu không hợp lệ - không có dòng nào được nhập.', res.errors.slice(0, 500));
      return { inserted: ins, updated: upd };
    },

    /** Sao chép toàn bộ trần (chung và riêng từng trường) của một năm sang năm mới để chỉnh tiếp; bỏ qua dòng đã có. */
    'tran.copy': function (p, user) {
      Auth.require(user, 'policy.edit');
      var out;
      Db.tx(function () {
        assertDeanWritable('DEAN_TRAN', p.de_an_ma, true);
        var from = parseInt(p.from_nam, 10), to = parseInt(p.to_nam, 10);
        if (!(from > 0) || !(to > 0) || from === to) throw new AppError('BAD_REQUEST', 'Nhập năm nguồn và năm đích khác nhau');
        var src = Db.filter('DEAN_TRAN', function (r) { return r.de_an_ma === p.de_an_ma && r.nam === from; });
        if (!src.length) throw new AppError('EMPTY', 'Năm ' + from + ' chưa có dòng trần nào để sao chép');
        var raws = src.map(function (r, i) {
          return { n: i + 1, vals: { truong_ma: r.truong_ma, nam: String(to), tn_tu: String(r.tn_tu), tn_den: r.tn_den === '' ? '' : String(r.tn_den),
            ty_le: String(Math.round(r.ty_le * 10000) / 100).replace('.', ',') + '%' } };
        });
        var have = {};
        Db.filter('DEAN_TRAN', function (r) { return r.de_an_ma === p.de_an_ma && r.nam === to; }).forEach(function (r) { have[r.truong_ma + '|' + r.tn_tu] = true; });
        raws = raws.filter(function (x) { return !have[x.vals.truong_ma + '|' + x.vals.tn_tu]; });
        if (!raws.length) throw new AppError('EMPTY', 'Năm ' + to + ' đã có đủ các dòng này');
        var res = Validate.rows('DEAN_TRAN', raws, { de_an_ma: p.de_an_ma }, { mode: 'insert' });
        if (!res.ok) throw validationError(res);
        Db.insertMany('DEAN_TRAN', res.rows.map(function (r) { return stripRow(SCHEMA.DEAN_TRAN, r); }), user.email);
        Audit.log(user, 'SAO_CHEP_TRAN', 'DEAN_TRAN', p.de_an_ma, { tu_nam: from, den_nam: to, so_dong: res.rows.length });
        out = { copied: res.rows.length };
      });
      return out;
    },

    'dean.check': function (p, user) {
      Auth.require(user, 'policy.view');
      return { issues: Policy.checkReady(p.ma) };
    },

    'dean.clone': function (p, user) {
      Auth.require(user, 'policy.edit');
      var out;
      Db.tx(function () { out = Policy.clone(user, p.src, p); });
      return out;
    },

    'dean.publish': function (p, user) {
      Auth.require(user, 'policy.publish');
      var out;
      Db.tx(function () { out = Policy.publish(user, p.ma); });
      return out;
    },

    'roles.matrix': function (p, user) {
      Auth.require(user, 'role.manage');
      var grid = {};
      Db.all('ROLE_PERMS').forEach(function (rp) { (grid[rp.role_ma] = grid[rp.role_ma] || {})[rp.quyen] = true; });
      return { roles: Db.all('ROLES').map(function (r) { return { ma: r.ma, ten: r.ten }; }), perms: PERMS, grid: grid };
    },

    'roles.save': function (p, user) {
      Auth.require(user, 'role.manage');
      if (p.role === 'ADMIN') throw new AppError('LOCKED', 'Vai trò ADMIN luôn có toàn quyền, không chỉnh được');
      var valid = PERMS.map(function (x) { return x.k; });
      (p.perms || []).forEach(function (k) { if (valid.indexOf(k) < 0) throw new AppError('BAD_REQUEST', 'Quyền không hợp lệ: ' + k); });
      Db.tx(function () {
        if (!Db.find('ROLES', function (r) { return r.ma === p.role; })) throw new AppError('NOT_FOUND', 'Không có vai trò ' + p.role);
        var before = Db.filter('ROLE_PERMS', function (x) { return x.role_ma === p.role; });
        Db.removeMany('ROLE_PERMS', before.map(function (x) { return x.id; }));
        Db.insertMany('ROLE_PERMS', Util.uniq(p.perms || []).map(function (k) { return { role_ma: p.role, quyen: k }; }), user.email);
        Audit.log(user, 'SUA_QUYEN_VAI_TRO', 'ROLE_PERMS', p.role, { truoc: before.map(function (x) { return x.quyen; }), sau: p.perms || [] });
      });
      return {};
    },

    'notify.list': function (p, user) {
      return { items: Notify.list(user.email, 30), unread: Notify.unread(user.email) };
    },

    'notify.read': function (p, user) {
      Notify.markRead(user.email, p.ids || null);
      return { unread: Notify.unread(user.email) };
    },

    'khaibao.submit': function (p, user) {
      Auth.require(user, 'phieu.create');
      var out;
      Db.tx(function () {
        var ky = findKy(p.ky_ma, true), tr = findTruong(p.truong_ma), staff = {};
        Db.all('NHAN_SU').forEach(function (s) { if (s.truong_ma === tr.ma) staff[s.ma_nv] = s; });
        if (ky.loai === 'Điều chỉnh') throw new AppError('BAD_REQUEST', 'Đợt điều chỉnh không có khai báo giảng dạy');
        var tbl = ky.loai === 'Hè' ? 'HE_KHAI_BAO' : 'KHAI_BAO';
        var lines = Db.filter(tbl, function (r) {
          var s = staff[r.ma_nv];
          return r.ky_ma === ky.ma && r.trang_thai === 'Nháp' && s && Auth.canRow(user, 'declare.edit', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv });
        });
        if (!lines.length) throw new AppError('EMPTY', 'Không có dòng khai báo nào ở trạng thái Nháp của trường này trong kỳ ' + ky.ma);
        var ph = Workflow.create(user, { loai: 'Khai báo', tieu_de: (ky.loai === 'Hè' ? 'Khai báo ngày làm việc hè ' : 'Khai báo giảng dạy ') + ky.ma + ' · ' + tr.ten + ' (' + lines.length + ' dòng)',
          truong_ma: tr.ma, chi_nhanh_ma: tr.chi_nhanh_ma, ky_ma: ky.ma, payload: { lines: lines.length } });
        Db.updateMany(tbl, lines.map(function (l) { return { id: l.id, patch: { trang_thai: 'Chờ duyệt', phieu_ma: ph.ma_phieu } }; }), user.email);
        out = { ma_phieu: ph.ma_phieu, lines: lines.length };
      });
      return out;
    },

    'ngach.propose': function (p, user) {
      Auth.require(user, 'phieu.create');
      var out;
      Db.tx(function () {
        var s = Db.find('NHAN_SU', function (x) { return x.ma_nv === p.ma_nv; });
        if (!s) throw new AppError('NOT_FOUND', 'Không tìm thấy nhân sự ' + p.ma_nv);
        if (!Auth.canRow(user, 'staff.view', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv })) throw new AppError('FORBIDDEN', 'Nhân sự nằm ngoài phạm vi của bạn');
        var vals = { ma_nv: p.ma_nv, ngach_ma: p.ngach_ma || '', hieu_luc_tu: p.hieu_luc_tu || '', hieu_luc_den: '', so_quyet_dinh: p.so_quyet_dinh || '', ly_do: p.ly_do || '' };
        var res = Validate.rows('QUA_TRINH_NGACH', [{ n: 1, vals: vals }], {}, { mode: 'insert', autoClose: true });
        if (!res.ok) throw validationError(res);
        var ng = Db.find('NGACH_DM', function (n) { return n.ma === vals.ngach_ma; });
        var ph = Workflow.create(user, { loai: 'Đề xuất ngạch', tieu_de: 'Đề xuất ngạch ' + ng.ten + ' cho ' + s.ho_ten + ' (' + s.ma_nv + ')',
          truong_ma: s.truong_ma, chi_nhanh_ma: s.chi_nhanh_ma, payload: { row: vals } });
        out = { ma_phieu: ph.ma_phieu };
      });
      return out;
    },

    'phieu.other': function (p, user) {
      Auth.require(user, 'phieu.create');
      if (!p.tieu_de || !p.noi_dung) throw new AppError('BAD_REQUEST', 'Nhập tiêu đề và nội dung');
      var out;
      Db.tx(function () {
        var tr = p.truong_ma ? findTruong(p.truong_ma) : null;
        var ph = Workflow.create(user, { loai: 'Khác', tieu_de: p.tieu_de, truong_ma: tr ? tr.ma : '', chi_nhanh_ma: tr ? tr.chi_nhanh_ma : '', payload: { noi_dung: p.noi_dung } });
        out = { ma_phieu: ph.ma_phieu };
      });
      return out;
    },

    'calc.run': function (p, user) {
      Auth.require(user, 'calc.run');
      var out;
      Db.tx(function () { out = Calc.run(user, p.ky_ma, p.truong_ma || '', p.gom); });
      return out;
    },

    'calc.simulate': function (p, user) {
      Auth.require(user, 'calc.run');
      return Calc.simulate(user, p.ky_ma, p.truong_ma || '', p.kich_ban || {}, p.group, p.gom);
    },

    tonghop: function (p, user) {
      Auth.require(user, 'calc.view');
      return Report.summary(user, p.ky_ma, p.group);
    },

    'tonghop.export': function (p, user) {
      Auth.require(user, 'calc.view');
      return Report.exportTable(user, p.ky_ma, p.bang);
    },

    'phutroi.chitiet': function (p, user) {
      Auth.require(user, 'calc.view');
      return Report.ptDetail(user, p.ky_ma, p.ma_nv);
    },

    'quyettoan.submit': function (p, user) {
      Auth.require(user, 'phieu.create');
      var out;
      Db.tx(function () {
        var ky = findKy(p.ky_ma, true), tr = findTruong(p.truong_ma), staff = {};
        Db.all('NHAN_SU').forEach(function (s) { if (s.truong_ma === tr.ma) staff[s.ma_nv] = s; });
        var mine = function (r) {
          var s = staff[r.ma_nv];
          return r.ky_ma === ky.ma && r.trang_thai === 'Tạm tính' && s && Auth.canRow(user, 'calc.run', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv });
        };
        var isHe = ky.loai === 'Hè';
        var inc = Db.filter(isHe ? 'HE_THU_NHAP' : 'THU_NHAP_MOI', mine), qt = isHe ? [] : Db.filter('QUYET_TOAN', mine);
        if (!inc.length) throw new AppError('EMPTY', 'Chưa có kết quả tạm tính của trường này. Hãy bấm "Tính toán" trước.');
        if (inc.concat(qt).some(function (r) { return r.nguon === 'Gồm dòng chưa duyệt'; })) {
          throw new AppError('UNAPPROVED', 'Kết quả đang gồm dòng khai báo CHƯA duyệt (chế độ tính thử). Hãy duyệt hết khai báo rồi bấm "Tính toán" với chế độ "Chỉ dòng đã duyệt" trước khi gửi chốt.');
        }
        var ph = Workflow.create(user, { loai: 'Quyết toán kỳ', tieu_de: (isHe ? 'Lương hè ' : 'Quyết toán & thu nhập mới ') + ky.ma + ' · ' + tr.ten + ' (' + inc.length + ' nhân sự)',
          truong_ma: tr.ma, chi_nhanh_ma: tr.chi_nhanh_ma, ky_ma: ky.ma, payload: { nhan_su: inc.length } });
        var patch = function (r) { return { id: r.id, patch: { trang_thai: 'Chờ chốt', phieu_ma: ph.ma_phieu } }; };
        Db.updateMany(isHe ? 'HE_THU_NHAP' : 'THU_NHAP_MOI', inc.map(patch), user.email);
        Db.updateMany('QUYET_TOAN', qt.map(patch), user.email);
        out = { ma_phieu: ph.ma_phieu, nhan_su: inc.length };
      });
      return out;
    },

    'phieu.list': function (p, user) {
      var rows = Db.all('PHIEU'), tab = p.tab || 'cho_toi';
      if (tab === 'cho_toi') rows = pendingFor(user);
      else if (tab === 'cua_toi') rows = rows.filter(function (x) { return x.nguoi_tao === user.email; });
      else {
        Auth.require(user, 'phieu.view');
        rows = rows.filter(function (x) { return Auth.canRow(user, 'phieu.view', { cn: x.chi_nhanh_ma, tr: x.truong_ma }); });
      }
      rows = rows.slice().reverse().slice(0, 300);
      return { rows: rows.map(function (x) { return phieuRow(x, user); }) };
    },

    'phieu.get': function (p, user) {
      var ph = Db.get('PHIEU', p.id);
      if (!ph || !canSee(user, ph)) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu hoặc bạn không có quyền xem');
      var au = Workflow.authority(user, ph), chain = Workflow.parse(ph.quy_trinh, []);
      var logs = Db.filter('PHIEU_LOG', function (l) { return l.ma_phieu === ph.ma_phieu; })
        .map(function (l) { return { buoc: l.buoc, hanh_dong: l.hanh_dong, email: l.email, ghi_chu: l.ghi_chu, ts: l.ts }; });
      return { phieu: phieuRow(ph, user), steps: chain, log: logs, items: phieuItems(ph),
        can_act: !!au.ok, act_mode: au.ok ? au.mode : '', can_cancel: ph.trang_thai === 'Đang duyệt' && (ph.nguoi_tao === user.email || user.isAdmin) };
    },

    'phieu.act': function (p, user) {
      var out;
      Db.tx(function () { out = phieuRow(Workflow.act(user, p.id, p.action, p.note || ''), user); });
      return out;
    },

    'phieu.cancel': function (p, user) {
      Db.tx(function () { Workflow.cancel(user, p.id); });
      return {};
    }
  };

  return { handlers: handlers, table: table };
})();
