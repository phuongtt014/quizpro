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

  function labelOf(r) { return r.ten || r.ho_ten || r.ma || ''; }

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
    if (T.ctx) assertDraft(ctx[T.ctx]);
    return ctx;
  }

  function validationError(res, headline) {
    return new AppError('VALIDATION', headline || (res.errors[0].msg + (res.errors.length > 1 ? ' (và ' + (res.errors.length - 1) + ' lỗi khác)' : '')), res.errors);
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
      var locked = false;
      if (T.ctx) { var d = Db.find('DEAN', function (x) { return x.ma === ctx[T.ctx]; }); locked = !d || d.trang_thai !== 'Nháp'; }
      return { rows: rows.map(function (r) { return pickClient(T, r); }), total: total, page: page, pageSize: PAGE, locked: locked };
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
        if (T.ctx) assertDraft(ctx[T.ctx]);
        var row = Db.get(p.table, p.id);
        if (!row || (T.ctx && row[T.ctx] !== ctx[T.ctx])) throw new AppError('NOT_FOUND', 'Không tìm thấy bản ghi');
        var sf = Auth.scopeFn(p.table);
        if (sf && !Auth.canRow(user, T.perm.w, sf(row))) throw new AppError('FORBIDDEN', 'Bản ghi nằm ngoài phạm vi dữ liệu của bạn');

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
        truncated: !!res.truncated, locked: T.ctx ? (function () { var d = Db.find('DEAN', function (x) { return x.ma === p.ctx[T.ctx]; }); return !d || d.trang_thai !== 'Nháp'; })() : false };
    },

    importCommit: function (p, user) {
      var T = table(p.table);
      Auth.require(user, T.perm.i || T.perm.w);
      var res, ins = 0, upd = 0;
      Db.tx(function () {
        if (T.ctx) assertDraft((p.ctx || {})[T.ctx]);
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
    }
  };

  return { handlers: handlers, table: table };
})();
