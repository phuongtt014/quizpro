/**
 * QUẢN LÝ ĐỊNH BIÊN & PHÂN CÔNG – KHỐI MẦM NON, HỆ THỐNG TRƯỜNG VIỆT MỸ
 * Căn cứ: Quy định tên lớp học – Định biên nhân sự khối Mầm non (HDMN-DBNS-01, hiệu lực 01/06/2026).
 * Script gắn (bound) với một Google Sheet đóng vai trò cơ sở dữ liệu.
 */

const SH = {
  USERS: 'NguoiDung', ROLEPERM: 'PQ_VaiTro', USERCAMP: 'PQ_CoSo', CAMPUS: 'CoSo',
  STAFF: 'NhanSu', CLASS: 'Lop', ASSIGN: 'PhanCong',
  CT: 'CauHinh_Lop', BAND: 'CauHinh_Khung', POS: 'CauHinh_CoSo', PARAM: 'CauHinh_ThamSo', AUDIT: 'NhatKy'
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
  { key: 'audit.view', label: 'Xem nhật ký' }
];

const ROLE_ADMIN = 'Admin';
const DEFAULT_ROLES = {
  'Admin': PERMS.map(p => p.key),
  'Chủ tịch HĐHT Mầm non': ['dash.view', 'report.export', 'staff.view', 'class.view', 'config.edit', 'audit.view'],
  'Nhân sự': ['dash.view', 'report.export', 'staff.view', 'staff.import', 'class.view', 'audit.view'],
  'Hiệu trưởng/Quản lý cơ sở': ['dash.view', 'report.export', 'staff.view', 'staff.assign', 'class.view', 'class.edit'],
  'Người xem': ['dash.view', 'staff.view', 'class.view']
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
  NhatKy: ['ThoiGian', 'Email', 'HanhDong', 'ChiTiet']
};
const TEXT_COLS = { NhanSu: ['MaNV', 'MaCoSo', 'SoDT'], Lop: ['MaLop', 'MaCoSo', 'SoThuTu'], PhanCong: ['MaLop', 'MaNV'], PQ_CoSo: ['MaCoSo'], CoSo: ['MaCoSo'] };

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
    .addToUi();
}

/* ===================== DB HELPERS ===================== */

function ss_() { return SpreadsheetApp.getActive(); }
function sheet_(n) {
  const sh = ss_().getSheetByName(n);
  if (!sh) throw new Error('Chưa khởi tạo hệ thống: thiếu sheet "' + n + '". Hãy chạy setup() / menu Định biên.');
  return sh;
}
function read_(name) {
  const v = sheet_(name).getDataRange().getValues();
  const h = v.shift();
  return v.filter(r => r.some(c => c !== '')).map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; });
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
}
function textColsOf_(name) { return TEXT_COLS[name] || []; }
function put_(name, rows, headers) { writeAll_(name, headers || HEADERS[name], rows, textColsOf_(name)); }
function num_(v, d) { const n = Number(v); return (v === '' || v === null || v === undefined || isNaN(n)) ? (d === undefined ? 0 : d) : n; }
function str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function uid_(p) { return p + Utilities.getUuid().slice(0, 8); }

function log_(c, action, detail) {
  const sh = sheet_(SH.AUDIT);
  sh.appendRow([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss'), c ? c.email : 'system', action, String(detail || '').slice(0, 900)]);
}

/* ===================== SETUP & SEED ===================== */

function setup() {
  const ss = ss_();
  Object.keys(HEADERS).forEach(n => { if (!ss.getSheetByName(n)) ss.insertSheet(n); });
  if (!ss.getSheetByName(SH.ROLEPERM)) ss.insertSheet(SH.ROLEPERM);
  if (!ss.getSheetByName(SH.POS)) ss.insertSheet(SH.POS);

  const empty = n => sheet_(n).getLastRow() < 2;
  const adminMail = (Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '').toLowerCase();

  if (empty(SH.ROLEPERM)) saveRoleGrid_(DEFAULT_ROLES);
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
  if (empty(SH.PARAM)) put_(SH.PARAM, [
    { Khoa: 'NamHoc', GiaTri: '2026 - 2027', MoTa: 'Năm học hiển thị trên báo cáo' },
    { Khoa: 'ChenhLech', GiaTri: '2', MoTa: 'Lớp đạt tỉ lệ định biên + N học sinh thì đủ điều kiện đề xuất bổ sung GV/bảo mẫu' }
  ]);
  log_(null, 'setup', 'Khởi tạo hệ thống');
  SpreadsheetApp.getActive().toast('Đã khởi tạo. Triển khai Web app rồi truy cập bằng đường link.', 'Định biên', 8);
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

function api(action, payload) {
  try {
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

const ACTIONS = {
  bootstrap: { fn: bootstrap_ },
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
  auditList: { perm: 'audit.view', fn: auditList_ }
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
    cfg, classRoles: CLASS_ROLES, roleOptions: CLASS_ROLES.concat(positionNames_(cfg)), perms: PERMS
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
  if (p.params) put_(SH.PARAM, p.params.map(x => ({ Khoa: x.Khoa, GiaTri: str_(x.GiaTri), MoTa: x.MoTa || '' })));
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
  const all = read_(SH.STAFF), i = all.findIndex(x => str_(x.MaNV) === str_(p.maNV));
  if (i < 0) throw new Error('Không tìm thấy nhân viên');
  needCampus_(c, all[i].MaCoSo);
  const cfg = loadCfg_(), valid = CLASS_ROLES.concat(positionNames_(cfg));
  const role = str_(p.vaiTro);
  if (role && valid.indexOf(role) < 0) throw new Error('Vai trò không hợp lệ: ' + role);
  all[i].VaiTroDB = role;
  let lop = Array.isArray(p.lop) ? p.lop.map(str_) : null;
  if (CLASS_ROLES.indexOf(role) < 0) lop = [];
  const asg = read_(SH.ASSIGN);
  if (lop !== null) {
    const classes = read_(SH.CLASS);
    lop.forEach(id => { const cl = classes.find(x => str_(x.MaLop) === id); if (!cl || str_(cl.MaCoSo) !== str_(all[i].MaCoSo)) throw new Error('Lớp ' + id + ' không thuộc cơ sở của nhân viên'); });
    const rest = asg.filter(a => str_(a.MaNV) !== str_(p.maNV));
    lop.forEach(id => rest.push({ MaLop: id, MaNV: str_(p.maNV) }));
    put_(SH.ASSIGN, rest);
  }
  put_(SH.STAFF, all);
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
  if (i >= 0) { needCampus_(c, all[i].MaCoSo); if (str_(all[i].MaCoSo) !== row.MaCoSo) throw new Error('Không đổi cơ sở của lớp đã tạo'); all[i] = row; } else all.push(row);
  put_(SH.CLASS, all);
  log_(c, 'classSave', name + ' @' + row.MaCoSo + ' ' + si + '+' + gc);
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
    const issues = [];
    let status = 'ok';
    if (students === 0) status = 'trong';
    else {
      if (gv < ct.SoGV) issues.push('Thiếu ' + (ct.SoGV - gv) + ' giáo viên');
      if (bm < ct.SoBM) issues.push('Thiếu ' + (ct.SoBM - bm) + ' bảo mẫu');
      const lack = issues.length > 0;
      if (ct.TiLe && adults > 0 && students > ct.TiLe * adults) issues.push('Vượt tỉ lệ ' + ct.TiLe + ':1 (hiện ' + (students / adults).toFixed(1) + ':1)');
      if (gv > ct.SoGV) issues.push('Thừa ' + (gv - ct.SoGV) + ' giáo viên so với định biên');
      if (bm > ct.SoBM) issues.push('Thừa ' + (bm - ct.SoBM) + ' bảo mẫu so với định biên');
      status = lack ? 'thieu' : issues.some(x => x.indexOf('Vượt') === 0) ? 'vuot' : issues.length ? 'thua' : 'ok';
    }
    const cap = ct.TiLe * stdAdults;
    return {
      MaLop: str_(l.MaLop), TenLop: l.TenLop, MaNhom: ct.MaNhom, LuaTuoi: ct.LuaTuoi, TenBoGD: ct.TenBoGD, siSo: num_(l.SiSo), giuCho: num_(l.GiuCho), students,
      gv, bm, stdGV: ct.SoGV, stdBM: ct.SoBM, tiLe: ct.TiLe, capacity: cap, ratioActual: adults ? +(students / adults).toFixed(1) : null,
      canPropose: students > 0 && cap > 0 && students >= cap + extra, status, issues,
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
    const need = open.reduce((a, l) => a + (role === 'Giáo viên' ? l.stdGV : l.stdBM), 0);
    const actual = active.filter(s => s.VaiTroDB === role).length;
    positions.push({ viTri: role + ' (theo lớp)', role, min: need, max: need, actual, status: statusOf_(actual, { min: need, max: need }), kind: 'class' });
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
  return read_(SH.AUDIT).slice(-300).reverse();
}
