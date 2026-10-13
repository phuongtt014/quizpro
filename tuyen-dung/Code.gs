/**
 * HR Recruit – Backend Google Apps Script
 * Dùng Google Sheet làm cơ sở dữ liệu, Google Drive lưu tệp đính kèm.
 *
 * Cách dùng: mở Google Sheet → Tiện ích mở rộng → Apps Script → dán file này vào Code.gs,
 * tạo thêm file HTML tên "Index" và dán nội dung Index.html. Xem HUONG-DAN.md.
 */

const SHEETS = { cfg: 'ThietLap', reqs: 'DeXuat', cands: 'UngVien', lib: 'ThuVien' };
const FOLDER_NAME = 'HR Recruit – Tệp đính kèm';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Mở ứng dụng. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('HR Recruit – Quản lý tuyển dụng')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Chạy 1 lần trong trình soạn thảo để cấp quyền (Sheet + Drive). */
function setup() {
  SpreadsheetApp.getActiveSpreadsheet();
  folder_();
  Logger.log('OK – đã cấp quyền và tạo thư mục Drive.');
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function who_() {
  return String(Session.getActiveUser().getEmail() || '').toLowerCase();
}

function readCol_(col) {
  const sh = ss_().getSheetByName(SHEETS[col]);
  if (!sh || sh.getLastRow() < 2) return [];
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const dc = head.indexOf('data');
  if (dc < 0) return [];
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, dc + 1).getValues();
  const order = [], byId = {};
  vals.forEach(function (r) {
    const id = String(r[0]);
    if (!(id in byId)) order.push(id);
    byId[id] = r[dc]; // nếu trùng mã: lấy dòng CUỐI (dòng mà thao tác ghi hướng tới)
  });
  const out = [];
  order.forEach(function (id) {
    try { if (byId[id]) out.push(JSON.parse(byId[id])); } catch (e) { /* bỏ qua dòng lỗi */ }
  });
  return out;
}

/** Trả toàn bộ dữ liệu cho giao diện. */
function api_load() {
  const cfgArr = readCol_('cfg');
  return {
    email: who_(),
    sheetUrl: ss_().getUrl(),
    cfg: cfgArr.length ? cfgArr[0] : null,
    reqs: readCol_('reqs'),
    cands: readCol_('cands'),
    lib: readCol_('lib')
  };
}

/** Kiểm tra quyền ghi: phải là người dùng đã đăng ký; chỉ admin được sửa Thiết lập. */
function assertCanWrite_(ops) {
  const cfgArr = readCol_('cfg');
  if (!cfgArr.length) return; // lần đầu: người mở đầu tiên khởi tạo hệ thống
  const cfg = cfgArr[0];
  const email = who_();
  const user = (cfg.users || []).filter(function (u) {
    return String(u.email || '').toLowerCase() === email && email;
  })[0];
  if (!user) throw new Error('Tài khoản ' + (email || '(không xác định)') + ' chưa được cấp quyền.');
  const isAdmin = user.roleId === 'admin';
  ops.forEach(function (op) {
    if (op.col === 'cfg' && !isAdmin) throw new Error('Chỉ quản trị viên được sửa Thiết lập.');
    if (!SHEETS[op.col]) throw new Error('Bảng dữ liệu không hợp lệ: ' + op.col);
  });
}

function getSheet_(col, head) {
  let sh = ss_().getSheetByName(SHEETS[col]);
  if (!sh) sh = ss_().insertSheet(SHEETS[col]);
  if (sh.getLastRow() === 0) {
    const h = head.concat(['data']);
    sh.getRange(1, 1, 1, h.length).setValues([h])
      .setFontWeight('bold').setBackground('#5b47d6').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Ghi thay đổi: ops = [{col, type:'put'|'del', id, head, row, data}] */
function api_sync(ops) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    assertCanWrite_(ops);
    const byCol = {};
    ops.forEach(function (op) { (byCol[op.col] = byCol[op.col] || []).push(op); });

    Object.keys(byCol).forEach(function (col) {
      const list = byCol[col];
      const firstPut = list.filter(function (o) { return o.type === 'put'; })[0];
      let sh = ss_().getSheetByName(SHEETS[col]);
      if (!firstPut && (!sh || sh.getLastRow() === 0)) return;
      if (!sh || sh.getLastRow() === 0) sh = getSheet_(col, firstPut.head);

      const width = sh.getLastColumn();
      const head = sh.getRange(1, 1, 1, width).getValues()[0];
      const dc = head.indexOf('data');
      const last = sh.getLastRow();
      const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
      const pos = {}, rowsById = {};
      ids.forEach(function (id, i) {
        pos[id] = i + 2; // dòng cuối cùng của mỗi mã
        (rowsById[id] = rowsById[id] || []).push(i + 2);
      });
      const toDelete = [];
      Object.keys(rowsById).forEach(function (id) { // dọn các dòng trùng mã (giữ dòng cuối)
        rowsById[id].slice(0, -1).forEach(function (r) { toDelete.push(r); });
      });

      const appends = [];
      list.forEach(function (op) {
        if (op.type !== 'put') return;
        const rowVals = op.row.map(function (v) { return v === null || v === undefined ? '' : String(v); });
        while (rowVals.length < dc) rowVals.push('');
        rowVals[dc] = op.data;
        if (pos[op.id]) {
          const rg = sh.getRange(pos[op.id], 1, 1, rowVals.length);
          rg.setNumberFormat('@').setValues([rowVals]);
        } else {
          appends.push(rowVals);
          pos[op.id] = -1; // tránh thêm trùng trong cùng lô
        }
      });
      if (appends.length) {
        const start = sh.getLastRow() + 1;
        const w = Math.max.apply(null, appends.map(function (r) { return r.length; }));
        appends.forEach(function (r) { while (r.length < w) r.push(''); });
        sh.getRange(start, 1, appends.length, w).setNumberFormat('@').setValues(appends);
      }

      list.filter(function (o) { return o.type === 'del'; }).forEach(function (o) {
        (rowsById[o.id] || []).forEach(function (r) { toDelete.push(r); });
      });
      const dels = toDelete.filter(function (r, i) { return r > 1 && toDelete.indexOf(r) === i; })
        .sort(function (a, b) { return b - a; });
      dels.forEach(function (r) { sh.deleteRow(r); });
    });
    SpreadsheetApp.flush();
    return { ok: true, ops: ops.length };
  } finally {
    lock.releaseLock();
  }
}

function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* tạo mới */ } }
  const f = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

/** Tải tệp lên Drive. Trả về metadata để lưu cùng hồ sơ. */
function api_upload(name, mime, b64) {
  assertCanWrite_([]);
  const bytes = Utilities.base64Decode(b64);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('Tệp vượt quá 10MB.');
  const blob = Utilities.newBlob(bytes, mime || 'application/octet-stream', name);
  const f = folder_().createFile(blob);
  try { f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* tài khoản cá nhân: bỏ qua */ }
  return { id: f.getId(), name: f.getName(), size: f.getSize(), type: mime, at: Date.now(), url: f.getUrl() };
}

function api_deleteFile(id) {
  assertCanWrite_([]);
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* đã xoá */ }
  return true;
}

/** Chẩn đoán: số dòng, mã trùng, kích thước dữ liệu lớn nhất của từng sheet. */
function api_diag() {
  const out = { email: who_(), sheets: {} };
  Object.keys(SHEETS).forEach(function (col) {
    const sh = ss_().getSheetByName(SHEETS[col]);
    if (!sh) { out.sheets[col] = { name: SHEETS[col], exists: false }; return; }
    const last = sh.getLastRow();
    const info = { name: SHEETS[col], exists: true, rows: Math.max(0, last - 1), dup: [], maxLen: 0 };
    if (last > 1) {
      const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      const dc = head.indexOf('data');
      info.hasData = dc >= 0;
      if (dc >= 0) {
        const vals = sh.getRange(2, 1, last - 1, dc + 1).getValues();
        const seen = {};
        vals.forEach(function (r) {
          const id = String(r[0]);
          if (seen[id] && info.dup.indexOf(id) < 0) info.dup.push(id);
          seen[id] = true;
          info.maxLen = Math.max(info.maxLen, String(r[dc] || '').length);
        });
      }
    }
    out.sheets[col] = info;
  });
  return out;
}

/* ===================== Gửi email cho ứng viên (Gmail alias) ===================== */

/** Chạy 1 lần trong trình soạn thảo để cấp quyền Gmail cho ứng dụng. */
function authorizeMail() {
  const aliases = GmailApp.getAliases();
  Logger.log('Đã cấp quyền Gmail. Alias hiện có: ' + aliases.join(', '));
}

/** Trả về {cfg, user} nếu người dùng hiện tại đã đăng ký và có quyền cap (quản trị luôn có). */
function userCan_(cap) {
  const cfgArr = readCol_('cfg');
  if (!cfgArr.length) return null;
  const cfg = cfgArr[0];
  const email = who_();
  const user = (cfg.users || []).filter(function (u) {
    return String(u.email || '').toLowerCase() === email && email;
  })[0];
  if (!user) return null;
  const role = (cfg.roles || []).filter(function (r) { return r.id === user.roleId; })[0];
  const ok = role && (role.id === 'admin' || (role.caps || []).indexOf(cap) >= 0);
  return ok ? { cfg: cfg, user: user } : null;
}

function splitEmails_(s) {
  return String(s || '').split(/[,;\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
}
function escHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function logMail_(row) {
  let sh = ss_().getSheetByName('NhatKyEmail');
  if (!sh) {
    sh = ss_().insertSheet('NhatKyEmail');
    sh.getRange(1, 1, 1, 8).setValues([['Thời gian', 'Người thao tác', 'Người nhận', 'CC', 'Tiêu đề', 'Gửi từ', 'Ứng viên', 'Kết quả']])
      .setFontWeight('bold').setBackground('#5b47d6').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  sh.appendRow(row);
}

/** Cho quản trị xem alias "Gửi thư với tư cách" đã cấu hình trong Gmail của chủ dự án. */
function api_mailInfo() {
  if (!userCan_('cfg.edit')) throw new Error('Chỉ quản trị mới xem được cấu hình email.');
  let aliases;
  try { aliases = GmailApp.getAliases(); }
  catch (e) { throw new Error('Chưa cấp quyền Gmail: hãy chạy hàm authorizeMail trong Apps Script. (' + e.message + ')'); }
  return { owner: Session.getEffectiveUser().getEmail(), aliases: aliases, quota: MailApp.getRemainingDailyQuota() };
}

/**
 * Gửi 1 email cho ứng viên. Người gửi / alias / BCC / chữ ký / giới hạn ngày lấy từ Thiết lập (phía máy chủ),
 * giao diện chỉ được chọn người nhận, CC thêm, tiêu đề, nội dung và tệp đính kèm (chỉ tệp trong thư mục của ứng dụng).
 */
function api_sendMail(p) {
  const ctx = userCan_('cand.move');
  if (!ctx) throw new Error('Bạn không có quyền gửi email cho ứng viên.');
  const m = ctx.cfg.mail || {};
  const actor = who_();
  const subject = String((p && p.subject) || '').trim().slice(0, 200);
  const to = String((p && p.to) || '').trim();
  try {
    if (!m.enabled) throw new Error('Gửi email trực tiếp chưa được bật (Thiết lập → Email gửi ứng viên).');
    const re = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
    if (!re.test(to)) throw new Error('Email người nhận không hợp lệ.');
    const ccAll = splitEmails_((p.cc || '') + ',' + (m.cc || ''));
    ccAll.forEach(function (x) { if (!re.test(x)) throw new Error('Email CC không hợp lệ: ' + x); });
    if (ccAll.length > 6) throw new Error('Tối đa 6 địa chỉ CC.');
    const bccAll = splitEmails_(m.bcc || '');
    bccAll.forEach(function (x) { if (!re.test(x)) throw new Error('Email BCC trong Thiết lập không hợp lệ: ' + x); });
    const body = String((p && p.body) || '');
    if (!subject) throw new Error('Thiếu tiêu đề.');
    if (!body.trim()) throw new Error('Thiếu nội dung.');
    if (body.length > 20000) throw new Error('Nội dung quá dài.');
    if (/\{\{\w+\}\}/.test(subject + body)) throw new Error('Thư còn trường chưa điền dạng {{...}}.');

    const options = {};
    if (m.senderName) options.name = String(m.senderName);
    if (m.replyTo) options.replyTo = String(m.replyTo);
    if (ccAll.length) options.cc = ccAll.join(',');
    if (bccAll.length) options.bcc = bccAll.join(',');
    if (m.fromAlias) {
      const aliases = GmailApp.getAliases().map(function (a) { return a.toLowerCase(); });
      if (aliases.indexOf(String(m.fromAlias).toLowerCase()) < 0) {
        throw new Error('"' + m.fromAlias + '" chưa là địa chỉ "Gửi thư với tư cách" trong Gmail của ' +
          Session.getEffectiveUser().getEmail() + '. Hãy thêm và xác minh alias trong Gmail trước.');
      }
      options.from = m.fromAlias;
    }

    const ids = (p.attachIds || []).slice(0, 5);
    if (ids.length) {
      const folderId = folder_().getId();
      let total = 0;
      options.attachments = ids.map(function (id) {
        const f = DriveApp.getFileById(id);
        let inside = false;
        const it = f.getParents();
        while (it.hasNext()) { if (it.next().getId() === folderId) { inside = true; break; } }
        if (!inside) throw new Error('Tệp đính kèm không thuộc thư mục của ứng dụng.');
        total += f.getSize();
        if (total > 20 * 1024 * 1024) throw new Error('Tổng dung lượng đính kèm vượt 20MB.');
        return f.getBlob();
      });
    }

    const full = body + (m.signature ? '\n\n' + m.signature : '');
    options.htmlBody = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#111">' +
      escHtml_(full).replace(/\r?\n/g, '<br>') + '</div>';

    // giới hạn số thư mỗi ngày (cấu hình trong Thiết lập)
    const props = PropertiesService.getScriptProperties();
    const key = 'mail_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    const limit = Number(m.dailyLimit) || 200;
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const used = Number(props.getProperty(key)) || 0;
      if (used >= limit) throw new Error('Đã đạt giới hạn ' + limit + ' email/ngày đã đặt trong Thiết lập.');
      if (MailApp.getRemainingDailyQuota() < 1 + ccAll.length + bccAll.length) throw new Error('Đã hết hạn mức gửi email trong ngày của Google.');
      props.setProperty(key, String(used + 1));
    } finally { lock.releaseLock(); }

    GmailApp.sendEmail(to, subject, full, options);
    try { logMail_([new Date(), actor, to, ccAll.join(', '), subject, m.fromAlias || Session.getEffectiveUser().getEmail(), String(p.candidate || ''), 'ĐÃ GỬI']); } catch (x) { /* thư đã gửi; lỗi ghi nhật ký không được báo là gửi thất bại */ }
    return { ok: true, from: m.fromAlias || Session.getEffectiveUser().getEmail(), remaining: MailApp.getRemainingDailyQuota() };
  } catch (e) {
    try { logMail_([new Date(), actor, to, '', subject, m.fromAlias || '', String((p && p.candidate) || ''), 'LỖI: ' + e.message]); } catch (x) { /* bỏ qua */ }
    throw e;
  }
}
