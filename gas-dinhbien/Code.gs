/**
 * QUẢN LÝ ĐỊNH BIÊN & PHÂN CÔNG – KHỐI MẦM NON, HỆ THỐNG TRƯỜNG VIỆT MỸ
 * Căn cứ: Quy định tên lớp học – Định biên nhân sự khối Mầm non (HDMN-DBNS-01, hiệu lực 01/06/2026).
 * Script gắn (bound) với một Google Sheet đóng vai trò cơ sở dữ liệu.
 */

const SH = {
  USERS: 'NguoiDung', ROLEPERM: 'PQ_VaiTro', USERCAMP: 'PQ_CoSo', CAMPUS: 'CoSo',
  STAFF: 'NhanSu', CLASS: 'Lop', ASSIGN: 'PhanCong',
  CT: 'CauHinh_Lop', BAND: 'CauHinh_Khung', POS: 'CauHinh_CoSo', PARAM: 'CauHinh_ThamSo', AUDIT: 'NhatKy', HIST: 'LichSu', PD: 'PheDuyet', PDDL: 'PheDuyet_DL', GUIDE: 'HuongDan'
};

const PERMS = [
  { key: 'dash.view', label: 'Xem báo cáo định biên' },
  { key: 'report.export', label: 'Xuất báo cáo' },
  { key: 'staff.view', label: 'Xem nhân sự' },
  { key: 'staff.import', label: 'Nhập / sửa dữ liệu nhân sự' },
  { key: 'staff.assign', label: 'Phân công vai trò & lớp' },
  { key: 'class.view', label: 'Xem lớp học' },
  { key: 'class.edit', label: 'Quản lý lớp & sĩ số' },
  { key: 'config.edit', label: 'Cấu hình định mức & cơ sở' },
  { key: 'admin.perm', label: 'Phân quyền & người dùng' },
  { key: 'audit.view', label: 'Xem nhật ký' },
  { key: 'history.view', label: 'Xem lịch sử phân công' },
  { key: 'history.snapshot', label: 'Chốt kỳ phân công' },
  { key: 'approval.submit', label: 'Gửi phê duyệt' },
  { key: 'approval.approve', label: 'Được chọn làm người phê duyệt' },
  { key: 'approval.viewall', label: 'Xem mọi hồ sơ phê duyệt' }
];

const SYS_NAME = 'Hệ thống Định biên Khối Mầm non';
const PARAM_DEF = [
  { Khoa: 'NamHoc', GiaTri: '2026 - 2027', MoTa: 'Năm học hiển thị trên báo cáo' },
  { Khoa: 'ChenhLech', GiaTri: '2', MoTa: 'Lớp đạt tỉ lệ định biên + N học sinh thì đủ điều kiện đề xuất bổ sung GV/bảo mẫu' },
  { Khoa: 'XacThucOTP', GiaTri: '1', MoTa: '1 = bắt buộc nhập mã xác nhận gửi qua email khi vào hệ thống; 0 = tắt' },
  { Khoa: 'PhienGio', GiaTri: '8', MoTa: 'Số giờ một lần xác nhận có hiệu lực (1–72)' },
  { Khoa: 'ChuKy', GiaTri: 'Người lập;Chủ tịch HĐHT Mầm non;Phó Tổng Giám đốc;Tổng Giám đốc', MoTa: 'Các chức danh ký ở cuối bản in (cách nhau bằng dấu ;)' },
  { Khoa: 'TenGui', GiaTri: SYS_NAME, MoTa: 'Tên hiển thị của email tự động (thay cho tên chủ web app)' },
  { Khoa: 'KhongTraLoi', GiaTri: '1', MoTa: '1 = email tự động ghi chú "không trả lời" và dùng địa chỉ no-reply nếu tài khoản hỗ trợ; 0 = cho phép trả lời' }
];
const PARAM_SECURE = ['XacThucOTP', 'PhienGio', 'TenGui', 'KhongTraLoi'];   // chỉ Admin được đổi
const ROLE_ADMIN = 'Admin';
const DEFAULT_ROLES = {
  'Admin': PERMS.map(p => p.key),
  'Chủ tịch HĐHT Mầm non': ['dash.view', 'report.export', 'staff.view', 'class.view', 'config.edit', 'audit.view', 'history.view', 'approval.approve', 'approval.viewall'],
  'Nhân sự': ['dash.view', 'report.export', 'staff.view', 'staff.import', 'class.view', 'audit.view', 'history.view', 'history.snapshot', 'approval.submit', 'approval.approve', 'approval.viewall'],
  'Hiệu trưởng/Quản lý cơ sở': ['dash.view', 'report.export', 'staff.view', 'staff.assign', 'class.view', 'class.edit', 'history.view', 'history.snapshot', 'approval.submit'],
  'Người xem': ['dash.view', 'staff.view', 'class.view', 'history.view']
};

const CLASS_ROLES = ['Giáo viên', 'Bảo mẫu'];   // vai trò gắn theo lớp
const STATUS_OFF = 'Nghỉ việc';

const HEADERS = {
  NguoiDung: ['Email', 'HoTen', 'VaiTro', 'KichHoat'],
  PQ_CoSo: ['Email', 'MaCoSo'],
  CoSo: ['MaCoSo', 'TenCoSo', 'KichHoat'],
  NhanSu: ['MaNV', 'HoTen', 'MaCoSo', 'ChucDanhHR', 'TrangThai', 'VaiTroDB', 'GhiChu'],
  Lop: ['MaLop', 'MaCoSo', 'MaNhom', 'SoThuTu', 'TenLop', 'SiSo', 'GiuCho', 'GhiChu'],
  PhanCong: ['MaLop', 'MaNV'],
  CauHinh_Lop: ['MaNhom', 'LuaTuoi', 'TenLop', 'VietTat', 'TiLe', 'SoGV', 'SoBM', 'TenBoGD'],
  CauHinh_Khung: ['MaKhung', 'Nhan', 'Tu', 'Den'],
  CauHinh_ThamSo: ['Khoa', 'GiaTri', 'MoTa'],
  NhatKy: ['ThoiGian', 'Email', 'HanhDong', 'ChiTiet'],
  LichSu: ['Ky', 'MaCoSo', 'ChotLuc', 'NguoiChot', 'GhiChu', 'DuLieu'],
  PheDuyet: ['MaPD', 'Loai', 'Ky', 'MaCoSo', 'TieuDe', 'GhiChu', 'NguoiGui', 'TenNguoiGui', 'GuiLuc', 'CheDo', 'TrangThai', 'Luong', 'KetThucLuc'],
  PheDuyet_DL: ['MaPD', 'DuLieu'],
  HuongDan: ['Id', 'ThuTu', 'Icon', 'TieuDe', 'DoiTuong', 'Loai', 'NoiDung']
};
const TEXT_COLS = { NhanSu: ['MaNV', 'MaCoSo', 'SoDT'], Lop: ['MaLop', 'MaCoSo', 'SoThuTu'], PhanCong: ['MaLop', 'MaNV'], PQ_CoSo: ['MaCoSo'], CoSo: ['MaCoSo'], LichSu: ['Ky', 'MaCoSo', 'DuLieu'], PheDuyet: ['MaPD', 'Ky', 'MaCoSo'], PheDuyet_DL: ['MaPD', 'DuLieu'], HuongDan: ['Id', 'TieuDe', 'NoiDung'] };
const NOCACHE = {};
NOCACHE[SH.AUDIT] = 1; NOCACHE[SH.HIST] = 1; NOCACHE[SH.PDDL] = 1;

/* ===================== WEB APP ===================== */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Định biên & Phân công – Mầm non Việt Mỹ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Định biên')
    .addItem('1. Khởi tạo hệ thống (chạy lần đầu)', 'setup')
    .addItem('2. Nạp dữ liệu mẫu để chạy thử', 'seedDemo')
    .addItem('3. Bật tự động chốt kỳ hằng tháng', 'installMonthlyTrigger')
    .addItem('4. Đăng xuất mọi phiên (bắt nhập lại mã)', 'revokeAllSessions')
    .addToUi();
}

/* ===================== DB HELPERS ===================== */

function ss_() { return SpreadsheetApp.getActive(); }
function ensureHeaders_(name) {
  const sh = sheet_(name), h = HEADERS[name];
  if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, h.length).setValues([h]); sh.setFrozenRows(1); return; }
  if (String(sh.getRange(1, 1).getValue()) !== h[0]) {   // sửa sheet cũ bị thiếu dòng tiêu đề
    sh.insertRowBefore(1); sh.getRange(1, 1, 1, h.length).setValues([h]); sh.setFrozenRows(1); cacheDrop_(name);
  }
}
function sheet_(n) {
  let sh = ss_().getSheetByName(n);
  if (!sh && HEADERS[n]) { sh = ss_().insertSheet(n); ensureHeaders_(n); }
  if (!sh) throw new Error('Chưa khởi tạo hệ thống: thiếu sheet "' + n + '". Hãy chạy setup() / menu Định biên.');
  return sh;
}
/* Cache theo sheet (CacheService, chia mảnh ≤30k ký tự); xoá khi ghi. Nhật ký không cache. */
const CACHE_TTL = 600, CHUNK = 30000;
function cacheGet_(name) {
  try {
    const c = CacheService.getScriptCache(), n = Number(c.get('m_' + name));
    if (!n) return null;
    const keys = []; for (let i = 0; i < n; i++) keys.push('d_' + name + '_' + i);
    const got = c.getAll(keys); let s = '';
    for (let i = 0; i < n; i++) { if (got[keys[i]] == null) return null; s += got[keys[i]]; }
    return JSON.parse(s);
  } catch (e) { return null; }
}
function cachePut_(name, obj) {
  try {
    const s = JSON.stringify(obj), m = {}; let n = 0;
    for (let i = 0; i < s.length || n === 0; i += CHUNK) m['d_' + name + '_' + (n++)] = s.slice(i, i + CHUNK);
    m['m_' + name] = String(n);
    CacheService.getScriptCache().putAll(m, CACHE_TTL);
  } catch (e) { /* quá lớn / lỗi cache: bỏ qua, vẫn đọc trực tiếp */ }
}
function cacheDrop_(name) { try { CacheService.getScriptCache().remove('m_' + name); } catch (e) {} }

function read_(name) {
  if (!NOCACHE[name]) { const hit = cacheGet_(name); if (hit) return hit; }
  const v = sheet_(name).getDataRange().getValues();
  const h = v.shift();
  const out = [];
  v.forEach((r, idx) => { if (r.some(c => c !== '')) { const o = { _r: idx + 2 }; h.forEach((k, i) => o[k] = r[i]); out.push(o); } });
  if (!NOCACHE[name]) cachePut_(name, out);
  return out;
}
/* Ghi 1 ô theo số dòng (_r) – nhanh hơn ghi lại cả bảng */
function setCell_(name, row, header, value) {
  const sh = sheet_(name), col = HEADERS[name].indexOf(header) + 1;
  sh.getRange(row, col).setValue(value);
  cacheDrop_(name);
}
function writeAll_(name, headers, rows, textCols) {
  const sh = sheet_(name);
  sh.clearContents();
  const data = [headers].concat(rows.map(o => headers.map(h => (o[h] === undefined || o[h] === null) ? '' : o[h])));
  const rng = sh.getRange(1, 1, data.length, headers.length);
  const fmt = headers.map(h => (textCols === 'all' || (textCols || []).indexOf(h) >= 0) ? '@' : 'General');
  rng.setNumberFormats(data.map(() => fmt));
  rng.setValues(data);
  sh.setFrozenRows(1);
  cacheDrop_(name);
}
function textColsOf_(name) { return TEXT_COLS[name] || []; }
function put_(name, rows, headers) { writeAll_(name, headers || HEADERS[name], rows, textColsOf_(name)); }
function num_(v, d) { const n = Number(v); return (v === '' || v === null || v === undefined || isNaN(n)) ? (d === undefined ? 0 : d) : n; }
function str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function uid_(p) { return p + Utilities.getUuid().slice(0, 8); }

function log_(c, action, detail) {
  const sh = sheet_(SH.AUDIT);
  if (sh.getLastRow() === 0) ensureHeaders_(SH.AUDIT);
  sh.appendRow([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss'), c ? c.email : 'system', action, String(detail || '').slice(0, 900)]);
}

/* ===================== SETUP & SEED ===================== */

function setup() {
  const ss = ss_();
  Object.keys(HEADERS).forEach(n => { if (!ss.getSheetByName(n)) ss.insertSheet(n); ensureHeaders_(n); });
  if (!ss.getSheetByName(SH.ROLEPERM)) ss.insertSheet(SH.ROLEPERM);
  if (!ss.getSheetByName(SH.POS)) ss.insertSheet(SH.POS);

  const empty = n => sheet_(n).getLastRow() < 2;
  const adminMail = (Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '').toLowerCase();

  if (empty(SH.ROLEPERM)) saveRoleGrid_(DEFAULT_ROLES); else migrateRolePerm_();
  if (empty(SH.USERS)) {
    put_(SH.USERS, [{ Email: adminMail, HoTen: 'Quản trị hệ thống', VaiTro: ROLE_ADMIN, KichHoat: true }]);
    put_(SH.USERCAMP, [{ Email: adminMail, MaCoSo: '*' }]);
  }
  if (empty(SH.CAMPUS)) put_(SH.CAMPUS, [{ MaCoSo: 'CS01', TenCoSo: 'Cơ sở 1 (đổi tên trong Cấu hình)', KichHoat: true }]);

  if (empty(SH.CT)) put_(SH.CT, [
    { MaNhom: 'PreN', LuaTuoi: '18-24 tháng', TenLop: 'Pre-Nursery', VietTat: 'Pre-N', TiLe: 4, SoGV: 2, SoBM: 1, TenBoGD: 'Nhà trẻ' },
    { MaNhom: 'N', LuaTuoi: '25-36 tháng', TenLop: 'Nursery', VietTat: 'N', TiLe: 5, SoGV: 2, SoBM: 1, TenBoGD: 'Nhà trẻ' },
    { MaNhom: 'PreKA', LuaTuoi: '3-4 tuổi', TenLop: 'Pre-Kindergarten A', VietTat: 'Pre-K.A', TiLe: 6, SoGV: 2, SoBM: 0, TenBoGD: 'Mầm' },
    { MaNhom: 'PreKB', LuaTuoi: '4-5 tuổi', TenLop: 'Pre-Kindergarten B', VietTat: 'Pre-K.B', TiLe: 8, SoGV: 2, SoBM: 0, TenBoGD: 'Chồi' },
    { MaNhom: 'K', LuaTuoi: '5-6 tuổi', TenLop: 'Kindergarten', VietTat: 'K', TiLe: 10, SoGV: 2, SoBM: 0, TenBoGD: 'Lá' }
  ]);
  if (empty(SH.BAND)) put_(SH.BAND, [
    { MaKhung: 'B1', Nhan: 'Dưới 50 học sinh', Tu: 0, Den: 49 },
    { MaKhung: 'B2', Nhan: '50 – 59 học sinh', Tu: 50, Den: 59 },
    { MaKhung: 'B3', Nhan: '60 – 70 học sinh', Tu: 60, Den: 70 },
    { MaKhung: 'B4', Nhan: '71 – 150 học sinh', Tu: 71, Den: 150 },
    { MaKhung: 'B5', Nhan: '151 – 190 học sinh', Tu: 151, Den: 190 },
    { MaKhung: 'B6', Nhan: 'Trên 190 học sinh', Tu: 191, Den: '' }
  ]);
  if (empty(SH.POS)) {
    const P = (v, a) => { const o = { ViTri: v }; a.forEach((x, i) => o['B' + (i + 1)] = String(x)); return o; };
    writeAll_(SH.POS, ['ViTri', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'], [
      P('Hiệu trưởng', [1, 1, 1, 1, 1, 1]),
      P('Hiệu phó', [0, 0, 0, 1, 1, 2]),
      P('Trợ lý kiêm nhiệm', [0, 1, 0, 0, 0, 0]),
      P('Trợ lý', [0, 0, 1, 0, 1, 0]),
      P('Tư vấn tuyển sinh', [1, 1, 1, 1, 1, 2]),
      P('Y tế', [1, 1, 1, 1, 1, 1]),
      P('Giáo viên Tiếng Anh VN', [1, 1, 1, 2, 2, 2]),
      P('Cấp dưỡng', [1, 1, 2, 2, 2, 3]),
      P('Phục vụ', [1, 1, 1, 2, 2, '2-3']),
      P('Bảo vệ', ['1-2', '1-2', 2, 2, 2, 2])
    ], 'all');
  }
  const defParams = PARAM_DEF;
  const haveP = read_(SH.PARAM);
  const addP = defParams.filter(d => !haveP.some(h => h.Khoa === d.Khoa));
  if (addP.length) put_(SH.PARAM, haveP.concat(addP));
  authSecret_();
  if (empty(SH.GUIDE)) put_(SH.GUIDE, GUIDE_DEF);
  log_(null, 'setup', 'Khởi tạo hệ thống');
  SpreadsheetApp.getActive().toast('Đã khởi tạo. Triển khai Web app rồi truy cập bằng đường link.', 'Định biên', 8);
}

/* Bản cập nhật có thêm quyền mới: bổ sung cột, giữ nguyên các tick cũ */
function migrateRolePerm_() {
  const rows = read_(SH.ROLEPERM), head = Object.keys(rows[0] || {});
  if (PERMS.every(p => head.indexOf(p.key) >= 0)) return;
  const grid = {};
  rows.forEach(r => { grid[r.VaiTro] = {}; PERMS.forEach(p => grid[r.VaiTro][p.key] = head.indexOf(p.key) >= 0 ? bool_(r[p.key]) : (DEFAULT_ROLES[r.VaiTro] || []).indexOf(p.key) >= 0); });
  saveRoleGrid_(grid);
}

function saveRoleGrid_(grid) {
  const keys = PERMS.map(p => p.key);
  const rows = Object.keys(grid).map(r => {
    const o = { VaiTro: r };
    keys.forEach(k => o[k] = r === ROLE_ADMIN ? true : (grid[r].indexOf ? grid[r].indexOf(k) >= 0 : grid[r][k] === true));
    return o;
  });
  writeAll_(SH.ROLEPERM, ['VaiTro'].concat(keys), rows, []);
}

function seedDemo() {
  setup();
  put_(SH.CAMPUS, [
    { MaCoSo: 'CS01', TenCoSo: 'Cơ sở Demo A', KichHoat: true },
    { MaCoSo: 'CS02', TenCoSo: 'Cơ sở Demo B', KichHoat: true }
  ]);
  const staff = [], classes = [], assign = [];
  const add = (id, name, cs, title, role) => staff.push({ MaNV: id, HoTen: name, MaCoSo: cs, ChucDanhHR: title, TrangThai: 'Đang làm', VaiTroDB: role || '', GhiChu: '' });
  add('D001', 'Nguyễn Thị Hiền', 'CS01', 'Hiệu trưởng', 'Hiệu trưởng');
  add('D002', 'Trần Thu Hà', 'CS01', 'Giáo viên', 'Giáo viên');
  add('D003', 'Lê Mai Anh', 'CS01', 'Giáo viên', 'Giáo viên');
  add('D004', 'Phạm Bích Ngọc', 'CS01', 'Bảo mẫu', 'Bảo mẫu');
  add('D005', 'Võ Thanh Tâm', 'CS01', 'Giáo viên', 'Giáo viên');
  add('D006', 'Đặng Kim Liên', 'CS01', 'Giáo viên', '');
  add('D007', 'Hồ Văn Bảo', 'CS01', 'Bảo vệ', 'Bảo vệ');
  add('D101', 'Ngô Phương Thảo', 'CS02', 'Hiệu trưởng', 'Hiệu trưởng');
  classes.push({ MaLop: 'L-demo1', MaCoSo: 'CS01', MaNhom: 'PreN', SoThuTu: '1', TenLop: 'Pre-N1', SiSo: 8, GiuCho: 2, GhiChu: '' });
  classes.push({ MaLop: 'L-demo2', MaCoSo: 'CS01', MaNhom: 'K', SoThuTu: '1', TenLop: 'K1', SiSo: 18, GiuCho: 0, GhiChu: '' });
  classes.push({ MaLop: 'L-demo3', MaCoSo: 'CS02', MaNhom: 'PreKA', SoThuTu: '1', TenLop: 'Pre-K.A1', SiSo: 12, GiuCho: 0, GhiChu: '' });
  [['L-demo1', 'D002'], ['L-demo1', 'D003'], ['L-demo1', 'D004'], ['L-demo2', 'D005']].forEach(a => assign.push({ MaLop: a[0], MaNV: a[1] }));
  put_(SH.STAFF, staff); put_(SH.CLASS, classes); put_(SH.ASSIGN, assign);
  log_(null, 'seedDemo', 'Nạp dữ liệu mẫu');
}

/* ===================== AUTH ===================== */

function ctx_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('Không xác định được tài khoản. Hãy đăng nhập bằng tài khoản Google của tổ chức.');
  const u = read_(SH.USERS).find(x => str_(x.Email).toLowerCase() === email && bool_(x.KichHoat));
  if (!u) throw new Error('Tài khoản ' + email + ' chưa được cấp quyền sử dụng. Vui lòng liên hệ Admin.');
  const rp = read_(SH.ROLEPERM).find(r => r.VaiTro === u.VaiTro);
  const perms = u.VaiTro === ROLE_ADMIN ? PERMS.map(p => p.key) : PERMS.filter(p => rp && bool_(rp[p.key])).map(p => p.key);
  const links = read_(SH.USERCAMP).filter(x => str_(x.Email).toLowerCase() === email).map(x => str_(x.MaCoSo));
  const campuses = read_(SH.CAMPUS).filter(x => bool_(x.KichHoat)).map(x => ({ MaCoSo: str_(x.MaCoSo), TenCoSo: x.TenCoSo }));
  const all = u.VaiTro === ROLE_ADMIN || links.indexOf('*') >= 0;
  const mine = all ? campuses : campuses.filter(x => links.indexOf(x.MaCoSo) >= 0);
  return { email, name: u.HoTen, role: u.VaiTro, perms, campuses: mine, allowed: mine.map(x => x.MaCoSo), allCampuses: all };
}
function needCampus_(c, id) { if (c.allowed.indexOf(str_(id)) < 0) throw new Error('Bạn không có quyền với cơ sở ' + id); }

/* ===================== API DISPATCH ===================== */

function api(action, payload, token) {
  try {
    if (AUTH_FREE[action]) return { ok: true, data: authAction_(action, payload || {}, token) };
    if (otpOn_()) {
      const em = (Session.getActiveUser().getEmail() || '').toLowerCase();
      if (!tokenOk_(token, em)) return { ok: false, auth: true, error: 'Cần xác nhận đăng nhập bằng mã gửi qua email.' };
    }
    const a = ACTIONS[action];
    if (!a) throw new Error('Hành động không hợp lệ: ' + action);
    const c = ctx_();
    if (a.perm && c.perms.indexOf(a.perm) < 0) throw new Error('Bạn không có quyền: ' + (PERMS.find(p => p.key === a.perm) || {}).label);
    let res;
    if (a.write) {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try { res = a.fn(c, payload || {}); } finally { lock.releaseLock(); }
    } else res = a.fn(c, payload || {});
    return { ok: true, data: res };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/* ===================== XÁC NHẬN ĐĂNG NHẬP BẰNG MÃ (OTP QUA EMAIL) ===================== */
/* Sau khi Google xác định tài khoản, người dùng phải nhập mã 6 số gửi tới email của chính họ.
   Thành công → cấp token ký HMAC (không lưu máy chủ) có hạn PhienGio giờ, gắn với đúng email đó. */

const AUTH_FREE = { authStatus: 1, authSend: 1, authVerify: 1 };
const OTP_TTL = 300, OTP_MAX_TRY = 5, OTP_LOCK = 900, OTP_COOLDOWN = 60;

function param_(k, d) { const r = read_(SH.PARAM).find(x => x.Khoa === k); return r ? str_(r.GiaTri) : d; }
function otpOn_() { return param_('XacThucOTP', '1') !== '0'; }
function sessionHours_() { return Math.max(1, Math.min(72, num_(param_('PhienGio', '8'), 8))); }

function authSecret_() {
  const pr = PropertiesService.getScriptProperties();
  let k = pr.getProperty('AUTH_SECRET');
  if (!k) {
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { k = pr.getProperty('AUTH_SECRET'); if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty('AUTH_SECRET', k); } } finally { lock.releaseLock(); }
  }
  return k;
}
/* Đăng xuất toàn bộ phiên hiện có (đổi khoá ký) – chạy từ menu Định biên */
function revokeAllSessions() {
  PropertiesService.getScriptProperties().setProperty('AUTH_SECRET', Utilities.getUuid() + Utilities.getUuid());
  log_(null, 'revokeSessions', 'Đăng xuất mọi phiên');
  SpreadsheetApp.getActive().toast('Đã đăng xuất mọi người dùng. Mọi người sẽ phải nhập lại mã xác nhận.', 'Định biên', 8);
}
function sign_(payload) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, authSecret_())); }
function makeToken_(email, expSec) {
  const payload = email + '|' + expSec;
  return Utilities.base64EncodeWebSafe(payload) + '.' + sign_(payload);
}
function tokenOk_(token, email) {
  try {
    if (!token || !email) return false;
    const parts = String(token).split('.');
    if (parts.length !== 2) return false;
    const payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
    if (sign_(payload) !== parts[1]) return false;
    const at = payload.lastIndexOf('|');
    return payload.slice(0, at) === email && Number(payload.slice(at + 1)) > Date.now() / 1000;
  } catch (e) { return false; }
}
function otpHash_(code, email) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, code + '|' + email + '|' + authSecret_()));
}
function maskEmail_(e) { const p = e.split('@'); return p[0].slice(0, 2) + '***@' + (p[1] || ''); }

function authAction_(action, p, token) {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('Không xác định được tài khoản Google. Hãy đăng nhập bằng tài khoản của tổ chức.');
  const cache = CacheService.getScriptCache(), kOtp = 'otp_' + email, kLock = 'otplock_' + email, kCd = 'otpcd_' + email;
  const on = otpOn_();
  if (action === 'authStatus') return { required: on, valid: !on || tokenOk_(token, email), masked: maskEmail_(email), hours: sessionHours_() };
  if (!on) throw new Error('Hệ thống không bật xác nhận bằng mã.');
  const u = read_(SH.USERS).find(x => str_(x.Email).toLowerCase() === email && bool_(x.KichHoat));
  if (!u) throw new Error('Tài khoản ' + email + ' chưa được cấp quyền sử dụng. Vui lòng liên hệ Admin.');
  if (cache.get(kLock)) throw new Error('Tài khoản tạm khoá 15 phút do nhập sai mã nhiều lần.');

  if (action === 'authSend') {
    if (cache.get(kCd)) throw new Error('Vui lòng chờ ' + OTP_COOLDOWN + ' giây giữa các lần gửi mã.');
    const code = ('000000' + (parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 1000000)).slice(-6);
    try {
      sendMail_({ to: email, subject: 'Mã xác nhận đăng nhập: ' + code,
        htmlBody: '<p>Xin chào ' + u.HoTen + ',</p><p>Mã xác nhận đăng nhập hệ thống Định biên & Phân công của bạn là:</p><p style="font-size:28px;letter-spacing:6px"><b>' + code + '</b></p><p>Mã có hiệu lực ' + (OTP_TTL / 60) + ' phút. Tuyệt đối không chia sẻ mã này. Nếu không phải bạn đang đăng nhập, hãy bỏ qua email này và báo Admin.</p>' });
    } catch (e) { throw new Error('Không gửi được email mã xác nhận: ' + e.message); }
    cache.put(kOtp, JSON.stringify({ h: otpHash_(code, email), e: Date.now() + OTP_TTL * 1000, t: 0 }), OTP_TTL);
    cache.put(kCd, '1', OTP_COOLDOWN);
    log_({ email }, 'otpSend', 'Gửi mã xác nhận');
    return { sent: true, masked: maskEmail_(email), cooldown: OTP_COOLDOWN, minutes: OTP_TTL / 60 };
  }
  if (action === 'authVerify') {
    const raw = cache.get(kOtp);
    if (!raw) throw new Error('Mã đã hết hạn hoặc chưa được gửi. Hãy bấm "Gửi mã".');
    const o = JSON.parse(raw), code = str_(p.code).replace(/\D/g, '');
    if (otpHash_(code, email) !== o.h) {
      o.t = (o.t || 0) + 1;
      if (o.t >= OTP_MAX_TRY) { cache.remove(kOtp); cache.put(kLock, '1', OTP_LOCK); log_({ email }, 'otpFail', 'Sai mã ' + OTP_MAX_TRY + ' lần – khoá 15 phút'); throw new Error('Nhập sai quá ' + OTP_MAX_TRY + ' lần. Tài khoản tạm khoá 15 phút.'); }
      cache.put(kOtp, JSON.stringify(o), Math.max(1, Math.ceil((o.e - Date.now()) / 1000)));
      throw new Error('Mã không đúng. Còn ' + (OTP_MAX_TRY - o.t) + ' lần thử.');
    }
    cache.remove(kOtp);
    const hours = sessionHours_(), exp = Math.floor(Date.now() / 1000) + hours * 3600;
    log_({ email }, 'login', 'Đăng nhập bằng mã xác nhận (phiên ' + hours + ' giờ)');
    return { token: makeToken_(email, exp), exp, hours };
  }
  throw new Error('Hành động không hợp lệ');
}

const ACTIONS = {
  bootstrap: { fn: bootstrap_ },
  loadAll: { fn: loadAll_ },
  report: { perm: 'dash.view', fn: reportGet_ },
  staffList: { perm: 'staff.view', fn: staffList_ },
  staffSave: { perm: 'staff.import', write: true, fn: staffSave_ },
  staffImport: { perm: 'staff.import', write: true, fn: staffImport_ },
  staffDelete: { perm: 'staff.import', write: true, fn: staffDelete_ },
  staffAssign: { perm: 'staff.assign', write: true, fn: staffAssign_ },
  classList: { perm: 'class.view', fn: classList_ },
  classSave: { perm: 'class.edit', write: true, fn: classSave_ },
  classDelete: { perm: 'class.edit', write: true, fn: classDelete_ },
  configSave: { perm: 'config.edit', write: true, fn: configSave_ },
  permGet: { perm: 'admin.perm', fn: permGet_ },
  permSave: { perm: 'admin.perm', write: true, fn: permSave_ },
  auditList: { perm: 'audit.view', fn: auditList_ },
  historyList: { perm: 'history.view', fn: historyList_ },
  historyGet: { perm: 'history.view', fn: historyGet_ },
  historySnapshot: { perm: 'history.snapshot', write: true, fn: historySnapshot_ },
  classPreview: { perm: 'class.edit', fn: classPreview_ },
  mailTest: { perm: 'admin.perm', fn: mailTest_ },
  guideSave: { perm: 'admin.perm', write: true, fn: guideSave_ },
  guideReset: { perm: 'admin.perm', write: true, fn: guideReset_ },
  approvalList: { fn: (c) => pdList_(c) },
  approvalCandidates: { perm: 'approval.submit', fn: approverCandidates_ },
  approvalSubmit: { perm: 'approval.submit', write: true, fn: approvalSubmit_ },
  approvalGet: { fn: approvalGet_ },
  approvalAct: { perm: 'approval.approve', write: true, fn: approvalAct_ },
  approvalWithdraw: { perm: 'approval.submit', write: true, fn: approvalWithdraw_ }
};

/* ===================== CONFIG ===================== */

function loadCfg_() {
  const params = {};
  read_(SH.PARAM).forEach(r => params[r.Khoa] = str_(r.GiaTri));
  const bands = read_(SH.BAND).map(r => ({ MaKhung: str_(r.MaKhung), Nhan: r.Nhan, Tu: num_(r.Tu), Den: r.Den === '' ? null : num_(r.Den) }));
  return {
    params, bands,
    classTypes: read_(SH.CT).map(r => ({ MaNhom: str_(r.MaNhom), LuaTuoi: r.LuaTuoi, TenLop: r.TenLop, VietTat: str_(r.VietTat), TiLe: num_(r.TiLe), SoGV: num_(r.SoGV), SoBM: num_(r.SoBM), TenBoGD: r.TenBoGD })),
    positions: read_(SH.POS).map(r => { const o = { ViTri: str_(r.ViTri) }; bands.forEach(b => o[b.MaKhung] = str_(r[b.MaKhung])); return o; })
  };
}
function positionNames_(cfg) { return cfg.positions.map(p => p.ViTri); }

function bootstrap_(c) {
  const cfg = loadCfg_();
  return {
    me: { email: c.email, name: c.name, role: c.role, perms: c.perms },
    campuses: c.campuses,
    allCampuses: read_(SH.CAMPUS).map(x => ({ MaCoSo: str_(x.MaCoSo), TenCoSo: x.TenCoSo, KichHoat: bool_(x.KichHoat) })),
    appUrl: (function () { try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; } })(),
    cfg, classRoles: CLASS_ROLES, roleOptions: CLASS_ROLES.concat(positionNames_(cfg)), perms: PERMS
  };
}

/* Một lần gọi trả về mọi dữ liệu cần cho các tab (client lưu cache, chuyển tab không gọi server). */
function loadAll_(c) {
  const has = k => c.perms.indexOf(k) >= 0;
  return {
    boot: bootstrap_(c),
    report: has('dash.view') ? reportGet_(c, {}) : null,
    staff: has('staff.view') ? staffList_(c, {}) : [],
    classes: has('class.view') ? classList_(c, {}) : [],
    guide: guideList_(),
    approvals: (has('approval.submit') || has('approval.approve') || has('approval.viewall')) ? pdList_(c) : []
  };
}

function configSave_(c, p) {
  if (p.classTypes) {
    p.classTypes.forEach(t => { if (!str_(t.MaNhom) || !str_(t.VietTat)) throw new Error('Nhóm tuổi cần có Mã và Tên viết tắt.'); });
    put_(SH.CT, p.classTypes.map(t => ({ MaNhom: str_(t.MaNhom), LuaTuoi: str_(t.LuaTuoi), TenLop: str_(t.TenLop), VietTat: str_(t.VietTat), TiLe: num_(t.TiLe), SoGV: num_(t.SoGV), SoBM: num_(t.SoBM), TenBoGD: str_(t.TenBoGD) })));
  }
  if (p.bands) {
    p.bands.forEach((b, i) => { if (!str_(b.MaKhung)) throw new Error('Khung sĩ số #' + (i + 1) + ' thiếu mã.'); });
    put_(SH.BAND, p.bands.map(b => ({ MaKhung: str_(b.MaKhung), Nhan: str_(b.Nhan), Tu: num_(b.Tu), Den: (b.Den === '' || b.Den === null || b.Den === undefined) ? '' : num_(b.Den) })));
  }
  if (p.positions) {
    const bands = p.bands ? p.bands : read_(SH.BAND);
    writeAll_(SH.POS, ['ViTri'].concat(bands.map(b => str_(b.MaKhung))), p.positions.filter(x => str_(x.ViTri)), 'all');
  }
  if (p.params) {
    const cur = {}; read_(SH.PARAM).forEach(r => cur[r.Khoa] = str_(r.GiaTri));
    const inc = {}; p.params.forEach(x => inc[x.Khoa] = str_(x.GiaTri));
    const isAdmin = c.perms.indexOf('admin.perm') >= 0;
    const out = PARAM_DEF.map(d => {
      let v = inc[d.Khoa];
      if (v === undefined || (PARAM_SECURE.indexOf(d.Khoa) >= 0 && !isAdmin)) v = cur[d.Khoa] !== undefined ? cur[d.Khoa] : d.GiaTri;
      if ((d.Khoa === 'XacThucOTP' || d.Khoa === 'KhongTraLoi') && v !== '0' && v !== '1') throw new Error('Giá trị ' + d.Khoa + ' chỉ nhận 0 hoặc 1');
      if (d.Khoa === 'PhienGio') v = String(Math.min(72, Math.max(1, num_(v, 8))));
      if (d.Khoa === 'TenGui') v = (v || '').slice(0, 60) || SYS_NAME;
      if (d.Khoa === 'ChuKy') v = (v || '').split(';').map(x => x.trim()).filter(Boolean).slice(0, 6).join(';') || d.GiaTri;
      return { Khoa: d.Khoa, GiaTri: v, MoTa: d.MoTa };
    });
    put_(SH.PARAM, out);
  }
  if (p.campuses) {
    const seen = {};
    p.campuses.forEach(x => { const id = str_(x.MaCoSo); if (!id) throw new Error('Cơ sở thiếu mã.'); if (seen[id]) throw new Error('Trùng mã cơ sở ' + id); seen[id] = 1; });
    put_(SH.CAMPUS, p.campuses.map(x => ({ MaCoSo: str_(x.MaCoSo), TenCoSo: str_(x.TenCoSo), KichHoat: x.KichHoat !== false })));
  }
  log_(c, 'configSave', Object.keys(p).join(','));
  return bootstrap_(ctx_());
}

/* ===================== STAFF ===================== */

function suggestRole_(title) {
  const t = str_(title).toLowerCase();
  const map = [['hiệu phó', 'Hiệu phó'], ['hiệu trưởng', 'Hiệu trưởng'], ['trợ lý kiêm nhiệm', 'Trợ lý kiêm nhiệm'], ['trợ lý', 'Trợ lý'], ['tư vấn', 'Tư vấn tuyển sinh'],
    ['y tế', 'Y tế'], ['tiếng anh', 'Giáo viên Tiếng Anh VN'], ['cấp dưỡng', 'Cấp dưỡng'], ['bếp', 'Cấp dưỡng'], ['phục vụ', 'Phục vụ'], ['tạp vụ', 'Phục vụ'],
    ['bảo vệ', 'Bảo vệ'], ['bảo mẫu', 'Bảo mẫu'], ['giáo viên', 'Giáo viên']];
  const m = map.find(x => t.indexOf(x[0]) >= 0);
  return m ? m[1] : '';
}

function staffList_(c, p) {
  const asg = {};
  read_(SH.ASSIGN).forEach(a => (asg[str_(a.MaNV)] = asg[str_(a.MaNV)] || []).push(str_(a.MaLop)));
  let rows = read_(SH.STAFF).filter(s => c.allowed.indexOf(str_(s.MaCoSo)) >= 0);
  if (p.campus) rows = rows.filter(s => str_(s.MaCoSo) === p.campus);
  return rows.map(s => ({ MaNV: str_(s.MaNV), HoTen: s.HoTen, MaCoSo: str_(s.MaCoSo), ChucDanhHR: s.ChucDanhHR, TrangThai: s.TrangThai || 'Đang làm', VaiTroDB: s.VaiTroDB, GhiChu: s.GhiChu, lop: asg[str_(s.MaNV)] || [] }));
}

function upsertStaff_(c, all, r, allowSuggest) {
  const id = str_(r.MaNV);
  if (!id) throw new Error('Thiếu mã nhân viên');
  if (!str_(r.HoTen)) throw new Error('Thiếu họ tên');
  needCampus_(c, r.MaCoSo);
  const i = all.findIndex(s => str_(s.MaNV) === id);
  if (i >= 0) {
    needCampus_(c, all[i].MaCoSo);
    const old = all[i];
    all[i] = Object.assign({}, old, { HoTen: str_(r.HoTen), MaCoSo: str_(r.MaCoSo), ChucDanhHR: str_(r.ChucDanhHR), TrangThai: str_(r.TrangThai) || 'Đang làm', GhiChu: r.GhiChu === undefined ? old.GhiChu : str_(r.GhiChu) });
    return { moved: str_(old.MaCoSo) !== str_(r.MaCoSo), id, isNew: false };
  }
  all.push({ MaNV: id, HoTen: str_(r.HoTen), MaCoSo: str_(r.MaCoSo), ChucDanhHR: str_(r.ChucDanhHR), TrangThai: str_(r.TrangThai) || 'Đang làm', VaiTroDB: allowSuggest ? suggestRole_(r.ChucDanhHR) : '', GhiChu: str_(r.GhiChu) });
  return { moved: false, id, isNew: true };
}
function dropAssign_(ids) {
  const set = {}; ids.forEach(x => set[x] = 1);
  put_(SH.ASSIGN, read_(SH.ASSIGN).filter(a => !set[str_(a.MaNV)]));
}

function staffSave_(c, p) {
  const all = read_(SH.STAFF);
  const r = upsertStaff_(c, all, p.row, false);
  put_(SH.STAFF, all);
  if (r.moved) dropAssign_([r.id]);
  log_(c, 'staffSave', r.id);
  return true;
}

function staffImport_(c, p) {
  const all = read_(SH.STAFF), camps = read_(SH.CAMPUS);
  const errors = []; let added = 0, updated = 0; const moved = [];
  (p.rows || []).forEach((r, i) => {
    try {
      const key = str_(r.CoSo || r.MaCoSo).toLowerCase();
      const cp = camps.find(x => str_(x.MaCoSo).toLowerCase() === key || str_(x.TenCoSo).toLowerCase() === key);
      if (!cp) throw new Error('Không tìm thấy cơ sở "' + (r.CoSo || r.MaCoSo) + '"');
      const res = upsertStaff_(c, all, Object.assign({}, r, { MaCoSo: str_(cp.MaCoSo) }), true);
      res.isNew ? added++ : updated++;
      if (res.moved) moved.push(res.id);
    } catch (e) { errors.push('Dòng ' + (i + 1) + ' (' + str_(r.MaNV) + '): ' + e.message); }
  });
  put_(SH.STAFF, all);
  if (moved.length) dropAssign_(moved);
  log_(c, 'staffImport', 'thêm ' + added + ', cập nhật ' + updated + ', lỗi ' + errors.length);
  return { added, updated, errors };
}

function staffDelete_(c, p) {
  const all = read_(SH.STAFF), s = all.find(x => str_(x.MaNV) === str_(p.maNV));
  if (!s) throw new Error('Không tìm thấy nhân viên');
  needCampus_(c, s.MaCoSo);
  put_(SH.STAFF, all.filter(x => str_(x.MaNV) !== str_(p.maNV)));
  dropAssign_([str_(p.maNV)]);
  log_(c, 'staffDelete', p.maNV);
  return true;
}

function staffAssign_(c, p) {
  const all = read_(SH.STAFF), s = all.find(x => str_(x.MaNV) === str_(p.maNV));
  if (!s) throw new Error('Không tìm thấy nhân viên');
  needCampus_(c, s.MaCoSo);
  const cfg = loadCfg_(), valid = CLASS_ROLES.concat(positionNames_(cfg));
  const role = str_(p.vaiTro);
  if (role && valid.indexOf(role) < 0) throw new Error('Vai trò không hợp lệ: ' + role);
  let lop = Array.isArray(p.lop) ? p.lop.map(str_) : null;
  if (CLASS_ROLES.indexOf(role) < 0) lop = [];
  if (lop !== null) {
    const classes = read_(SH.CLASS);
    lop.forEach(id => { const cl = classes.find(x => str_(x.MaLop) === id); if (!cl || str_(cl.MaCoSo) !== str_(s.MaCoSo)) throw new Error('Lớp ' + id + ' không thuộc cơ sở của nhân viên'); });
    const asg = read_(SH.ASSIGN), keep = asg.filter(a => str_(a.MaNV) !== str_(p.maNV));
    if (lop.length || keep.length !== asg.length) {
      lop.forEach(id => keep.push({ MaLop: id, MaNV: str_(p.maNV) }));
      put_(SH.ASSIGN, keep);
    }
  }
  if (str_(s.VaiTroDB) !== role) setCell_(SH.STAFF, s._r, 'VaiTroDB', role);
  log_(c, 'staffAssign', p.maNV + ' → ' + role + (lop ? ' [' + lop.join(',') + ']' : ''));
  return true;
}

/* ===================== CLASSES ===================== */

function classList_(c, p) {
  const cfg = loadCfg_(), staff = {};
  read_(SH.STAFF).forEach(s => staff[str_(s.MaNV)] = s);
  const asg = {};
  read_(SH.ASSIGN).forEach(a => { const s = staff[str_(a.MaNV)]; if (s && s.TrangThai !== STATUS_OFF) (asg[str_(a.MaLop)] = asg[str_(a.MaLop)] || []).push({ MaNV: str_(s.MaNV), HoTen: s.HoTen, VaiTro: s.VaiTroDB }); });
  return read_(SH.CLASS).filter(l => c.allowed.indexOf(str_(l.MaCoSo)) >= 0 && (!p.campus || str_(l.MaCoSo) === p.campus)).map(l => ({
    MaLop: str_(l.MaLop), MaCoSo: str_(l.MaCoSo), MaNhom: str_(l.MaNhom), SoThuTu: str_(l.SoThuTu), TenLop: l.TenLop, SiSo: num_(l.SiSo), GiuCho: num_(l.GiuCho), GhiChu: l.GhiChu,
    members: asg[str_(l.MaLop)] || []
  }));
}

function classSave_(c, p) {
  const r = p.row; needCampus_(c, r.MaCoSo);
  const cfg = loadCfg_(), ct = cfg.classTypes.find(t => t.MaNhom === str_(r.MaNhom));
  if (!ct) throw new Error('Nhóm tuổi không hợp lệ');
  const stt = str_(r.SoThuTu) || '1', name = ct.VietTat + stt;
  const si = num_(r.SiSo), gc = num_(r.GiuCho);
  if (si < 0 || gc < 0) throw new Error('Sĩ số không hợp lệ');
  const all = read_(SH.CLASS), id = str_(r.MaLop) || uid_('L');
  if (all.some(l => str_(l.MaLop) !== id && str_(l.MaCoSo) === str_(r.MaCoSo) && l.TenLop === name)) throw new Error('Cơ sở đã có lớp ' + name);
  const row = { MaLop: id, MaCoSo: str_(r.MaCoSo), MaNhom: ct.MaNhom, SoThuTu: stt, TenLop: name, SiSo: si, GiuCho: gc, GhiChu: str_(r.GhiChu) };
  const i = all.findIndex(l => str_(l.MaLop) === id);
  const was = i >= 0 ? num_(all[i].SiSo) + '+' + num_(all[i].GiuCho) + ' → ' : '';
  if (i >= 0) { needCampus_(c, all[i].MaCoSo); if (str_(all[i].MaCoSo) !== row.MaCoSo) throw new Error('Không đổi cơ sở của lớp đã tạo'); all[i] = row; } else all.push(row);
  put_(SH.CLASS, all);
  log_(c, 'classSave', name + ' @' + row.MaCoSo + ' sĩ số+giữ chỗ: ' + was + si + '+' + gc);
  return true;
}

function classDelete_(c, p) {
  const all = read_(SH.CLASS), l = all.find(x => str_(x.MaLop) === str_(p.maLop));
  if (!l) throw new Error('Không tìm thấy lớp');
  needCampus_(c, l.MaCoSo);
  put_(SH.CLASS, all.filter(x => str_(x.MaLop) !== str_(p.maLop)));
  put_(SH.ASSIGN, read_(SH.ASSIGN).filter(a => str_(a.MaLop) !== str_(p.maLop)));
  log_(c, 'classDelete', l.TenLop + ' @' + l.MaCoSo);
  return true;
}

/* ===================== ĐÁNH GIÁ ĐỊNH BIÊN (logic lõi) ===================== */

function parseRange_(v) {
  const s = str_(v).replace(/[–—]/g, '-');
  if (!s) return { min: 0, max: 0 };
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return { min: +m[1], max: +m[2] };
  const n = Number(s);
  return isNaN(n) ? { min: 0, max: 0 } : { min: n, max: n };
}
function bandFor_(cfg, n) {
  return cfg.bands.find(b => n >= b.Tu && (b.Den === null || n <= b.Den)) || null;
}
function statusOf_(actual, r) { return actual < r.min ? 'thieu' : actual > r.max ? 'thua' : 'ok'; }
const SEVERITY = { ok: 0, trong: 0, thua: 1, vuot: 2, thieu: 3 };
function worst_(list) { return list.reduce((w, s) => SEVERITY[s] > SEVERITY[w] ? s : w, 'ok'); }

function evalCampus_(campus, staffAll, classesAll, assignsAll, cfg) {
  const extra = num_(cfg.params.ChenhLech, 2);
  const byId = {};
  staffAll.forEach(s => byId[str_(s.MaNV)] = s);
  const isActive = s => s && str_(s.MaCoSo) === campus.MaCoSo && (s.TrangThai || 'Đang làm') !== STATUS_OFF;
  const active = staffAll.filter(isActive);
  const asgByClass = {}, asgByStaff = {};
  assignsAll.forEach(a => { (asgByClass[str_(a.MaLop)] = asgByClass[str_(a.MaLop)] || []).push(str_(a.MaNV)); (asgByStaff[str_(a.MaNV)] = asgByStaff[str_(a.MaNV)] || []).push(str_(a.MaLop)); });

  const classes = classesAll.filter(l => str_(l.MaCoSo) === campus.MaCoSo).map(l => {
    const ct = cfg.classTypes.find(t => t.MaNhom === str_(l.MaNhom)) || { TiLe: 0, SoGV: 0, SoBM: 0, VietTat: str_(l.MaNhom), LuaTuoi: '' };
    const members = (asgByClass[str_(l.MaLop)] || []).map(id => byId[id]).filter(isActive);
    const gv = members.filter(s => s.VaiTroDB === 'Giáo viên').length, bm = members.filter(s => s.VaiTroDB === 'Bảo mẫu').length;
    const students = num_(l.SiSo) + num_(l.GiuCho), adults = gv + bm, stdAdults = ct.SoGV + ct.SoBM;
    /* Mục 4 đề án: chỉ đề xuất/tính THIẾU GV-bảo mẫu khi lớp đạt tỉ lệ định biên + N học sinh
       (N = tham số ChenhLech, mặc định 2): sĩ số ≥ tỉ lệ × số người đang phụ trách + N.
       Số người cần = ceil((sĩ số − N + 1) / tỉ lệ). Chưa đủ điều kiện thì không tính là thiếu. */
    const r = ct.TiLe, issues = [], notes = [];
    let status = 'ok', need = adults, short = { gv: 0, bm: 0, total: 0 }, eligible = false;
    if (students === 0) status = 'trong';
    else if (r > 0) {
      const demand = Math.ceil((students - extra + 1) / r);   // số người cần theo tỉ lệ
      need = Math.max(adults, demand);
      eligible = students >= r * adults + extra;
      if (eligible) {
        const t = demand - adults;
        const g = Math.min(t, Math.max(0, ct.SoGV - gv)), b = Math.min(t - g, Math.max(0, ct.SoBM - bm));
        short = { gv: g + (t - g - b), bm: b, total: t };
        issues.push('Thiếu ' + [short.gv ? short.gv + ' giáo viên' : '', short.bm ? short.bm + ' bảo mẫu' : ''].filter(Boolean).join(' + ') + ' – đủ điều kiện bổ sung (sĩ số ' + students + ' ≥ ' + r + ' × ' + adults + ' + ' + extra + ')');
        status = 'thieu';
      } else if (adults > 0 && students > r * adults) {
        issues.push('Vượt tỉ lệ ' + r + ':1 (hiện ' + (students / adults).toFixed(1) + ':1) nhưng chưa đủ điều kiện bổ sung (cần ≥ ' + (r * adults + extra) + ' học sinh)');
        status = 'vuot';
      }
      const keep = Math.max(stdAdults, demand);
      if (status !== 'thieu' && adults > keep) { issues.push('Thừa ' + (adults - keep) + ' người so với định biên của lớp'); if (status === 'ok') status = 'thua'; }
      if (status === 'ok' || status === 'vuot') {
        if (gv < ct.SoGV || bm < ct.SoBM) notes.push('Thấp hơn cơ cấu chuẩn (' + gv + '/' + ct.SoGV + ' GV' + (ct.SoBM ? ', ' + bm + '/' + ct.SoBM + ' bảo mẫu' : '') + ') nhưng tỉ lệ vẫn đảm bảo nên không tính là thiếu');
      }
    }
    const cap = r * stdAdults;
    return {
      MaLop: str_(l.MaLop), TenLop: l.TenLop, MaNhom: ct.MaNhom, LuaTuoi: ct.LuaTuoi, TenBoGD: ct.TenBoGD, siSo: num_(l.SiSo), giuCho: num_(l.GiuCho), students,
      gv, bm, stdGV: ct.SoGV, stdBM: ct.SoBM, tiLe: r, capacity: cap, ratioActual: adults ? +(students / adults).toFixed(1) : null,
      need, short, eligible, canPropose: eligible, status, issues, notes,
      members: members.map(s => ({ HoTen: s.HoTen, VaiTro: s.VaiTroDB }))
    };
  });

  const total = classes.reduce((a, l) => a + l.students, 0);
  const band = bandFor_(cfg, total);
  const positions = cfg.positions.map(p => {
    const r = band ? parseRange_(p[band.MaKhung]) : { min: 0, max: 0 };
    const actual = active.filter(s => s.VaiTroDB === p.ViTri).length;
    return { viTri: p.ViTri, min: r.min, max: r.max, actual, status: statusOf_(actual, r), kind: 'campus' };
  });
  const open = classes.filter(l => l.students > 0);
  CLASS_ROLES.forEach(role => {
    /* Dòng tổng hợp theo lớp: chỉ chênh lệch khi có lớp đủ điều kiện bổ sung (Σ số thiếu của các lớp đó) */
    const lack = open.reduce((a, l) => a + (role === 'Giáo viên' ? l.short.gv : l.short.bm), 0);
    const actual = active.filter(s => s.VaiTroDB === role).length;
    positions.push({ viTri: role + ' (theo lớp)', role, min: actual + lack, max: actual + lack, actual, status: lack ? 'thieu' : 'ok', kind: 'class' });
  });

  const warnings = [];
  const noRole = active.filter(s => !s.VaiTroDB);
  if (noRole.length) warnings.push(noRole.length + ' nhân sự chưa được phân vai trò định biên: ' + noRole.slice(0, 5).map(s => s.HoTen).join(', ') + (noRole.length > 5 ? '…' : ''));
  const noClass = active.filter(s => CLASS_ROLES.indexOf(s.VaiTroDB) >= 0 && !(asgByStaff[str_(s.MaNV)] || []).filter(id => classesAll.some(l => str_(l.MaLop) === id)).length);
  if (noClass.length) warnings.push(noClass.length + ' giáo viên/bảo mẫu chưa được phân lớp: ' + noClass.slice(0, 5).map(s => s.HoTen).join(', ') + (noClass.length > 5 ? '…' : ''));
  const multi = active.filter(s => CLASS_ROLES.indexOf(s.VaiTroDB) >= 0 && (asgByStaff[str_(s.MaNV)] || []).length > 1);
  if (multi.length) warnings.push(multi.length + ' nhân sự được phân vào hơn 1 lớp: ' + multi.slice(0, 5).map(s => s.HoTen).join(', '));
  if (!band) warnings.push('Tổng sĩ số ' + total + ' không nằm trong khung định biên nào – kiểm tra Cấu hình.');

  const status = worst_(positions.map(p => p.status).concat(classes.map(l => l.status)));
  return { MaCoSo: campus.MaCoSo, TenCoSo: campus.TenCoSo, total, band: band ? { MaKhung: band.MaKhung, Nhan: band.Nhan } : null, staffActive: active.length, positions, classes, warnings, status, canPropose: classes.some(l => l.canPropose) };
}

function summarize_(list) {
  const sum = { campuses: list.length, ok: 0, thieu: 0, thua: 0, vuot: 0, short: 0, surplus: 0, byPosition: {} };
  list.forEach(cp => {
    if (cp.status === 'ok' || cp.status === 'trong') sum.ok++; else sum[cp.status]++;
    cp.positions.forEach(p => {
      const b = sum.byPosition[p.viTri] = sum.byPosition[p.viTri] || { short: 0, surplus: 0 };
      if (p.actual < p.min) { b.short += p.min - p.actual; sum.short += p.min - p.actual; }
      if (p.actual > p.max) { b.surplus += p.actual - p.max; sum.surplus += p.actual - p.max; }
    });
  });
  return sum;
}

function reportGet_(c, p) {
  const cfg = loadCfg_(), staff = read_(SH.STAFF), classes = read_(SH.CLASS), asg = read_(SH.ASSIGN);
  const list = c.campuses.filter(x => !p.campus || x.MaCoSo === p.campus).map(x => evalCampus_(x, staff, classes, asg, cfg));
  return { namHoc: cfg.params.NamHoc, campuses: list, summary: summarize_(list), positionOrder: list.length ? list[0].positions.map(x => x.viTri) : [] };
}

/* ===================== PHÂN QUYỀN ===================== */

function permGet_() {
  const roles = read_(SH.ROLEPERM), grid = {};
  roles.forEach(r => { grid[r.VaiTro] = {}; PERMS.forEach(p => grid[r.VaiTro][p.key] = bool_(r[p.key])); });
  const links = read_(SH.USERCAMP);
  const users = read_(SH.USERS).map(u => ({ Email: str_(u.Email), HoTen: u.HoTen, VaiTro: u.VaiTro, KichHoat: bool_(u.KichHoat), campuses: links.filter(l => str_(l.Email).toLowerCase() === str_(u.Email).toLowerCase()).map(l => str_(l.MaCoSo)) }));
  return { perms: PERMS, roles: Object.keys(grid), roleGrid: grid, users, campuses: read_(SH.CAMPUS).filter(x => bool_(x.KichHoat)).map(x => ({ MaCoSo: str_(x.MaCoSo), TenCoSo: x.TenCoSo })) };
}

function permSave_(c, p) {
  const grid = p.roleGrid || {};
  grid[ROLE_ADMIN] = PERMS.map(x => x.key);
  Object.keys(grid).forEach(r => { if (!str_(r)) throw new Error('Tên vai trò không được trống'); });
  const users = (p.users || []).map(u => ({ Email: str_(u.Email).toLowerCase(), HoTen: str_(u.HoTen), VaiTro: str_(u.VaiTro), KichHoat: u.KichHoat !== false, campuses: u.campuses || [] }));
  const seen = {};
  users.forEach(u => {
    if (!u.Email) throw new Error('Có người dùng chưa nhập email');
    if (seen[u.Email]) throw new Error('Trùng email ' + u.Email); seen[u.Email] = 1;
    if (!grid[u.VaiTro]) throw new Error('Vai trò "' + u.VaiTro + '" của ' + u.Email + ' không tồn tại');
  });
  if (!users.some(u => u.VaiTro === ROLE_ADMIN && u.KichHoat)) throw new Error('Phải còn ít nhất một Admin đang kích hoạt.');
  const me = users.find(u => u.Email === c.email);
  if (!me || !me.KichHoat) throw new Error('Không thể tự khoá tài khoản của chính bạn.');
  saveRoleGrid_(grid);
  put_(SH.USERS, users);
  const links = [];
  users.forEach(u => { if (u.VaiTro === ROLE_ADMIN) links.push({ Email: u.Email, MaCoSo: '*' }); else u.campuses.forEach(m => links.push({ Email: u.Email, MaCoSo: str_(m) })); });
  put_(SH.USERCAMP, links);
  log_(c, 'permSave', users.length + ' người dùng, ' + Object.keys(grid).length + ' vai trò');
  return permGet_();
}

function auditList_() {
  ensureHeaders_(SH.AUDIT);
  return read_(SH.AUDIT).slice(-300).reverse().map(r => ({ ThoiGian: str_(r.ThoiGian), Email: r.Email, HanhDong: r.HanhDong, ChiTiet: r.ChiTiet }));
}

/* ===================== LỊCH SỬ PHÂN CÔNG (chốt kỳ) ===================== */
/* Mỗi kỳ (YYYY-MM) × cơ sở lưu một ảnh chụp: nhân sự – vai trò – lớp – sĩ số – kết luận định biên. */

function snapOf_(campus, staffAll, classesAll, asgAll, cfg) {
  const rep = evalCampus_(campus, staffAll, classesAll, asgAll, cfg);
  rep.classes.forEach(l => delete l.members);
  const cls = {}; classesAll.forEach(l => cls[str_(l.MaLop)] = l.TenLop);
  const by = {}; asgAll.forEach(a => (by[str_(a.MaNV)] = by[str_(a.MaNV)] || []).push(cls[str_(a.MaLop)] || str_(a.MaLop)));
  return {
    MaCoSo: campus.MaCoSo, TenCoSo: campus.TenCoSo, namHoc: cfg.params.NamHoc,
    staff: staffAll.filter(x => str_(x.MaCoSo) === campus.MaCoSo).map(x => ({ MaNV: str_(x.MaNV), HoTen: x.HoTen, ChucDanhHR: x.ChucDanhHR, TrangThai: x.TrangThai || 'Đang làm', VaiTroDB: x.VaiTroDB || '', lop: (by[str_(x.MaNV)] || []).sort() })),
    report: rep
  };
}

function takeSnapshots_(ky, campuses, who, note, overwrite) {
  const cfg = loadCfg_(), staff = read_(SH.STAFF), classes = read_(SH.CLASS), asg = read_(SH.ASSIGN);
  const rows = read_(SH.HIST), now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm');
  let n = 0;
  campuses.forEach(cp => {
    const i = rows.findIndex(r => str_(r.Ky) === ky && str_(r.MaCoSo) === cp.MaCoSo);
    if (i >= 0 && !overwrite) return;
    const json = JSON.stringify(snapOf_(cp, staff, classes, asg, cfg));
    if (json.length > 49000) throw new Error('Dữ liệu cơ sở ' + cp.MaCoSo + ' quá lớn để lưu trong 1 ô (' + json.length + ' ký tự).');
    const row = { Ky: ky, MaCoSo: cp.MaCoSo, ChotLuc: now, NguoiChot: who, GhiChu: note, DuLieu: json };
    if (i >= 0) rows[i] = row; else rows.push(row);
    n++;
  });
  put_(SH.HIST, rows);
  return n;
}

function historySnapshot_(c, p) {
  const ky = str_(p.ky);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ky)) throw new Error('Kỳ phải có dạng YYYY-MM, ví dụ 2026-11');
  const ids = (p.campuses && p.campuses.length ? p.campuses : c.allowed).map(str_);
  ids.forEach(id => needCampus_(c, id));
  const n = takeSnapshots_(ky, c.campuses.filter(x => ids.indexOf(x.MaCoSo) >= 0), c.email, str_(p.ghiChu), true);
  log_(c, 'historySnapshot', ky + ' · ' + ids.join(','));
  return n;
}

function historyList_(c) {
  return read_(SH.HIST).filter(r => c.allowed.indexOf(str_(r.MaCoSo)) >= 0).map(r => {
    let d = {}; try { d = JSON.parse(r.DuLieu); } catch (e) {}
    const rp = d.report || {};
    return { Ky: str_(r.Ky), MaCoSo: str_(r.MaCoSo), TenCoSo: d.TenCoSo || r.MaCoSo, ChotLuc: str_(r.ChotLuc), NguoiChot: r.NguoiChot, GhiChu: r.GhiChu, total: rp.total, status: rp.status, nhanSu: (d.staff || []).filter(x => x.TrangThai !== STATUS_OFF).length };
  }).sort((a, b) => a.Ky < b.Ky ? 1 : a.Ky > b.Ky ? -1 : a.TenCoSo > b.TenCoSo ? 1 : -1);
}

/* vs: '' | 'current' | 'YYYY-MM' → trả về {a: kỳ đang xem, b: kỳ so sánh} */
function historyGet_(c, p) {
  needCampus_(c, p.campus);
  const rows = read_(SH.HIST);
  const find = ky => {
    const r = rows.find(x => str_(x.Ky) === str_(ky) && str_(x.MaCoSo) === str_(p.campus));
    if (!r) throw new Error('Không có dữ liệu kỳ ' + ky + ' của cơ sở này');
    const d = JSON.parse(r.DuLieu); d.Ky = str_(r.Ky); d.ChotLuc = str_(r.ChotLuc); d.NguoiChot = r.NguoiChot; d.GhiChu = r.GhiChu; return d;
  };
  const out = { a: find(p.ky), b: null };
  if (p.vs === 'current') {
    const cp = c.campuses.find(x => x.MaCoSo === str_(p.campus));
    out.b = snapOf_(cp, read_(SH.STAFF), read_(SH.CLASS), read_(SH.ASSIGN), loadCfg_());
    out.b.Ky = 'current'; out.b.ChotLuc = 'Hiện tại';
  } else if (p.vs) out.b = find(p.vs);
  return out;
}

/* ===================== XEM TRƯỚC TÁC ĐỘNG KHI ĐỔI SĨ SỐ ===================== */

function brief_(r, tenLop) {
  const cl = r.classes.find(l => l.TenLop === tenLop);
  return { total: r.total, band: r.band, status: r.status, positions: r.positions.map(p => ({ viTri: p.viTri, min: p.min, max: p.max, actual: p.actual, status: p.status })), cls: cl ? { students: cl.students, gv: cl.gv, bm: cl.bm, stdGV: cl.stdGV, stdBM: cl.stdBM, tiLe: cl.tiLe, capacity: cl.capacity, status: cl.status, issues: cl.issues, notes: cl.notes, short: cl.short, canPropose: cl.canPropose } : null };
}
/* Tính thử (không ghi) cơ sở sẽ ra sao nếu lớp có sĩ số/giữ chỗ mới */
function classPreview_(c, p) {
  const r = p.row; needCampus_(c, r.MaCoSo);
  const cfg = loadCfg_(), ct = cfg.classTypes.find(t => t.MaNhom === str_(r.MaNhom));
  if (!ct) throw new Error('Nhóm tuổi không hợp lệ');
  const campus = c.campuses.find(x => x.MaCoSo === str_(r.MaCoSo));
  const staff = read_(SH.STAFF), asg = read_(SH.ASSIGN), classes = read_(SH.CLASS);
  const name = ct.VietTat + (str_(r.SoThuTu) || '1');
  const row = { MaLop: str_(r.MaLop) || '__moi', MaCoSo: campus.MaCoSo, MaNhom: ct.MaNhom, SoThuTu: str_(r.SoThuTu) || '1', TenLop: name, SiSo: num_(r.SiSo), GiuCho: num_(r.GiuCho) };
  const i = classes.findIndex(l => str_(l.MaLop) === row.MaLop);
  const after = classes.slice(); if (i >= 0) after[i] = row; else after.push(row);
  const b = evalCampus_(campus, staff, classes, asg, cfg), a = evalCampus_(campus, staff, after, asg, cfg);
  return { name, isNew: i < 0, before: brief_(b, i >= 0 ? classes[i].TenLop : name), after: brief_(a, name), extra: num_(cfg.params.ChenhLech, 2) };
}

/* ===================== HƯỚNG DẪN SỬ DỤNG (Admin chỉnh sửa được) ===================== */
/* Cú pháp nội dung: "## " tiêu đề nhỏ · "1. " bước · "- " gạch đầu dòng · "> " mẹo · "!> " lưu ý · **đậm** · [tab:staff|Chữ hiển thị] nút mở tab */
const R_ALL = 'Tất cả';
const GUIDE_DEF = [
  { Id: 'g01', ThuTu: 1, Icon: '🔐', TieuDe: 'Đăng nhập lần đầu', DoiTuong: R_ALL, Loai: 'section', NoiDung:
'Hệ thống dùng tài khoản Google của tổ chức và **mã xác nhận 6 số** gửi về email của bạn.\n1. Mở đường link hệ thống do Admin cung cấp.\n2. Bấm **Gửi mã xác nhận**.\n3. Mở email "Mã xác nhận đăng nhập", nhập 6 số vào ô (mã có hiệu lực 5 phút).\n4. Đăng nhập xong, bạn được dùng liên tục khoảng 8 giờ.\n> Không thấy email? Kiểm tra thư mục Spam, chờ 60 giây rồi bấm **Gửi lại mã**.\n!> Nhập sai 5 lần sẽ bị khoá 15 phút. Nếu báo "chưa được cấp quyền", nhờ Admin thêm email của bạn vào hệ thống.' },
  { Id: 'g02', ThuTu: 2, Icon: '👥', TieuDe: 'Nhập danh sách nhân sự', DoiTuong: 'Nhân sự, Admin', Loai: 'section', NoiDung:
'Làm một lần đầu năm, sau đó chỉ cập nhật khi có người vào/nghỉ.\n1. Vào tab [tab:staff|Nhân sự].\n2. Bấm **Nhập từ Excel**.\n3. Trong Excel/Google Sheet, chọn các cột theo thứ tự: **Mã NV · Họ tên · Cơ sở · Chức danh · Trạng thái** rồi Copy.\n4. Dán vào ô và bấm **Nhập**. Mã NV đã có sẽ được cập nhật, không bị trùng.\n> Người nghỉ việc: đổi Trạng thái thành **Nghỉ việc** để không tính vào định biên (không cần xoá).' },
  { Id: 'g03', ThuTu: 3, Icon: '🏫', TieuDe: 'Tạo lớp và cập nhật sĩ số', DoiTuong: 'Hiệu trưởng/Quản lý cơ sở, Admin', Loai: 'section', NoiDung:
'1. Vào tab [tab:classes|Lớp học] → **+ Thêm lớp**.\n2. Chọn **nhóm tuổi** (hệ thống tự đặt tên: Pre-N1, N1, Pre-K.A1, Pre-K.B1, K1…).\n3. Nhập **Sĩ số thực học** và **Đã đăng ký giữ chỗ**. Tổng hai số này là sĩ số dùng để tính định biên.\n4. Xem khung **Tác động** bên dưới (xem trước hệ quả: đổi khung định biên không? lớp có đủ điều kiện bổ sung giáo viên không?) rồi bấm **Lưu**.\n## Khi sĩ số thay đổi\n- Bấm **Sửa** ở lớp đó và nhập số mới; mọi báo cáo tự tính lại ngay.\n- Cuối tháng nên [tab:history|Chốt kỳ] để lưu lại số liệu.' },
  { Id: 'g04', ThuTu: 4, Icon: '🧩', TieuDe: 'Phân vai trò và phân lớp cho nhân sự', DoiTuong: 'Hiệu trưởng/Quản lý cơ sở, Admin', Loai: 'section', NoiDung:
'Mỗi nhân sự cần có **Vai trò định biên** thì mới được tính trong báo cáo.\n1. Vào [tab:staff|Nhân sự], tìm người cần phân.\n2. Ở cột **Vai trò định biên** chọn: Giáo viên, Bảo mẫu, Y tế, Cấp dưỡng, Bảo vệ…\n3. Với Giáo viên/Bảo mẫu, bấm **Phân lớp** và tick các lớp phụ trách.\n> Tick ô **Chưa phân vai trò** ở đầu bảng để tìm nhanh những người còn sót.\n> Giáo viên Tiếng Anh VN được tính ở cấp cơ sở, không cần phân lớp.' },
  { Id: 'g05', ThuTu: 5, Icon: '📊', TieuDe: 'Đọc báo cáo định biên', DoiTuong: R_ALL, Loai: 'section', NoiDung:
'Có 2 nơi xem: [tab:dash|Tổng quan] (so sánh các cơ sở) và [tab:campus|Báo cáo cơ sở] (chi tiết từng cơ sở).\n## Ý nghĩa màu sắc\n- **Đạt** (xanh): đúng định biên.\n- **Thiếu** (đỏ): cần bổ sung người **và đã đủ điều kiện mở rộng định biên**.\n- **Thừa** (vàng): nhiều hơn định biên.\n- **Vượt tỉ lệ – theo dõi** (tím): lớp đông hơn tỉ lệ cho phép nhưng **chưa đủ điều kiện** để xin thêm người.\n## Khi nào mới tính là "Thiếu"?\n- **Giáo viên/Bảo mẫu của lớp**: chỉ khi sĩ số lớp ≥ tỉ lệ × số người đang phụ trách + 2 học sinh (Quy định mục 4). Ví dụ lớp K (10:1) có 2 giáo viên: đủ điều kiện khi từ **22 học sinh**.\n- **Nhân sự cơ sở** (Hiệu phó, Y tế, Cấp dưỡng…): theo khung tổng sĩ số của cơ sở (dưới 50, 50–59, 60–70, 71–150…).\n> Lớp ít học sinh mà chỉ có 1 giáo viên vẫn là **Đạt** nếu tỉ lệ còn đảm bảo; hệ thống chỉ ghi chú "thấp hơn cơ cấu chuẩn".' },
  { Id: 'g06', ThuTu: 6, Icon: '✉️', TieuDe: 'Gửi hồ sơ và phê duyệt', DoiTuong: 'Hiệu trưởng/Quản lý cơ sở, Chủ tịch HĐHT Mầm non, Nhân sự, Admin', Loai: 'section', NoiDung:
'## Người gửi\n1. Vào [tab:approval|Phê duyệt] → **Gửi phê duyệt**.\n2. Chọn loại hồ sơ, cơ sở, kỳ và viết nội dung ngắn gọn.\n3. Chọn **người phê duyệt** theo thứ tự (dùng ↑ ↓ để sắp xếp).\n4. Chọn **Tuần tự** (lần lượt từng người) hoặc **Đồng thời** (cùng lúc).\n5. Bấm **Gửi** – hệ thống tự gửi email thông báo.\n## Người phê duyệt\n1. Hồ sơ chờ bạn hiện **số đỏ** trên tab Phê duyệt kèm email thông báo.\n2. Mở hồ sơ, xem số liệu đính kèm, nhập ý kiến rồi bấm **Phê duyệt** hoặc **Từ chối** (từ chối bắt buộc ghi lý do).\n> Hồ sơ lưu số liệu **đúng thời điểm gửi**; duyệt xong tự lưu vào Lịch sử.\n> Gửi nhầm? Mở hồ sơ → **Thu hồi** (khi chưa duyệt xong).' },
  { Id: 'g07', ThuTu: 7, Icon: '📌', TieuDe: 'Chốt kỳ và xem lại các tháng cũ', DoiTuong: 'Hiệu trưởng/Quản lý cơ sở, Nhân sự, Chủ tịch HĐHT Mầm non, Admin', Loai: 'section', NoiDung:
'Mỗi lần phân công lại, "chụp ảnh" lại để sau này xem được bảng phân công của từng tháng.\n1. Vào [tab:history|Lịch sử phân công] → **Chốt kỳ phân công**, chọn tháng và cơ sở.\n2. Xem lại: bấm **Xem**. Muốn biết ai đổi lớp/vai trò: bấm **So với hiện tại**.\n> Nếu Admin đã bật, hệ thống tự chốt tháng trước vào ngày 1 hằng tháng.' },
  { Id: 'g08', ThuTu: 8, Icon: '🖨️', TieuDe: 'In và xuất Excel', DoiTuong: R_ALL, Loai: 'section', NoiDung:
'- **⬇ Excel**: tải file .xlsx nhiều sheet.\n- **🖨 In**: in khổ A4 ngang, tự ẩn menu và nút bấm.\n- Tick ô **Kèm phần ký** cạnh nút In khi cần chữ ký trực tiếp của Ban Tổng giám đốc (mặc định: Người lập, Chủ tịch HĐHT Mầm non, Phó Tổng Giám đốc, Tổng Giám đốc).\n> Chọn "Lưu dưới dạng PDF" trong hộp thoại in nếu muốn gửi file thay vì in giấy.' },
  { Id: 'g09', ThuTu: 9, Icon: '⚙️', TieuDe: 'Cấu hình định mức', DoiTuong: 'Chủ tịch HĐHT Mầm non, Admin', Loai: 'section', NoiDung:
'Vào [tab:config|Cấu hình] để chỉnh: tỉ lệ HS:GV theo lứa tuổi, khung sĩ số, định biên từng vị trí theo khung, số học sinh chênh lệch (+N), danh sách cơ sở, dòng ký ở bản in.\n!> Thay đổi áp dụng ngay cho mọi báo cáo. Hãy đối chiếu với văn bản quy định trước khi lưu.' },
  { Id: 'g10', ThuTu: 10, Icon: '🔑', TieuDe: 'Phân quyền người dùng', DoiTuong: 'Admin', Loai: 'section', NoiDung:
'1. Vào [tab:perm|Phân quyền].\n2. **Quyền × Vai trò**: tick chức năng mỗi vai trò được dùng.\n3. **Người dùng × Cơ sở**: thêm email, chọn vai trò, tick các cơ sở được truy cập.\n4. Bấm **Lưu phân quyền**.\n> Muốn ai đó được chọn làm người phê duyệt: tick quyền **Được chọn làm người phê duyệt** cho vai trò của họ.' },
  { Id: 'f01', ThuTu: 11, Icon: '❓', TieuDe: 'Vì sao lớp báo "Vượt tỉ lệ" mà không báo "Thiếu"?', DoiTuong: R_ALL, Loai: 'faq', NoiDung:
'Vì lớp mới vượt tỉ lệ một chút. Theo quy định, chỉ khi sĩ số đạt **tỉ lệ × số người phụ trách + 2 học sinh** mới đủ điều kiện xin thêm giáo viên/bảo mẫu. Lúc đó trạng thái sẽ chuyển sang **Thiếu**.' },
  { Id: 'f02', ThuTu: 12, Icon: '❓', TieuDe: 'Sĩ số lớp thay đổi giữa tháng thì làm gì?', DoiTuong: R_ALL, Loai: 'faq', NoiDung:
'Hiệu trưởng vào [tab:classes|Lớp học] → **Sửa** → nhập sĩ số mới (xem khung Tác động trước khi lưu). Báo cáo tự tính lại. Cuối tháng nhớ **Chốt kỳ**.' },
  { Id: 'f03', ThuTu: 13, Icon: '❓', TieuDe: 'Tôi không thấy tab hoặc cơ sở nào đó?', DoiTuong: R_ALL, Loai: 'faq', NoiDung:
'Mỗi người chỉ thấy chức năng và cơ sở được Admin cấp quyền. Cần thêm quyền, hãy nhờ Admin chỉnh trong tab Phân quyền.' },
  { Id: 'f04', ThuTu: 14, Icon: '❓', TieuDe: 'Số liệu có vẻ cũ hoặc chưa cập nhật?', DoiTuong: R_ALL, Loai: 'faq', NoiDung:
'Bấm nút **⟳ Làm mới** ở góc trên. Nếu ai đó sửa trực tiếp trong Google Sheet (không qua web), có thể chậm tối đa 10 phút.' },
  { Id: 'f05', ThuTu: 15, Icon: '❓', TieuDe: 'Không nhận được mã xác nhận đăng nhập?', DoiTuong: R_ALL, Loai: 'faq', NoiDung:
'Kiểm tra thư mục Spam, chờ 60 giây rồi bấm **Gửi lại mã**. Vẫn không có: báo Admin kiểm tra email của bạn đã được thêm đúng chưa.' },
  { Id: 'f06', ThuTu: 16, Icon: '❓', TieuDe: 'Nhập nhầm vai trò hoặc lớp cho nhân sự?', DoiTuong: R_ALL, Loai: 'faq', NoiDung:
'Mở tab [tab:staff|Nhân sự] và chọn lại – áp dụng ngay. Mọi thay đổi đều được ghi vào Nhật ký.' }
];

function guideList_() {
  const rows = read_(SH.GUIDE);
  if (!rows.length) return GUIDE_DEF;
  return rows.map(r => ({ Id: str_(r.Id), ThuTu: num_(r.ThuTu), Icon: str_(r.Icon), TieuDe: str_(r.TieuDe), DoiTuong: str_(r.DoiTuong) || R_ALL, Loai: r.Loai === 'faq' ? 'faq' : 'section', NoiDung: str_(r.NoiDung) }))
    .sort((a, b) => a.ThuTu - b.ThuTu);
}
function guideSave_(c, p) {
  const items = p.items || [];
  if (!items.length) throw new Error('Cần ít nhất một mục hướng dẫn');
  if (items.length > 60) throw new Error('Tối đa 60 mục');
  const out = items.map((x, i) => {
    if (!str_(x.TieuDe)) throw new Error('Mục #' + (i + 1) + ' chưa có tiêu đề');
    if (str_(x.NoiDung).length > 8000) throw new Error('Mục "' + x.TieuDe + '" quá dài (tối đa 8000 ký tự)');
    return { Id: str_(x.Id) || uid_('g'), ThuTu: i + 1, Icon: str_(x.Icon).slice(0, 4), TieuDe: str_(x.TieuDe).slice(0, 150), DoiTuong: str_(x.DoiTuong) || R_ALL, Loai: x.Loai === 'faq' ? 'faq' : 'section', NoiDung: String(x.NoiDung || '') };
  });
  put_(SH.GUIDE, out);
  log_(c, 'guideSave', out.length + ' mục');
  return guideList_();
}
function guideReset_(c) { put_(SH.GUIDE, GUIDE_DEF); log_(c, 'guideReset', 'Khôi phục hướng dẫn mặc định'); return guideList_(); }

/* ===================== GỬI & PHÊ DUYỆT ===================== */
/* Người gửi chọn danh sách người duyệt (tuần tự hoặc đồng thời). Hồ sơ đính kèm ảnh chụp phân công/định biên tại thời điểm gửi.
   Khi tất cả đồng ý → trạng thái "Đã duyệt" và ảnh chụp được ghi vào Lịch sử phân công của kỳ đó. */

const PD_WAIT = 'Chờ duyệt', PD_OK = 'Đã duyệt', PD_NO = 'Từ chối', PD_BACK = 'Đã thu hồi';

function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'); }

function approverCandidates_(c) {
  const grid = {}; read_(SH.ROLEPERM).forEach(r => grid[r.VaiTro] = r);
  return read_(SH.USERS).filter(u => bool_(u.KichHoat) && str_(u.Email).toLowerCase() !== c.email &&
    (u.VaiTro === ROLE_ADMIN || (grid[u.VaiTro] && bool_(grid[u.VaiTro]['approval.approve']))))
    .map(u => ({ Email: str_(u.Email).toLowerCase(), HoTen: u.HoTen, VaiTro: u.VaiTro }));
}


function pdItem_(r, c, camp) {
  let l = []; try { l = JSON.parse(r.Luong || '[]'); } catch (e) {}
  const me = c.email, involved = str_(r.NguoiGui).toLowerCase() === me || l.some(x => x.email === me);
  let toiDuyet = false;
  if (r.TrangThai === PD_WAIT) {
    if (r.CheDo === 'Tuần tự') { const cur = l.find(x => x.tt === 'cho'); toiDuyet = !!cur && cur.email === me; }
    else toiDuyet = l.some(x => x.email === me && x.tt === 'cho');
  }
  return { MaPD: str_(r.MaPD), Loai: r.Loai, Ky: str_(r.Ky), MaCoSo: str_(r.MaCoSo), TenCoSo: camp[str_(r.MaCoSo)] || str_(r.MaCoSo), TieuDe: r.TieuDe, GhiChu: r.GhiChu,
    NguoiGui: str_(r.NguoiGui), TenNguoiGui: r.TenNguoiGui, GuiLuc: str_(r.GuiLuc), CheDo: r.CheDo, TrangThai: r.TrangThai, KetThucLuc: str_(r.KetThucLuc), luong: l, involved, toiDuyet, laNguoiGui: str_(r.NguoiGui).toLowerCase() === me };
}
function pdList_(c) {
  const camp = {}; read_(SH.CAMPUS).forEach(x => camp[str_(x.MaCoSo)] = x.TenCoSo);
  const all = c.perms.indexOf('approval.viewall') >= 0;
  return read_(SH.PD).map(r => pdItem_(r, c, camp)).filter(x => all || x.involved).sort((a, b) => a.MaPD < b.MaPD ? 1 : -1);
}

/* ===== Gửi email tự động: ẩn tên/địa chỉ chủ web app =====
   - Tên hiển thị = TenGui (mặc định "Hệ thống Định biên Khối Mầm non"), thêm ghi chú "email tự động, không trả lời".
   - KhongTraLoi=1: dùng noReply (Google Workspace gửi từ địa chỉ noreply@<tên miền>). Nếu tài khoản không hỗ trợ → gửi thường
     nhưng đặt Reply-To = noreply@<tên miền> để không ai trả lời nhầm vào hộp thư chủ.
   - KhongTraLoi=0: dùng tên/Reply-To của người thao tác (m.name, m.replyTo) nếu có. */
function sysName_() { return str_(param_('TenGui', SYS_NAME)) || SYS_NAME; }
function sendMail_(m) {
  const noReply = param_('KhongTraLoi', '1') !== '0', name = sysName_();
  const o = { to: m.to, subject: m.subject, name };
  if (m.cc) o.cc = m.cc;
  if (!noReply) {
    o.htmlBody = m.htmlBody;
    if (m.name) o.name = m.name;
    if (m.replyTo) o.replyTo = m.replyTo;
    MailApp.sendEmail(o); return { noReply: false, mode: 'reply' };
  }
  o.htmlBody = m.htmlBody + '<hr style="border:0;border-top:1px solid #ddd;margin:18px 0 8px"><p style="color:#777;font-size:12px;margin:0">Đây là email tự động của ' + name + '. Vui lòng không trả lời email này.</p>';
  try { MailApp.sendEmail(Object.assign({}, o, { noReply: true })); return { noReply: true, mode: 'noreply' }; }
  catch (e) { /* tài khoản không hỗ trợ noReply (không phải Workspace) hoặc lỗi tạm: gửi thường, Reply-To về địa chỉ không tồn tại */ }
  const dom = (Session.getEffectiveUser().getEmail() || '').split('@')[1];
  if (dom) o.replyTo = 'noreply@' + dom;
  MailApp.sendEmail(o); return { noReply: false, mode: 'fallback' };
}
function mailTest_(c) {
  const r = sendMail_({ to: c.email, subject: 'Thử email tự động – ' + sysName_(), htmlBody: '<p>Đây là email thử do ' + c.name + ' yêu cầu để xem cách hiển thị người gửi.</p>' });
  return { to: c.email, mode: r.mode };
}

/* Mọi thông báo phê duyệt do hệ thống tự gửi qua sendMail_ (ẩn tên chủ web app). Nội dung luôn ghi rõ người thao tác. */
function notify_(to, subject, html, actor) {
  try {
    const url = ScriptApp.getService().getUrl();
    (Array.isArray(to) ? to : [to]).filter(Boolean).forEach(addr => {
      const m = { to: addr, subject: '[Định biên MN] ' + subject,
        htmlBody: html + (actor ? '<p style="color:#666">Người thao tác: <b>' + actor.name + '</b> (' + actor.email + ')</p>' : '') + (url ? '<p><a href="' + url + '">Mở hệ thống</a></p>' : '') };
      if (actor) { m.name = actor.name + ' (' + sysName_() + ')'; m.replyTo = actor.email; }
      sendMail_(m);
    });
  } catch (e) { /* không gửi được mail (hạn mức/quyền): bỏ qua, hồ sơ vẫn hợp lệ */ }
}

function approvalSubmit_(c, p) {
  const ky = str_(p.ky);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ky)) throw new Error('Kỳ phải có dạng YYYY-MM');
  needCampus_(c, p.campus);
  const che = p.cheDo === 'Đồng thời' ? 'Đồng thời' : 'Tuần tự';
  const emails = (p.approvers || []).map(x => str_(x).toLowerCase());
  if (!emails.length) throw new Error('Chọn ít nhất một người phê duyệt');
  if (emails.length > 10 || new Set(emails).size !== emails.length) throw new Error('Danh sách người duyệt trùng lặp hoặc quá 10 người');
  const cand = approverCandidates_(c), byMail = {}; cand.forEach(x => byMail[x.Email] = x);
  emails.forEach(e => { if (!byMail[e]) throw new Error(e + ' không thuộc danh sách người có thể phê duyệt'); });
  if (!str_(p.tieuDe)) throw new Error('Nhập tiêu đề');
  const rows = read_(SH.PD);
  if (rows.some(r => str_(r.Ky) === ky && str_(r.MaCoSo) === str_(p.campus) && r.Loai === str_(p.loai) && r.TrangThai === PD_WAIT)) throw new Error('Đã có hồ sơ cùng loại của kỳ ' + ky + ' đang chờ duyệt. Hãy thu hồi hồ sơ cũ nếu muốn gửi lại.');
  const campus = c.campuses.find(x => x.MaCoSo === str_(p.campus));
  const json = JSON.stringify(snapOf_(campus, read_(SH.STAFF), read_(SH.CLASS), read_(SH.ASSIGN), loadCfg_()));
  if (json.length > 49000) throw new Error('Dữ liệu cơ sở quá lớn để đính kèm hồ sơ.');
  const n = rows.reduce((m, r) => Math.max(m, Number(String(r.MaPD).replace(/\D/g, '')) || 0), 0) + 1, id = 'PD' + ('0000' + n).slice(-4);
  const luong = emails.map(e => ({ email: e, hoTen: byMail[e].HoTen, tt: 'cho', yKien: '', luc: '' }));
  rows.push({ MaPD: id, Loai: str_(p.loai) || 'Phân công & định biên', Ky: ky, MaCoSo: campus.MaCoSo, TieuDe: str_(p.tieuDe), GhiChu: str_(p.ghiChu), NguoiGui: c.email, TenNguoiGui: c.name, GuiLuc: nowStr_(), CheDo: che, TrangThai: PD_WAIT, Luong: JSON.stringify(luong), KetThucLuc: '' });
  put_(SH.PD, rows);
  const dl = read_(SH.PDDL); dl.push({ MaPD: id, DuLieu: json }); put_(SH.PDDL, dl);
  const first = che === 'Tuần tự' ? [emails[0]] : emails;
  notify_(first, 'Đề nghị phê duyệt ' + id, '<p>' + c.name + ' gửi hồ sơ <b>' + str_(p.tieuDe) + '</b> (' + campus.TenCoSo + ', kỳ ' + ky + ') chờ bạn phê duyệt.</p>' + (str_(p.ghiChu) ? '<p>Nội dung: ' + str_(p.ghiChu) + '</p>' : ''), c);
  log_(c, 'approvalSubmit', id + ' · ' + campus.MaCoSo + ' · ' + ky + ' → ' + emails.join(', ') + ' (' + che + ')');
  return id;
}

function approvalGet_(c, p) {
  const camp = {}; read_(SH.CAMPUS).forEach(x => camp[str_(x.MaCoSo)] = x.TenCoSo);
  const r = read_(SH.PD).find(x => str_(x.MaPD) === str_(p.id));
  if (!r) throw new Error('Không tìm thấy hồ sơ');
  const it = pdItem_(r, c, camp);
  if (!it.involved && c.perms.indexOf('approval.viewall') < 0) throw new Error('Bạn không có quyền xem hồ sơ này');
  const dl = read_(SH.PDDL).find(x => str_(x.MaPD) === str_(p.id));
  it.snapshot = dl ? JSON.parse(dl.DuLieu) : null;
  return it;
}

function approvalAct_(c, p) {
  const rows = read_(SH.PD), r = rows.find(x => str_(x.MaPD) === str_(p.id));
  if (!r) throw new Error('Không tìm thấy hồ sơ');
  const it = pdItem_(r, c, {});
  if (!it.toiDuyet) throw new Error(r.TrangThai !== PD_WAIT ? 'Hồ sơ không còn ở trạng thái chờ duyệt' : 'Chưa đến lượt bạn hoặc bạn không nằm trong luồng phê duyệt');
  const ok = p.decision === 'approve', ykien = str_(p.yKien);
  if (!ok && !ykien) throw new Error('Vui lòng nhập lý do từ chối');
  const l = it.luong, me = l.find(x => x.email === c.email && x.tt === 'cho');
  me.tt = ok ? 'duyet' : 'tuchoi'; me.yKien = ykien; me.luc = nowStr_();
  r.Luong = JSON.stringify(l);
  const sender = str_(r.NguoiGui);
  if (!ok) {
    r.TrangThai = PD_NO; r.KetThucLuc = nowStr_();
    notify_(sender, 'Hồ sơ ' + r.MaPD + ' bị từ chối', '<p>' + c.name + ' đã từ chối <b>' + r.TieuDe + '</b>.</p><p>Lý do: ' + ykien + '</p>', c);
  } else if (l.every(x => x.tt === 'duyet')) {
    r.TrangThai = PD_OK; r.KetThucLuc = nowStr_();
    const dl = read_(SH.PDDL).find(x => str_(x.MaPD) === str_(r.MaPD));
    if (dl) {
      const hist = read_(SH.HIST), i = hist.findIndex(h => str_(h.Ky) === str_(r.Ky) && str_(h.MaCoSo) === str_(r.MaCoSo));
      const row = { Ky: str_(r.Ky), MaCoSo: str_(r.MaCoSo), ChotLuc: nowStr_(), NguoiChot: 'Phê duyệt ' + r.MaPD, GhiChu: 'Đã phê duyệt: ' + r.TieuDe, DuLieu: dl.DuLieu };
      if (i >= 0) hist[i] = row; else hist.push(row);
      put_(SH.HIST, hist);
    }
    notify_(sender, 'Hồ sơ ' + r.MaPD + ' đã được phê duyệt', '<p><b>' + r.TieuDe + '</b> đã được tất cả người phê duyệt đồng ý.</p>', c);
  } else if (r.CheDo === 'Tuần tự') {
    const next = l.find(x => x.tt === 'cho');
    if (next) notify_(next.email, 'Đến lượt bạn phê duyệt ' + r.MaPD, '<p>Hồ sơ <b>' + r.TieuDe + '</b> của ' + r.TenNguoiGui + ' chờ bạn phê duyệt (' + c.name + ' đã đồng ý).</p>', c);
  }
  put_(SH.PD, rows);
  log_(c, 'approvalAct', r.MaPD + ' · ' + (ok ? 'đồng ý' : 'từ chối') + (ykien ? ' · ' + ykien : ''));
  return r.TrangThai;
}

function approvalWithdraw_(c, p) {
  const rows = read_(SH.PD), r = rows.find(x => str_(x.MaPD) === str_(p.id));
  if (!r) throw new Error('Không tìm thấy hồ sơ');
  if (str_(r.NguoiGui).toLowerCase() !== c.email) throw new Error('Chỉ người gửi mới được thu hồi');
  if (r.TrangThai !== PD_WAIT) throw new Error('Hồ sơ không còn ở trạng thái chờ duyệt');
  r.TrangThai = PD_BACK; r.KetThucLuc = nowStr_();
  put_(SH.PD, rows);
  log_(c, 'approvalWithdraw', r.MaPD);
  return true;
}

/* Tự động chốt kỳ của tháng trước vào ngày 1 hằng tháng (không ghi đè kỳ đã chốt thủ công) */
function autoSnapshot() {
  const cur = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM').split('-').map(Number);   // [năm, tháng]
  const ky = cur[1] === 1 ? (cur[0] - 1) + '-12' : cur[0] + '-' + ('0' + (cur[1] - 1)).slice(-2);
  const camps = read_(SH.CAMPUS).filter(x => bool_(x.KichHoat)).map(x => ({ MaCoSo: str_(x.MaCoSo), TenCoSo: x.TenCoSo }));
  const n = takeSnapshots_(ky, camps, 'Hệ thống (tự động)', 'Tự động chốt đầu tháng', false);
  log_(null, 'autoSnapshot', ky + ': ' + n + ' cơ sở');
}
function installMonthlyTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'autoSnapshot').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoSnapshot').timeBased().onMonthDay(1).atHour(1).create();
  SpreadsheetApp.getActive().toast('Đã bật tự động chốt kỳ vào 1h sáng ngày 1 hằng tháng.', 'Định biên', 8);
}
