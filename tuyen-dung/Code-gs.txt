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
  const vals = sh.getRange(2, dc + 1, sh.getLastRow() - 1, 1).getValues();
  const out = [];
  vals.forEach(function (r) {
    try { if (r[0]) out.push(JSON.parse(r[0])); } catch (e) { /* bỏ qua dòng lỗi */ }
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
      const pos = {};
      ids.forEach(function (id, i) { pos[id] = i + 2; });

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

      const dels = list.filter(function (o) { return o.type === 'del'; })
        .map(function (o) { return pos[o.id]; })
        .filter(function (r) { return r && r > 1; })
        .sort(function (a, b) { return b - a; });
      dels.forEach(function (r) { sh.deleteRow(r); });
    });
    SpreadsheetApp.flush();
    return { ok: true };
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
