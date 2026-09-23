/**
 * =====================================================================
 *  WEB APP QUẢN LÝ & TÍNH BHXH HÀNG THÁNG
 *  Nền tảng: Google Apps Script – Database: chính Google Sheet chứa script
 *  Cài đặt: xem file HUONG_DAN.md
 * =====================================================================
 */

// ---------------------------------------------------------------------
// HẰNG SỐ
// ---------------------------------------------------------------------
const ROLE = { ADMIN: 'Admin', NHAP: 'Nhập liệu', XEM: 'Xem' };
const KY_MO = 'Đang mở';
const KY_CHOT = 'Đã chốt';
const TT_AD = 'Đang áp dụng';
const TT_NGUNG = 'Ngừng áp dụng';
const TRAN_LUONG = 'Mức lương đóng tối đa';
const TRAN_DONG = 'Mức đóng tối đa';
const TRAN_KHONG = 'Không áp dụng';
const DT_NLD = 'NLĐ';
const DT_DN = 'DN';
const CO = 'Có';
const KHONG = 'Không';
const PQ_HD = 'Hoạt động';
const PQ_KHOA = 'Khóa';

const LISTS = {
  role: [ROLE.ADMIN, ROLE.NHAP, ROLE.XEM],
  doiTuong: [DT_NLD, DT_DN],
  loaiTran: [TRAN_LUONG, TRAN_DONG, TRAN_KHONG],
  trangThai: [TT_AD, TT_NGUNG],
  coKhong: [CO, KHONG],
  pqTrangThai: [PQ_HD, PQ_KHOA]
};

// Cột của hồ sơ nhân viên: [key, tiêu đề cột trên Sheet, kiểu]
const NV_COLS = [
  ['maNV', 'Mã NV', 'text'],
  ['hoTen', 'Họ và tên', 'text'],
  ['maBHXH', 'Mã số BHXH', 'text'],
  ['ngaySinh', 'Ngày sinh', 'date'],
  ['phongBan', 'Đơn vị_Phòng ban', 'text'],
  ['chucDanh', 'Chức danh', 'text'],
  ['ngayVao', 'Ngày vào làm', 'date'],
  ['ngayBHXH', 'Ngày bắt đầu BHXH', 'date'],
  ['ngayNghi', 'Ngày nghỉ việc', 'date'],
  ['thangDung', 'Tháng dừng đóng', 'month'],
  ['luongChinh', 'Mức lương chính', 'num'],
  ['pcKN', 'PC Kiêm nhiệm', 'num'],
  ['pcCV', 'PC Chức vụ', 'num'],
  ['pcDH', 'PC Độc hại', 'num'],
  ['pcKhac', 'PC Khác', 'num'],
  ['luongDong', 'Lương đóng BHXH', 'num'],
  ['maPL', 'Mã phân loại', 'text'],
  ['congDoan', 'Tham gia công đoàn', 'text'],
  ['emailQL', 'Email NV quản lý hồ sơ', 'text'],
  ['ghiChu', 'Ghi chú', 'text']
];

const T = {
  PB: { name: 'Phòng ban', cols: [
    ['ten', 'Đơn vị_Phòng ban', 'text'],
    ['ghiChu', 'Ghi chú', 'text']] },
  KHOAN: { name: 'Khoản trích đóng', cols: [
    ['id', 'ID', 'text'],
    ['ten', 'Tên khoản trích đóng', 'text'],
    ['ma', 'Mã nhận diện', 'text'],
    ['doiTuong', 'Đối tượng áp dụng', 'text'],
    ['tiLe', 'Tỉ lệ trích đóng mặc định (%)', 'pct'],
    ['loaiTran', 'Mức trần', 'text'],
    ['mucToiDa', 'Mức tối đa', 'num'],
    ['ngayHL', 'Ngày hiệu lực', 'date'],
    ['trangThai', 'Trạng thái', 'text'],
    ['chiDoanVien', 'Chỉ áp dụng đoàn viên công đoàn', 'text'],
    ['ghiChu', 'Ghi chú', 'text']] },
  MAPL: { name: 'Mã phân loại', cols: [
    ['ma', 'Mã phân loại', 'text'],
    ['moTa', 'Mô tả', 'text'],
    ['trangThai', 'Trạng thái', 'text'],
    ['khoanNLD', 'Khoản trích đóng NLĐ', 'text'],
    ['khoanDN', 'Khoản trích đóng DN', 'text'],
    ['ghiChu', 'Ghi chú', 'text']] },
  NV: { name: 'Danh sách nhân viên', cols: NV_COLS },
  KY: { name: 'Kỳ BHXH', cols: [
    ['ky', 'Kỳ', 'month'],
    ['trangThai', 'Trạng thái', 'text'],
    ['ngayTao', 'Ngày tạo', 'text'],
    ['nguoiTao', 'Người tạo', 'text'],
    ['ngayTinh', 'Lần tính gần nhất', 'text'],
    ['nguoiTinh', 'Người tính', 'text'],
    ['ngayChot', 'Ngày chốt', 'text'],
    ['nguoiChot', 'Người chốt', 'text'],
    ['ghiChu', 'Ghi chú', 'text']] },
  DLKY: { name: 'Dữ liệu kỳ', cols: [['ky', 'Kỳ', 'month']].concat(NV_COLS) },
  KQ: { name: 'Kết quả tính', cols: [
    ['ky', 'Kỳ', 'month'],
    ['maNV', 'Mã NV', 'text'],
    ['hoTen', 'Họ và tên', 'text'],
    ['maBHXH', 'Mã số BHXH', 'text'],
    ['phongBan', 'Đơn vị_Phòng ban', 'text'],
    ['chucDanh', 'Chức danh', 'text'],
    ['maPL', 'Mã phân loại', 'text'],
    ['congDoan', 'Tham gia công đoàn', 'text'],
    ['luongDong', 'Lương đóng BHXH', 'num'],
    ['dong', 'Đóng trong kỳ', 'text'],
    ['tongNLD', 'Tổng NLĐ đóng', 'num'],
    ['tongDN', 'Tổng DN đóng', 'num'],
    ['tongCong', 'Tổng cộng', 'num'],
    ['canhBao', 'Cảnh báo', 'text'],
    ['emailQL', 'Email NV quản lý hồ sơ', 'text']] },
  TT: { name: 'Truy thu - Thoái thu', cols: [
    ['id', 'ID', 'text'],
    ['ky', 'Kỳ ghi nhận', 'month'],
    ['maNV', 'Mã NV', 'text'],
    ['hoTen', 'Họ và tên', 'text'],
    ['tuThang', 'Từ tháng', 'month'],
    ['denThang', 'Đến tháng', 'month'],
    ['soThang', 'Số tháng', 'num'],
    ['luongCu', 'Lương đóng cũ', 'num'],
    ['luongMoi', 'Lương đóng mới', 'num'],
    ['maPL', 'Mã phân loại', 'text'],
    ['congDoan', 'Tham gia công đoàn', 'text'],
    ['tienNLD', 'Chênh lệch NLĐ', 'num'],
    ['tienDN', 'Chênh lệch DN', 'num'],
    ['chiTiet', 'Chi tiết theo khoản', 'text'],
    ['ghiChu', 'Ghi chú', 'text'],
    ['nguoiTao', 'Người tạo', 'text'],
    ['emailQL', 'Email NV quản lý hồ sơ', 'text']] },
  PQ: { name: 'Phân quyền', cols: [
    ['email', 'Email', 'text'],
    ['hoTen', 'Họ tên', 'text'],
    ['vaiTro', 'Vai trò', 'text'],
    ['trangThai', 'Trạng thái', 'text'],
    ['ghiChu', 'Ghi chú', 'text']] },
  LOG: { name: 'Nhật ký', cols: [
    ['thoiGian', 'Thời gian', 'text'],
    ['email', 'Người thực hiện', 'text'],
    ['hanhDong', 'Hành động', 'text'],
    ['chiTiet', 'Chi tiết', 'text']] }
};

const INFO_SHEET = 'Thông tin chung';
const INFO_FIELDS = [
  ['maCty', 'Mã công ty'],
  ['tenCty', 'Tên công ty'],
  ['mst', 'Mã số thuế'],
  ['diaChi', 'Địa chỉ'],
  ['vung', 'Vùng lương tối thiểu'],
  ['luongToiThieu', 'Mức lương tối thiểu vùng'],
  ['luongCoSo', 'Mức lương cơ sở']
];

// ---------------------------------------------------------------------
// WEB APP & MENU
// ---------------------------------------------------------------------
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Quản lý BHXH')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('BHXH')
    .addItem('1. Khởi tạo / cập nhật cấu trúc', 'khoiTaoCauTruc')
    .addItem('2. Tính lại cột "Lương đóng BHXH" (tab Danh sách nhân viên)', 'menuTinhLuongDong')
    .addSeparator()
    .addItem('Mở web app', 'menuMoWebApp')
    .addToUi();
}

function menuMoWebApp() {
  const url = ScriptApp.getService().getUrl();
  const html = url
    ? '<p style="font-family:Arial">Link web app:</p><p><a href="' + url + '" target="_blank">' + url + '</a></p>'
    : '<p style="font-family:Arial">Chưa triển khai web app. Vào Tiện ích mở rộng &gt; Apps Script &gt; Triển khai &gt; Tùy chọn triển khai mới &gt; Ứng dụng web.</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(140), 'Web app BHXH');
}

function menuTinhLuongDong() {
  const d = load_(T.NV);
  d.rows.forEach(function (r) { update_(T.NV, r._row, { luongDong: luongDong_(r) }); });
  SpreadsheetApp.getActive().toast('Đã tính lại Lương đóng BHXH cho ' + d.rows.length + ' nhân viên.', 'BHXH');
}

// ---------------------------------------------------------------------
// KHỞI TẠO CẤU TRÚC
// ---------------------------------------------------------------------
function khoiTaoCauTruc() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  const me = (Session.getEffectiveUser().getEmail() || '').toLowerCase();

  // Thông tin chung (dạng 2 cột)
  let info = ss.getSheetByName(INFO_SHEET);
  if (!info) {
    info = ss.insertSheet(INFO_SHEET, 0);
    const vals = [['Thông tin', 'Giá trị']].concat(INFO_FIELDS.map(function (f) { return [f[1], '']; }));
    info.getRange(1, 1, vals.length, 2).setValues(vals);
    info.getRange('B2:B' + vals.length).setNumberFormat('@');
    info.getRange('B7:B8').setNumberFormat('#,##0');
    info.getRange('B6').setValue('Vùng I');
    info.getRange('B7').setValue(4960000);
    info.getRange('B8').setValue(2340000);
    info.getRange('C7').setValue('Số liệu mẫu – kiểm tra lại theo quy định hiện hành');
    styleHeader_(info, 2);
    info.setColumnWidth(1, 220); info.setColumnWidth(2, 360);
  }

  const created = {};
  Object.keys(T).forEach(function (k) { created[k] = ensureSheet_(T[k]); });

  if (created.PB) {
    append_(T.PB, ['Ban Giám đốc', 'Phòng Hành chính - Nhân sự', 'Phòng Kế toán'].map(function (x) { return { ten: x }; }));
  }
  if (created.KHOAN) {
    const hl = '2026-01-01', note = 'Số liệu mẫu – kiểm tra lại theo quy định hiện hành';
    const c1 = 46800000, c2 = 99200000;
    const sample = [
      ['Bảo hiểm xã hội (NLĐ)', 'BHXH_NLD', DT_NLD, 8, TRAN_LUONG, c1, KHONG],
      ['Bảo hiểm y tế (NLĐ)', 'BHYT_NLD', DT_NLD, 1.5, TRAN_LUONG, c1, KHONG],
      ['Bảo hiểm thất nghiệp (NLĐ)', 'BHTN_NLD', DT_NLD, 1, TRAN_LUONG, c2, KHONG],
      ['Đoàn phí công đoàn (NLĐ)', 'DPCD_NLD', DT_NLD, 1, TRAN_DONG, 234000, CO],
      ['Bảo hiểm xã hội (DN)', 'BHXH_DN', DT_DN, 17, TRAN_LUONG, c1, KHONG],
      ['BH tai nạn lao động - BNN (DN)', 'BHTNLD_DN', DT_DN, 0.5, TRAN_LUONG, c1, KHONG],
      ['Bảo hiểm y tế (DN)', 'BHYT_DN', DT_DN, 3, TRAN_LUONG, c1, KHONG],
      ['Bảo hiểm thất nghiệp (DN)', 'BHTN_DN', DT_DN, 1, TRAN_LUONG, c2, KHONG],
      ['Kinh phí công đoàn (DN)', 'KPCD_DN', DT_DN, 2, TRAN_LUONG, c1, KHONG]
    ];
    append_(T.KHOAN, sample.map(function (s, i) {
      return { id: 'K' + (i + 1), ten: s[0], ma: s[1], doiTuong: s[2], tiLe: s[3], loaiTran: s[4], mucToiDa: s[5],
        ngayHL: hl, trangThai: TT_AD, chiDoanVien: s[6], ghiChu: note };
    }));
  }
  if (created.MAPL) {
    append_(T.MAPL, [
      { ma: 'CT', moTa: 'Nhân viên Việt Nam – HĐLĐ từ 1 tháng', trangThai: TT_AD,
        khoanNLD: 'BHXH_NLD; BHYT_NLD; BHTN_NLD; DPCD_NLD', khoanDN: 'BHXH_DN; BHTNLD_DN; BHYT_DN; BHTN_DN; KPCD_DN', ghiChu: 'Mẫu' },
      { ma: 'NN', moTa: 'Người nước ngoài', trangThai: TT_AD,
        khoanNLD: 'BHXH_NLD; BHYT_NLD; DPCD_NLD', khoanDN: 'BHXH_DN; BHTNLD_DN; BHYT_DN; KPCD_DN', ghiChu: 'Mẫu – kiểm tra lại' },
      { ma: 'HT', moTa: 'Người đang hưởng lương hưu', trangThai: TT_AD,
        khoanNLD: 'DPCD_NLD', khoanDN: 'BHTNLD_DN; KPCD_DN', ghiChu: 'Mẫu – kiểm tra lại' }
    ]);
  }
  if (created.PQ && me) {
    append_(T.PQ, [{ email: me, hoTen: 'Chủ sở hữu', vaiTro: ROLE.ADMIN, trangThai: PQ_HD, ghiChu: 'Tạo khi khởi tạo' }]);
  }

  // Dropdown (data validation)
  const v = function (t, title, list) {
    const sh = getSheet_(t), c = headerOf_(sh).indexOf(title) + 1;
    if (!c) return;
    sh.getRange(2, c, sh.getMaxRows() - 1, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build());
  };
  const vr = function (t, title, srcT) {
    const sh = getSheet_(t), c = headerOf_(sh).indexOf(title) + 1;
    const src = getSheet_(srcT);
    if (!c) return;
    sh.getRange(2, c, sh.getMaxRows() - 1, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInRange(src.getRange(2, 1, src.getMaxRows() - 1, 1), true)
        .setAllowInvalid(true).build());
  };
  v(T.KHOAN, 'Đối tượng áp dụng', LISTS.doiTuong);
  v(T.KHOAN, 'Mức trần', LISTS.loaiTran);
  v(T.KHOAN, 'Trạng thái', LISTS.trangThai);
  v(T.KHOAN, 'Chỉ áp dụng đoàn viên công đoàn', LISTS.coKhong);
  v(T.MAPL, 'Trạng thái', LISTS.trangThai);
  [T.NV, T.DLKY].forEach(function (t) {
    v(t, 'Tham gia công đoàn', LISTS.coKhong);
    vr(t, 'Mã phân loại', T.MAPL);
    vr(t, 'Đơn vị_Phòng ban', T.PB);
  });
  v(T.KY, 'Trạng thái', [KY_MO, KY_CHOT]);
  v(T.PQ, 'Vai trò', LISTS.role);
  v(T.PQ, 'Trạng thái', LISTS.pqTrangThai);

  SpreadsheetApp.getActive().toast('Đã khởi tạo cấu trúc. Hãy kiểm tra các tab Thông tin chung, Khoản trích đóng, Mã phân loại.', 'BHXH', 8);
}

function ensureSheet_(t) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(t.name);
  let isNew = false;
  if (!sh) {
    sh = ss.insertSheet(t.name);
    isNew = true;
  }
  let header = sh.getLastColumn() ? headerOf_(sh) : [];
  if (!header.filter(String).length) header = [];
  const missing = t.cols.map(function (c) { return c[1]; }).filter(function (h) { return header.indexOf(h) < 0; });
  if (missing.length) {
    header = header.concat(missing);
    sh.getRange(1, 1, 1, header.length).setValues([header]);
  }
  styleHeader_(sh, header.length);
  // định dạng cả cột
  const rows = sh.getMaxRows() - 1;
  t.cols.forEach(function (c) {
    const idx = header.indexOf(c[1]);
    if (idx >= 0) sh.getRange(2, idx + 1, rows, 1).setNumberFormat(fmtOf_(c[2]));
  });
  return isNew || sh.getLastRow() < 2;
}

function styleHeader_(sh, n) {
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff').setWrap(true);
  sh.setFrozenRows(1);
}

// ---------------------------------------------------------------------
// TIỆN ÍCH NGÀY/SỐ
// ---------------------------------------------------------------------
function tz_() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); }
function now_() { return Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm:ss'); }
function pad2_(n) { n = Number(n); return (n < 10 ? '0' : '') + n; }

/** Chuẩn hoá tháng về 'yyyy-MM' */
function normMonth_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM');
  const s = String(v).trim();
  let m;
  if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return m[2] + '-' + pad2_(m[1]);
  if ((m = s.match(/^(\d{4})-(\d{1,2})/))) return m[1] + '-' + pad2_(m[2]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return m[3] + '-' + pad2_(m[2]);
  return '';
}
/** Chuẩn hoá ngày về 'yyyy-MM-dd' */
function normDate_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const s = String(v).trim();
  let m;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return m[3] + '-' + pad2_(m[2]) + '-' + pad2_(m[1]);
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + pad2_(m[2]) + '-' + pad2_(m[3]);
  return '';
}
function monthDisp_(k) { return k ? k.slice(5, 7) + '/' + k.slice(0, 4) : ''; }
function dateDisp_(d) { return d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : ''; }
function isoToDate_(s) { const p = s.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
function nextMonth_(k) {
  let y = Number(k.slice(0, 4)), m = Number(k.slice(5, 7)) + 1;
  if (m > 12) { m = 1; y++; }
  return y + '-' + pad2_(m);
}
function monthRange_(a, b) {
  const out = [];
  let k = a;
  while (k && k <= b && out.length < 600) { out.push(k); k = nextMonth_(k); }
  return out;
}
function num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/\s/g, '').replace(/,/g, ''));
  return isFinite(n) ? n : 0;
}
function fmtNum_(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function fmtOf_(type) {
  return { text: '@', month: '@', date: 'dd/MM/yyyy', num: '#,##0', pct: '0.####' }[type] || '@';
}
function luongDong_(o) {
  const s = num_(o.luongChinh) + num_(o.pcKN) + num_(o.pcCV) + num_(o.pcDH) + num_(o.pcKhac);
  return s > 0 ? s : num_(o.luongDong);
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------------------------------------------------------------------
// LỚP TRUY CẬP BẢNG (SHEET)
// ---------------------------------------------------------------------
function getSheet_(t) {
  const sh = SpreadsheetApp.getActive().getSheetByName(t.name);
  if (!sh) throw new Error('Không tìm thấy tab "' + t.name + '". Hãy chạy menu BHXH > Khởi tạo / cập nhật cấu trúc.');
  return sh;
}
function headerOf_(sh) {
  const lc = sh.getLastColumn();
  return lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
}
function fromCell_(type, v) {
  switch (type) {
    case 'date': return normDate_(v);
    case 'month': return normMonth_(v);
    case 'num': case 'pct': return num_(v);
    default:
      if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'dd/MM/yyyy HH:mm:ss');
      return String(v === null || v === undefined ? '' : v).trim();
  }
}
function toCell_(type, v) {
  if (v === undefined || v === null) return '';
  switch (type) {
    case 'date': { const s = normDate_(v); return s ? isoToDate_(s) : ''; }
    case 'month': { const s = normMonth_(v); return s ? monthDisp_(s) : ''; }
    case 'num': case 'pct': return v === '' ? '' : num_(v);
    default: return String(v);
  }
}
function load_(t) {
  const sh = getSheet_(t);
  const header = headerOf_(sh);
  const lr = sh.getLastRow();
  const values = lr > 1 && header.length ? sh.getRange(2, 1, lr - 1, header.length).getValues() : [];
  const idx = {};
  t.cols.forEach(function (c) { idx[c[0]] = header.indexOf(c[1]); });
  const rows = [];
  values.forEach(function (v, i) {
    if (v.every(function (x) { return x === '' || x === null; })) return;
    const o = { _row: i + 2 };
    t.cols.forEach(function (c) {
      o[c[0]] = idx[c[0]] >= 0 ? fromCell_(c[2], v[idx[c[0]]]) : ((c[2] === 'num' || c[2] === 'pct') ? 0 : '');
    });
    rows.push(o);
  });
  return { sh: sh, header: header, rows: rows };
}
function buildRow_(t, header, o, existing) {
  const row = existing ? existing.slice() : header.map(function () { return ''; });
  t.cols.forEach(function (c) {
    const i = header.indexOf(c[1]);
    if (i >= 0 && o[c[0]] !== undefined) row[i] = toCell_(c[2], o[c[0]]);
  });
  return row;
}
function formatRange_(t, sh, header, start, n) {
  t.cols.forEach(function (c) {
    const i = header.indexOf(c[1]);
    if (i >= 0) sh.getRange(start, i + 1, n, 1).setNumberFormat(fmtOf_(c[2]));
  });
}
function ensureRows_(sh, need) {
  const max = sh.getMaxRows();
  if (need > max) sh.insertRowsAfter(max, need - max);
}
function append_(t, objs) {
  if (!objs || !objs.length) return;
  const sh = getSheet_(t);
  const header = headerOf_(sh);
  const rows = objs.map(function (o) { return buildRow_(t, header, o, null); });
  const start = sh.getLastRow() + 1;
  ensureRows_(sh, start + rows.length - 1);
  formatRange_(t, sh, header, start, rows.length);
  sh.getRange(start, 1, rows.length, header.length).setValues(rows);
}
function update_(t, rowNum, o) {
  const sh = getSheet_(t);
  const header = headerOf_(sh);
  const rg = sh.getRange(rowNum, 1, 1, header.length);
  const ex = rg.getValues()[0];
  formatRange_(t, sh, header, rowNum, 1);
  rg.setValues([buildRow_(t, header, o, ex)]);
}
function deleteRows_(t, rowNums) {
  const sh = getSheet_(t);
  rowNums.slice().sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
}
function strip_(o) { const c = Object.assign({}, o); delete c._row; return c; }

function log_(user, action, detail) {
  try {
    append_(T.LOG, [{ thoiGian: now_(), email: user ? user.email : '', hanhDong: action, chiTiet: detail || '' }]);
  } catch (e) { /* bỏ qua lỗi ghi log */ }
}

// ---------------------------------------------------------------------
// NGƯỜI DÙNG & PHÂN QUYỀN
// ---------------------------------------------------------------------
function getUser_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  if (!email) {
    throw new Error('Không xác định được email đăng nhập. Hãy đăng nhập bằng tài khoản Google của tổ chức '
      + 'và triển khai web app với "Thực thi dưới dạng: Tôi", "Ai có quyền truy cập: Mọi người trong tổ chức".');
  }
  const rows = load_(T.PQ).rows;
  const r = rows.find(function (x) { return x.email.toLowerCase() === email; });
  if (r && r.trangThai !== PQ_KHOA && LISTS.role.indexOf(r.vaiTro) >= 0) {
    return { email: email, role: r.vaiTro, hoTen: r.hoTen || email };
  }
  // Chưa có Admin nào: chủ sở hữu script được coi là Admin
  const owner = (Session.getEffectiveUser().getEmail() || '').toLowerCase();
  const hasAdmin = rows.some(function (x) { return x.vaiTro === ROLE.ADMIN && x.trangThai !== PQ_KHOA; });
  if (!hasAdmin && email === owner) return { email: email, role: ROLE.ADMIN, hoTen: 'Chủ sở hữu' };
  throw new Error('Tài khoản ' + email + ' chưa được cấp quyền hoặc đã bị khóa. Vui lòng liên hệ Admin.');
}
function requireRole_(user, roles) {
  if (roles.indexOf(user.role) < 0) throw new Error('Bạn không có quyền thực hiện thao tác này (vai trò: ' + user.role + ').');
}
function canSee_(user, r) {
  if (user.role !== ROLE.NHAP) return true;
  return String(r.emailQL || '').toLowerCase() === user.email;
}

// ---------------------------------------------------------------------
// ĐỌC DANH MỤC
// ---------------------------------------------------------------------
function getInfo_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(INFO_SHEET);
  const o = {};
  INFO_FIELDS.forEach(function (f) { o[f[0]] = ''; });
  if (!sh || sh.getLastRow() < 2) return o;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    const f = INFO_FIELDS.find(function (x) { return x[1] === String(r[0]).trim(); });
    if (f) o[f[0]] = (f[0] === 'luongToiThieu' || f[0] === 'luongCoSo') ? num_(r[1]) : String(r[1]).trim();
  });
  return o;
}
function listKy_() {
  return load_(T.KY).rows.filter(function (r) { return r.ky; })
    .sort(function (a, b) { return a.ky < b.ky ? 1 : -1; });
}
function getKy_(ky) {
  const r = load_(T.KY).rows.find(function (x) { return x.ky === ky; });
  if (!r) throw new Error('Không tìm thấy kỳ ' + monthDisp_(ky));
  return r;
}
function requireOpen_(ky) {
  const k = getKy_(ky);
  if (k.trangThai === KY_CHOT) throw new Error('Kỳ ' + monthDisp_(ky) + ' đã chốt, không thể chỉnh sửa. Phát sinh cho tháng cũ hãy nhập Truy thu/Thoái thu ở kỳ đang mở.');
  return k;
}
/** "BHXH_NLD; BHYT_NLD=1.2" -> [{ma, tiLe}] */
function parseDS_(s) {
  return String(s || '').split(/[;\n]/).map(function (x) { return x.trim(); }).filter(String).map(function (x) {
    const p = x.split('=');
    const tl = p.length > 1 && String(p[1]).trim() !== '' ? num_(String(p[1]).replace(',', '.')) : null;
    return { ma: p[0].trim(), tiLe: tl };
  });
}
function maplMap_() {
  const m = {};
  load_(T.MAPL).rows.forEach(function (r) {
    if (!r.ma) return;
    const seen = {};
    r.ds = parseDS_(r.khoanNLD).concat(parseDS_(r.khoanDN)).filter(function (x) {
      if (seen[x.ma]) return false; seen[x.ma] = 1; return true;
    });
    m[r.ma] = r;
  });
  return m;
}
/** Chọn phiên bản khoản trích có hiệu lực trong tháng ky (ngày hiệu lực <= cuối tháng) */
function khoanHieuLuc_(rows, ky) {
  const end = ky + '-31';
  const best = {};
  rows.forEach(function (r) {
    if (!r.ma) return;
    const d = r.ngayHL || '0000-00-00';
    if (d > end) return;
    if (!best[r.ma] || d >= (best[r.ma].ngayHL || '0000-00-00')) best[r.ma] = r;
  });
  const m = {};
  Object.keys(best).forEach(function (c) { if (best[c].trangThai !== TT_NGUNG) m[c] = best[c]; });
  return m;
}
function allCodes_(rows) {
  const nld = [], dn = [];
  rows.forEach(function (r) {
    if (!r.ma) return;
    const arr = r.doiTuong === DT_DN ? dn : nld;
    if (nld.indexOf(r.ma) < 0 && dn.indexOf(r.ma) < 0) arr.push(r.ma);
  });
  return nld.concat(dn);
}
function khoanTen_(rows) {
  const m = {};
  rows.slice().sort(function (a, b) { return (a.ngayHL || '') < (b.ngayHL || '') ? -1 : 1; })
    .forEach(function (r) { if (r.ma) m[r.ma] = { ma: r.ma, ten: r.ten, doiTuong: r.doiTuong }; });
  return m;
}

// ---------------------------------------------------------------------
// ENGINE TÍNH TOÁN
// ---------------------------------------------------------------------
function tienKhoan_(k, luong, tiLe) {
  let base = luong;
  const max = num_(k.mucToiDa);
  if (k.loaiTran === TRAN_LUONG && max > 0) base = Math.min(luong, max);
  let amt = base * tiLe / 100;
  if (k.loaiTran === TRAN_DONG && max > 0) amt = Math.min(amt, max);
  return Math.round(amt); // làm tròn đến đồng, từng khoản
}
function tinhTheoPL_(luong, pl, kmap, congDoan) {
  const items = {};
  let nld = 0, dn = 0;
  (pl.ds || []).forEach(function (x) {
    const k = kmap[x.ma];
    if (!k) return;
    if (k.chiDoanVien === CO && congDoan !== CO) return;
    const rate = x.tiLe !== null ? x.tiLe : num_(k.tiLe);
    const a = tienKhoan_(k, luong, rate);
    items[x.ma] = a;
    if (k.doiTuong === DT_DN) dn += a; else nld += a;
  });
  return { items: items, nld: nld, dn: dn };
}
function tinhNV_(nv, ky, kmap, maplMap, ltt) {
  const luong = luongDong_(nv);
  const cb = [];
  let dong = true;
  if (!nv.ngayBHXH) { dong = false; cb.push('Chưa có ngày bắt đầu BHXH'); }
  else if (nv.ngayBHXH.slice(0, 7) > ky) { dong = false; cb.push('Chưa đến tháng bắt đầu BHXH'); }
  if (nv.thangDung && nv.thangDung <= ky) { dong = false; cb.push('Dừng đóng từ ' + monthDisp_(nv.thangDung)); }
  const pl = maplMap[nv.maPL];
  if (dong) {
    if (!nv.maPL) { dong = false; cb.push('Chưa có mã phân loại'); }
    else if (!pl) { dong = false; cb.push('Mã phân loại "' + nv.maPL + '" không tồn tại'); }
    else if (pl.trangThai === TT_NGUNG) { dong = false; cb.push('Mã phân loại "' + nv.maPL + '" đã ngừng áp dụng'); }
  }
  if (dong && luong <= 0) cb.push('Lương đóng BHXH = 0');
  if (dong && ltt > 0 && luong > 0 && luong < ltt) cb.push('Lương đóng thấp hơn lương tối thiểu vùng (' + fmtNum_(ltt) + ')');
  if (nv.ngayNghi && !nv.thangDung) cb.push('Có ngày nghỉ việc nhưng chưa nhập tháng dừng đóng');
  let r = { items: {}, nld: 0, dn: 0 };
  if (dong) r = tinhTheoPL_(luong, pl, kmap, nv.congDoan);
  return { luong: luong, dong: dong, items: r.items, nld: r.nld, dn: r.dn, canhBao: cb };
}
function tinhTruyThu_(r, ctxFn, maplMap) {
  const pl = maplMap[r.maPL];
  const months = monthRange_(r.tuThang, r.denThang);
  if (!pl) return { soThang: months.length, nld: 0, dn: 0, chiTiet: 'Mã phân loại không hợp lệ' };
  const sum = {};
  let nld = 0, dn = 0;
  months.forEach(function (m) {
    const km = ctxFn(m);
    const a = tinhTheoPL_(num_(r.luongMoi), pl, km, r.congDoan);
    const b = tinhTheoPL_(num_(r.luongCu), pl, km, r.congDoan);
    const codes = {};
    Object.keys(a.items).concat(Object.keys(b.items)).forEach(function (c) { codes[c] = 1; });
    Object.keys(codes).forEach(function (c) { sum[c] = (sum[c] || 0) + (a.items[c] || 0) - (b.items[c] || 0); });
    nld += a.nld - b.nld;
    dn += a.dn - b.dn;
  });
  return {
    soThang: months.length, nld: nld, dn: dn,
    chiTiet: Object.keys(sum).filter(function (c) { return sum[c]; }).map(function (c) { return c + ': ' + fmtNum_(sum[c]); }).join('; ')
  };
}
function ctxFactory_() {
  const khoanRows = load_(T.KHOAN).rows;
  const cache = {};
  return { khoanRows: khoanRows, fn: function (m) { return cache[m] || (cache[m] = khoanHieuLuc_(khoanRows, m)); } };
}

// ----- Bảng kết quả (cột khoản trích sinh động theo mã) -----
function kqBaseTitles_() { return T.KQ.cols.map(function (c) { return c[1]; }); }
function loadKQAll_() {
  const sh = getSheet_(T.KQ);
  const header = headerOf_(sh);
  const base = kqBaseTitles_();
  const codes = header.filter(function (h) { return h && base.indexOf(h) < 0; });
  const lr = sh.getLastRow();
  const vals = lr > 1 && header.length ? sh.getRange(2, 1, lr - 1, header.length).getValues() : [];
  const rows = [];
  vals.forEach(function (v) {
    if (v.every(function (x) { return x === ''; })) return;
    const o = {};
    T.KQ.cols.forEach(function (c) { const i = header.indexOf(c[1]); o[c[0]] = i >= 0 ? fromCell_(c[2], v[i]) : ''; });
    o.items = {};
    codes.forEach(function (c) { const n = num_(v[header.indexOf(c)]); if (n) o.items[c] = n; });
    rows.push(o);
  });
  return { codes: codes, rows: rows };
}
function writeKQ_(ky, out, codes) {
  const sh = getSheet_(T.KQ);
  let header = headerOf_(sh);
  if (!header.filter(String).length) header = kqBaseTitles_();
  const oldLen = header.length;
  codes.forEach(function (c) { if (header.indexOf(c) < 0) header.push(c); });
  const lr = sh.getLastRow();
  const old = lr > 1 ? sh.getRange(2, 1, lr - 1, oldLen).getValues() : [];
  const kyCol = header.indexOf('Kỳ');
  const keep = old.filter(function (v) {
    return v.some(function (x) { return x !== ''; }) && normMonth_(v[kyCol]) !== ky;
  }).map(function (v) {
    const a = v.slice();
    while (a.length < header.length) a.push('');
    a[kyCol] = monthDisp_(normMonth_(a[kyCol]));
    return a;
  });
  const fresh = out.map(function (o) {
    const row = buildRow_(T.KQ, header, o, null);
    codes.forEach(function (c) { row[header.indexOf(c)] = o.dong === CO ? (o.items[c] || 0) : ''; });
    return row;
  });
  const all = keep.concat(fresh).sort(function (a, b) {
    const x = normMonth_(a[kyCol]), y = normMonth_(b[kyCol]);
    return x < y ? -1 : (x > y ? 1 : 0);
  });
  if (lr > 1) sh.getRange(2, 1, lr - 1, Math.max(sh.getLastColumn(), 1)).clearContent();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  styleHeader_(sh, header.length);
  if (all.length) {
    ensureRows_(sh, all.length + 1);
    formatRange_(T.KQ, sh, header, 2, all.length);
    codes.forEach(function (c) { sh.getRange(2, header.indexOf(c) + 1, all.length, 1).setNumberFormat('#,##0'); });
    sh.getRange(2, 1, all.length, header.length).setValues(all);
  }
}

// ---------------------------------------------------------------------
// API: KHỞI ĐỘNG
// ---------------------------------------------------------------------
function apiBootstrap() {
  const user = getUser_();
  return {
    user: user,
    info: getInfo_(),
    kys: listKy_(),
    khoan: load_(T.KHOAN).rows,
    mapl: load_(T.MAPL).rows,
    phongBan: load_(T.PB).rows.map(function (r) { return r.ten; }).filter(String),
    lists: LISTS,
    today: Utilities.formatDate(new Date(), tz_(), 'yyyy-MM')
  };
}

// ---------------------------------------------------------------------
// API: KỲ BHXH
// ---------------------------------------------------------------------
function apiListKy() { getUser_(); return listKy_(); }

function apiTaoKy(ky) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  ky = normMonth_(ky);
  if (!ky) throw new Error('Kỳ không hợp lệ.');
  return withLock_(function () {
    const kys = listKy_();
    if (kys.some(function (k) { return k.ky === ky; })) throw new Error('Kỳ ' + monthDisp_(ky) + ' đã tồn tại.');
    if (kys.length && ky < kys[0].ky) throw new Error('Chỉ được tạo kỳ sau kỳ mới nhất (' + monthDisp_(kys[0].ky) + ').');
    const src = kys.length ? kys[0].ky : null;
    const base = src ? load_(T.DLKY).rows.filter(function (r) { return r.ky === src; }) : [];
    const have = {};
    base.forEach(function (r) { have[r.maNV] = 1; });
    let themTuHoSo = 0;
    load_(T.NV).rows.forEach(function (m) {
      if (!m.maNV || have[m.maNV]) return;
      if (m.ngayBHXH && m.ngayBHXH.slice(0, 7) > ky) return;
      base.push(m); have[m.maNV] = 1; themTuHoSo++;
    });
    const copy = base.filter(function (r) { return !r.thangDung || r.thangDung > ky; }).map(function (r) {
      const o = strip_(r);
      o.ky = ky;
      o.luongDong = luongDong_(o);
      return o;
    });
    append_(T.DLKY, copy);
    append_(T.KY, [{ ky: ky, trangThai: KY_MO, ngayTao: now_(), nguoiTao: user.email }]);
    const nguon = src ? 'kỳ ' + monthDisp_(src) : 'tab Danh sách nhân viên';
    log_(user, 'Tạo kỳ', monthDisp_(ky) + ' – ' + copy.length + ' NV, nguồn: ' + nguon);
    return { ky: ky, soNV: copy.length, nguon: nguon, themTuHoSo: src ? themTuHoSo : 0 };
  });
}

function apiTinhKy(ky) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN, ROLE.NHAP]);
  ky = normMonth_(ky);
  return withLock_(function () {
    requireOpen_(ky);
    const res = tinhKy_(ky, user);
    log_(user, 'Tính kỳ', monthDisp_(ky) + ' – ' + res.soDong + '/' + res.soNV + ' NV đóng');
    return res;
  });
}

function tinhKy_(ky, user) {
  const info = getInfo_();
  const ctx = ctxFactory_();
  const maplMap = maplMap_();
  const kmap = ctx.fn(ky);
  const nvs = load_(T.DLKY).rows.filter(function (r) { return r.ky === ky; });
  const codes = allCodes_(ctx.khoanRows);
  let tongNLD = 0, tongDN = 0, soDong = 0, soCB = 0;
  const out = nvs.map(function (nv) {
    const r = tinhNV_(nv, ky, kmap, maplMap, num_(info.luongToiThieu));
    if (r.dong) { soDong++; tongNLD += r.nld; tongDN += r.dn; }
    if (r.canhBao.length) soCB++;
    return {
      ky: ky, maNV: nv.maNV, hoTen: nv.hoTen, maBHXH: nv.maBHXH, phongBan: nv.phongBan, chucDanh: nv.chucDanh,
      maPL: nv.maPL, congDoan: nv.congDoan, luongDong: r.luong, dong: r.dong ? CO : KHONG,
      tongNLD: r.nld, tongDN: r.dn, tongCong: r.nld + r.dn, canhBao: r.canhBao.join('; '), emailQL: nv.emailQL,
      items: r.items
    };
  });
  writeKQ_(ky, out, codes);

  let ttNLD = 0, ttDN = 0;
  load_(T.TT).rows.filter(function (r) { return r.ky === ky; }).forEach(function (r) {
    const c = tinhTruyThu_(r, ctx.fn, maplMap);
    ttNLD += c.nld; ttDN += c.dn;
    update_(T.TT, r._row, { soThang: c.soThang, tienNLD: c.nld, tienDN: c.dn, chiTiet: c.chiTiet });
  });
  update_(T.KY, getKy_(ky)._row, { ngayTinh: now_(), nguoiTinh: user.email });
  return { ky: ky, soNV: nvs.length, soDong: soDong, soCanhBao: soCB, tongNLD: tongNLD, tongDN: tongDN, ttNLD: ttNLD, ttDN: ttDN };
}

function apiChotKy(ky) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  ky = normMonth_(ky);
  return withLock_(function () {
    requireOpen_(ky);
    const res = tinhKy_(ky, user); // tính lại lần cuối trước khi chốt
    update_(T.KY, getKy_(ky)._row, { trangThai: KY_CHOT, ngayChot: now_(), nguoiChot: user.email });
    log_(user, 'Chốt kỳ', monthDisp_(ky));
    return res;
  });
}

// ---------------------------------------------------------------------
// API: NHÂN VIÊN
// ky = '' nghĩa là làm việc trên hồ sơ gốc (tab Danh sách nhân viên)
// ---------------------------------------------------------------------
function apiNhanVien(ky) {
  const user = getUser_();
  ky = normMonth_(ky);
  let rows, trangThai = '', editable;
  if (ky) {
    const k = getKy_(ky);
    trangThai = k.trangThai;
    rows = load_(T.DLKY).rows.filter(function (r) { return r.ky === ky; });
    editable = k.trangThai !== KY_CHOT;
  } else {
    rows = load_(T.NV).rows;
    editable = true;
  }
  editable = editable && user.role !== ROLE.XEM;
  rows = rows.filter(function (r) { return canSee_(user, r); }).map(function (r) {
    r.luongDong = luongDong_(r);
    return r;
  });
  return { ky: ky, trangThai: trangThai, editable: editable, rows: rows };
}

function apiSaveNV(ky, o, isNew) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN, ROLE.NHAP]);
  ky = normMonth_(ky);
  o = cleanNV_(o, user);
  return withLock_(function () {
    const kys = listKy_();
    const latest = kys.length ? kys[0].ky : '';
    if (ky) {
      requireOpen_(ky);
      const dl = load_(T.DLKY);
      const ex = dl.rows.find(function (r) { return r.ky === ky && r.maNV === o.maNV; });
      saveOne_(T.DLKY, ex, Object.assign({ ky: ky }, o), isNew, user);
    }
    // Cập nhật hồ sơ gốc nếu sửa ở kỳ mới nhất hoặc sửa trực tiếp hồ sơ gốc
    if (!ky || ky >= latest) {
      const ex2 = load_(T.NV).rows.find(function (r) { return r.maNV === o.maNV; });
      if (!ky) saveOne_(T.NV, ex2, o, isNew, user);
      else if (ex2) update_(T.NV, ex2._row, o);
      else append_(T.NV, [o]);
    }
    log_(user, isNew ? 'Thêm NV' : 'Sửa NV', (ky ? 'Kỳ ' + monthDisp_(ky) : 'Hồ sơ gốc') + ' – ' + o.maNV + ' ' + o.hoTen);
    return true;
  });
}
function saveOne_(t, ex, o, isNew, user) {
  if (isNew) {
    if (ex) throw new Error('Mã NV "' + o.maNV + '" đã tồn tại.');
    append_(t, [o]);
  } else {
    if (!ex) throw new Error('Không tìm thấy NV "' + o.maNV + '".');
    if (!canSee_(user, ex)) throw new Error('Bạn không quản lý hồ sơ NV này.');
    update_(t, ex._row, o);
  }
}
function cleanNV_(o, user) {
  const r = {};
  NV_COLS.forEach(function (c) { r[c[0]] = o[c[0]] === undefined || o[c[0]] === null ? '' : o[c[0]]; });
  r.maNV = String(r.maNV).trim();
  r.hoTen = String(r.hoTen).trim();
  if (!r.maNV) throw new Error('Chưa nhập Mã NV.');
  if (!r.hoTen) throw new Error('Chưa nhập Họ và tên.');
  ['luongChinh', 'pcKN', 'pcCV', 'pcDH', 'pcKhac'].forEach(function (k) { r[k] = num_(r[k]); });
  r.luongDong = luongDong_(r);
  r.congDoan = r.congDoan === CO ? CO : KHONG;
  r.emailQL = String(r.emailQL || '').toLowerCase().trim();
  if (user.role === ROLE.NHAP) r.emailQL = user.email;
  if (r.maPL && !maplMap_()[r.maPL]) throw new Error('Mã phân loại "' + r.maPL + '" không tồn tại.');
  if (r.thangDung && r.ngayBHXH && normMonth_(r.thangDung) < r.ngayBHXH.slice(0, 7)) {
    throw new Error('Tháng dừng đóng không được trước tháng bắt đầu BHXH.');
  }
  return r;
}

function apiDeleteNV(ky, maNV) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  ky = normMonth_(ky);
  return withLock_(function () {
    let t = T.NV, rows;
    if (ky) { requireOpen_(ky); t = T.DLKY; rows = load_(T.DLKY).rows.filter(function (r) { return r.ky === ky && r.maNV === maNV; }); }
    else rows = load_(T.NV).rows.filter(function (r) { return r.maNV === maNV; });
    if (!rows.length) throw new Error('Không tìm thấy NV.');
    deleteRows_(t, rows.map(function (r) { return r._row; }));
    log_(user, 'Xóa NV', (ky ? 'Kỳ ' + monthDisp_(ky) : 'Hồ sơ gốc') + ' – ' + maNV);
    return true;
  });
}

// ---------------------------------------------------------------------
// API: TRUY THU / THOÁI THU
// ---------------------------------------------------------------------
function apiTruyThu(ky) {
  const user = getUser_();
  ky = normMonth_(ky);
  const k = getKy_(ky);
  const rows = load_(T.TT).rows.filter(function (r) { return r.ky === ky && canSee_(user, r); });
  const nvMap = {};
  load_(T.NV).rows.concat(load_(T.DLKY).rows.filter(function (r) { return r.ky === ky; })).forEach(function (r) {
    if (r.maNV && canSee_(user, r)) nvMap[r.maNV] = { maNV: r.maNV, hoTen: r.hoTen, maPL: r.maPL, congDoan: r.congDoan, luongDong: luongDong_(r), emailQL: r.emailQL };
  });
  return {
    ky: ky, trangThai: k.trangThai, editable: k.trangThai !== KY_CHOT && user.role !== ROLE.XEM,
    rows: rows, nvs: Object.keys(nvMap).map(function (x) { return nvMap[x]; })
  };
}

function apiSaveTruyThu(ky, o) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN, ROLE.NHAP]);
  ky = normMonth_(ky);
  return withLock_(function () {
    requireOpen_(ky);
    const tu = normMonth_(o.tuThang), den = normMonth_(o.denThang);
    if (!o.maNV) throw new Error('Chưa chọn nhân viên.');
    if (!tu || !den) throw new Error('Chưa nhập Từ tháng / Đến tháng.');
    if (tu > den) throw new Error('Từ tháng phải nhỏ hơn hoặc bằng Đến tháng.');
    if (den >= ky) throw new Error('Truy thu/thoái thu chỉ áp dụng cho các tháng trước kỳ ' + monthDisp_(ky) + '.');
    const nv = apiTruyThu(ky).nvs.find(function (x) { return x.maNV === o.maNV; });
    if (!nv) throw new Error('Không tìm thấy NV hoặc bạn không quản lý hồ sơ NV này.');
    const maplMap = maplMap_();
    const rec = {
      ky: ky, maNV: nv.maNV, hoTen: nv.hoTen, tuThang: tu, denThang: den,
      luongCu: num_(o.luongCu), luongMoi: num_(o.luongMoi),
      maPL: o.maPL || nv.maPL, congDoan: o.congDoan === CO ? CO : (o.congDoan === KHONG ? KHONG : nv.congDoan),
      ghiChu: o.ghiChu || '', emailQL: nv.emailQL
    };
    if (!maplMap[rec.maPL]) throw new Error('Mã phân loại không hợp lệ.');
    const c = tinhTruyThu_(rec, ctxFactory_().fn, maplMap);
    rec.soThang = c.soThang; rec.tienNLD = c.nld; rec.tienDN = c.dn; rec.chiTiet = c.chiTiet;
    if (o.id) {
      const ex = load_(T.TT).rows.find(function (r) { return r.id === o.id && r.ky === ky; });
      if (!ex || !canSee_(user, ex)) throw new Error('Không tìm thấy dòng truy thu.');
      rec.id = o.id;
      update_(T.TT, ex._row, rec);
    } else {
      rec.id = 'TT' + Date.now();
      rec.nguoiTao = user.email;
      append_(T.TT, [rec]);
    }
    log_(user, 'Lưu truy thu', monthDisp_(ky) + ' – ' + rec.maNV + ' ' + monthDisp_(tu) + '→' + monthDisp_(den));
    return rec;
  });
}

function apiDeleteTruyThu(ky, id) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN, ROLE.NHAP]);
  ky = normMonth_(ky);
  return withLock_(function () {
    requireOpen_(ky);
    const ex = load_(T.TT).rows.find(function (r) { return r.id === id && r.ky === ky; });
    if (!ex || !canSee_(user, ex)) throw new Error('Không tìm thấy dòng truy thu.');
    deleteRows_(T.TT, [ex._row]);
    log_(user, 'Xóa truy thu', monthDisp_(ky) + ' – ' + ex.maNV);
    return true;
  });
}

// ---------------------------------------------------------------------
// API: BÁO CÁO
// ---------------------------------------------------------------------
function tomTatKy_(kqRows, ttRows) {
  const s = { soNV: 0, soDong: 0, quyLuong: 0, nld: 0, dn: 0, ttNLD: 0, ttDN: 0, soCanhBao: 0, items: {} };
  kqRows.forEach(function (r) {
    s.soNV++;
    if (r.canhBao) s.soCanhBao++;
    if (r.dong !== CO) return;
    s.soDong++; s.quyLuong += r.luongDong; s.nld += r.tongNLD; s.dn += r.tongDN;
    Object.keys(r.items).forEach(function (c) { s.items[c] = (s.items[c] || 0) + r.items[c]; });
  });
  ttRows.forEach(function (r) { s.ttNLD += r.tienNLD; s.ttDN += r.tienDN; });
  s.tong = s.nld + s.dn + s.ttNLD + s.ttDN;
  return s;
}

function apiTongQuan() {
  const user = getUser_();
  const kys = listKy_().slice(0, 12);
  const kq = loadKQAll_().rows.filter(function (r) { return canSee_(user, r); });
  const tt = load_(T.TT).rows.filter(function (r) { return canSee_(user, r); });
  return kys.map(function (k) {
    const rows = kq.filter(function (r) { return r.ky === k.ky; });
    const s = tomTatKy_(rows, tt.filter(function (r) { return r.ky === k.ky; }));
    s.ky = k.ky; s.trangThai = k.trangThai; s.daTinh = !!k.ngayTinh; s.ngayTinh = k.ngayTinh;
    delete s.items;
    return s;
  });
}

function apiBaoCaoChiTiet(ky) {
  const user = getUser_();
  ky = normMonth_(ky);
  const k = getKy_(ky);
  const kq = loadKQAll_();
  const rows = kq.rows.filter(function (r) { return r.ky === ky && canSee_(user, r); });
  const ten = khoanTen_(load_(T.KHOAN).rows);
  const tong = {};
  rows.forEach(function (r) { Object.keys(r.items).forEach(function (c) { tong[c] = (tong[c] || 0) + Math.abs(r.items[c]); }); });
  const codes = kq.codes.filter(function (c) { return tong[c]; }).map(function (c) {
    return ten[c] || { ma: c, ten: c, doiTuong: c.slice(-2) === 'DN' ? DT_DN : DT_NLD };
  });
  codes.sort(function (a, b) { return (a.doiTuong === DT_DN) - (b.doiTuong === DT_DN); });
  const tt = load_(T.TT).rows.filter(function (r) { return r.ky === ky && canSee_(user, r); });
  return { info: getInfo_(), ky: ky, kyInfo: k, codes: codes, rows: rows, truyThu: tt };
}

function apiBienDong(ky) {
  const user = getUser_();
  ky = normMonth_(ky);
  const k = getKy_(ky);
  const prev = listKy_().map(function (x) { return x.ky; }).filter(function (x) { return x < ky; })[0] || '';
  const kq = loadKQAll_().rows.filter(function (r) { return canSee_(user, r); });
  const cur = kq.filter(function (r) { return r.ky === ky; });
  if (!cur.length) throw new Error('Kỳ ' + monthDisp_(ky) + ' chưa được tính. Hãy bấm "Tính" ở màn hình Kỳ BHXH.');
  const pre = prev ? kq.filter(function (r) { return r.ky === prev; }) : [];
  const dl = {};
  load_(T.DLKY).rows.forEach(function (r) { if (r.ky === ky || r.ky === prev) dl[r.ky + '|' + r.maNV] = r; });
  const P = {}, C = {};
  pre.forEach(function (r) { P[r.maNV] = r; });
  cur.forEach(function (r) { C[r.maNV] = r; });
  const out = [];
  const add = function (loai, c, p, ghiChu) {
    const x = c || p;
    out.push({
      loai: loai, maNV: x.maNV, hoTen: x.hoTen, maBHXH: x.maBHXH, chucDanh: x.chucDanh, phongBan: x.phongBan,
      luongCu: p ? p.luongDong : '', luongMoi: c && c.dong === CO ? c.luongDong : '',
      maPLCu: p ? p.maPL : '', maPLMoi: c ? c.maPL : '', tuThang: ky, denThang: '', ghiChu: ghiChu || ''
    });
  };
  const lyDoGiam = function (maNV, fallback) {
    const d = dl[ky + '|' + maNV] || dl[prev + '|' + maNV];
    const a = [];
    if (d && d.ngayNghi) a.push('Nghỉ việc ngày ' + dateDisp_(d.ngayNghi));
    if (d && d.thangDung) a.push('Dừng đóng từ ' + monthDisp_(d.thangDung));
    return a.join('; ') || fallback || '';
  };
  if (prev) {
    cur.forEach(function (c) {
      const p = P[c.maNV];
      const cd = c.dong === CO, pd = !!p && p.dong === CO;
      if (cd && !pd) add('Tăng mới', c, null, p ? 'Đóng lại' : '');
      else if (!cd && pd) add('Giảm', c, p, lyDoGiam(c.maNV, c.canhBao));
      else if (cd && pd) {
        if (c.luongDong !== p.luongDong) add(c.luongDong > p.luongDong ? 'Điều chỉnh tăng lương' : 'Điều chỉnh giảm lương', c, p);
        if (c.maPL !== p.maPL) add('Đổi mã phân loại', c, p);
      }
    });
    pre.forEach(function (p) { if (!C[p.maNV] && p.dong === CO) add('Giảm', null, p, lyDoGiam(p.maNV, 'Không có trong kỳ')); });
  }
  load_(T.TT).rows.filter(function (r) { return r.ky === ky && canSee_(user, r); }).forEach(function (t) {
    out.push({
      loai: (t.tienNLD + t.tienDN) >= 0 ? 'Truy thu' : 'Thoái thu', maNV: t.maNV, hoTen: t.hoTen,
      maBHXH: (C[t.maNV] || P[t.maNV] || {}).maBHXH || '', chucDanh: (C[t.maNV] || {}).chucDanh || '',
      phongBan: (C[t.maNV] || {}).phongBan || '', luongCu: t.luongCu, luongMoi: t.luongMoi,
      maPLCu: t.maPL, maPLMoi: t.maPL, tuThang: t.tuThang, denThang: t.denThang,
      ghiChu: [t.ghiChu, 'NLĐ: ' + fmtNum_(t.tienNLD) + ', DN: ' + fmtNum_(t.tienDN)].filter(String).join(' – ')
    });
  });
  return { info: getInfo_(), ky: ky, prev: prev, kyInfo: k, rows: out };
}

function apiTongHop(nam) {
  const user = getUser_();
  nam = String(nam);
  const all = listKy_();
  const years = [];
  all.forEach(function (k) { const y = k.ky.slice(0, 4); if (years.indexOf(y) < 0) years.push(y); });
  const kys = all.filter(function (k) { return k.ky.slice(0, 4) === nam; }).reverse();
  const kq = loadKQAll_();
  const rows = kq.rows.filter(function (r) { return r.ky.slice(0, 4) === nam && canSee_(user, r); });
  const tt = load_(T.TT).rows.filter(function (r) { return r.ky.slice(0, 4) === nam && canSee_(user, r); });
  const months = kys.map(function (k) {
    const s = tomTatKy_(rows.filter(function (r) { return r.ky === k.ky; }), tt.filter(function (r) { return r.ky === k.ky; }));
    s.ky = k.ky; s.trangThai = k.trangThai; s.daTinh = !!k.ngayTinh;
    return s;
  });
  const ten = khoanTen_(load_(T.KHOAN).rows);
  const codes = kq.codes.filter(function (c) { return months.some(function (m) { return m.items[c]; }); }).map(function (c) {
    const o = ten[c] || { ma: c, ten: c, doiTuong: '' };
    return { ma: o.ma, ten: o.ten, doiTuong: o.doiTuong };
  });
  codes.sort(function (a, b) { return (a.doiTuong === DT_DN) - (b.doiTuong === DT_DN); });
  return { info: getInfo_(), nam: nam, years: years, months: months, codes: codes };
}

// ---------------------------------------------------------------------
// API: XUẤT EXCEL / PDF
// ---------------------------------------------------------------------
function apiXuat(loai, thamSo, format) {
  const doc = buildDoc_(loai, thamSo);
  return makeFile_(doc, format === 'pdf' ? 'pdf' : 'xlsx');
}

function buildDoc_(loai, p) {
  if (loai === 'chitiet') {
    const d = apiBaoCaoChiTiet(p);
    const header = ['STT', 'Mã NV', 'Họ và tên', 'Mã số BHXH', 'Đơn vị_Phòng ban', 'Mã PL', 'Lương đóng BHXH']
      .concat(d.codes.map(function (c) { return c.ten + ' (' + c.ma + ')'; }))
      .concat(['Tổng NLĐ', 'Tổng DN', 'Tổng cộng', 'Ghi chú']);
    const dong = d.rows.filter(function (r) { return r.dong === CO; })
      .sort(function (a, b) { return (a.phongBan + a.maNV) < (b.phongBan + b.maNV) ? -1 : 1; });
    const rows = dong.map(function (r, i) {
      return [i + 1, r.maNV, r.hoTen, r.maBHXH, r.phongBan, r.maPL, r.luongDong]
        .concat(d.codes.map(function (c) { return r.items[c.ma] || 0; }))
        .concat([r.tongNLD, r.tongDN, r.tongCong, r.canhBao]);
    });
    const sum = function (col) { return rows.reduce(function (s, r) { return s + (Number(r[col]) || 0); }, 0); };
    const total = ['', '', 'TỔNG CỘNG', '', '', '', sum(6)];
    for (let c = 7; c < header.length - 1; c++) total.push(sum(c));
    total.push('');
    const numCols = [];
    for (let c = 6; c < header.length - 1; c++) numCols.push(c);
    const sections = [{ title: 'Danh sách NV đóng BHXH (' + dong.length + ' người)', header: header, rows: rows, total: total, numCols: numCols }];
    if (d.truyThu.length) {
      const h2 = ['STT', 'Mã NV', 'Họ và tên', 'Từ tháng', 'Đến tháng', 'Số tháng', 'Lương cũ', 'Lương mới', 'Chênh lệch NLĐ', 'Chênh lệch DN', 'Chi tiết', 'Ghi chú'];
      const r2 = d.truyThu.map(function (t, i) {
        return [i + 1, t.maNV, t.hoTen, monthDisp_(t.tuThang), monthDisp_(t.denThang), t.soThang, t.luongCu, t.luongMoi, t.tienNLD, t.tienDN, t.chiTiet, t.ghiChu];
      });
      const tot2 = ['', '', 'TỔNG', '', '', '', '', '',
        r2.reduce(function (s, r) { return s + r[8]; }, 0), r2.reduce(function (s, r) { return s + r[9]; }, 0), '', ''];
      sections.push({ title: 'Truy thu / Thoái thu', header: h2, rows: r2, total: tot2, numCols: [6, 7, 8, 9] });
    }
    return { info: d.info, title: 'BẢNG TÍNH BHXH – KỲ ' + monthDisp_(d.ky), fileName: 'BHXH_ChiTiet_' + d.ky, sections: sections };
  }
  if (loai === 'biendong') {
    const d = apiBienDong(p);
    const header = ['STT', 'Loại biến động', 'Mã NV', 'Họ và tên', 'Mã số BHXH', 'Chức danh', 'Đơn vị_Phòng ban',
      'Lương cũ', 'Lương mới', 'Mã PL cũ', 'Mã PL mới', 'Từ tháng', 'Đến tháng', 'Ghi chú'];
    const rows = d.rows.map(function (r, i) {
      return [i + 1, r.loai, r.maNV, r.hoTen, r.maBHXH, r.chucDanh, r.phongBan, r.luongCu, r.luongMoi,
        r.maPLCu, r.maPLMoi, monthDisp_(r.tuThang), monthDisp_(r.denThang), r.ghiChu];
    });
    return {
      info: d.info, title: 'BÁO CÁO BIẾN ĐỘNG TĂNG/GIẢM – KỲ ' + monthDisp_(d.ky),
      subtitle: d.prev ? 'So với kỳ ' + monthDisp_(d.prev) : 'Không có kỳ trước để so sánh',
      fileName: 'BHXH_BienDong_' + d.ky, sections: [{ title: '', header: header, rows: rows, numCols: [7, 8] }]
    };
  }
  if (loai === 'tonghop') {
    const d = apiTongHop(p);
    const h1 = ['Kỳ', 'Trạng thái', 'Số NV đóng', 'Quỹ lương đóng', 'NLĐ đóng', 'DN đóng', 'Truy thu NLĐ', 'Truy thu DN', 'Tổng phải nộp'];
    const r1 = d.months.map(function (m) {
      return [monthDisp_(m.ky), m.trangThai, m.soDong, m.quyLuong, m.nld, m.dn, m.ttNLD, m.ttDN, m.tong];
    });
    const s = function (i) { return r1.reduce(function (a, r) { return a + r[i]; }, 0); };
    const t1 = ['CẢ NĂM', '', '', s(3), s(4), s(5), s(6), s(7), s(8)];
    const h2 = ['Mã khoản', 'Tên khoản', 'Đối tượng'].concat(d.months.map(function (m) { return monthDisp_(m.ky); })).concat(['Cả năm']);
    const r2 = d.codes.map(function (c) {
      const vals = d.months.map(function (m) { return m.items[c.ma] || 0; });
      return [c.ma, c.ten, c.doiTuong].concat(vals).concat([vals.reduce(function (a, b) { return a + b; }, 0)]);
    });
    const nc2 = [];
    for (let i = 3; i < h2.length; i++) nc2.push(i);
    return {
      info: d.info, title: 'TỔNG HỢP BHXH NĂM ' + d.nam, fileName: 'BHXH_TongHop_' + d.nam,
      sections: [
        { title: 'Tổng hợp theo tháng', header: h1, rows: r1, total: t1, numCols: [2, 3, 4, 5, 6, 7, 8] },
        { title: 'Chi tiết theo khoản trích (không gồm truy thu)', header: h2, rows: r2, numCols: nc2 }
      ]
    };
  }
  throw new Error('Loại báo cáo không hợp lệ.');
}

function makeFile_(doc, format) {
  const width = Math.max.apply(null, doc.sections.map(function (s) { return s.header.length; }).concat([4]));
  const grid = [];
  const styles = []; // {row, type, len, numCols}
  const push = function (arr) { const a = arr.slice(); while (a.length < width) a.push(''); grid.push(a); };
  push([doc.info.tenCty || '']);
  push([(doc.info.mst ? 'MST: ' + doc.info.mst : '') + (doc.info.diaChi ? '   Địa chỉ: ' + doc.info.diaChi : '')]);
  push([doc.title]); styles.push({ row: grid.length, type: 'title' });
  push([doc.subtitle || ('Ngày xuất: ' + now_())]);
  push([]);
  doc.sections.forEach(function (s) {
    if (s.title) { push([s.title]); styles.push({ row: grid.length, type: 'sec' }); }
    push(s.header); styles.push({ row: grid.length, type: 'head', len: s.header.length });
    const start = grid.length + 1;
    s.rows.forEach(push);
    if (s.total) { push(s.total); styles.push({ row: grid.length, type: 'total', len: s.header.length }); }
    const end = grid.length;
    if (end >= start) styles.push({ type: 'num', start: start, end: end, cols: s.numCols || [], len: s.header.length });
    push([]);
  });

  const tmp = SpreadsheetApp.create(doc.fileName);
  try {
    const sh = tmp.getSheets()[0];
    sh.setName('Bao cao');
    if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
    if (sh.getMaxRows() < grid.length) sh.insertRowsAfter(sh.getMaxRows(), grid.length - sh.getMaxRows());
    const rg = sh.getRange(1, 1, grid.length, width);
    rg.setNumberFormat('@');
    styles.forEach(function (st) {
      if (st.type === 'num') st.cols.forEach(function (c) { sh.getRange(st.start, c + 1, st.end - st.start + 1, 1).setNumberFormat('#,##0'); });
    });
    rg.setValues(grid).setFontFamily('Arial').setFontSize(9).setVerticalAlignment('middle');
    sh.getRange(1, 1).setFontWeight('bold');
    styles.forEach(function (st) {
      if (st.type === 'title') sh.getRange(st.row, 1).setFontWeight('bold').setFontSize(14);
      if (st.type === 'sec') sh.getRange(st.row, 1).setFontWeight('bold').setFontSize(11);
      if (st.type === 'head') sh.getRange(st.row, 1, 1, st.len).setFontWeight('bold').setBackground('#dbe5f1').setWrap(true).setHorizontalAlignment('center');
      if (st.type === 'total') sh.getRange(st.row, 1, 1, st.len).setFontWeight('bold').setBackground('#f2f2f2');
      if (st.type === 'num') sh.getRange(st.start - 1, 1, st.end - st.start + 2, st.len).setBorder(true, true, true, true, true, true, '#999999', SpreadsheetApp.BorderStyle.SOLID);
    });
    sh.autoResizeColumns(1, width);
    sh.setColumnWidth(1, 60);
    SpreadsheetApp.flush();
    const q = format === 'pdf'
      ? 'format=pdf&size=A4&portrait=false&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=CENTER&top_margin=0.4&bottom_margin=0.4&left_margin=0.3&right_margin=0.3'
      : 'format=xlsx';
    const resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + tmp.getId() + '/export?' + q, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) throw new Error('Không xuất được file (mã lỗi ' + resp.getResponseCode() + ').');
    return {
      name: doc.fileName + (format === 'pdf' ? '.pdf' : '.xlsx'),
      mime: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: Utilities.base64Encode(resp.getBlob().getBytes())
    };
  } finally {
    DriveApp.getFileById(tmp.getId()).setTrashed(true);
  }
}

// ---------------------------------------------------------------------
// API: THIẾT LẬP (Admin)
// ---------------------------------------------------------------------
function apiSaveInfo(o) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  const sh = SpreadsheetApp.getActive().getSheetByName(INFO_SHEET);
  if (!sh) throw new Error('Không tìm thấy tab "' + INFO_SHEET + '".');
  const lr = Math.max(sh.getLastRow(), 1);
  const labels = lr > 1 ? sh.getRange(2, 1, lr - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); }) : [];
  INFO_FIELDS.forEach(function (f) {
    if (o[f[0]] === undefined) return;
    let i = labels.indexOf(f[1]);
    let row;
    if (i < 0) { row = sh.getLastRow() + 1; sh.getRange(row, 1).setValue(f[1]); labels.push(f[1]); }
    else row = i + 2;
    const isNum = f[0] === 'luongToiThieu' || f[0] === 'luongCoSo';
    sh.getRange(row, 2).setNumberFormat(isNum ? '#,##0' : '@').setValue(isNum ? num_(o[f[0]]) : String(o[f[0]]));
  });
  log_(user, 'Sửa thông tin chung', '');
  return getInfo_();
}

function apiSavePhongBan(list) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  const names = [];
  (list || []).forEach(function (x) { x = String(x).trim(); if (x && names.indexOf(x) < 0) names.push(x); });
  return withLock_(function () {
    const d = load_(T.PB);
    const note = {};
    d.rows.forEach(function (r) { note[r.ten] = r.ghiChu; });
    const sh = d.sh;
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    append_(T.PB, names.map(function (n) { return { ten: n, ghiChu: note[n] || '' }; }));
    log_(user, 'Cập nhật phòng ban', names.length + ' đơn vị');
    return names;
  });
}

function apiSaveKhoan(o) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  const r = {
    ten: String(o.ten || '').trim(), ma: String(o.ma || '').trim().toUpperCase(), doiTuong: o.doiTuong,
    tiLe: num_(o.tiLe), loaiTran: o.loaiTran || TRAN_KHONG, mucToiDa: num_(o.mucToiDa),
    ngayHL: normDate_(o.ngayHL), trangThai: o.trangThai || TT_AD, chiDoanVien: o.chiDoanVien === CO ? CO : KHONG,
    ghiChu: o.ghiChu || ''
  };
  if (!r.ten || !r.ma) throw new Error('Chưa nhập Tên khoản hoặc Mã nhận diện.');
  if (!/^[A-Z0-9_]+$/.test(r.ma)) throw new Error('Mã nhận diện chỉ gồm chữ không dấu, số và dấu gạch dưới (VD: BHXH_NLD).');
  if (LISTS.doiTuong.indexOf(r.doiTuong) < 0) throw new Error('Đối tượng áp dụng không hợp lệ.');
  if (!r.ngayHL) throw new Error('Chưa nhập Ngày hiệu lực.');
  if (r.loaiTran !== TRAN_KHONG && r.mucToiDa <= 0) throw new Error('Chưa nhập Mức tối đa cho loại trần đã chọn.');
  return withLock_(function () {
    const d = load_(T.KHOAN);
    const other = d.rows.filter(function (x) { return x.ma === r.ma && (!o._row || x._row !== o._row); });
    if (other.some(function (x) { return x.doiTuong !== r.doiTuong; })) throw new Error('Mã ' + r.ma + ' đã được dùng cho đối tượng khác.');
    if (other.some(function (x) { return x.ngayHL === r.ngayHL; })) throw new Error('Mã ' + r.ma + ' đã có phiên bản cùng ngày hiệu lực ' + dateDisp_(r.ngayHL) + '.');
    if (o._row) {
      const ex = d.rows.find(function (x) { return x._row === Number(o._row); });
      if (!ex) throw new Error('Không tìm thấy dòng cần sửa.');
      r.id = ex.id;
      update_(T.KHOAN, ex._row, r);
    } else {
      r.id = 'K' + Date.now();
      append_(T.KHOAN, [r]);
    }
    log_(user, 'Lưu khoản trích', r.ma + ' ' + r.tiLe + '% từ ' + dateDisp_(r.ngayHL));
    return load_(T.KHOAN).rows;
  });
}

function apiDeleteKhoan(row) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  return withLock_(function () {
    const ex = load_(T.KHOAN).rows.find(function (x) { return x._row === Number(row); });
    if (!ex) throw new Error('Không tìm thấy dòng.');
    deleteRows_(T.KHOAN, [ex._row]);
    log_(user, 'Xóa khoản trích', ex.ma + ' hiệu lực ' + dateDisp_(ex.ngayHL));
    return load_(T.KHOAN).rows;
  });
}

function apiSaveMaPL(o, isNew) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  const ma = String(o.ma || '').trim();
  if (!ma) throw new Error('Chưa nhập Mã phân loại.');
  const ten = khoanTen_(load_(T.KHOAN).rows);
  const nld = [], dn = [];
  (o.ds || []).forEach(function (x) {
    const k = ten[x.ma];
    if (!k) return;
    const s = x.ma + (x.tiLe !== null && x.tiLe !== '' && x.tiLe !== undefined ? '=' + num_(x.tiLe) : '');
    (k.doiTuong === DT_DN ? dn : nld).push(s);
  });
  const r = { ma: ma, moTa: o.moTa || '', trangThai: o.trangThai || TT_AD, khoanNLD: nld.join('; '), khoanDN: dn.join('; '), ghiChu: o.ghiChu || '' };
  return withLock_(function () {
    const d = load_(T.MAPL);
    const ex = d.rows.find(function (x) { return x.ma === ma; });
    if (isNew) { if (ex) throw new Error('Mã phân loại "' + ma + '" đã tồn tại.'); append_(T.MAPL, [r]); }
    else { if (!ex) throw new Error('Không tìm thấy mã phân loại.'); update_(T.MAPL, ex._row, r); }
    log_(user, 'Lưu mã phân loại', ma + ' | NLĐ: ' + r.khoanNLD + ' | DN: ' + r.khoanDN);
    return load_(T.MAPL).rows;
  });
}

function apiDeleteMaPL(ma) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  return withLock_(function () {
    const used = load_(T.NV).rows.concat(load_(T.DLKY).rows).some(function (r) { return r.maPL === ma; });
    if (used) throw new Error('Mã "' + ma + '" đang được sử dụng. Hãy chuyển Trạng thái sang "Ngừng áp dụng" thay vì xóa.');
    const ex = load_(T.MAPL).rows.find(function (x) { return x.ma === ma; });
    if (!ex) throw new Error('Không tìm thấy mã.');
    deleteRows_(T.MAPL, [ex._row]);
    log_(user, 'Xóa mã phân loại', ma);
    return load_(T.MAPL).rows;
  });
}

function apiPhanQuyen() {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  return load_(T.PQ).rows;
}

function apiSavePQ(o) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  const r = { email: String(o.email || '').toLowerCase().trim(), hoTen: o.hoTen || '', vaiTro: o.vaiTro, trangThai: o.trangThai || PQ_HD, ghiChu: o.ghiChu || '' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) throw new Error('Email không hợp lệ.');
  if (LISTS.role.indexOf(r.vaiTro) < 0) throw new Error('Vai trò không hợp lệ.');
  return withLock_(function () {
    const d = load_(T.PQ);
    const ex = d.rows.find(function (x) { return x.email.toLowerCase() === r.email; });
    if (ex && ex.email.toLowerCase() === user.email && (r.vaiTro !== ROLE.ADMIN || r.trangThai === PQ_KHOA)) {
      throw new Error('Bạn không thể tự hạ quyền hoặc khóa chính mình.');
    }
    if (ex) update_(T.PQ, ex._row, r); else append_(T.PQ, [r]);
    log_(user, 'Phân quyền', r.email + ' → ' + r.vaiTro + ' (' + r.trangThai + ')');
    return load_(T.PQ).rows;
  });
}

function apiDeletePQ(email) {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  email = String(email).toLowerCase();
  if (email === user.email) throw new Error('Bạn không thể xóa chính mình.');
  return withLock_(function () {
    const ex = load_(T.PQ).rows.find(function (x) { return x.email.toLowerCase() === email; });
    if (!ex) throw new Error('Không tìm thấy.');
    deleteRows_(T.PQ, [ex._row]);
    log_(user, 'Xóa phân quyền', email);
    return load_(T.PQ).rows;
  });
}

function apiNhatKy() {
  const user = getUser_();
  requireRole_(user, [ROLE.ADMIN]);
  return load_(T.LOG).rows.slice(-500).reverse();
}
