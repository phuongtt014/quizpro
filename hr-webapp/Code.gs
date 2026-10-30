/**
 * QUẢN LÝ HỒ SƠ NHÂN SỰ - Google Apps Script Web App (Google Sheet làm database)
 *
 * Cách dùng nhanh:
 *   1. Dán file này vào Code.gs, index.html vào file HTML tên "index", appsscript.json vào manifest.
 *   2. Sửa INITIAL_ADMINS bên dưới (email Admin đầu tiên).
 *   3. Chạy hàm setup() một lần (cấp quyền khi được hỏi) -> tự tạo/khởi tạo Google Sheet.
 *   4. Triển khai > Ứng dụng web > Thực thi bằng: Tôi | Ai có quyền truy cập: Bất kỳ ai.
 *
 * Bảo mật: mọi hàm công khai (google.script.run) đều yêu cầu token phiên do đăng nhập OTP cấp,
 * phân quyền được kiểm tra lại ở server cho từng thao tác. Hàm kết thúc bằng "_" là hàm nội bộ.
 */

var APP = {
  TITLE: 'Quản lý hồ sơ nhân sự',
  SHEET_DATA: 'NhanSu',
  SHEET_CFG: 'CauHinhTruong',
  SHEET_PERM: 'PhanQuyen',
  OTP_TTL: 300,        // mã OTP có hiệu lực 5 phút
  OTP_MAX_TRY: 5,      // nhập sai tối đa 5 lần
  OTP_RESEND: 60,      // giãn cách giữa 2 lần gửi mã (giây)
  SESSION_TTL: 21600,  // phiên đăng nhập 6 giờ (tối đa của CacheService)
  MAX_IMPORT_ROWS: 5000,
  META_BY: '_CapNhatBoi',
  META_AT: '_CapNhatLuc',
  // Email Admin đầu tiên (được thêm khi chạy setup). SỬA Ở ĐÂY nếu cần.
  INITIAL_ADMINS: ['phuongtt@vaschools.edu.vn']
};

var CODE = 'Mã Nhân Viên';
var REGION = 'Khu Vực';
var ROLES = ['Admin', 'Nhập liệu', 'Chỉ xem'];
var TYPE_LABEL = { text: 'Văn bản', list: 'Danh mục', number: 'Số', date: 'Ngày' };

/** Danh sách trường mặc định: [tên, kiểu, bắt buộc, danh mục]. Khu Vực là trường hệ thống dùng để phân quyền. */
var DEFAULT_FIELDS = [
  ['Khu Vực', 'list', true, ['Miền Bắc', 'Miền Trung', 'Miền Nam']],
  ['Mã Nhân Viên', 'text', true],
  ['Phân Loại', 'list', true, ['Giáo viên', 'Nhân viên', 'Quản lý']],
  ['Họ Tên', 'text', true],
  ['Đơn Vị Phòng', 'list', true, ['Mầm non', 'Tiểu học', 'THCS', 'THPT', 'Khối văn phòng']],
  ['Cơ Sở', 'list', false, ['Cơ sở 1', 'Cơ sở 2']],
  ['Chức Vụ Chính', 'list', true, ['Hiệu trưởng', 'Phó hiệu trưởng', 'Giáo viên', 'Nhân viên', 'Trưởng phòng']],
  ['Chức Vụ Kiêm Nhiệm', 'list', false, ['Tổ trưởng chuyên môn', 'Giáo viên chủ nhiệm']],
  ['Pháp Nhân Chính', 'list', true, ['Pháp nhân 1', 'Pháp nhân 2']],
  ['Giới Tính', 'list', true, ['Nam', 'Nữ']],
  ['Ngày Sinh', 'date', true],
  ['Quốc Tịch', 'list', false, ['Việt Nam']],
  ['Địa Chỉ Thường Trú', 'text', false],
  ['Ngày Vào Làm', 'date', true],
  ['Mức lương chính', 'number', false],
  ['Phụ cấp chức vụ', 'number', false],
  ['Phụ cấp kiêm nhiệm', 'number', false],
  ['Phụ cấp độc hại', 'number', false],
  ['Hỗ trợ BHXH', 'number', false],
  ['Định mức tiền ăn', 'number', false],
  ['Định mức đi lại', 'number', false],
  ['Mức tính thưởng chuyên cần', 'number', false],
  ['Mức thưởng năng suất 1 giờ', 'number', false],
  ['Hỗ trợ điện thoại', 'number', false],
  ['Hỗ trợ xăng xe', 'number', false],
  ['Định mức tiền ăn vườn trường', 'number', false],
  ['Định mức nhà ở', 'number', false],
  ['Định mức GVCN', 'number', false],
  ['Định mức quẹt thẻ', 'number', false],
  ['Định mức bếp', 'number', false],
  ['Định mức bảo vệ', 'number', false],
  ['Định mức tài xế', 'number', false],
  ['Tổng thu nhập', 'number', false]
];

/* =====================================================================
 * 1. KHỞI TẠO (SETUP)
 * ===================================================================== */

/** Chạy 1 lần từ trình soạn thảo. Idempotent: chỉ bổ sung phần còn thiếu, không xóa dữ liệu. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = null;
  if (props.getProperty('SPREADSHEET_ID')) {
    ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  } else {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
    if (!ss) ss = SpreadsheetApp.create('CSDL Hồ sơ nhân sự');
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  _ss = ss;

  // Sheet cấu hình trường
  var cfgSheet = ss.getSheetByName(APP.SHEET_CFG) || ss.insertSheet(APP.SHEET_CFG);
  if (cfgSheet.getLastRow() < 2) {
    writeConfig_(DEFAULT_FIELDS.map(function (d) {
      return { name: d[0], type: d[1], required: d[2], visible: true, options: d[3] || [] };
    }));
  }

  // Sheet phân quyền
  var permSheet = ss.getSheetByName(APP.SHEET_PERM) || ss.insertSheet(APP.SHEET_PERM);
  permSheet.getRange(1, 1, 1, 5).setValues([['Email', 'Vai trò', 'Khu vực', 'Trạng thái', 'Ghi chú']]).setFontWeight('bold');
  permSheet.getRange('A:E').setNumberFormat('@');
  permSheet.setFrozenRows(1);
  var perms = readPerms_();
  var admins = APP.INITIAL_ADMINS.slice();
  try {
    var me = Session.getEffectiveUser().getEmail();
    if (me) admins.push(me);
  } catch (e) { /* bỏ qua */ }
  var changed = false;
  admins.forEach(function (em) {
    em = normEmail_(em);
    if (!em) return;
    var exist = perms.filter(function (p) { return p.email === em; })[0];
    if (!exist) {
      perms.push({ email: em, role: 'Admin', all: true, regions: [], active: true, note: 'Admin khởi tạo' });
      changed = true;
    }
  });
  if (changed || permSheet.getLastRow() < 2) writePerms_(perms);

  // Sheet dữ liệu
  ensureDataSheet_(readConfig_(), true);

  // Xóa Sheet1 mặc định nếu rỗng
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);

  Logger.log('Đã khởi tạo xong. Google Sheet: ' + ss.getUrl());
  return 'OK: ' + ss.getUrl();
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Nhân sự').addItem('Khởi tạo / kiểm tra hệ thống', 'setup').addToUi();
  } catch (e) { /* script độc lập, không có menu */ }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(APP.TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* =====================================================================
 * 2. TIỆN ÍCH SHEET / CẤU HÌNH
 * ===================================================================== */

var _ss = null;
function getSS_() {
  if (_ss) return _ss;
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) { _ss = SpreadsheetApp.openById(id); return _ss; }
  try { _ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { _ss = null; }
  if (!_ss) throw new Error('Chưa khởi tạo hệ thống. Hãy chạy hàm setup() trong trình soạn thảo Apps Script.');
  return _ss;
}

function sheet_(name) {
  var sh = getSS_().getSheetByName(name);
  if (!sh) throw new Error('Chưa khởi tạo hệ thống: thiếu sheet "' + name + '". Hãy chạy hàm setup().');
  return sh;
}

function normEmail_(e) { return String(e == null ? '' : e).trim().toLowerCase(); }
function isEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function parseBool_(v) {
  if (v === true) return true;
  return ['có', 'co', 'yes', 'true', '1', 'x', 'y'].indexOf(String(v).trim().toLowerCase()) >= 0;
}
function parseType_(s) {
  s = String(s).trim().toLowerCase();
  var map = { 'văn bản': 'text', 'text': 'text', 'danh mục': 'list', 'list': 'list', 'số': 'number', 'number': 'number', 'ngày': 'date', 'date': 'date' };
  return map[s] || 'text';
}
function splitOptions_(v) {
  return String(v == null ? '' : v).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
}
function defaultNames_() { return DEFAULT_FIELDS.map(function (d) { return d[0]; }); }

function readConfig_() {
  var sh = sheet_(APP.SHEET_CFG);
  var last = sh.getLastRow();
  var core = defaultNames_();
  var out = [];
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 7).getValues().forEach(function (r) {
    var name = String(r[1]);
    if (!name) return;
    out.push({
      name: name,
      type: parseType_(r[2]),
      required: parseBool_(r[3]),
      visible: parseBool_(r[4]),
      options: splitOptions_(r[5]),
      core: core.indexOf(name) >= 0
    });
  });
  return out;
}

function writeConfig_(fields) {
  var sh = getSS_().getSheetByName(APP.SHEET_CFG) || getSS_().insertSheet(APP.SHEET_CFG);
  sh.getRange('A:G').setNumberFormat('@');
  sh.getRange(1, 1, 1, 7).setValues([['Thứ tự', 'Tên trường', 'Kiểu', 'Bắt buộc', 'Hiện', 'Danh mục (mỗi giá trị 1 dòng)', 'Hệ thống']]).setFontWeight('bold');
  sh.setFrozenRows(1);
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 7).clearContent();
  var core = defaultNames_();
  var rows = fields.map(function (f, i) {
    return [String(i + 1), f.name, TYPE_LABEL[f.type] || 'Văn bản', f.required ? 'Có' : 'Không', f.visible ? 'Có' : 'Không',
      (f.options || []).join('\n'), core.indexOf(f.name) >= 0 ? 'Có' : 'Không'];
  });
  if (rows.length) sh.getRange(2, 1, rows.length, 7).setValues(rows);
}

function readPerms_() {
  var sh = sheet_(APP.SHEET_PERM);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var out = [];
  sh.getRange(2, 1, last - 1, 5).getValues().forEach(function (r) {
    var email = normEmail_(r[0]);
    if (!email) return;
    var role = ROLES.indexOf(String(r[1]).trim()) >= 0 ? String(r[1]).trim() : 'Chỉ xem';
    var rg = String(r[2] == null ? '' : r[2]).trim();
    var all = rg === '*';
    out.push({
      email: email, role: role, all: all,
      regions: all ? [] : rg.split(/[;\n]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x; }),
      active: String(r[3]).trim() !== 'Khóa',
      note: String(r[4] || '')
    });
  });
  return out;
}

function writePerms_(list) {
  var sh = sheet_(APP.SHEET_PERM);
  sh.getRange('A:E').setNumberFormat('@');
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 5).clearContent();
  var rows = list.map(function (p) {
    return [p.email, p.role, p.all ? '*' : (p.regions || []).join('; '), p.active ? 'Hoạt động' : 'Khóa', p.note || ''];
  });
  if (rows.length) sh.getRange(2, 1, rows.length, 5).setValues(rows);
}

function regionOptions_() {
  var f = readConfig_().filter(function (x) { return x.name === REGION; })[0];
  return f ? f.options : [];
}

function buildUser_(p) {
  var all = p.role === 'Admin' || p.all;
  return { email: p.email, role: p.role, all: all, regions: all ? regionOptions_() : p.regions };
}

function findUser_(email) {
  var p = readPerms_().filter(function (x) { return x.email === email && x.active; })[0];
  return p ? buildUser_(p) : null;
}

function canRegion_(u, region) { return u.all || u.regions.indexOf(region) >= 0; }

/** Đảm bảo sheet dữ liệu có đủ cột theo cấu hình; formatAll=true thì áp định dạng cho cả cột. */
function ensureDataSheet_(cfg, formatAll) {
  var ss = getSS_();
  var sh = ss.getSheetByName(APP.SHEET_DATA) || ss.insertSheet(APP.SHEET_DATA);
  var lastCol = sh.getLastColumn();
  var head = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var want = [];
  cfg.forEach(function (f) { if (head.indexOf(f.name) < 0) want.push(f.name); });
  [APP.META_BY, APP.META_AT].forEach(function (m) { if (head.indexOf(m) < 0 && want.indexOf(m) < 0) want.push(m); });
  if (want.length) {
    // đặt cột meta sau cùng khi tạo mới
    sh.getRange(1, head.length + 1, 1, want.length).setValues([want]);
    head = head.concat(want);
  }
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#e8f0fe');
  sh.setFrozenRows(1);
  if (formatAll || want.length) {
    var fm = fmtRow_(head, cfg);
    var rows = Math.max(sh.getMaxRows() - 1, 1);
    head.forEach(function (h, i) { sh.getRange(2, i + 1, rows, 1).setNumberFormat(fm[i]); });
  }
  return sh;
}

function headRow_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

/** Định dạng ô theo cột: số -> #,##0 ; còn lại -> văn bản (giữ nguyên số 0 đầu, ngày dd/mm/yyyy). */
function fmtRow_(head, cfg) {
  var by = {};
  cfg.forEach(function (f) { by[f.name] = f; });
  return head.map(function (h) { return by[h] && by[h].type === 'number' ? '#,##0' : '@'; });
}

function nowStr_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'); }

function cellOut_(v, f, tz) {
  if (f.type === 'number') {
    if (v === '' || v == null) return '';
    if (typeof v === 'number') return v;
    var n = parseNumber_(String(v));
    return isNaN(n) ? '' : n;
  }
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'dd/MM/yyyy');
  return v == null ? '' : String(v);
}

function readAll_(cfg) {
  var sh = sheet_(APP.SHEET_DATA);
  var last = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (last < 2 || !lastCol) return [];
  var head = headRow_(sh);
  var idx = {};
  head.forEach(function (h, i) { idx[h] = i; });
  var tz = Session.getScriptTimeZone();
  var out = [];
  sh.getRange(2, 1, last - 1, lastCol).getValues().forEach(function (row, ri) {
    var rec = {};
    cfg.forEach(function (f) { rec[f.name] = idx[f.name] === undefined ? '' : cellOut_(row[idx[f.name]], f, tz); });
    if (rec[CODE] === '') return;
    rec.__row = ri + 2;
    out.push(rec);
  });
  return out;
}

function visibleRecords_(u, cfg) {
  return readAll_(cfg).filter(function (r) { return canRegion_(u, r[REGION]); }).map(function (r) { delete r.__row; return r; });
}

function buildRow_(head, cfg, rec, email, existing) {
  var by = {};
  cfg.forEach(function (f) { by[f.name] = f; });
  return head.map(function (h, i) {
    if (h === APP.META_BY) return email;
    if (h === APP.META_AT) return nowStr_();
    if (by[h]) return rec[h] == null ? '' : rec[h];
    return existing ? existing[i] : '';
  });
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* =====================================================================
 * 3. XÁC THỰC OTP + PHIÊN
 * ===================================================================== */

function hash_(email, code) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email + '|' + code + '|' + ScriptApp.getScriptId());
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function requestOtp(email) {
  try {
    email = normEmail_(email);
    if (!isEmail_(email)) return { ok: false, error: 'Email không hợp lệ.' };
    var cache = CacheService.getScriptCache();
    if (cache.get('OTPT:' + email)) return { ok: false, error: 'Vui lòng đợi ' + APP.OTP_RESEND + ' giây rồi yêu cầu mã mới.' };
    cache.put('OTPT:' + email, '1', APP.OTP_RESEND);
    var u = findUser_(email);
    if (u) {
      var code = String(parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 900000 + 100000);
      cache.put('OTP:' + email, hash_(email, code), APP.OTP_TTL);
      cache.remove('OTPA:' + email);
      MailApp.sendEmail({
        to: email,
        name: APP.TITLE,
        subject: '[' + APP.TITLE + '] Mã xác thực đăng nhập: ' + code,
        htmlBody: '<p>Mã xác thực của bạn là:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">' + code +
          '</p><p>Mã có hiệu lực trong ' + (APP.OTP_TTL / 60) + ' phút. Không chia sẻ mã này cho bất kỳ ai.</p>' +
          '<p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>'
      });
    }
    // Thông báo chung để không lộ email nào có quyền
    return { ok: true, message: 'Nếu email đã được cấp quyền, mã xác thực 6 số đã được gửi. Mã có hiệu lực ' + (APP.OTP_TTL / 60) + ' phút.' };
  } catch (e) { return fail_(e); }
}

function verifyOtp(email, code) {
  try {
    email = normEmail_(email);
    code = String(code == null ? '' : code).trim();
    var cache = CacheService.getScriptCache();
    var stored = cache.get('OTP:' + email);
    if (!stored) return { ok: false, error: 'Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.' };
    var tries = Number(cache.get('OTPA:' + email) || 0) + 1;
    if (tries > APP.OTP_MAX_TRY) {
      cache.remove('OTP:' + email);
      return { ok: false, error: 'Nhập sai quá nhiều lần. Hãy yêu cầu mã mới.' };
    }
    cache.put('OTPA:' + email, String(tries), APP.OTP_TTL);
    if (stored !== hash_(email, code)) return { ok: false, error: 'Mã xác thực không đúng (còn ' + (APP.OTP_MAX_TRY - tries) + ' lần thử).' };
    var u = findUser_(email);
    if (!u) return { ok: false, error: 'Tài khoản chưa được cấp quyền hoặc đã bị khóa.' };
    cache.remove('OTP:' + email);
    cache.remove('OTPA:' + email);
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    cache.put('SES:' + token, email, APP.SESSION_TTL);
    return { ok: true, token: token, user: u, ttl: APP.SESSION_TTL };
  } catch (e) { return fail_(e); }
}

function logout(token) {
  try { CacheService.getScriptCache().remove('SES:' + token); } catch (e) { /* bỏ qua */ }
  return { ok: true };
}

function auth_(token) {
  var email = token ? CacheService.getScriptCache().get('SES:' + token) : null;
  if (!email) throw new Error('AUTH:Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  var u = findUser_(email);
  if (!u) throw new Error('AUTH:Tài khoản đã bị khóa hoặc thu hồi quyền.');
  return u;
}

function fail_(e) {
  var m = String(e && e.message || e);
  if (m.indexOf('AUTH:') === 0) return { ok: false, auth: true, error: m.slice(5) };
  if (m.indexOf('DENY:') === 0) return { ok: false, error: m.slice(5) };
  Logger.log(e && e.stack || m);
  return { ok: false, error: 'Lỗi hệ thống: ' + m };
}

function run_(token, roles, fn) {
  try {
    var u = auth_(token);
    if (roles && roles.indexOf(u.role) < 0) throw new Error('DENY:Bạn không có quyền thực hiện chức năng này.');
    return fn(u);
  } catch (e) { return fail_(e); }
}

/* =====================================================================
 * 4. KIỂM TRA DỮ LIỆU (dùng chung cho nhập tay và import)
 * ===================================================================== */

function parseNumber_(s) {
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  return NaN;
}

function show_(v) { return String(v).replace(/ /g, '␣'); }

/** Kiểm tra nghiêm ngặt: phân biệt hoa/thường và khoảng trắng. Trả về {errors, clean}. */
function validate_(raw, cfg) {
  var errors = [], clean = {};
  cfg.forEach(function (f) {
    var v = raw[f.name];
    if (v === undefined || v === null) v = '';
    if (typeof v === 'number') {
      if (f.type === 'number') {
        if (!isFinite(v) || v % 1 !== 0 || v < 0) errors.push(f.name + ': "' + v + '" phải là số nguyên không âm.');
        else clean[f.name] = v;
        return;
      }
      v = String(v);
    }
    if (typeof v !== 'string') v = String(v);
    if (v === '') {
      if (f.required) errors.push(f.name + ': bắt buộc nhập.');
      clean[f.name] = '';
      return;
    }
    if (v !== v.trim()) { errors.push(f.name + ': "' + show_(v) + '" có khoảng trắng thừa ở đầu/cuối.'); return; }
    if (f.type === 'list') {
      if (f.options.length && f.options.indexOf(v) < 0) {
        errors.push(f.name + ': "' + show_(v) + '" không có trong danh mục (phân biệt chữ hoa/thường và khoảng trắng). Hợp lệ: ' +
          f.options.slice(0, 8).join(', ') + (f.options.length > 8 ? ', ...' : ''));
        return;
      }
    } else if (f.type === 'number') {
      var n = parseNumber_(v);
      if (isNaN(n)) { errors.push(f.name + ': "' + v + '" không phải số nguyên không âm (VD: 1500000 hoặc 1.500.000).'); return; }
      clean[f.name] = n;
      return;
    } else if (f.type === 'date') {
      var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
      var okd = false;
      if (m) {
        var d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
        var dt = new Date(y, mo - 1, d);
        okd = y >= 1900 && y <= 2100 && dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
      }
      if (!okd) { errors.push(f.name + ': "' + v + '" không phải ngày hợp lệ dd/mm/yyyy.'); return; }
    }
    clean[f.name] = v;
  });
  return { errors: errors, clean: clean };
}

/* =====================================================================
 * 5. API HỒ SƠ
 * ===================================================================== */

function bootstrap(token) {
  return run_(token, null, function (u) {
    var cfg = readConfig_();
    return { ok: true, user: u, config: cfg, records: visibleRecords_(u, cfg) };
  });
}

function getRecords(token) {
  return run_(token, null, function (u) {
    return { ok: true, records: visibleRecords_(u, readConfig_()) };
  });
}

function saveRecord(token, rec, originalCode) {
  return run_(token, ['Admin', 'Nhập liệu'], function (u) {
    var cfg = readConfig_();
    var res = validate_(rec || {}, cfg);
    var errs = res.errors.slice();
    var clean = res.clean;
    if (!errs.length && !canRegion_(u, clean[REGION])) errs.push('Bạn không có quyền với Khu Vực "' + clean[REGION] + '".');
    if (errs.length) return { ok: false, error: errs.join('\n') };
    return withLock_(function () {
      var sh = ensureDataSheet_(cfg, false);
      var head = headRow_(sh);
      var codeCol = head.indexOf(CODE) + 1, regCol = head.indexOf(REGION) + 1;
      var last = sh.getLastRow();
      var codes = last > 1 ? sh.getRange(2, codeCol, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
      var rowOf = function (c) { var i = codes.indexOf(c); return i < 0 ? -1 : i + 2; };
      var newCode = String(clean[CODE]);
      var existNew = rowOf(newCode);
      var lastCol = head.length;
      if (originalCode) {
        var r = rowOf(String(originalCode));
        if (r < 0) return { ok: false, error: 'Không tìm thấy hồ sơ cần sửa (có thể đã bị xóa).' };
        if (!canRegion_(u, String(sh.getRange(r, regCol).getValue()))) return { ok: false, error: 'Bạn không có quyền sửa hồ sơ này.' };
        if (existNew > 0 && existNew !== r) return { ok: false, error: 'Mã Nhân Viên "' + newCode + '" đã tồn tại.' };
        var rg = sh.getRange(r, 1, 1, lastCol);
        var row = buildRow_(head, cfg, clean, u.email, rg.getValues()[0]);
        rg.setNumberFormats([fmtRow_(head, cfg)]);
        rg.setValues([row]);
      } else {
        if (existNew > 0) return { ok: false, error: 'Mã Nhân Viên "' + newCode + '" đã tồn tại trong hệ thống.' };
        var rg2 = sh.getRange(Math.max(last, 1) + 1, 1, 1, lastCol);
        rg2.setNumberFormats([fmtRow_(head, cfg)]);
        rg2.setValues([buildRow_(head, cfg, clean, u.email, null)]);
      }
      return { ok: true, record: clean };
    });
  });
}

function deleteRecord(token, code) {
  return run_(token, ['Admin', 'Nhập liệu'], function (u) {
    return withLock_(function () {
      var cfg = readConfig_();
      var sh = ensureDataSheet_(cfg, false);
      var head = headRow_(sh);
      var codeCol = head.indexOf(CODE) + 1, regCol = head.indexOf(REGION) + 1;
      var last = sh.getLastRow();
      if (last < 2) return { ok: false, error: 'Không tìm thấy hồ sơ.' };
      var codes = sh.getRange(2, codeCol, last - 1, 1).getValues().map(function (r) { return String(r[0]); });
      var i = codes.indexOf(String(code));
      if (i < 0) return { ok: false, error: 'Không tìm thấy hồ sơ (có thể đã bị xóa).' };
      var row = i + 2;
      if (!canRegion_(u, String(sh.getRange(row, regCol).getValue()))) return { ok: false, error: 'Bạn không có quyền xóa hồ sơ này.' };
      sh.deleteRow(row);
      return { ok: true };
    });
  });
}

/**
 * payload = { headers: [..], rows: [{n: số dòng trong file, v: [..]}], mode: 'append'|'replace', dryRun: bool }
 * Dòng lỗi KHÔNG được nhập; dòng hợp lệ được nhập.
 */
function importRecords(token, payload) {
  return run_(token, ['Admin', 'Nhập liệu'], function (u) {
    var cfg = readConfig_();
    var headers = (payload.headers || []).map(function (h) { return h == null ? '' : String(h); });
    var rows = payload.rows || [];
    var replace = payload.mode === 'replace';
    var dry = !!payload.dryRun;
    if (rows.length > APP.MAX_IMPORT_ROWS) return { ok: false, error: 'File quá lớn: tối đa ' + APP.MAX_IMPORT_ROWS + ' dòng mỗi lần nhập.' };

    var byName = {};
    cfg.forEach(function (f) { byName[f.name] = f; });
    var colOf = {}, unknown = [], dupHead = [];
    headers.forEach(function (h, i) {
      if (h === '') return;
      if (!byName[h]) { unknown.push(h); return; }
      if (colOf[h] !== undefined) dupHead.push(h); else colOf[h] = i;
    });
    var autoRegion = !u.all && u.regions.length === 1 ? u.regions[0] : null;
    var missing = cfg.filter(function (f) {
      if (!f.required || colOf[f.name] !== undefined) return false;
      return !(f.name === REGION && autoRegion);
    }).map(function (f) { return f.name; });
    if (dupHead.length || missing.length) {
      return {
        ok: false,
        error: (dupHead.length ? 'Cột bị trùng tên: ' + dupHead.join(', ') + '. ' : '') +
          (missing.length ? 'File thiếu cột bắt buộc: ' + missing.join(', ') + '. ' : '') +
          (unknown.length ? 'Cột không nhận diện được (tên cột phải khớp chính xác, kể cả hoa/thường và khoảng trắng): ' + unknown.join(', ') + '.' : '')
      };
    }

    var existing = readAll_(cfg);
    var blocked = {}, inScopeCount = 0;
    existing.forEach(function (r) {
      var inScope = canRegion_(u, r[REGION]);
      if (inScope) inScopeCount++;
      if (replace && inScope) return;
      blocked[r[CODE]] = true;
    });

    var seen = {}, good = [], errs = [];
    rows.forEach(function (r) {
      var raw = {};
      cfg.forEach(function (f) { var i = colOf[f.name]; raw[f.name] = i === undefined ? '' : r.v[i]; });
      var regBlank = raw[REGION] === '' || raw[REGION] == null;
      if (autoRegion && regBlank) raw[REGION] = autoRegion;
      var res = validate_(raw, cfg);
      var msgs = res.errors.slice();
      var clean = res.clean;
      if (clean[REGION] && !canRegion_(u, clean[REGION]) && byName[REGION].options.indexOf(clean[REGION]) >= 0) {
        msgs.push(REGION + ': "' + clean[REGION] + '" không thuộc phạm vi quyền của bạn.');
      }
      var code = clean[CODE] === undefined ? '' : String(clean[CODE]);
      if (code) {
        if (seen[code] !== undefined) msgs.push(CODE + ': trùng với dòng ' + seen[code] + ' trong file.');
        else seen[code] = r.n;
        if (blocked[code]) msgs.push(CODE + ': "' + code + '" đã tồn tại trong hệ thống' + (replace ? ' (ngoài phạm vi quyền của bạn).' : '.'));
      }
      if (msgs.length) errs.push({ row: r.n, code: raw[CODE] == null ? '' : String(raw[CODE]), name: raw['Họ Tên'] == null ? '' : String(raw['Họ Tên']), errors: msgs });
      else good.push(clean);
    });

    var out = {
      ok: true, dryRun: dry, mode: replace ? 'replace' : 'append',
      total: rows.length, valid: good.length, invalid: errs.length,
      errors: errs.slice(0, 2000), unknown: unknown, willRemove: replace ? inScopeCount : 0
    };
    if (dry) return out;
    if (replace && !good.length) return { ok: false, error: 'Không có dòng hợp lệ nào nên hệ thống KHÔNG thực hiện thay thế (dữ liệu cũ được giữ nguyên).' };
    if (!good.length) { out.inserted = 0; return out; }

    return withLock_(function () {
      var sh = ensureDataSheet_(cfg, false);
      var head = headRow_(sh);
      var lastRow = sh.getLastRow(), lastCol = head.length;
      var kept = [];
      if (replace && lastRow > 1) {
        var regIdx = head.indexOf(REGION);
        var vals = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
        vals.forEach(function (row) {
          var blank = row.every(function (c) { return c === '' || c == null; });
          if (blank) return;
          if (canRegion_(u, String(row[regIdx]))) return; // thuộc phạm vi -> bị thay thế
          kept.push(row);
        });
        sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      }
      var newRows = good.map(function (rec) { return buildRow_(head, cfg, rec, u.email, null); });
      var all = replace ? kept.concat(newRows) : newRows;
      var start = replace ? 2 : Math.max(lastRow, 1) + 1;
      var rg = sh.getRange(start, 1, all.length, lastCol);
      var fm = fmtRow_(head, cfg);
      rg.setNumberFormats(all.map(function () { return fm; }));
      rg.setValues(all);
      out.inserted = good.length;
      out.removed = replace ? inScopeCount : 0;
      out.applied = true;
      return out;
    });
  });
}

/* =====================================================================
 * 6. API THIẾT LẬP TRƯỜNG + PHÂN QUYỀN (chỉ Admin)
 * ===================================================================== */

function saveConfig(token, fields) {
  return run_(token, ['Admin'], function (u) {
    var core = defaultNames_();
    var errs = [], seen = {}, out = [];
    (fields || []).forEach(function (f, i) {
      var name = String(f.name == null ? '' : f.name);
      var tag = 'Dòng ' + (i + 1) + ': ';
      if (!name || name !== name.trim()) { errs.push(tag + 'tên trường trống hoặc có khoảng trắng thừa.'); return; }
      if (name.length > 80 || /[\r\n]/.test(name)) { errs.push(tag + 'tên trường không hợp lệ.'); return; }
      if (name === APP.META_BY || name === APP.META_AT) { errs.push(tag + 'tên trường bị trùng tên hệ thống.'); return; }
      if (seen[name]) { errs.push(tag + 'trùng tên trường "' + name + '".'); return; }
      seen[name] = true;
      var type = TYPE_LABEL[f.type] ? f.type : 'text';
      var opts = [], os = {};
      if (type === 'list') {
        (f.options || []).forEach(function (o) {
          o = String(o).trim();
          if (o && !os[o]) { os[o] = true; opts.push(o); }
        });
      }
      var nf = { name: name, type: type, required: !!f.required, visible: !!f.visible, options: opts };
      if (name === REGION) { nf.type = 'list'; nf.required = true; if (!opts.length) errs.push('Trường "' + REGION + '" phải có ít nhất 1 giá trị danh mục.'); }
      if (name === CODE) { nf.type = 'text'; nf.required = true; }
      out.push(nf);
    });
    core.forEach(function (n) { if (!seen[n]) errs.push('Không được xóa trường hệ thống "' + n + '".'); });
    if (errs.length) return { ok: false, error: errs.join('\n') };
    return withLock_(function () {
      writeConfig_(out);
      ensureDataSheet_(out, true);
      return { ok: true, config: readConfig_() };
    });
  });
}

function getPermissions(token) {
  return run_(token, ['Admin'], function () {
    return { ok: true, permissions: readPerms_(), regions: regionOptions_() };
  });
}

function savePermissions(token, list) {
  return run_(token, ['Admin'], function (u) {
    var regions = regionOptions_();
    var errs = [], seen = {}, out = [];
    (list || []).forEach(function (p, i) {
      var tag = 'Dòng ' + (i + 1) + ': ';
      var email = normEmail_(p.email);
      if (!isEmail_(email)) { errs.push(tag + 'email "' + (p.email || '') + '" không hợp lệ.'); return; }
      if (seen[email]) { errs.push(tag + 'trùng email ' + email + '.'); return; }
      seen[email] = true;
      var role = ROLES.indexOf(p.role) >= 0 ? p.role : null;
      if (!role) { errs.push(tag + 'vai trò không hợp lệ (Admin / Nhập liệu / Chỉ xem).'); return; }
      var all = role === 'Admin' || !!p.all;
      var rgs = all ? [] : (p.regions || []).map(function (x) { return String(x); });
      var bad = rgs.filter(function (x) { return regions.indexOf(x) < 0; });
      if (bad.length) { errs.push(tag + 'khu vực không có trong danh mục: ' + bad.join(', ')); return; }
      if (!all && !rgs.length) { errs.push(tag + 'chưa chọn khu vực nào cho ' + email + '.'); return; }
      out.push({ email: email, role: role, all: all, regions: rgs, active: !!p.active, note: String(p.note || '') });
    });
    var me = out.filter(function (p) { return p.email === u.email; })[0];
    if (!me || me.role !== 'Admin' || !me.active) errs.push('Bạn không thể tự gỡ quyền Admin hoặc khóa chính mình.');
    if (errs.length) return { ok: false, error: errs.join('\n') };
    return withLock_(function () {
      writePerms_(out);
      return { ok: true, permissions: readPerms_() };
    });
  });
}
