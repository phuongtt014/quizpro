/**
 * Xác thực & phân quyền. Quyền = (chức năng) x (phạm vi dữ liệu):
 * phạm vi: Toàn hệ thống | Chi nhánh | Trường | Cá nhân.
 * Vai trò ADMIN (toàn hệ thống) luôn có mọi quyền để không bao giờ bị khóa ngoài.
 */
var Auth = (function () {
  var cached = null;

  function email() {
    var e = '';
    try { e = Session.getActiveUser().getEmail(); } catch (x) { e = ''; }
    // Không dùng getEffectiveUser: với "chạy bằng tài khoản người triển khai" nó trả về chủ hệ thống.
    return String(e || '').toLowerCase();
  }

  function activeGrant(g, today) {
    return (!g.hieu_luc_tu || g.hieu_luc_tu <= today) && (!g.hieu_luc_den || g.hieu_luc_den >= today);
  }

  function load(mail) {
    if (!mail) return null;
    var u = Db.find('USERS', function (x) { return x.email === mail; });
    if (!u || u.trang_thai !== 'Hoạt động') return null;
    var today = Util.todayIso(), grants = [], isAdmin = false;
    var rolePerms = {};
    Db.all('ROLE_PERMS').forEach(function (rp) { (rolePerms[rp.role_ma] = rolePerms[rp.role_ma] || []).push(rp.quyen); });
    Db.filter('USER_ROLES', function (g) { return g.email === mail && activeGrant(g, today); }).forEach(function (g) {
      if (g.role_ma === 'ADMIN' && g.pham_vi === 'Toàn hệ thống') isAdmin = true;
      (rolePerms[g.role_ma] || []).forEach(function (p) { grants.push({ perm: p, scope: g.pham_vi, code: g.pham_vi_ma, role: g.role_ma }); });
    });
    if (isAdmin) PERMS.forEach(function (p) { grants.push({ perm: p.k, scope: 'Toàn hệ thống', code: '', role: 'ADMIN' }); });
    var perms = Util.uniq(grants.map(function (g) { return g.perm; })).sort();
    return { email: mail, name: u.ho_ten, ma_nv: u.ma_nv, grants: grants, perms: perms, isAdmin: isAdmin };
  }

  return {
    email: email,
    current: function () { if (!cached) cached = load(email()); return cached; },
    reset: function () { cached = null; },
    loadFor: load,

    can: function (user, perm) { return !!user && user.perms.indexOf(perm) >= 0; },

    require: function (user, perm) {
      if (!Auth.can(user, perm)) throw new AppError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này (' + perm + ')');
    },

    hasGlobal: function (user, perm) {
      return user.grants.some(function (g) { return g.perm === perm && g.scope === 'Toàn hệ thống'; });
    },

    /** sc = { cn, tr, nv } của dòng dữ liệu. */
    canRow: function (user, perm, sc) {
      if (!sc) return Auth.can(user, perm);
      return user.grants.some(function (g) {
        if (g.perm !== perm) return false;
        if (g.scope === 'Toàn hệ thống') return true;
        if (g.scope === 'Chi nhánh') return !!sc.cn && sc.cn === g.code;
        if (g.scope === 'Trường') return !!sc.tr && sc.tr === g.code;
        if (g.scope === 'Cá nhân') return !!sc.nv && sc.nv === user.ma_nv;
        return false;
      });
    },

    /** Hàm suy ra phạm vi dữ liệu của một dòng thuộc bảng t (null nếu bảng không giới hạn phạm vi). */
    scopeFn: function (t) {
      var sc = SCHEMA[t].scope, map;
      if (!sc) return null;
      if (sc === 'chi_nhanh') return function (r) { return { cn: r.ma }; };
      if (sc === 'truong') return function (r) { return { cn: r.chi_nhanh_ma, tr: r.ma }; };
      if (sc === 'nhan_su') return function (r) { return { cn: r.chi_nhanh_ma, tr: r.truong_ma, nv: r.ma_nv }; };
      if (sc === 'truong_ma') {
        map = {};
        Db.all('TRUONG').forEach(function (x) { map[x.ma] = x; });
        return function (r) { return { tr: r.truong_ma, cn: map[r.truong_ma] ? map[r.truong_ma].chi_nhanh_ma : '' }; };
      }
      if (sc === 'staff') {
        map = {};
        Db.all('NHAN_SU').forEach(function (x) { map[x.ma_nv] = x; });
        return function (r) {
          var s = map[r.ma_nv];
          return s ? { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv } : {};
        };
      }
      return null;
    },

    /** Email những người đang có quyền perm (dùng để gửi thông báo). */
    usersWith: function (perm) {
      var today = Util.todayIso(), out = [];
      var roles = {};
      Db.all('ROLE_PERMS').forEach(function (rp) { if (rp.quyen === perm) roles[rp.role_ma] = true; });
      Db.all('USER_ROLES').forEach(function (g) {
        if ((roles[g.role_ma] || g.role_ma === 'ADMIN') && activeGrant(g, today)) out.push(g.email);
      });
      var active = {};
      Db.all('USERS').forEach(function (u) { if (u.trang_thai === 'Hoạt động') active[u.email] = true; });
      return Util.uniq(out).filter(function (e) { return active[e]; });
    }
  };
})();
