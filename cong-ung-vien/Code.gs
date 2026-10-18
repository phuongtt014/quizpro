/**
 * CỔNG THÔNG TIN ỨNG VIÊN (BM.10/HN.QT.01) – dự án Apps Script ĐỘC LẬP với hệ thống tuyển dụng.
 * Gắn vào MỘT Google Sheet RIÊNG (không dùng chung Sheet với hệ thống tuyển dụng). Xem HUONG-DAN.md.
 *
 * Hai bản triển khai của cùng dự án:
 *  - CÔNG KHAI  : Thực thi dưới tư cách "Tôi", Ai có quyền truy cập "Bất kỳ ai"  → ứng viên điền / tra cứu hồ sơ.
 *  - NỘI BỘ     : Thực thi dưới tư cách "Tôi", "Bất kỳ ai trong tổ chức"        → nhân viên HCNS (thêm ?m=admin vào URL).
 */

const SH_DATA = 'HoSo', SH_USERS = 'NguoiDung', SH_CFG = 'CauHinh', SH_LOG = 'NhatKy';
const TZ = 'Asia/Ho_Chi_Minh';
const COLS = ['Mã hồ sơ', 'Thời gian nộp', 'Cập nhật lần cuối', 'Số lần sửa', 'Trạng thái', 'Họ và tên', 'Vị trí ứng tuyển', 'Điện thoại', 'Email', 'Số CCCD',
  'Ngày nhận việc (ứng viên)', 'Ngày nhận việc (HCNS)', 'Khoá', 'Chức danh', 'Cơ sở', 'Địa điểm', 'Thời gian', 'MSNV', 'Ghi chú HCNS', 'salt', 'hash', 'data'];
const CI = {}; COLS.forEach(function (c, i) { CI[c] = i; });
const CFG_DEFAULT = { lockDays: 3, autoLockDays: 60, maxFail: 5, perHour: 120, perDay: 600, minFillSec: 20 };
const ROLE_RANK = { 'Xem': 1, 'Tuyển dụng': 2, 'Quản trị': 3 };

/*SCHEMA-BEGIN*/
/* ---- Lược đồ biểu mẫu BM.10/HN.QT.01 (dùng chung cho giao diện và Code.gs) ---- */
var FORM_META = { code: 'BM.10/HN.QT.01', date: '21/09/2026', issue: '01', title: 'THÔNG TIN ỨNG VIÊN', sub: '(Dùng cho cán bộ quản lý, giáo viên và nhân viên văn phòng)' };
var PF_DEFAULT = [
  { k: 'viTri', l: 'Vị trí ứng tuyển', t: 'text', req: 1, max: 120, wide: 1 },
  { k: 'hoTen', l: 'Họ và tên', t: 'text', req: 1, max: 80 },
  { k: 'gioiTinh', l: 'Giới tính', t: 'radio', opts: ['Nam', 'Nữ'], req: 1 },
  { k: 'ngaySinh', l: 'Ngày sinh', t: 'date', req: 1, birth: 1 },
  { k: 'noiSinh', l: 'Nơi sinh', t: 'text', req: 1, max: 100 },
  { k: 'quocTich', l: 'Quốc tịch', t: 'text', max: 60 },
  { k: 'cccd', l: 'Số CCCD', t: 'cccd', req: 1 },
  { k: 'ngayCap', l: 'Ngày cấp', t: 'date', req: 1 },
  { k: 'noiCap', l: 'Nơi cấp', t: 'text', req: 1, max: 100 },
  { k: 'danToc', l: 'Dân tộc', t: 'text', max: 40 },
  { k: 'tonGiao', l: 'Tôn giáo', t: 'text', max: 40 },
  { k: 'honNhan', l: 'Tình trạng hôn nhân', t: 'radio', opts: ['Độc thân', 'Có gia đình'] },
  { k: 'dienThoai', l: 'Điện thoại di động', t: 'tel', req: 1 },
  { k: 'thuongTru', l: 'Địa chỉ thường trú (sau sáp nhập)', t: 'text', req: 1, max: 250, wide: 1 },
  { k: 'tamTru', l: 'Địa chỉ tạm trú / hiện nay', t: 'text', req: 1, max: 250, wide: 1 },
  { k: 'mangThai', l: 'Đang mang thai', t: 'radio', opts: ['Có', 'Không'], wide: 1 },
  { k: 'email', l: 'Email', t: 'email', req: 1, max: 120, wide: 1 },
  { k: 'doanDang', l: 'Đoàn/Đảng', t: 'text', max: 60 },
  { k: 'nvqs', l: 'Nghĩa vụ quân sự', t: 'check', cb: 'Đã hoàn thành' },
  { k: 'khanCap', l: 'Người liên hệ khẩn cấp', t: 'text', req: 1, max: 80, wide: 1 },
  { k: 'quanHe', l: 'Mối quan hệ', t: 'text', req: 1, max: 40 },
  { k: 'sdtKhanCap', l: 'SĐT người liên hệ khẩn cấp', t: 'tel', req: 1 },
  { k: 'diaChiLienLac', l: 'Địa chỉ liên lạc', t: 'text', req: 1, max: 250, wide: 1 },
  { k: 'ngayNhanViec', l: 'Ngày nhận việc chính thức', t: 'date', wide: 1, future: 1 },
  { k: 'nguon', l: 'Bạn biết thông tin tuyển dụng này thông qua', t: 'multi', opts: ['Website VA Schools', 'Fanpage VA Schools Tuyển dụng', 'Khác'], wide: 1 },
  { k: 'luong', l: 'Mức lương mong muốn', t: 'text', max: 60, wide: 1 }
];
var PF = PF_DEFAULT;
var FIELD_TYPES = { text: 'Văn bản ngắn', textarea: 'Văn bản dài', number: 'Số', date: 'Ngày', tel: 'Điện thoại', email: 'Email', select: 'Danh sách chọn (dropdown)', radio: 'Chọn một (nút tròn)', multi: 'Chọn nhiều (ô tích)' };
var LOCKED_FIELDS = { viTri: 1, hoTen: 1, ngaySinh: 1, cccd: 1, dienThoai: 1, email: 1 }; /* không ẩn, không đổi kiểu */
var TBL_OPTS = { bangCap: [], heDaoTao: [], ngoaiNgu: [] }; /* danh mục (dropdown) cho các cột của bảng; để trống = ô nhập tự do */
/** Gộp cấu hình đã lưu (danh sách trường theo thứ tự) với trường mặc định. */
function mergeFields(saved) {
  var def = {}, out = [], seen = {};
  PF_DEFAULT.forEach(function (f) { def[f.k] = f; });
  (Array.isArray(saved) ? saved : []).forEach(function (s) {
    if (!s || !s.k || seen[s.k]) return;
    var d = def[s.k], f;
    if (d) {
      f = {}; Object.keys(d).forEach(function (x) { f[x] = d[x]; });
      if (s.l) f.l = String(s.l); if (s.req != null) f.req = s.req ? 1 : 0; f.hide = s.hide ? 1 : 0; if (s.wide != null) f.wide = s.wide ? 1 : 0;
      if (!LOCKED_FIELDS[s.k] && d.t !== 'check' && s.t && FIELD_TYPES[s.t]) f.t = s.t;
      if (Array.isArray(s.opts) && s.opts.length) f.opts = s.opts.slice();
      if (LOCKED_FIELDS[s.k]) f.hide = 0;
    } else if (s.custom && /^c_[a-z0-9_]{1,24}$/.test(s.k)) {
      var t = FIELD_TYPES[s.t] ? s.t : 'text';
      f = { k: s.k, l: String(s.l || s.k), t: t, req: s.req ? 1 : 0, opts: Array.isArray(s.opts) ? s.opts.slice() : [], wide: s.wide ? 1 : 0, custom: 1, hide: s.hide ? 1 : 0 };
    } else return;
    if (f.t === 'text' && !f.max) f.max = 120;
    if (f.t === 'textarea') f.max = 500;
    if (f.t === 'number') f.max = 20;
    seen[f.k] = 1; out.push(f);
  });
  PF_DEFAULT.forEach(function (d) { if (!seen[d.k]) { var f = {}; Object.keys(d).forEach(function (x) { f[x] = d[x]; }); out.push(f); } });
  return out;
}
/* các hàng của mục II khi in (theo đúng biểu mẫu) */
var PRINT_II = [['hoTen', 'gioiTinh'], ['ngaySinh', 'noiSinh'], ['quocTich', 'cccd'], ['ngayCap', 'noiCap'], ['danToc', 'tonGiao'], ['honNhan', 'dienThoai'], ['thuongTru'], ['tamTru'], ['mangThai'], ['email'], ['doanDang', 'nvqs'], ['khanCap'], ['quanHe', 'sdtKhanCap'], ['diaChiLienLac'], ['ngayNhanViec'], ['nguon'], ['luong']];
var HV_LEVELS = ['Trung học', 'Cao đẳng', 'Đại học', 'Thạc Sĩ', 'Tiến Sĩ', 'Khác'];
var HV_COLS = [['truong', 'Tên trường', 100], ['nam', 'Năm tốt nghiệp', 4], ['chuyenNganh', 'Chuyên ngành', 100], ['bangCap', 'Bằng cấp', 80], ['heDaoTao', 'Hệ đào tạo', 60]];
var TABLES = {
  khoaHoc: { title: 'IV. CÁC KHÓA ĐÀO TẠO KHÁC', rows: 4, maxRows: 8, cols: [['truong', 'Tên trường / trung tâm', 'text', 100], ['noiDung', 'Nội dung khóa học', 'text', 150], ['tu', 'Từ', 'month', 7], ['den', 'Đến', 'month', 7], ['tt', 'Trạng thái', 'tt', 10]] },
  ngoaiNgu: { title: 'V. CHỨNG CHỈ NGOẠI NGỮ', rows: 3, maxRows: 6, cols: [['ngoaiNgu', 'Ngoại ngữ', 'text', 60], ['chungChi', 'Chứng chỉ / văn bằng', 'text', 100], ['nam', 'Năm đạt chứng chỉ / văn bằng', 'year', 4]] },
  kinhNghiem: { title: 'VI. KINH NGHIỆM LÀM VIỆC (liệt kê từ gần đây nhất về trước)', rows: 5, maxRows: 10, cols: [['tu', 'Từ (tháng/năm)', 'month', 7], ['den', 'Đến (tháng/năm)', 'month', 7], ['congTy', 'Tên Công ty - Địa điểm, Người tham khảo, chức vụ, SĐT', 'text', 250], ['chucDanh', 'Chức danh công việc', 'text', 100], ['lyDo', 'Lý do thôi việc', 'text', 150]] }
};
var HR_STATUS = ['Mới nộp', 'Đã xem', 'Đã liên hệ', 'Đã nhận việc', 'Không tiếp tục'];
var COMMIT_TEXT = ['Tôi cam đoan những thông tin cung cấp trên đây là chính xác. Tôi chấp nhận việc Công ty xác minh những thông tin trên và cam kết không kiện tổ chức hoặc những cá nhân cung cấp thông tin cho Công ty. Nếu các thông tin trên không đúng sự thật thì tôi chấp nhận việc Công ty chấm dứt HĐLĐ trước thời hạn mà không cần báo trước, đồng thời bồi thường thiệt hại cho Công ty (nếu có).', 'Tôi cam kết bảo mật thông tin của hệ thống Trường Việt Mỹ - VA Schools.', 'Tôi đồng thuận cho VA Schools sử dụng các thông tin cá nhân do tôi cung cấp để phục vụ công tác tuyển dụng, quản lý nhân sự và các nghiệp vụ liên quan của Phòng Hành chính - Nhân sự theo quy định.'];
/*SCHEMA-END*/

function doGet(e) {
  const mode = e && e.parameter && e.parameter.m === 'admin' ? 'admin' : 'public';
  const html = HtmlService.createHtmlOutputFromFile('Index').getContent().split("'__MODE__'").join("'" + mode + "'");
  return HtmlService.createHtmlOutput(html).setTitle('Thông tin ứng viên – VA Schools')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Chạy 1 lần trong trình soạn thảo: tạo các sheet cần thiết và ghi nhận chủ dự án là Quản trị. */
function setup() {
  const owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  dataSheet_(); cfgSheet_();
  const us = usersSheet_();
  if (us.getLastRow() < 2) us.getRange(2, 1, 1, 3).setNumberFormat('@').setValues([[owner, 'Quản trị', 'Chủ dự án']]);
  logAct_('SETUP', '', owner);
  Logger.log('OK – đã tạo sheet HoSo, NguoiDung, CauHinh, NhatKy. Quản trị: ' + owner);
}

/* ---------------- tiện ích ---------------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function head_(sh, cols) {
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#8a1538').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}
function dataSheet_() { let sh = ss_().getSheetByName(SH_DATA); if (!sh) { sh = ss_().insertSheet(SH_DATA); head_(sh, COLS); } return sh; }
function usersSheet_() { let sh = ss_().getSheetByName(SH_USERS); if (!sh) { sh = ss_().insertSheet(SH_USERS); head_(sh, ['Email', 'Vai trò', 'Tên']); } return sh; }
function cfgSheet_() {
  let sh = ss_().getSheetByName(SH_CFG);
  if (!sh) {
    sh = ss_().insertSheet(SH_CFG); head_(sh, ['Khoá', 'Giá trị', 'Mô tả']);
    const rows = [['lockDays', CFG_DEFAULT.lockDays, 'Số ngày sau "Ngày nhận việc" thì khoá hồ sơ'], ['autoLockDays', CFG_DEFAULT.autoLockDays, 'Nếu chưa có ngày nhận việc: tự khoá sau N ngày kể từ khi nộp'],
      ['maxFail', CFG_DEFAULT.maxFail, 'Số lần nhập sai số xác nhận tối đa trước khi tạm khoá 30 phút'], ['perHour', CFG_DEFAULT.perHour, 'Số hồ sơ nộp tối đa mỗi giờ (chống spam)'],
      ['perDay', CFG_DEFAULT.perDay, 'Số hồ sơ nộp tối đa mỗi ngày'], ['minFillSec', CFG_DEFAULT.minFillSec, 'Thời gian điền tối thiểu (giây)']];
    sh.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  return sh;
}
function cfg_() {
  const out = {}; Object.keys(CFG_DEFAULT).forEach(function (k) { out[k] = CFG_DEFAULT[k]; });
  try {
    const sh = ss_().getSheetByName(SH_CFG);
    if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) { const n = Number(r[1]); if (r[0] in out && isFinite(n) && n >= 0) out[r[0]] = n; });
  } catch (e) { /* dùng mặc định */ }
  return out;
}
function logAct_(act, code, who) {
  try {
    let sh = ss_().getSheetByName(SH_LOG);
    if (!sh) { sh = ss_().insertSheet(SH_LOG); head_(sh, ['Thời gian', 'Hành động', 'Mã hồ sơ', 'Người thực hiện']); }
    sh.appendRow([now_(), act, code, who || '']);
  } catch (e) { /* bỏ qua */ }
}
function now_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function safeCell_(v) { v = v == null ? '' : String(v); return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; }
function addDays_(iso, n) { return new Date(new Date(iso + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10); }
function cs_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 200); }
function isoOk_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
function monthNorm_(s) {
  s = cs_(s, 7); if (!s) return '';
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return s;
  const m = /^(0?[1-9]|1[0-2])\/(\d{4})$/.exec(s);
  return m ? m[2] + '-' + ('0' + m[1]).slice(-2) : null;
}

/* ---------------- cấu hình biểu mẫu (trường, danh mục) ---------------- */
function formCfgRaw_() {
  const sh = cfgSheet_(), last = sh.getLastRow();
  if (last > 1) { const v = sh.getRange(2, 1, last - 1, 2).getValues(); for (let i = 0; i < v.length; i++) if (v[i][0] === 'formCfg') { try { return { row: i + 2, cfg: JSON.parse(v[i][1]) }; } catch (e) { return { row: i + 2, cfg: {} }; } } }
  return { row: 0, cfg: {} };
}
/** Nạp cấu hình vào biến toàn cục PF / TBL_OPTS (gọi ở đầu mỗi API dùng lược đồ). */
function loadFields_() {
  const c = formCfgRaw_().cfg || {};
  PF = mergeFields(c.fields);
  ['bangCap', 'heDaoTao', 'ngoaiNgu'].forEach(function (k) { TBL_OPTS[k] = (c.tbl && Array.isArray(c.tbl[k])) ? c.tbl[k].filter(function (x) { return typeof x === 'string'; }) : []; });
  return { fields: PF, tbl: TBL_OPTS };
}
function pub_config() { return loadFields_(); }
function adm_setFields(list, tbl) {
  const u = adm_('Quản trị'), seen = {}, out = [];
  if (!Array.isArray(list) || list.length > 90) throw new Error('Danh sách trường không hợp lệ.');
  const defKeys = {}; PF_DEFAULT.forEach(function (f) { defKeys[f.k] = f; });
  let nCustom = 0;
  list.forEach(function (x) {
    const k = cs_(x && x.k, 30); if (!k || seen[k]) throw new Error('Mã trường trùng hoặc trống: ' + k);
    seen[k] = 1;
    const isCustom = !defKeys[k];
    if (isCustom && (!x.custom || !/^c_[a-z0-9_]{1,24}$/.test(k))) throw new Error('Mã trường không hợp lệ: ' + k);
    if (isCustom && ++nCustom > 40) throw new Error('Tối đa 40 trường thêm mới.');
    const l = cs_(x.l, 90); if (!l) throw new Error('Trường ' + k + ' chưa có tên hiển thị.');
    const t = cs_(x.t, 12), o = { k: k, l: l, req: x.req ? 1 : 0, hide: x.hide ? 1 : 0, wide: x.wide ? 1 : 0 };
    if (isCustom) { o.custom = 1; if (!FIELD_TYPES[t]) throw new Error('Kiểu dữ liệu không hợp lệ: ' + t); o.t = t; }
    else if (!LOCKED_FIELDS[k] && defKeys[k].t !== 'check' && FIELD_TYPES[t]) o.t = t;
    else if (LOCKED_FIELDS[k]) o.hide = 0;
    const tt = o.t || defKeys[k].t;
    if (tt === 'select' || tt === 'radio' || tt === 'multi') {
      const opts = (Array.isArray(x.opts) ? x.opts : []).map(function (v) { return cs_(v, 60); }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).slice(0, 60);
      if (opts.length < 2) throw new Error('Trường "' + l + '" cần ít nhất 2 lựa chọn trong danh mục.');
      o.opts = opts;
    }
    out.push(o);
  });
  const tb = {}; ['bangCap', 'heDaoTao', 'ngoaiNgu'].forEach(function (k) { tb[k] = ((tbl && Array.isArray(tbl[k])) ? tbl[k] : []).map(function (v) { return cs_(v, 60); }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).slice(0, 60); });
  const json = JSON.stringify({ fields: out, tbl: tb });
  if (json.length > 45000) throw new Error('Cấu hình quá dài.');
  const sh = cfgSheet_(), r = formCfgRaw_();
  if (r.row) sh.getRange(r.row, 1, 1, 3).setNumberFormat('@').setValues([['formCfg', json, 'Cấu hình trường biểu mẫu (sửa qua trang quản lý)']]);
  else sh.getRange(sh.getLastRow() + 1, 1, 1, 3).setNumberFormat('@').setValues([['formCfg', json, 'Cấu hình trường biểu mẫu (sửa qua trang quản lý)']]);
  logAct_('ĐỔI CẤU HÌNH BIỂU MẪU', '', u.email);
  return loadFields_();
}
function adm_resetFields() {
  const u = adm_('Quản trị'), r = formCfgRaw_();
  if (r.row) cfgSheet_().deleteRow(r.row);
  logAct_('KHÔI PHỤC BIỂU MẪU MẶC ĐỊNH', '', u.email);
  return loadFields_();
}

/* ---------------- kiểm tra & chuẩn hoá dữ liệu ---------------- */
function clean_(p, prev) {
  p = p || {}; prev = prev || {};
  const out = {}, errs = [], t = today_(), y = +t.slice(0, 4);
  PF.forEach(function (f) {
    if (f.hide) { if (prev[f.k] !== undefined) out[f.k] = prev[f.k]; if (f.k === 'nguon' && prev.nguonKhac !== undefined) out.nguonKhac = prev.nguonKhac; return; }
    let v = p[f.k];
    if (f.t === 'check') { out[f.k] = (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0; return; }
    if (f.t === 'multi') {
      const arr = (Array.isArray(v) ? v : []).map(function (x) { return cs_(x, 60); }).filter(function (x, i, a) { return (f.opts || []).indexOf(x) >= 0 && a.indexOf(x) === i; });
      out[f.k] = arr;
      if (f.k === 'nguon') out.nguonKhac = arr.indexOf('Khác') >= 0 ? cs_(p.nguonKhac, 80) : '';
      if (f.req && !arr.length) errs.push(f.l + ' là bắt buộc');
      return;
    }
    v = cs_(v, f.t === 'date' ? 10 : (f.max || 120));
    if ((f.t === 'radio' || f.t === 'select') && v && (f.opts || []).indexOf(v) < 0) { errs.push(f.l + ' không hợp lệ'); v = ''; }
    if (f.t === 'number' && v && !/^-?\d{1,12}([.,]\d{1,4})?$/.test(v)) { errs.push(f.l + ' phải là số'); v = ''; }
    if (f.t === 'date' && v) {
      if (!isoOk_(v)) { errs.push(f.l + ' không hợp lệ'); v = ''; }
      else if (f.birth && (+v.slice(0, 4) < 1940 || +v.slice(0, 4) > y - 14)) { errs.push('Ngày sinh không hợp lý'); v = ''; }
      else if (!f.future && !f.birth && (v > t || +v.slice(0, 4) < 1940)) { errs.push(f.l + ' không hợp lý'); v = ''; }
      else if (f.future && (+v.slice(0, 4) < y - 1 || +v.slice(0, 4) > y + 2)) { errs.push(f.l + ' không hợp lý'); v = ''; }
    }
    if (f.t === 'cccd' && v && !/^(\d{9}|\d{12})$/.test(v)) { errs.push('Số CCCD phải gồm 12 chữ số (hoặc 9 số với CMND cũ)'); v = ''; }
    if (f.t === 'tel' && v && !(/^[0-9+().\s-]{8,16}$/.test(v) && v.replace(/\D/g, '').length >= 9)) { errs.push(f.l + ' không hợp lệ'); v = ''; }
    if (f.t === 'email' && v && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v)) { errs.push('Email không hợp lệ'); v = ''; }
    if (f.req && !v) errs.push(f.l + ' là bắt buộc');
    out[f.k] = v;
  });
  // học vấn
  const hv = Array.isArray(p.hocVan) ? p.hocVan : [];
  out.hocVan = HV_LEVELS.map(function (lv, i) {
    const r = hv[i] || {}, o = {};
    HV_COLS.forEach(function (c) { o[c[0]] = cs_(r[c[0]], c[2]); if (TBL_OPTS[c[0]] && TBL_OPTS[c[0]].length && o[c[0]] && TBL_OPTS[c[0]].indexOf(o[c[0]]) < 0) { errs.push(c[1] + ' (' + lv + ') không thuộc danh mục'); o[c[0]] = ''; } });
    if (o.nam && !/^\d{4}$/.test(o.nam)) { errs.push('Năm tốt nghiệp (' + lv + ') phải gồm 4 chữ số'); o.nam = ''; }
    return o;
  });
  Object.keys(TABLES).forEach(function (tk) {
    const T = TABLES[tk], src = Array.isArray(p[tk]) ? p[tk].slice(0, T.maxRows) : [];
    out[tk] = src.map(function (r) {
      r = r || {}; const o = {}; let any = false;
      T.cols.forEach(function (c) {
        let v = cs_(r[c[0]], c[3] > 20 ? c[3] : 20);
        if (c[2] === 'month') { const mn = monthNorm_(v); if (mn === null) { errs.push(T.title.split('.')[0] + ': tháng/năm không hợp lệ'); v = ''; } else v = mn; }
        if (c[2] === 'year' && v && !/^\d{4}$/.test(v)) { errs.push('Năm không hợp lệ (' + c[1] + ')'); v = ''; }
        if (c[2] === 'tt' && v && ['Đã học', 'Đang học'].indexOf(v) < 0) v = '';
        if (TBL_OPTS[c[0]] && TBL_OPTS[c[0]].length && tk === 'ngoaiNgu' && c[0] === 'ngoaiNgu' && v && TBL_OPTS.ngoaiNgu.indexOf(v) < 0) { errs.push('Ngoại ngữ không thuộc danh mục'); v = ''; }
        if (v) any = true; o[c[0]] = v;
      });
      return any ? o : null;
    }).filter(Boolean);
  });
  out.camKet = (p.camKet === true || p.camKet === 1 || p.camKet === '1' || p.camKet === 'true') ? 1 : 0;
  if (!out.camKet) errs.push('Bạn cần tích xác nhận cam đoan');
  if (errs.length) throw new Error(errs.slice(0, 5).join('; ') + (errs.length > 5 ? '; …' : ''));
  if (JSON.stringify(out).length > 38000) throw new Error('Nội dung quá dài, vui lòng rút gọn.');
  return out;
}

/* ---------------- lưu / đọc ---------------- */
function findRow_(sh, code) {
  const last = sh.getLastRow(); if (last < 2) return 0;
  const v = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === code) return i + 2;
  return 0;
}
function readRow_(sh, row) {
  const v = sh.getRange(row, 1, 1, COLS.length).getValues()[0];
  let d = {}; try { d = JSON.parse(v[CI.data]); } catch (e) { d = {}; }
  return { code: String(v[CI['Mã hồ sơ']]), at: String(v[CI['Thời gian nộp']]), upd: String(v[CI['Cập nhật lần cuối']]), rev: Number(v[CI['Số lần sửa']]) || 0, salt: String(v[CI.salt]), hash: String(v[CI.hash]), data: d };
}
function rowValues_(m) {
  const d = m.data, hr = d.hr || {}, a = new Array(COLS.length).fill('');
  a[CI['Mã hồ sơ']] = m.code; a[CI['Thời gian nộp']] = m.at; a[CI['Cập nhật lần cuối']] = m.upd; a[CI['Số lần sửa']] = String(m.rev);
  a[CI['Trạng thái']] = hr.trangThai || 'Mới nộp'; a[CI['Họ và tên']] = safeCell_(d.hoTen); a[CI['Vị trí ứng tuyển']] = safeCell_(d.viTri);
  a[CI['Điện thoại']] = safeCell_(d.dienThoai); a[CI['Email']] = safeCell_(d.email); a[CI['Số CCCD']] = safeCell_(d.cccd);
  a[CI['Ngày nhận việc (ứng viên)']] = d.ngayNhanViec || ''; a[CI['Ngày nhận việc (HCNS)']] = hr.ngayNhanViecHR || ''; a[CI['Khoá']] = hr.khoa || '';
  a[CI['Chức danh']] = safeCell_(hr.chucDanh); a[CI['Cơ sở']] = safeCell_(hr.coSo); a[CI['Địa điểm']] = safeCell_(hr.diaDiem); a[CI['Thời gian']] = safeCell_(hr.thoiGian);
  a[CI['MSNV']] = safeCell_(hr.msnv); a[CI['Ghi chú HCNS']] = safeCell_(hr.ghiChu);
  a[CI.salt] = m.salt; a[CI.hash] = m.hash; a[CI.data] = JSON.stringify(d);
  return a;
}
function writeRow_(sh, row, m) {
  const vals = rowValues_(m);
  sh.getRange(row, 1, 1, COLS.length).setNumberFormat('@').setValues([vals]);
}
function lockInfo_(m, cfg) {
  const hr = (m.data && m.data.hr) || {}, t = today_();
  if (hr.khoa === 'lock') return { locked: true, reason: 'Hồ sơ đã được Phòng Nhân sự khoá.', until: '' };
  if (hr.khoa === 'open') return { locked: false, reason: '', until: '' };
  const nv = hr.ngayNhanViecHR || (m.data && m.data.ngayNhanViec) || '';
  if (nv && isoOk_(nv)) {
    const until = addDays_(nv, cfg.lockDays);
    return t > until ? { locked: true, reason: 'Hồ sơ đã khoá (quá ' + cfg.lockDays + ' ngày sau ngày nhận việc).', until: until } : { locked: false, reason: '', until: until };
  }
  const base = String(m.at).slice(0, 10);
  if (isoOk_(base)) { const until = addDays_(base, cfg.autoLockDays); if (t > until) return { locked: true, reason: 'Hồ sơ đã khoá do quá thời hạn chỉnh sửa.', until: until }; return { locked: false, reason: '', until: until }; }
  return { locked: false, reason: '', until: '' };
}
function randSecret_() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let hex = '';
  while (hex.length < 16) hex += Utilities.getUuid().replace(/-/g, '');
  let s = ''; for (let i = 0; i < 8; i++) s += A.charAt(parseInt(hex.substr(i * 2, 2), 16) % 32);
  return s;
}
function normSecret_(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function hash_(salt, secret) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + normSecret_(secret)));
}
function fmtSecret_(s) { return s.slice(0, 4) + '-' + s.slice(4); }
function sameStr_(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const BAD_MSG_ = 'Mã hồ sơ hoặc số xác nhận không đúng.';
function failCheck_(code) {
  const c = CacheService.getScriptCache(), cfg = cfg_();
  if ((Number(c.get('f:' + code)) || 0) >= cfg.maxFail) throw new Error('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 30 phút hoặc liên hệ Phòng Nhân sự.');
  const hk = 'fg:' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHH');
  if ((Number(c.get(hk)) || 0) > 400) throw new Error('Hệ thống đang bận, vui lòng thử lại sau.');
}
function failAdd_(code) {
  const c = CacheService.getScriptCache(), k = 'f:' + code, hk = 'fg:' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHH');
  c.put(k, String((Number(c.get(k)) || 0) + 1), 1800); c.put(hk, String((Number(c.get(hk)) || 0) + 1), 3600);
  Utilities.sleep(500);
}
/** Xác thực mã + số xác nhận; trả về {sh,row,m}. */
function auth_(code, secret) {
  code = cs_(code, 20).toUpperCase();
  if (!/^HS-\d{4}-\d{4,6}$/.test(code)) { Utilities.sleep(300); throw new Error(BAD_MSG_); }
  failCheck_(code);
  const sh = dataSheet_(), row = findRow_(sh, code);
  const m = row ? readRow_(sh, row) : null;
  if (!m || !sameStr_(hash_(m.salt, secret), m.hash)) { failAdd_(code); throw new Error(BAD_MSG_); }
  CacheService.getScriptCache().remove('f:' + code);
  return { sh: sh, row: row, m: m };
}
function pubView_(m, cfg) {
  const d = JSON.parse(JSON.stringify(m.data)), hr = d.hr || {};
  d.hr = { chucDanh: hr.chucDanh || '', coSo: hr.coSo || '', diaDiem: hr.diaDiem || '', thoiGian: hr.thoiGian || '', msnv: hr.msnv || '' };
  const li = lockInfo_(m, cfg);
  return { code: m.code, at: m.at, upd: m.upd, rev: m.rev, data: d, locked: li.locked, lockReason: li.reason, lockUntil: li.until };
}

/* ---------------- API công khai ---------------- */
function pub_submit(payload, meta) {
  const cfg = cfg_(); meta = meta || {}; loadFields_();
  if (meta.hp) throw new Error('Không gửi được hồ sơ.');
  if ((Number(meta.sec) || 0) < cfg.minFillSec) throw new Error('Vui lòng kiểm tra lại thông tin trước khi gửi (gửi quá nhanh).');
  const rec = clean_(payload);
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const props = PropertiesService.getScriptProperties(), hk = 'sub_h_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHH'), dk = 'sub_d_' + today_();
    const nh = Number(props.getProperty(hk)) || 0, nd = Number(props.getProperty(dk)) || 0;
    if (nh >= cfg.perHour || nd >= cfg.perDay) throw new Error('Hệ thống đang nhận quá nhiều hồ sơ, vui lòng thử lại sau hoặc liên hệ Phòng Nhân sự.');
    const ym = Utilities.formatDate(new Date(), TZ, 'yyMM'), sk = 'seq_' + ym, seq = (Number(props.getProperty(sk)) || 0) + 1;
    const code = 'HS-' + ym + '-' + ('000' + seq).slice(-4);
    const secret = randSecret_(), salt = Utilities.getUuid(), ts = now_();
    rec.hr = { trangThai: 'Mới nộp' };
    const m = { code: code, at: ts, upd: ts, rev: 0, salt: salt, hash: hash_(salt, secret), data: rec };
    const sh = dataSheet_(); writeRow_(sh, sh.getLastRow() + 1, m);
    props.setProperty(sk, String(seq)); props.setProperty(hk, String(nh + 1)); props.setProperty(dk, String(nd + 1));
    SpreadsheetApp.flush();
    logAct_('NỘP', code, '');
    return { code: code, secret: fmtSecret_(secret), at: ts };
  } finally { lock.releaseLock(); }
}
function pub_lookup(code, secret) {
  const a = auth_(code, secret); logAct_('TRA CỨU', a.m.code, '');
  return pubView_(a.m, cfg_());
}
function pub_update(code, secret, payload) {
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    loadFields_();
    const a = auth_(code, secret), cfg = cfg_(), li = lockInfo_(a.m, cfg);
    if (li.locked) throw new Error(li.reason || 'Hồ sơ đã khoá, không thể chỉnh sửa.');
    const rec = clean_(payload, a.m.data); rec.hr = a.m.data.hr || { trangThai: 'Mới nộp' };
    a.m.data = rec; a.m.rev += 1; a.m.upd = now_();
    writeRow_(a.sh, a.row, a.m); SpreadsheetApp.flush(); logAct_('SỬA', a.m.code, '');
    return pubView_(a.m, cfg);
  } finally { lock.releaseLock(); }
}

/* ---------------- API nội bộ (nhân viên HCNS) ---------------- */
function adm_(minRole) {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('Chưa đăng nhập tài khoản công ty. Hãy mở bằng đường dẫn nội bộ.');
  const sh = usersSheet_(); let role = '';
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) { if (String(r[0]).toLowerCase().trim() === email) role = String(r[1]); });
  if (!ROLE_RANK[role]) throw new Error('Tài khoản ' + email + ' chưa được cấp quyền.');
  if (ROLE_RANK[role] < ROLE_RANK[minRole || 'Xem']) throw new Error('Vai trò "' + role + '" không có quyền thực hiện thao tác này.');
  return { email: email, role: role };
}
function adm_me() { const u = adm_('Xem'); return { email: u.email, role: u.role, statuses: HR_STATUS }; }
function adm_list(q) {
  adm_('Xem'); const sh = dataSheet_(), last = sh.getLastRow(), cfg = cfg_(); if (last < 2) return [];
  const v = sh.getRange(2, 1, last - 1, CI.salt).getValues(); q = cs_(q, 60).toLowerCase(); const out = [];
  for (let i = v.length - 1; i >= 0 && out.length < 2000; i--) {
    const r = v[i], hay = [r[CI['Mã hồ sơ']], r[CI['Họ và tên']], r[CI['Vị trí ứng tuyển']], r[CI['Điện thoại']], r[CI['Email']], r[CI['Số CCCD']], r[CI['MSNV']]].join(' ').toLowerCase();
    if (q && hay.indexOf(q) < 0) continue;
    const m = { at: String(r[CI['Thời gian nộp']]), data: { ngayNhanViec: String(r[CI['Ngày nhận việc (ứng viên)']]), hr: { ngayNhanViecHR: String(r[CI['Ngày nhận việc (HCNS)']]), khoa: String(r[CI['Khoá']]) } } };
    out.push({ code: r[CI['Mã hồ sơ']], at: m.at, name: r[CI['Họ và tên']], pos: r[CI['Vị trí ứng tuyển']], phone: r[CI['Điện thoại']], email: r[CI['Email']], status: r[CI['Trạng thái']], nv: m.data.hr.ngayNhanViecHR || m.data.ngayNhanViec, rev: r[CI['Số lần sửa']], locked: lockInfo_(m, cfg).locked });
  }
  return out;
}
function adm_get(code) {
  adm_('Xem'); code = cs_(code, 20); const sh = dataSheet_(), row = findRow_(sh, code); if (!row) throw new Error('Không tìm thấy hồ sơ.');
  const m = readRow_(sh, row), li = lockInfo_(m, cfg_());
  return { code: m.code, at: m.at, upd: m.upd, rev: m.rev, data: m.data, locked: li.locked, lockReason: li.reason, lockUntil: li.until };
}
function adm_saveHr(code, hr) {
  const u = adm_('Tuyển dụng'); hr = hr || {};
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = dataSheet_(), row = findRow_(sh, cs_(code, 20)); if (!row) throw new Error('Không tìm thấy hồ sơ.');
    const m = readRow_(sh, row), o = {};
    o.trangThai = HR_STATUS.indexOf(hr.trangThai) >= 0 ? hr.trangThai : 'Mới nộp';
    ['chucDanh', 'coSo', 'diaDiem', 'thoiGian', 'msnv'].forEach(function (k) { o[k] = cs_(hr[k], 120); });
    o.ghiChu = cs_(hr.ghiChu, 500);
    o.ngayNhanViecHR = isoOk_(cs_(hr.ngayNhanViecHR, 10)) ? cs_(hr.ngayNhanViecHR, 10) : '';
    o.khoa = ['lock', 'open'].indexOf(hr.khoa) >= 0 ? hr.khoa : '';
    m.data.hr = o; writeRow_(sh, row, m); SpreadsheetApp.flush(); logAct_('HCNS CẬP NHẬT', m.code, u.email);
    return adm_get(m.code);
  } finally { lock.releaseLock(); }
}
/** Cấp lại số xác nhận (khi ứng viên mất). Chỉ trả về một lần cho nhân viên – hãy xác minh danh tính ứng viên trước. */
function adm_resetSecret(code) {
  const u = adm_('Tuyển dụng');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = dataSheet_(), row = findRow_(sh, cs_(code, 20)); if (!row) throw new Error('Không tìm thấy hồ sơ.');
    const m = readRow_(sh, row), secret = randSecret_(); m.salt = Utilities.getUuid(); m.hash = hash_(m.salt, secret);
    writeRow_(sh, row, m); CacheService.getScriptCache().remove('f:' + m.code); logAct_('CẤP LẠI SỐ XÁC NHẬN', m.code, u.email);
    return { code: m.code, secret: fmtSecret_(secret) };
  } finally { lock.releaseLock(); }
}
function fmtD_(s) { s = String(s || ''); const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? m[3] + '/' + m[2] + '/' + m[1] : s; }
function fmtM_(s) { s = String(s || ''); const m = /^(\d{4})-(\d{2})$/.exec(s); return m ? m[2] + '/' + m[1] : s; }
/** Xuất toàn bộ hồ sơ dạng bảng phẳng (Tuyển dụng trở lên). Giao diện tự tạo CSV / Excel. */
function adm_export() {
  const u = adm_('Tuyển dụng'), sh = dataSheet_(), last = sh.getLastRow(); loadFields_();
  const heads = ['Mã hồ sơ', 'Thời gian nộp', 'Cập nhật lần cuối', 'Số lần sửa', 'Trạng thái', 'Chức danh (HCNS)', 'Cơ sở', 'Địa điểm', 'Thời gian', 'MSNV', 'Ngày nhận việc (HCNS)', 'Khoá'];
  const vis = PF.filter(function (f) { return !f.hide; });
  vis.forEach(function (f) { heads.push(f.l); });
  heads.push('Nguồn khác (ghi rõ)');
  HV_LEVELS.forEach(function (lv) { HV_COLS.forEach(function (c) { heads.push(lv + ' – ' + c[1]); }); });
  heads.push('Các khóa đào tạo khác', 'Chứng chỉ ngoại ngữ', 'Kinh nghiệm làm việc', 'Ghi chú HCNS');
  const rows = [];
  for (let r = 2; r <= last; r++) {
    const m = readRow_(sh, r), d = m.data || {}, hr = d.hr || {}, a = [m.code, m.at, m.upd, m.rev, hr.trangThai || '', hr.chucDanh || '', hr.coSo || '', hr.diaDiem || '', hr.thoiGian || '', hr.msnv || '', fmtD_(hr.ngayNhanViecHR), hr.khoa === 'lock' ? 'Khoá' : hr.khoa === 'open' ? 'Mở' : ''];
    vis.forEach(function (f) {
      let v = d[f.k];
      if (f.t === 'date') v = fmtD_(v); else if (f.t === 'check') v = v ? f.cb : ''; else if (f.t === 'multi') v = (v || []).join('; ');
      a.push(v == null ? '' : v);
    });
    a.push(d.nguonKhac || '');
    HV_LEVELS.forEach(function (lv, i) { const h = (d.hocVan || [])[i] || {}; HV_COLS.forEach(function (c) { a.push(h[c[0]] || ''); }); });
    a.push((d.khoaHoc || []).map(function (x) { return [x.truong, x.noiDung, fmtM_(x.tu) + '–' + fmtM_(x.den), x.tt].filter(Boolean).join(', '); }).join(' | '));
    a.push((d.ngoaiNgu || []).map(function (x) { return [x.ngoaiNgu, x.chungChi, x.nam].filter(Boolean).join(', '); }).join(' | '));
    a.push((d.kinhNghiem || []).map(function (x) { return [fmtM_(x.tu) + '–' + fmtM_(x.den), x.congTy, x.chucDanh, x.lyDo].filter(Boolean).join(', '); }).join(' | '));
    a.push(hr.ghiChu || '');
    rows.push(a);
  }
  logAct_('XUẤT DỮ LIỆU (' + rows.length + ' hồ sơ)', '', u.email);
  return { headers: heads, rows: rows };
}
function adm_users() {
  adm_('Quản trị'); const sh = usersSheet_(); if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().map(function (r) { return { email: String(r[0]), role: String(r[1]), name: String(r[2]) }; }).filter(function (x) { return x.email; });
}
function adm_setUsers(list) {
  const u = adm_('Quản trị'); const re = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/, seen = {}, rows = [];
  (list || []).slice(0, 100).forEach(function (x) {
    const e = cs_(x.email, 120).toLowerCase(), r = cs_(x.role, 20);
    if (!re.test(e)) throw new Error('Email không hợp lệ: ' + e);
    if (!ROLE_RANK[r]) throw new Error('Vai trò không hợp lệ: ' + r);
    if (!seen[e]) { seen[e] = 1; rows.push([e, r, cs_(x.name, 80)]); }
  });
  if (!rows.some(function (r) { return r[1] === 'Quản trị'; })) throw new Error('Phải còn ít nhất một Quản trị.');
  const sh = usersSheet_(); if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 3).clearContent();
  sh.getRange(2, 1, rows.length, 3).setNumberFormat('@').setValues(rows); logAct_('ĐỔI DANH SÁCH NGƯỜI DÙNG', '', u.email);
  return adm_users();
}
