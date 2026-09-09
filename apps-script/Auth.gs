/**
 * Auth.gs — Đăng nhập, quản lý phiên (session token), kiểm tra phân quyền.
 * Toàn bộ hàm public (không có "_" cuối tên) là entry point gọi từ client qua google.script.run.
 */

var SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 giờ

function findUserByUsername_(username) {
  var rows = sheetToObjects_(getSheet_(SHEETS.USERS));
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].Username).toLowerCase() === String(username).toLowerCase()) return rows[i];
  }
  return null;
}

function findUserById_(id) {
  var rows = sheetToObjects_(getSheet_(SHEETS.USERS));
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].Id === id) return rows[i];
  }
  return null;
}

function publicUser_(u) {
  return {
    id: u.Id, hoTen: u.HoTen, email: u.Email, soDienThoai: u.SoDienThoai,
    donVi: u.DonVi, username: u.Username, vaiTro: u.VaiTro,
    vaiTroLabel: ROLE_LABEL[u.VaiTro] || u.VaiTro, trangThai: u.TrangThai
  };
}

function login(username, password) {
  return safeCall_(function () {
    ensureAllSheets_();
    if (!username || !password) return jsonErr_('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
    var u = findUserByUsername_(username);
    if (!u) return jsonErr_('Tài khoản không tồn tại.');
    if (u.TrangThai !== 'Active') return jsonErr_('Tài khoản đã bị khoá. Liên hệ Admin để được hỗ trợ.');
    var hash = hashPassword_(password, u.Salt);
    if (hash !== u.PasswordHash) return jsonErr_('Sai mật khẩu.');

    var token = Utilities.getUuid();
    var expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      appendObject_(getSheet_(SHEETS.SESSIONS), SCHEMA[SHEETS.SESSIONS], { Token: token, Username: u.Username, HetHan: expires });
    } finally {
      lock.releaseLock();
    }
    return jsonOk_({ token: token, user: publicUser_(u) });
  });
}

function logout(token) {
  return safeCall_(function () {
    var sh = getSheet_(SHEETS.SESSIONS);
    var idx = findRowIndexById_(sh, 'Token', token);
    if (idx > 0) sh.deleteRow(idx);
    return jsonOk_({});
  });
}

/** Trả về object user (raw, nội bộ) nếu token hợp lệ & còn hạn, ngược lại ném lỗi. */
function requireSession_(token) {
  if (!token) throw new Error('Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại.');
  var sessions = sheetToObjects_(getSheet_(SHEETS.SESSIONS));
  var found = null;
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].Token === token) { found = sessions[i]; break; }
  }
  if (!found) throw new Error('Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại.');
  if (new Date(found.HetHan).getTime() < Date.now()) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  var u = findUserByUsername_(found.Username);
  if (!u || u.TrangThai !== 'Active') throw new Error('Tài khoản không còn hoạt động.');
  return u;
}

/** entry point: client gọi để khôi phục phiên khi load lại trang. */
function getCurrentUser(token) {
  return safeCall_(function () {
    ensureAllSheets_();
    var u = requireSession_(token);
    return jsonOk_({ user: publicUser_(u) });
  });
}

/** Ném lỗi nếu vai trò user không đạt tối thiểu mức yêu cầu. */
function requireMinRole_(user, minRole) {
  var rank = ROLE_RANK[user.VaiTro] || 0;
  var need = ROLE_RANK[minRole] || 0;
  if (rank < need) throw new Error('Bạn không có quyền thực hiện thao tác này (yêu cầu tối thiểu: ' + ROLE_LABEL[minRole] + ').');
  return true;
}
