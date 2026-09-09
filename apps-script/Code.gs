/**
 * Code.gs
 * TOÀN BỘ ứng dụng "Quản lý công việc nhóm" gộp trong 1 file duy nhất
 * (không cần file .html nào - CSS nhúng thẳng bên dưới dưới dạng chuỗi).
 *
 * Kiến trúc: server-rendered pages (doGet/doPost) + <form> HTML thuần,
 * KHÔNG dùng google.script.run - vì một số mạng nội bộ (trường học) chặn
 * kênh RPC/AJAX ngầm đó khiến trang treo vô thời hạn. Mỗi thao tác gửi
 * 1 request HTTP GET/POST chuẩn như mọi trang web thông thường.
 */

// ============================================================
// Constants.gs
// ============================================================
/**
 * Constants.gs
 * Tên sheet, tên cột, danh sách trạng thái và hằng số dùng chung toàn hệ thống.
 */

// ID của Google Spreadsheet dùng làm cơ sở dữ liệu.
// Nếu để trống, script sẽ dùng Spreadsheet đang active (khi bound script)
// hoặc tạo/mở theo SCRIPT_PROPERTIES key "SPREADSHEET_ID".
var SPREADSHEET_ID_PROPERTY_KEY = 'SPREADSHEET_ID';

var SHEET_NAMES = {
  NHAN_SU: 'NhanSu',
  DON_VI: 'DonVi',
  PHAN_MUC: 'PhanMuc',
  MA_DIEM: 'MaDiem',
  HO_SO: 'HoSo',
  CONG_VIEC: 'CongViec',
  CHAT_CONG_VIEC: 'ChatCongViec',
  CHAT_TRA_CUU: 'ChatTraCuu',
  PHIEU_DIEM: 'PhieuDiem'
};

// Vai trò hệ thống (thấp -> cao)
var ROLES = {
  NHAN_VIEN: 'NhanVien',
  TRUONG_NHOM: 'TruongNhom',
  QUAN_LY: 'QuanLy', // Trưởng đơn vị / TĐV - duyệt & đánh giá công việc
  ADMIN: 'Admin'     // Quản trị hệ thống - toàn quyền Thiết lập
};

var ROLE_LABELS = {
  NhanVien: 'Nhân viên',
  TruongNhom: 'Trưởng nhóm',
  QuanLy: 'Quản lý (Trưởng đơn vị)',
  Admin: 'Admin hệ thống'
};

var ROLE_RANK = {
  NhanVien: 1,
  TruongNhom: 2,
  QuanLy: 3,
  Admin: 4
};

// Trạng thái hồ sơ
var HOSO_STATUS = {
  MOI: 'Mới',
  DA_PHAN_CONG: 'Đã phân công',
  DANG_XU_LY: 'Đang xử lý',
  DA_HOAN_THANH: 'Đã hoàn thành',
  TU_CHOI: 'Từ chối'
};

// Trạng thái công việc
var CONGVIEC_STATUS = {
  CAN_LAM: 'Cần làm',
  DANG_LAM: 'Đang làm',
  DA_NOP: 'Đã nộp',
  TDV_XAC_NHAN: 'TĐV xác nhận',
  TAM_NGUNG: 'Tạm ngưng',
  HUY_BO: 'Hủy bỏ'
};

var CONGVIEC_STATUS_LIST = [
  CONGVIEC_STATUS.CAN_LAM,
  CONGVIEC_STATUS.DANG_LAM,
  CONGVIEC_STATUS.DA_NOP,
  CONGVIEC_STATUS.TDV_XAC_NHAN,
  CONGVIEC_STATUS.TAM_NGUNG,
  CONGVIEC_STATUS.HUY_BO
];

// Trạng thái phiếu điểm
var PHIEU_DIEM_STATUS = {
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  TU_CHOI: 'Từ chối'
};

var DIEM_MAC_DINH_CONG_VIEC = 100;

// Cột (header) từng sheet - dùng để tạo sheet mới & đọc/ghi theo tên cột an toàn
var COLUMNS = {
  NHAN_SU: ['Email', 'HoTen', 'DonVi', 'VaiTro', 'TrangThai', 'NgayTao'],
  DON_VI: ['MaDonVi', 'TenDonVi', 'TrangThai'],
  PHAN_MUC: ['MaPhanMuc', 'TenPhanMuc', 'TrangThai'],
  MA_DIEM: ['MaDiem', 'LyDo', 'SoDiem', 'TrangThai'],
  HO_SO: [
    'MaHoSo', 'MaXacNhan', 'HoTen', 'Email', 'SoDienThoai', 'DonVi',
    'TieuDe', 'PhanMuc', 'NoiDungChiTiet', 'TaiLieuDinhKem',
    'TrangThai', 'NguoiPhuTrach', 'ThoiHan', 'LyDoTuChoi', 'LinkKetQua',
    'MaCongViec', 'NgayTao', 'NgayCapNhat'
  ],
  CONG_VIEC: [
    'MaCongViec', 'MaHoSo', 'NoiDung', 'NguoiPhuTrach', 'MoTa',
    'TaiLieuDinhKem', 'TrangThai', 'PhanLoai', 'ThoiGianBatDau', 'ThoiHan',
    'ThoiGianHoanThanh', 'DiemHienTai', 'MaDanhGiaTDV', 'GhiChuTDV',
    'NguoiTao', 'NgayTao', 'NgayCapNhat'
  ],
  CHAT_CONG_VIEC: ['MaCongViec', 'ThoiGian', 'NguoiGui', 'NoiDung'],
  CHAT_TRA_CUU: ['MaHoSo', 'ThoiGian', 'NguoiGui', 'NoiDung'],
  PHIEU_DIEM: [
    'MaPhieu', 'NgayTao', 'NguoiTao', 'NhanSuDuocDeXuat', 'MaDiem',
    'SoDiem', 'NoiDung', 'MaCongViecLienQuan', 'TrangThai',
    'NguoiDuyet', 'NgayDuyet', 'LyDoTuChoi'
  ]
};

var TRANG_THAI_HOAT_DONG = {
  HOAT_DONG: 'Hoạt động',
  NGUNG: 'Ngừng'
};

// ============================================================
// Utils.gs
// ============================================================
/**
 * Utils.gs
 * Hàm tiện ích chung: sinh mã, định dạng ngày, validate...
 */

function pad2_(n) {
  return n < 10 ? '0' + n : String(n);
}

function todayYYYYMMDD_() {
  var d = new Date();
  return '' + d.getFullYear() + pad2_(d.getMonth() + 1) + pad2_(d.getDate());
}

/** Sinh mã hồ sơ dạng HS-YYYYMMDD-#### (số thứ tự trong ngày) */
function generateMaHoSo_() {
  var ymd = todayYYYYMMDD_();
  var prefix = 'HS-' + ymd + '-';
  var all = readAll_(SHEET_NAMES.HO_SO);
  var maxSeq = 0;
  all.forEach(function (r) {
    var ma = String(r.MaHoSo || '');
    if (ma.indexOf(prefix) === 0) {
      var seq = parseInt(ma.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  var next = maxSeq + 1;
  var seqStr = next < 10 ? '000' + next : next < 100 ? '00' + next : next < 1000 ? '0' + next : String(next);
  return prefix + seqStr;
}

/** Sinh mã xác nhận ngẫu nhiên 6 ký tự (chữ hoa + số, bỏ ký tự dễ nhầm) */
function generateMaXacNhan_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < 6; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function generateMaCongViec_() {
  var prefix = 'CV-' + todayYYYYMMDD_() + '-';
  var all = readAll_(SHEET_NAMES.CONG_VIEC);
  var maxSeq = 0;
  all.forEach(function (r) {
    var ma = String(r.MaCongViec || '');
    if (ma.indexOf(prefix) === 0) {
      var seq = parseInt(ma.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  var next = maxSeq + 1;
  var seqStr = next < 10 ? '000' + next : next < 100 ? '00' + next : next < 1000 ? '0' + next : String(next);
  return prefix + seqStr;
}

function generateMaPhieuDiem_() {
  var prefix = 'PD-' + todayYYYYMMDD_() + '-';
  var all = readAll_(SHEET_NAMES.PHIEU_DIEM);
  var maxSeq = 0;
  all.forEach(function (r) {
    var ma = String(r.MaPhieu || '');
    if (ma.indexOf(prefix) === 0) {
      var seq = parseInt(ma.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  var next = maxSeq + 1;
  var seqStr = next < 10 ? '00' + next : next < 100 ? '0' + next : String(next);
  return prefix + seqStr;
}

function nowStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

/** Tách chuỗi nhiều link (ngăn cách bởi xuống dòng hoặc dấu phẩy) thành mảng, loại bỏ rỗng */
function parseLinks_(text) {
  if (!text) return [];
  return String(text)
    .split(/[\n,;]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

function joinLinks_(arr) {
  return (arr || []).filter(function (s) { return s && String(s).trim(); }).join('\n');
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function throwIf_(cond, msg) {
  if (cond) throw new Error(msg);
}

// ============================================================
// SheetDB.gs
// ============================================================
/**
 * SheetDB.gs
 * Lớp truy xuất dữ liệu chung: mở Spreadsheet, đảm bảo sheet/tiêu đề tồn tại,
 * đọc/ghi theo tên cột (không phụ thuộc thứ tự cột vật lý).
 */

// Cache Spreadsheet đã mở trong phạm vi 1 lượt thực thi (1 request) - tránh
// mở lại nhiều lần (SpreadsheetApp.openById tốn thời gian) khi 1 trang gọi
// nhiều hàm đọc/ghi sheet khác nhau.
var CACHED_DB_ = null;

function getDb_() {
  if (CACHED_DB_) return CACHED_DB_;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SPREADSHEET_ID_PROPERTY_KEY);
  if (id) {
    CACHED_DB_ = SpreadsheetApp.openById(id);
    return CACHED_DB_;
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty(SPREADSHEET_ID_PROPERTY_KEY, active.getId());
    CACHED_DB_ = active;
    return CACHED_DB_;
  }
  // Chưa có DB nào -> tạo mới
  var ss = SpreadsheetApp.create('QuizPro - CSDL Quản lý công việc nhóm');
  props.setProperty(SPREADSHEET_ID_PROPERTY_KEY, ss.getId());
  CACHED_DB_ = ss;
  return CACHED_DB_;
}

var CACHED_SHEETS_ = {};

function getSheet_(sheetName) {
  if (CACHED_SHEETS_[sheetName]) return CACHED_SHEETS_[sheetName];
  var ss = getDb_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headerKey = Object.keys(SHEET_NAMES).filter(function (k) {
      return SHEET_NAMES[k] === sheetName;
    })[0];
    var headers = COLUMNS[headerKey] || [];
    if (headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
  CACHED_SHEETS_[sheetName] = sheet;
  return sheet;
}

/** Đảm bảo mọi sheet + header cần thiết đã tồn tại. Gọi khi khởi tạo hệ thống. */
function ensureAllSheets_() {
  Object.keys(SHEET_NAMES).forEach(function (key) {
    getSheet_(SHEET_NAMES[key]);
  });
}

function getHeaderMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function (h, idx) {
    if (h) map[h] = idx;
  });
  return map;
}

/** Đọc toàn bộ sheet thành mảng object {tenCot: giaTri} */
function readAll_(sheetName) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return [];
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var obj = { _row: r + 2 };
    var isEmpty = true;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      obj[headers[c]] = values[r][c];
      if (values[r][c] !== '' && values[r][c] !== null) isEmpty = false;
    }
    if (!isEmpty) out.push(obj);
  }
  return out;
}

/** Thêm 1 dòng theo object {tenCot: giaTri} */
function appendRow_(sheetName, obj) {
  var sheet = getSheet_(sheetName);
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = headers.map(function (h) {
    return obj.hasOwnProperty(h) ? obj[h] : '';
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/** Tìm 1 dòng theo điều kiện field=value, trả về object hoặc null */
function findOne_(sheetName, field, value) {
  var rows = readAll_(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][field]) === String(value)) return rows[i];
  }
  return null;
}

/** Tìm nhiều dòng theo điều kiện field=value */
function findMany_(sheetName, field, value) {
  var rows = readAll_(sheetName);
  return rows.filter(function (r) {
    return String(r[field]) === String(value);
  });
}

/** Cập nhật 1 dòng (theo số dòng vật lý _row) với các field mới - merge object */
function updateRow_(sheetName, rowIndex, patch) {
  var sheet = getSheet_(sheetName);
  var map = getHeaderMap_(sheet);
  Object.keys(patch).forEach(function (key) {
    if (map.hasOwnProperty(key)) {
      sheet.getRange(rowIndex, map[key] + 1).setValue(patch[key]);
    }
  });
}

/** Cập nhật theo điều kiện khoá chính keyField=keyValue, trả về true nếu tìm thấy */
function updateWhere_(sheetName, keyField, keyValue, patch) {
  var row = findOne_(sheetName, keyField, keyValue);
  if (!row) return false;
  updateRow_(sheetName, row._row, patch);
  return true;
}

// ============================================================
// Auth.gs
// ============================================================
/**
 * Auth.gs
 * Xác định người dùng hiện tại (qua Google account) và vai trò của họ
 * dựa trên danh sách nhân sự cấu hình trong tab Thiết lập (sheet NhanSu).
 */

/** Trả về thông tin người dùng hiện tại: {email, hoTen, donVi, vaiTro, dangHoatDong} */
function getCurrentUser_() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    // Không lấy được email người truy cập (có thể do executeAs="Me" và domain
    // admin hạn chế chia sẻ thông tin người dùng, hoặc access không giới hạn
    // domain). Không throw để Form gửi hồ sơ/Tra cứu vẫn dùng được bình
    // thường - chỉ các tab yêu cầu vai trò sẽ bị ẩn cho tới khi xác định được.
    return {
      email: '',
      hoTen: '',
      donVi: '',
      vaiTro: null,
      dangHoatDong: false,
      trongHeThong: false
    };
  }
  var nhanSu = findOne_(SHEET_NAMES.NHAN_SU, 'Email', email);
  if (!nhanSu) {
    // Người dùng chưa có trong danh sách nhân sự -> chỉ có quyền gửi hồ sơ & tra cứu
    return {
      email: email,
      hoTen: '',
      donVi: '',
      vaiTro: null,
      dangHoatDong: false,
      trongHeThong: false
    };
  }
  return {
    email: nhanSu.Email,
    hoTen: nhanSu.HoTen,
    donVi: nhanSu.DonVi,
    vaiTro: nhanSu.VaiTro,
    dangHoatDong: nhanSu.TrangThai === TRANG_THAI_HOAT_DONG.HOAT_DONG,
    trongHeThong: true
  };
}

function requireRoleAtLeast_(user, minRole) {
  if (!user || !user.vaiTro || !user.dangHoatDong) {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
  if ((ROLE_RANK[user.vaiTro] || 0) < (ROLE_RANK[minRole] || 999)) {
    throw new Error('Bạn không có đủ quyền (yêu cầu tối thiểu: ' + ROLE_LABELS[minRole] + ').');
  }
}

function requireExactRole_(user, role) {
  if (!user || user.vaiTro !== role || !user.dangHoatDong) {
    throw new Error('Chỉ ' + ROLE_LABELS[role] + ' mới có quyền thực hiện thao tác này.');
  }
}

function isAdmin_(user) {
  return !!user && user.vaiTro === ROLES.ADMIN && user.dangHoatDong;
}

function isQuanLyTroLen_(user) {
  return !!user && user.dangHoatDong && (ROLE_RANK[user.vaiTro] || 0) >= ROLE_RANK[ROLES.QUAN_LY];
}

function isTruongNhomTroLen_(user) {
  return !!user && user.dangHoatDong && (ROLE_RANK[user.vaiTro] || 0) >= ROLE_RANK[ROLES.TRUONG_NHOM];
}

// ============================================================
// MailService.gs
// ============================================================
/**
 * MailService.gs
 * Gửi email thông báo cho người gửi hồ sơ ở các mốc quan trọng.
 */

function getWebAppUrl_() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (e) {
    return '';
  }
}

function sendMailSafe_(to, subject, htmlBody) {
  if (!to || !isValidEmail_(to)) return;
  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (e) {
    Logger.log('Lỗi gửi email tới ' + to + ': ' + e.message);
  }
}

function mailWrap_(title, bodyHtml, maHoSo, maXacNhan) {
  var url = getWebAppUrl_();
  var lookupHint = (maHoSo && maXacNhan)
    ? '<p style="margin-top:16px;color:#5c5c57;font-size:13px">Mã hồ sơ: <b>' + maHoSo + '</b> &nbsp;|&nbsp; Mã xác nhận: <b>' + maXacNhan + '</b><br>Dùng 2 mã này để tra cứu tiến độ' + (url ? ' tại <a href="' + url + '">hệ thống</a>.' : '.') + '</p>'
    : '';
  return '<div style="font-family:Arial,sans-serif;max-width:560px">' +
    '<h2 style="color:#534AB7;margin-bottom:8px">' + title + '</h2>' +
    bodyHtml +
    lookupHint +
    '<p style="margin-top:24px;color:#8a8a84;font-size:12px">Email tự động từ Hệ thống Quản lý công việc nhóm - vui lòng không trả lời email này.</p>' +
    '</div>';
}

function mailHoSoDaTiepNhan_(hoSo) {
  var body = '<p>Xin chào <b>' + hoSo.HoTen + '</b>,</p>' +
    '<p>Hồ sơ của bạn đã được ghi nhận vào hệ thống với thông tin:</p>' +
    '<ul><li>Tiêu đề: ' + hoSo.TieuDe + '</li><li>Phân mục: ' + hoSo.PhanMuc + '</li></ul>' +
    '<p>Hồ sơ sẽ được bộ phận tiếp nhận xem xét và phân công xử lý trong thời gian sớm nhất.</p>';
  sendMailSafe_(hoSo.Email, '[Đã tiếp nhận] Hồ sơ ' + hoSo.MaHoSo, mailWrap_('Đã tiếp nhận hồ sơ', body, hoSo.MaHoSo, hoSo.MaXacNhan));
}

function mailHoSoDaPhanCong_(hoSo) {
  var body = '<p>Xin chào <b>' + hoSo.HoTen + '</b>,</p>' +
    '<p>Hồ sơ <b>' + hoSo.MaHoSo + '</b> của bạn đã được phân công xử lý.</p>' +
    (hoSo.ThoiHan ? '<p>Thời hạn xử lý dự kiến: <b>' + hoSo.ThoiHan + '</b></p>' : '');
  sendMailSafe_(hoSo.Email, '[Đã phân công] Hồ sơ ' + hoSo.MaHoSo, mailWrap_('Hồ sơ đã được phân công', body, hoSo.MaHoSo, hoSo.MaXacNhan));
}

function mailHoSoTuChoi_(hoSo) {
  var body = '<p>Xin chào <b>' + hoSo.HoTen + '</b>,</p>' +
    '<p>Rất tiếc, hồ sơ <b>' + hoSo.MaHoSo + '</b> của bạn đã bị từ chối xử lý.</p>' +
    '<p>Lý do: ' + (hoSo.LyDoTuChoi || '(không có)') + '</p>';
  sendMailSafe_(hoSo.Email, '[Từ chối] Hồ sơ ' + hoSo.MaHoSo, mailWrap_('Hồ sơ bị từ chối', body, hoSo.MaHoSo, hoSo.MaXacNhan));
}

function mailHoSoHoanThanh_(hoSo) {
  var body = '<p>Xin chào <b>' + hoSo.HoTen + '</b>,</p>' +
    '<p>Hồ sơ <b>' + hoSo.MaHoSo + '</b> của bạn đã được xử lý xong.</p>' +
    (hoSo.LinkKetQua ? '<p>Link kết quả:<br>' + parseLinks_(hoSo.LinkKetQua).map(function (l) { return '<a href="' + l + '">' + l + '</a>'; }).join('<br>') + '</p>' : '');
  sendMailSafe_(hoSo.Email, '[Hoàn thành] Hồ sơ ' + hoSo.MaHoSo, mailWrap_('Hồ sơ đã hoàn thành', body, hoSo.MaHoSo, hoSo.MaXacNhan));
}

// ============================================================
// HoSoService.gs
// ============================================================
/**
 * HoSoService.gs
 * Xử lý nghiệp vụ Form nhận hồ sơ + Tab tiếp nhận.
 */

/** Nộp hồ sơ mới từ Form (không yêu cầu vai trò cụ thể, chỉ cần đăng nhập Google) */
function submitHoSo(payload) {
  throwIf_(!payload, 'Thiếu dữ liệu hồ sơ.');
  throwIf_(!payload.hoTen, 'Vui lòng nhập Họ tên.');
  throwIf_(!isValidEmail_(payload.email), 'Email không hợp lệ.');
  throwIf_(!payload.donVi, 'Vui lòng chọn Đơn vị/Phòng ban.');
  throwIf_(!payload.tieuDe, 'Vui lòng nhập Tiêu đề.');
  throwIf_(!payload.phanMuc, 'Vui lòng chọn Phân mục.');
  throwIf_(!payload.noiDungChiTiet, 'Vui lòng nhập Nội dung chi tiết.');

  var maHoSo = generateMaHoSo_();
  var maXacNhan = generateMaXacNhan_();
  var now = nowStr_();

  var hoSo = {
    MaHoSo: maHoSo,
    MaXacNhan: maXacNhan,
    HoTen: payload.hoTen,
    Email: payload.email,
    SoDienThoai: payload.soDienThoai || '',
    DonVi: payload.donVi,
    TieuDe: payload.tieuDe,
    PhanMuc: payload.phanMuc,
    NoiDungChiTiet: payload.noiDungChiTiet,
    TaiLieuDinhKem: joinLinks_(payload.taiLieuDinhKem),
    TrangThai: HOSO_STATUS.MOI,
    NguoiPhuTrach: '',
    ThoiHan: '',
    LyDoTuChoi: '',
    LinkKetQua: '',
    MaCongViec: '',
    NgayTao: now,
    NgayCapNhat: now
  };
  appendRow_(SHEET_NAMES.HO_SO, hoSo);
  mailHoSoDaTiepNhan_(hoSo);
  return { maHoSo: maHoSo, maXacNhan: maXacNhan };
}

/** Danh sách hồ sơ cho tab Tiếp nhận (yêu cầu Trưởng nhóm trở lên) */
function listHoSoTiepNhan(user) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  var rows = readAll_(SHEET_NAMES.HO_SO);
  rows.sort(function (a, b) { return String(b.NgayTao).localeCompare(String(a.NgayTao)); });
  return rows;
}

/** Trưởng nhóm trở lên phân công hồ sơ -> sinh Công việc tương ứng */
function assignHoSo(user, params) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  throwIf_(!params || !params.maHoSo, 'Thiếu mã hồ sơ.');
  throwIf_(!params.nguoiPhuTrach, 'Vui lòng chọn người phụ trách.');
  throwIf_(!params.thoiHan, 'Vui lòng chọn thời hạn xử lý.');

  var hoSo = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo);
  throwIf_(!hoSo, 'Không tìm thấy hồ sơ.');
  throwIf_(hoSo.TrangThai === HOSO_STATUS.TU_CHOI, 'Hồ sơ đã bị từ chối, không thể phân công.');

  var now = nowStr_();
  var maCongViec;

  if (hoSo.MaCongViec) {
    // Đã có công việc (phân công lại) -> cập nhật công việc hiện có
    maCongViec = hoSo.MaCongViec;
    updateWhere_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', maCongViec, {
      NguoiPhuTrach: params.nguoiPhuTrach,
      ThoiHan: params.thoiHan,
      NgayCapNhat: now
    });
  } else {
    maCongViec = generateMaCongViec_();
    appendRow_(SHEET_NAMES.CONG_VIEC, {
      MaCongViec: maCongViec,
      MaHoSo: hoSo.MaHoSo,
      NoiDung: hoSo.TieuDe,
      NguoiPhuTrach: params.nguoiPhuTrach,
      MoTa: hoSo.NoiDungChiTiet,
      TaiLieuDinhKem: hoSo.TaiLieuDinhKem,
      TrangThai: CONGVIEC_STATUS.CAN_LAM,
      PhanLoai: hoSo.PhanMuc,
      ThoiGianBatDau: now,
      ThoiHan: params.thoiHan,
      ThoiGianHoanThanh: '',
      DiemHienTai: DIEM_MAC_DINH_CONG_VIEC,
      MaDanhGiaTDV: '',
      GhiChuTDV: '',
      NguoiTao: user.email,
      NgayTao: now,
      NgayCapNhat: now
    });
  }

  updateWhere_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo, {
    TrangThai: HOSO_STATUS.DA_PHAN_CONG,
    NguoiPhuTrach: params.nguoiPhuTrach,
    ThoiHan: params.thoiHan,
    MaCongViec: maCongViec,
    NgayCapNhat: now
  });

  hoSo.TrangThai = HOSO_STATUS.DA_PHAN_CONG;
  hoSo.ThoiHan = params.thoiHan;
  mailHoSoDaPhanCong_(hoSo);
  return { maCongViec: maCongViec };
}

/** Trưởng nhóm trở lên từ chối hồ sơ (cần ghi lý do) */
function rejectHoSo(user, params) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  throwIf_(!params || !params.maHoSo, 'Thiếu mã hồ sơ.');
  throwIf_(!params.lyDo, 'Vui lòng nhập lý do từ chối.');

  var hoSo = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo);
  throwIf_(!hoSo, 'Không tìm thấy hồ sơ.');

  var now = nowStr_();
  updateWhere_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo, {
    TrangThai: HOSO_STATUS.TU_CHOI,
    LyDoTuChoi: params.lyDo,
    NgayCapNhat: now
  });
  hoSo.TrangThai = HOSO_STATUS.TU_CHOI;
  hoSo.LyDoTuChoi = params.lyDo;
  mailHoSoTuChoi_(hoSo);
  return { ok: true };
}

/**
 * Đồng bộ trạng thái hồ sơ theo trạng thái công việc liên quan.
 * Gọi từ CongViecService khi trạng thái công việc thay đổi.
 */
function syncHoSoTuCongViec_(congViec) {
  if (!congViec.MaHoSo) return;
  var hoSo = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', congViec.MaHoSo);
  if (!hoSo) return;

  var now = nowStr_();
  var patch = { NgayCapNhat: now };

  if (congViec.TrangThai === CONGVIEC_STATUS.DA_NOP || congViec.TrangThai === CONGVIEC_STATUS.TDV_XAC_NHAN) {
    patch.TrangThai = HOSO_STATUS.DA_HOAN_THANH;
    if (congViec.TaiLieuDinhKem) patch.LinkKetQua = congViec.TaiLieuDinhKem;
  } else if (congViec.TrangThai === CONGVIEC_STATUS.HUY_BO) {
    patch.TrangThai = HOSO_STATUS.TU_CHOI;
    patch.LyDoTuChoi = patch.LyDoTuChoi || 'Công việc xử lý đã bị hủy bỏ.';
  } else if (congViec.TrangThai === CONGVIEC_STATUS.DANG_LAM || congViec.TrangThai === CONGVIEC_STATUS.CAN_LAM) {
    if (hoSo.TrangThai !== HOSO_STATUS.DA_HOAN_THANH) {
      patch.TrangThai = HOSO_STATUS.DANG_XU_LY;
    }
  }

  updateWhere_(SHEET_NAMES.HO_SO, 'MaHoSo', congViec.MaHoSo, patch);

  if (patch.TrangThai === HOSO_STATUS.DA_HOAN_THANH) {
    var updated = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', congViec.MaHoSo);
    mailHoSoHoanThanh_(updated);
  }
}

/** Tra cứu hồ sơ theo mã hồ sơ + mã xác nhận (không cần đăng nhập vai trò) */
function traCuuHoSo(maHoSo, maXacNhan) {
  throwIf_(!maHoSo || !maXacNhan, 'Vui lòng nhập đầy đủ Mã hồ sơ và Mã xác nhận.');
  var hoSo = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', maHoSo.trim());
  throwIf_(!hoSo, 'Không tìm thấy hồ sơ với mã đã nhập.');
  throwIf_(String(hoSo.MaXacNhan).toUpperCase() !== String(maXacNhan).trim().toUpperCase(), 'Mã xác nhận không đúng.');

  var congViec = null;
  if (hoSo.MaCongViec) {
    congViec = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', hoSo.MaCongViec);
  }
  var chat = findMany_(SHEET_NAMES.CHAT_TRA_CUU, 'MaHoSo', hoSo.MaHoSo);
  chat.sort(function (a, b) { return String(a.ThoiGian).localeCompare(String(b.ThoiGian)); });

  return { hoSo: hoSo, congViec: congViec, chat: chat };
}

/** Người đề xuất (qua tra cứu) nhắn tin cho người được phân công xử lý hồ sơ */
function guiTinTraCuu(params) {
  throwIf_(!params || !params.maHoSo || !params.maXacNhan, 'Thiếu thông tin xác thực.');
  var hoSo = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo);
  throwIf_(!hoSo, 'Không tìm thấy hồ sơ.');
  throwIf_(String(hoSo.MaXacNhan).toUpperCase() !== String(params.maXacNhan).trim().toUpperCase(), 'Mã xác nhận không đúng.');
  throwIf_(!params.noiDung, 'Vui lòng nhập nội dung tin nhắn.');

  appendRow_(SHEET_NAMES.CHAT_TRA_CUU, {
    MaHoSo: hoSo.MaHoSo,
    ThoiGian: nowStr_(),
    NguoiGui: hoSo.HoTen + ' (người đề xuất)',
    NoiDung: params.noiDung
  });
  return { ok: true };
}

// ============================================================
// CongViecService.gs
// ============================================================
/**
 * CongViecService.gs
 * Nghiệp vụ Tab quản lý công việc: cập nhật trạng thái, đánh giá TĐV,
 * chấm điểm, khung chat công việc.
 */

/** Danh sách công việc hiển thị theo quyền: nhân viên chỉ thấy việc của mình */
function listCongViec(user) {
  throwIf_(!user || !user.trongHeThong || !user.dangHoatDong, 'Tài khoản của bạn chưa được cấp quyền trong hệ thống.');
  var rows = readAll_(SHEET_NAMES.CONG_VIEC);
  if (!isTruongNhomTroLen_(user)) {
    rows = rows.filter(function (r) { return r.NguoiPhuTrach === user.email; });
  }
  rows.sort(function (a, b) { return String(b.NgayTao).localeCompare(String(a.NgayTao)); });
  return rows;
}

function getCongViecChiTiet(user, maCongViec) {
  var cv = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', maCongViec);
  throwIf_(!cv, 'Không tìm thấy công việc.');
  if (!isTruongNhomTroLen_(user)) {
    throwIf_(cv.NguoiPhuTrach !== user.email, 'Bạn không có quyền xem công việc này.');
  }
  var chat = findMany_(SHEET_NAMES.CHAT_CONG_VIEC, 'MaCongViec', maCongViec);
  chat.sort(function (a, b) { return String(a.ThoiGian).localeCompare(String(b.ThoiGian)); });
  return { congViec: cv, chat: chat };
}

function canEditStatus_(user, cv, newStatus) {
  if (isTruongNhomTroLen_(user)) return true; // Trưởng nhóm/Quản lý/Admin: toàn quyền
  if (cv.NguoiPhuTrach !== user.email) return false;
  // Nhân viên chỉ được tự chuyển các trạng thái làm việc thông thường
  var allowedForNhanVien = [CONGVIEC_STATUS.DANG_LAM, CONGVIEC_STATUS.DA_NOP];
  return allowedForNhanVien.indexOf(newStatus) !== -1;
}

/** Cập nhật trạng thái công việc. Khi chuyển sang "Đã nộp" cần link trả kết quả nếu có hồ sơ gốc. */
function capNhatTrangThaiCongViec(user, params) {
  throwIf_(!params || !params.maCongViec || !params.trangThaiMoi, 'Thiếu thông tin cập nhật.');
  throwIf_(CONGVIEC_STATUS_LIST.indexOf(params.trangThaiMoi) === -1, 'Trạng thái không hợp lệ.');

  var cv = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec);
  throwIf_(!cv, 'Không tìm thấy công việc.');
  throwIf_(!canEditStatus_(user, cv, params.trangThaiMoi), 'Bạn không có quyền chuyển sang trạng thái này.');

  if (params.trangThaiMoi === CONGVIEC_STATUS.TDV_XAC_NHAN) {
    requireRoleAtLeast_(user, ROLES.QUAN_LY);
  }

  var now = nowStr_();
  var patch = { TrangThai: params.trangThaiMoi, NgayCapNhat: now };

  if (params.trangThaiMoi === CONGVIEC_STATUS.DA_NOP) {
    if (cv.MaHoSo) {
      throwIf_(!params.linkKetQua || !parseLinks_(params.linkKetQua).length, 'Vui lòng nhập link trả kết quả để gửi về người đề xuất.');
    }
    if (params.linkKetQua) {
      var merged = parseLinks_(cv.TaiLieuDinhKem).concat(parseLinks_(params.linkKetQua));
      patch.TaiLieuDinhKem = joinLinks_(merged);
    }
    // Thời gian ghi nhận hoàn thành: tự động, chỉ Quản lý mới sửa lại được sau này
    patch.ThoiGianHoanThanh = now;
  }

  updateWhere_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec, patch);

  var updated = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec);
  syncHoSoTuCongViec_(updated);
  return { ok: true };
}

/** Chỉ Quản lý (TĐV) mới được sửa lại Thời gian ghi nhận hoàn thành */
function suaThoiGianHoanThanh(user, params) {
  requireRoleAtLeast_(user, ROLES.QUAN_LY);
  throwIf_(!params || !params.maCongViec, 'Thiếu mã công việc.');
  var cv = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec);
  throwIf_(!cv, 'Không tìm thấy công việc.');
  updateWhere_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec, {
    ThoiGianHoanThanh: params.thoiGianHoanThanh || '',
    NgayCapNhat: nowStr_()
  });
  return { ok: true };
}

/** Trưởng nhóm trở lên chỉnh sửa thông tin phân công/mô tả/thời hạn của công việc */
function capNhatCongViec(user, params) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  throwIf_(!params || !params.maCongViec, 'Thiếu mã công việc.');
  var cv = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec);
  throwIf_(!cv, 'Không tìm thấy công việc.');

  var patch = { NgayCapNhat: nowStr_() };
  ['NoiDung', 'NguoiPhuTrach', 'MoTa', 'PhanLoai', 'ThoiHan'].forEach(function (f) {
    if (params.hasOwnProperty(f) && params[f] !== undefined && params[f] !== null) {
      patch[f] = params[f];
    }
  });
  updateWhere_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec, patch);
  return { ok: true };
}

/**
 * Đánh giá của TĐV (chỉ vai trò Quản lý): chọn mã điểm -> tự cộng/trừ vào
 * điểm hiện tại của công việc (khởi điểm 100).
 */
function danhGiaTDV(user, params) {
  requireRoleAtLeast_(user, ROLES.QUAN_LY);
  throwIf_(!params || !params.maCongViec, 'Thiếu mã công việc.');
  var cv = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec);
  throwIf_(!cv, 'Không tìm thấy công việc.');

  var patch = { NgayCapNhat: nowStr_() };
  if (params.hasOwnProperty('ghiChuTDV')) patch.GhiChuTDV = params.ghiChuTDV;

  if (params.maDiem) {
    var maDiemRow = findOne_(SHEET_NAMES.MA_DIEM, 'MaDiem', params.maDiem);
    throwIf_(!maDiemRow, 'Mã điểm không tồn tại.');
    var soDiem = Number(maDiemRow.SoDiem) || 0;
    var diemGoc = Number(cv.DiemHienTai);
    if (isNaN(diemGoc)) diemGoc = DIEM_MAC_DINH_CONG_VIEC;
    // Nếu đã từng chọn mã điểm trước đó, hoàn tác điểm cũ trước khi áp mã mới
    if (cv.MaDanhGiaTDV) {
      var oldRow = findOne_(SHEET_NAMES.MA_DIEM, 'MaDiem', cv.MaDanhGiaTDV);
      if (oldRow) diemGoc -= (Number(oldRow.SoDiem) || 0);
    }
    patch.DiemHienTai = diemGoc + soDiem;
    patch.MaDanhGiaTDV = params.maDiem;
  }

  updateWhere_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec, patch);
  return { ok: true };
}

/** Gửi tin nhắn trong khung chat công việc; tự thu thập link vào Tài liệu đính kèm */
function guiChatCongViec(user, params) {
  throwIf_(!params || !params.maCongViec || !params.noiDung, 'Thiếu nội dung tin nhắn.');
  var cv = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec);
  throwIf_(!cv, 'Không tìm thấy công việc.');
  if (!isTruongNhomTroLen_(user)) {
    throwIf_(cv.NguoiPhuTrach !== user.email, 'Bạn không có quyền nhắn tin trong công việc này.');
  }

  appendRow_(SHEET_NAMES.CHAT_CONG_VIEC, {
    MaCongViec: params.maCongViec,
    ThoiGian: nowStr_(),
    NguoiGui: user.hoTen || user.email,
    NoiDung: params.noiDung
  });

  // Thu thập link (http/https) trong nội dung chat vào Tài liệu đính kèm
  var urlRegex = /(https?:\/\/[^\s]+)/g;
  var found = params.noiDung.match(urlRegex);
  if (found && found.length) {
    var merged = parseLinks_(cv.TaiLieuDinhKem).concat(found);
    // loại trùng
    var uniq = merged.filter(function (v, i) { return merged.indexOf(v) === i; });
    updateWhere_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', params.maCongViec, {
      TaiLieuDinhKem: joinLinks_(uniq),
      NgayCapNhat: nowStr_()
    });
  }
  return { ok: true };
}

// ============================================================
// DiemService.gs
// ============================================================
/**
 * DiemService.gs
 * Tab ghi nhận điểm cộng/trừ: lập phiếu -> Quản lý duyệt -> tính vào hệ thống.
 */

/** Lập phiếu đề xuất điểm (Trưởng nhóm trở lên) */
function taoPhieuDiem(user, params) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  throwIf_(!params || !params.nhanSuDuocDeXuat, 'Vui lòng chọn nhân sự đề xuất.');
  throwIf_(!params.maDiem, 'Vui lòng chọn mã điểm.');
  throwIf_(!params.noiDung, 'Vui lòng nhập nội dung.');

  var maDiemRow = findOne_(SHEET_NAMES.MA_DIEM, 'MaDiem', params.maDiem);
  throwIf_(!maDiemRow, 'Mã điểm không tồn tại.');

  var maPhieu = generateMaPhieuDiem_();
  var now = nowStr_();
  appendRow_(SHEET_NAMES.PHIEU_DIEM, {
    MaPhieu: maPhieu,
    NgayTao: now,
    NguoiTao: user.email,
    NhanSuDuocDeXuat: params.nhanSuDuocDeXuat,
    MaDiem: params.maDiem,
    SoDiem: maDiemRow.SoDiem,
    NoiDung: params.noiDung,
    MaCongViecLienQuan: params.maCongViecLienQuan || '',
    TrangThai: PHIEU_DIEM_STATUS.CHO_DUYET,
    NguoiDuyet: '',
    NgayDuyet: '',
    LyDoTuChoi: ''
  });
  return { maPhieu: maPhieu };
}

/** Danh sách phiếu điểm: Quản lý+ thấy tất cả, Trưởng nhóm thấy phiếu mình lập, Nhân viên thấy phiếu về mình */
function listPhieuDiem(user) {
  throwIf_(!user || !user.trongHeThong, 'Bạn chưa được cấp quyền trong hệ thống.');
  var rows = readAll_(SHEET_NAMES.PHIEU_DIEM);
  if (isQuanLyTroLen_(user)) {
    // xem tất cả
  } else if (isTruongNhomTroLen_(user)) {
    rows = rows.filter(function (r) { return r.NguoiTao === user.email; });
  } else {
    rows = rows.filter(function (r) { return r.NhanSuDuocDeXuat === user.email; });
  }
  rows.sort(function (a, b) { return String(b.NgayTao).localeCompare(String(a.NgayTao)); });
  return rows;
}

/** Quản lý duyệt phiếu điểm -> tính điểm vào công việc liên quan (nếu có) */
function duyetPhieuDiem(user, params) {
  requireRoleAtLeast_(user, ROLES.QUAN_LY);
  throwIf_(!params || !params.maPhieu, 'Thiếu mã phiếu.');
  var phieu = findOne_(SHEET_NAMES.PHIEU_DIEM, 'MaPhieu', params.maPhieu);
  throwIf_(!phieu, 'Không tìm thấy phiếu điểm.');
  throwIf_(phieu.TrangThai !== PHIEU_DIEM_STATUS.CHO_DUYET, 'Phiếu đã được xử lý trước đó.');

  var now = nowStr_();
  updateWhere_(SHEET_NAMES.PHIEU_DIEM, 'MaPhieu', params.maPhieu, {
    TrangThai: PHIEU_DIEM_STATUS.DA_DUYET,
    NguoiDuyet: user.email,
    NgayDuyet: now
  });

  if (phieu.MaCongViecLienQuan) {
    var cv = findOne_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', phieu.MaCongViecLienQuan);
    if (cv) {
      var diemGoc = Number(cv.DiemHienTai);
      if (isNaN(diemGoc)) diemGoc = DIEM_MAC_DINH_CONG_VIEC;
      updateWhere_(SHEET_NAMES.CONG_VIEC, 'MaCongViec', phieu.MaCongViecLienQuan, {
        DiemHienTai: diemGoc + (Number(phieu.SoDiem) || 0),
        NgayCapNhat: now
      });
    }
  }
  return { ok: true };
}

/** Quản lý từ chối phiếu điểm (cần lý do) */
function tuChoiPhieuDiem(user, params) {
  requireRoleAtLeast_(user, ROLES.QUAN_LY);
  throwIf_(!params || !params.maPhieu, 'Thiếu mã phiếu.');
  throwIf_(!params.lyDo, 'Vui lòng nhập lý do từ chối.');
  var phieu = findOne_(SHEET_NAMES.PHIEU_DIEM, 'MaPhieu', params.maPhieu);
  throwIf_(!phieu, 'Không tìm thấy phiếu điểm.');
  throwIf_(phieu.TrangThai !== PHIEU_DIEM_STATUS.CHO_DUYET, 'Phiếu đã được xử lý trước đó.');

  updateWhere_(SHEET_NAMES.PHIEU_DIEM, 'MaPhieu', params.maPhieu, {
    TrangThai: PHIEU_DIEM_STATUS.TU_CHOI,
    NguoiDuyet: user.email,
    NgayDuyet: nowStr_(),
    LyDoTuChoi: params.lyDo
  });
  return { ok: true };
}

/**
 * Báo cáo/Bảng điểm tổng hợp theo nhân sự:
 * điểm công việc (trung bình hoặc tổng theo lựa chọn) + tổng điểm phiếu đã duyệt.
 */
function baoCaoBangDiem(user) {
  throwIf_(!user || !user.trongHeThong, 'Bạn chưa được cấp quyền trong hệ thống.');
  var nhanSuList = readAll_(SHEET_NAMES.NHAN_SU);
  var congViecList = readAll_(SHEET_NAMES.CONG_VIEC);
  var phieuList = readAll_(SHEET_NAMES.PHIEU_DIEM).filter(function (p) {
    return p.TrangThai === PHIEU_DIEM_STATUS.DA_DUYET;
  });

  var canXemTatCa = isQuanLyTroLen_(user);
  if (!canXemTatCa) {
    nhanSuList = nhanSuList.filter(function (n) { return n.Email === user.email; });
  }

  return nhanSuList.map(function (ns) {
    var congViecCuaNs = congViecList.filter(function (c) { return c.NguoiPhuTrach === ns.Email; });
    var tongDiemCongViec = congViecCuaNs.reduce(function (sum, c) {
      var d = Number(c.DiemHienTai);
      return sum + (isNaN(d) ? 0 : d);
    }, 0);
    var soCongViec = congViecCuaNs.length;
    var diemTrungBinhCongViec = soCongViec ? Math.round((tongDiemCongViec / soCongViec) * 10) / 10 : 0;

    var phieuCuaNs = phieuList.filter(function (p) { return p.NhanSuDuocDeXuat === ns.Email; });
    var tongDiemThuongPhat = phieuCuaNs.reduce(function (sum, p) {
      var d = Number(p.SoDiem);
      return sum + (isNaN(d) ? 0 : d);
    }, 0);

    return {
      email: ns.Email,
      hoTen: ns.HoTen,
      donVi: ns.DonVi,
      vaiTro: ns.VaiTro,
      soCongViec: soCongViec,
      diemTrungBinhCongViec: diemTrungBinhCongViec,
      tongDiemThuongPhatDaDuyet: tongDiemThuongPhat,
      diemTongHop: Math.round((diemTrungBinhCongViec + tongDiemThuongPhat) * 10) / 10
    };
  });
}

// ============================================================
// SetupService.gs
// ============================================================
/**
 * SetupService.gs
 * Tab Thiết lập: quản trị Đơn vị, Phân mục, Mã điểm, Danh sách nhân sự.
 * Chỉ vai trò Admin hệ thống được thêm/sửa; mọi người dùng đã đăng nhập được
 * đọc các danh mục (để đổ vào dropdown của Form/Tab khác).
 */

/** Dữ liệu dropdown dùng chung cho Form hồ sơ & các tab (không cần quyền Admin để đọc) */
function getDanhMucDungChung() {
  var donVi = readAll_(SHEET_NAMES.DON_VI).filter(function (r) { return r.TrangThai === TRANG_THAI_HOAT_DONG.HOAT_DONG; });
  var phanMuc = readAll_(SHEET_NAMES.PHAN_MUC).filter(function (r) { return r.TrangThai === TRANG_THAI_HOAT_DONG.HOAT_DONG; });
  var maDiem = readAll_(SHEET_NAMES.MA_DIEM).filter(function (r) { return r.TrangThai === TRANG_THAI_HOAT_DONG.HOAT_DONG; });
  var nhanSu = readAll_(SHEET_NAMES.NHAN_SU).filter(function (r) { return r.TrangThai === TRANG_THAI_HOAT_DONG.HOAT_DONG; });
  return { donVi: donVi, phanMuc: phanMuc, maDiem: maDiem, nhanSu: nhanSu };
}

/** Toàn bộ dữ liệu Thiết lập (chỉ Admin) để hiển thị & chỉnh sửa trong tab Thiết lập */
function getThietLapDayDu(user) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  return {
    donVi: readAll_(SHEET_NAMES.DON_VI),
    phanMuc: readAll_(SHEET_NAMES.PHAN_MUC),
    maDiem: readAll_(SHEET_NAMES.MA_DIEM),
    nhanSu: readAll_(SHEET_NAMES.NHAN_SU)
  };
}

function upsertDonVi(user, item) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  throwIf_(!item || !item.MaDonVi || !item.TenDonVi, 'Thiếu Mã đơn vị / Tên đơn vị.');
  var existed = findOne_(SHEET_NAMES.DON_VI, 'MaDonVi', item.MaDonVi);
  var patch = { TenDonVi: item.TenDonVi, TrangThai: item.TrangThai || TRANG_THAI_HOAT_DONG.HOAT_DONG };
  if (existed) {
    updateRow_(SHEET_NAMES.DON_VI, existed._row, patch);
  } else {
    appendRow_(SHEET_NAMES.DON_VI, Object.assign({ MaDonVi: item.MaDonVi }, patch));
  }
  return { ok: true };
}

function upsertPhanMuc(user, item) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  throwIf_(!item || !item.MaPhanMuc || !item.TenPhanMuc, 'Thiếu Mã phân mục / Tên phân mục.');
  var existed = findOne_(SHEET_NAMES.PHAN_MUC, 'MaPhanMuc', item.MaPhanMuc);
  var patch = { TenPhanMuc: item.TenPhanMuc, TrangThai: item.TrangThai || TRANG_THAI_HOAT_DONG.HOAT_DONG };
  if (existed) {
    updateRow_(SHEET_NAMES.PHAN_MUC, existed._row, patch);
  } else {
    appendRow_(SHEET_NAMES.PHAN_MUC, Object.assign({ MaPhanMuc: item.MaPhanMuc }, patch));
  }
  return { ok: true };
}

function upsertMaDiem(user, item) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  throwIf_(!item || !item.MaDiem || !item.LyDo, 'Thiếu Mã điểm / Lý do.');
  throwIf_(isNaN(Number(item.SoDiem)), 'Số điểm phải là số (có thể âm).');
  var existed = findOne_(SHEET_NAMES.MA_DIEM, 'MaDiem', item.MaDiem);
  var patch = { LyDo: item.LyDo, SoDiem: Number(item.SoDiem), TrangThai: item.TrangThai || TRANG_THAI_HOAT_DONG.HOAT_DONG };
  if (existed) {
    updateRow_(SHEET_NAMES.MA_DIEM, existed._row, patch);
  } else {
    appendRow_(SHEET_NAMES.MA_DIEM, Object.assign({ MaDiem: item.MaDiem }, patch));
  }
  return { ok: true };
}

function upsertNhanSu(user, item) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  throwIf_(!item || !isValidEmail_(item.Email) || !item.HoTen, 'Thiếu Email hợp lệ / Họ tên.');
  throwIf_(Object.keys(ROLE_LABELS).indexOf(item.VaiTro) === -1, 'Vai trò không hợp lệ.');
  var existed = findOne_(SHEET_NAMES.NHAN_SU, 'Email', item.Email);
  var patch = {
    HoTen: item.HoTen,
    DonVi: item.DonVi || '',
    VaiTro: item.VaiTro,
    TrangThai: item.TrangThai || TRANG_THAI_HOAT_DONG.HOAT_DONG
  };
  if (existed) {
    updateRow_(SHEET_NAMES.NHAN_SU, existed._row, patch);
  } else {
    appendRow_(SHEET_NAMES.NHAN_SU, Object.assign({ Email: item.Email, NgayTao: nowStr_() }, patch));
  }
  return { ok: true };
}

/**
 * Chỉ chạy khoiTaoDuLieuMau() (tạo sheet + seed dữ liệu mẫu) MỘT LẦN DUY
 * NHẤT trong suốt vòng đời deployment, đánh dấu bằng Script Property.
 * Trước đây gọi lại mỗi lần chuyển trang khiến việc bấm tab rất chậm
 * (phải đọc lại 4-5 sheet để kiểm tra rỗng + đảm bảo đủ 9 sheet mỗi lần).
 */
function khoiTaoDuLieuMauNeuChuaChay_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('DA_KHOI_TAO_XONG') === '1') return;
  khoiTaoDuLieuMau();
  props.setProperty('DA_KHOI_TAO_XONG', '1');
}

/** Khởi tạo dữ liệu mẫu ban đầu (chỉ chạy nếu các sheet danh mục đang trống) - gọi thủ công từ Apps Script editor */
function khoiTaoDuLieuMau() {
  ensureAllSheets_();

  if (readAll_(SHEET_NAMES.DON_VI).length === 0) {
    [['DV01', 'Phòng Hành chính - Nhân sự'], ['DV02', 'Phòng Kỹ thuật'], ['DV03', 'Phòng Kinh doanh']]
      .forEach(function (r) {
        appendRow_(SHEET_NAMES.DON_VI, { MaDonVi: r[0], TenDonVi: r[1], TrangThai: TRANG_THAI_HOAT_DONG.HOAT_DONG });
      });
  }

  if (readAll_(SHEET_NAMES.PHAN_MUC).length === 0) {
    [['PM01', 'Đề xuất công việc'], ['PM02', 'Yêu cầu hỗ trợ kỹ thuật'], ['PM03', 'Yêu cầu khác']]
      .forEach(function (r) {
        appendRow_(SHEET_NAMES.PHAN_MUC, { MaPhanMuc: r[0], TenPhanMuc: r[1], TrangThai: TRANG_THAI_HOAT_DONG.HOAT_DONG });
      });
  }

  if (readAll_(SHEET_NAMES.MA_DIEM).length === 0) {
    [
      ['C01', 'Hoàn thành sớm tiến độ', 5],
      ['C02', 'Chất lượng vượt yêu cầu', 10],
      ['T01', 'Trễ hạn không báo trước', -10],
      ['T02', 'Sai sót phải làm lại', -5]
    ].forEach(function (r) {
      appendRow_(SHEET_NAMES.MA_DIEM, { MaDiem: r[0], LyDo: r[1], SoDiem: r[2], TrangThai: TRANG_THAI_HOAT_DONG.HOAT_DONG });
    });
  }

  if (readAll_(SHEET_NAMES.NHAN_SU).length === 0) {
    var myEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    if (myEmail) {
      appendRow_(SHEET_NAMES.NHAN_SU, {
        Email: myEmail,
        HoTen: 'Quản trị viên hệ thống',
        DonVi: 'DV01',
        VaiTro: ROLES.ADMIN,
        TrangThai: TRANG_THAI_HOAT_DONG.HOAT_DONG,
        NgayTao: nowStr_()
      });
    }
  }
}

// ============================================================
// Render.gs
// ============================================================
/**
 * Render.gs
 * Hàm dựng HTML phía server cho kiến trúc "form HTML thuần + doPost()"
 * (không dùng google.script.run) - dùng khi mạng chặn kênh RPC AJAX
 * của Apps Script nhưng vẫn tải được trang/gửi được form bình thường.
 */

function escHtml_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function qs_(params) {
  var parts = [];
  Object.keys(params || {}).forEach(function (k) {
    if (params[k] === undefined || params[k] === null) return;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  });
  return parts.join('&');
}

function linkTo_(page, extra) {
  var p = Object.assign({ page: page }, extra || {});
  return getWebAppUrl_() + '?' + qs_(p);
}

function linksToHtml_(text) {
  var links = parseLinks_(text);
  if (!links.length) return '<span class="muted">(không có)</span>';
  return links.map(function (l) {
    return '<a href="' + escHtml_(l) + '" target="_blank" rel="noopener">' + escHtml_(l) + '</a>';
  }).join('<br>');
}

function pillHoSo_(status) {
  var map = { 'Mới': 'gray', 'Đã phân công': 'indigo', 'Đang xử lý': 'amber', 'Đã hoàn thành': 'teal', 'Từ chối': 'coral' };
  return '<span class="pill ' + (map[status] || 'gray') + '">' + escHtml_(status) + '</span>';
}
function pillCongViec_(status) {
  var map = { 'Cần làm': 'gray', 'Đang làm': 'indigo', 'Đã nộp': 'amber', 'TĐV xác nhận': 'teal', 'Tạm ngưng': 'coral', 'Hủy bỏ': 'coral' };
  return '<span class="pill ' + (map[status] || 'gray') + '">' + escHtml_(status) + '</span>';
}
function pillPhieu_(status) {
  var map = { 'Chờ duyệt': 'amber', 'Đã duyệt': 'teal', 'Từ chối': 'coral' };
  return '<span class="pill ' + (map[status] || 'gray') + '">' + escHtml_(status) + '</span>';
}

/** Ô input select đơn giản */
function selectHtml_(name, options, selectedValue, placeholder, extraAttr) {
  var out = '<select name="' + escHtml_(name) + '" ' + (extraAttr || '') + '>';
  if (placeholder) out += '<option value="">' + escHtml_(placeholder) + '</option>';
  options.forEach(function (o) {
    var sel = String(o.value) === String(selectedValue) ? ' selected' : '';
    out += '<option value="' + escHtml_(o.value) + '"' + sel + '>' + escHtml_(o.label) + '</option>';
  });
  out += '</select>';
  return out;
}

function hiddenInputs_(fields) {
  return Object.keys(fields || {}).map(function (k) {
    return '<input type="hidden" name="' + escHtml_(k) + '" value="' + escHtml_(fields[k]) + '">';
  }).join('');
}

/** Thanh điều hướng - chỉ hiện link mà user có quyền */
function renderNav_(user, currentPage) {
  var items = [
    { page: 'form', label: 'Gửi hồ sơ', show: true },
    { page: 'tiepnhan', label: 'Tiếp nhận', show: isTruongNhomTroLen_(user) },
    { page: 'tracuu', label: 'Tra cứu', show: true },
    { page: 'congviec', label: 'Công việc', show: user && user.trongHeThong && user.dangHoatDong },
    { page: 'diem', label: 'Điểm cộng/trừ', show: isTruongNhomTroLen_(user) },
    { page: 'baocao', label: 'Báo cáo', show: user && user.trongHeThong && user.dangHoatDong },
    { page: 'thietlap', label: 'Thiết lập', show: isAdmin_(user) }
  ];
  var tabs = items.filter(function (i) { return i.show; }).map(function (i) {
    var active = (currentPage === i.page) ? ' active' : '';
    return '<a class="tab-btn' + active + '" href="' + escHtml_(linkTo_(i.page)) + '">' + escHtml_(i.label) + '</a>';
  }).join('');

  var userBox = '';
  if (user && user.email) {
    var role = user.vaiTro ? (ROLE_LABELS[user.vaiTro] || user.vaiTro) : 'Chưa được cấp quyền nội bộ';
    userBox = '<b>' + escHtml_(user.hoTen || user.email) + '</b>' + escHtml_(role);
  } else {
    userBox = '<span class="muted">Không xác định được tài khoản</span>';
  }

  return '<div class="topbar">' +
    '<div class="topbar-brand">📋 Quản lý công việc nhóm</div>' +
    tabs +
    '<div class="userbox">' + userBox + '</div>' +
    '</div>';
}

function renderFlash_(flash) {
  if (!flash || !flash.msg) return '';
  var cls = flash.type === 'error' ? 'coral' : 'teal';
  return '<div class="card" style="border-left:4px solid var(--' + cls + ')">' + escHtml_(flash.msg) + '</div>';
}

/** Trang trung gian: xử lý xong 1 hành động POST -> điều hướng (GET) sang trang kết quả,
 * tránh việc F5 gửi lại form (resubmit) và tránh lộ dữ liệu nhạy cảm (mã xác nhận) lên URL. */
function renderRedirect_(url, flash) {
  var msg = flash ? escHtml_(flash.msg) : '';
  var html = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">' +
    '<meta http-equiv="refresh" content="0;url=' + escHtml_(url) + '">' +
    '<script>top.location.href=' + JSON.stringify(url) + ';</script>' +
    '</head><body style="font-family:sans-serif;padding:2rem">' +
    '<p>' + msg + '</p><p><a href="' + escHtml_(url) + '">Bấm vào đây nếu trang không tự chuyển...</a></p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// PageForm.gs
// ============================================================
/**
 * PageForm.gs - Trang "Gửi hồ sơ"
 */
function pageForm_(user, params) {
  var dm = getDanhMucDungChung();
  var donViOpts = dm.donVi.map(function (d) { return { value: d.MaDonVi, label: d.TenDonVi }; });
  var phanMucOpts = dm.phanMuc.map(function (p) { return { value: p.MaPhanMuc, label: p.TenPhanMuc }; });

  return '<div class="card">' +
    '<h2>Form nhận hồ sơ</h2>' +
    '<div class="section-note">Điền đầy đủ thông tin. Sau khi gửi, hệ thống sẽ cấp Mã hồ sơ + Mã xác nhận qua email để bạn tra cứu tiến độ.</div>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'submitHoSo', returnPage: 'form' }) +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Họ tên *</label><input name="hoTen" required></div>' +
    '<div class="field"><label>Email *</label><input name="email" type="email" required></div>' +
    '<div class="field"><label>Số điện thoại</label><input name="soDienThoai"></div>' +
    '<div class="field"><label>Đơn vị / Phòng ban *</label>' + selectHtml_('donVi', donViOpts, '', '-- Chọn --', 'required') + '</div>' +
    '</div>' +
    '<div class="field"><label>Tiêu đề *</label><input name="tieuDe" required></div>' +
    '<div class="field"><label>Phân mục *</label>' + selectHtml_('phanMuc', phanMucOpts, '', '-- Chọn --', 'required') + '</div>' +
    '<div class="field"><label>Nội dung chi tiết *</label><textarea name="noiDungChiTiet" required></textarea></div>' +
    '<div class="field link-list-input"><label>Tài liệu đính kèm (mỗi link 1 dòng)</label><textarea name="taiLieuDinhKem" placeholder="https://drive.google.com/..."></textarea></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Gửi hồ sơ</button></div>' +
    '</form>' +
    '</div>';
}

/** Xử lý POST action=submitHoSo, trả về flash + trang chuyển hướng riêng (hiện mã hồ sơ/xác nhận) */
function doPostSubmitHoSo_(e) {
  var payload = {
    hoTen: e.parameter.hoTen,
    email: e.parameter.email,
    soDienThoai: e.parameter.soDienThoai,
    donVi: e.parameter.donVi,
    tieuDe: e.parameter.tieuDe,
    phanMuc: e.parameter.phanMuc,
    noiDungChiTiet: e.parameter.noiDungChiTiet,
    taiLieuDinhKem: parseLinks_(e.parameter.taiLieuDinhKem)
  };
  var res = submitHoSo(payload);
  var html = '<div class="card">' +
    '<h2>Gửi hồ sơ thành công</h2>' +
    '<p>Mã hồ sơ: <b>' + escHtml_(res.maHoSo) + '</b></p>' +
    '<p>Mã xác nhận: <b>' + escHtml_(res.maXacNhan) + '</b></p>' +
    '<p class="muted">Thông tin này đã được gửi tới email của bạn. Vui lòng lưu lại để tra cứu tiến độ ở tab "Tra cứu".</p>' +
    '<div class="btn-row"><a class="btn" href="' + escHtml_(linkTo_('form')) + '">Gửi hồ sơ khác</a> ' +
    '<a class="btn secondary" href="' + escHtml_(linkTo_('tracuu')) + '">Đi tới Tra cứu</a></div>' +
    '</div>';
  return { directHtml: html };
}

// ============================================================
// PageTiepNhan.gs
// ============================================================
/**
 * PageTiepNhan.gs - Trang "Tiếp nhận hồ sơ" (Trưởng nhóm trở lên)
 */
function pageTiepNhan_(user, params) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  var rows = listHoSoTiepNhan(user);
  var dm = getDanhMucDungChung();
  var nhanSuOpts = dm.nhanSu.map(function (n) { return { value: n.Email, label: n.HoTen }; });

  if (params.view === 'phancong' && params.maHoSo) {
    var hs = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ.');
    return '<div class="card"><h2>Phân công hồ sơ ' + escHtml_(hs.MaHoSo) + '</h2>' +
      '<p><b>' + escHtml_(hs.TieuDe) + '</b></p>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'assignHoSo', returnPage: 'tiepnhan', maHoSo: hs.MaHoSo }) +
      '<div class="field"><label>Người phụ trách</label>' + selectHtml_('nguoiPhuTrach', nhanSuOpts, hs.NguoiPhuTrach, '-- Chọn --', 'required') + '</div>' +
      '<div class="field"><label>Thời hạn xử lý</label><input type="date" name="thoiHan" value="' + escHtml_(hs.ThoiHan) + '" required></div>' +
      '<div class="btn-row"><button class="btn" type="submit">Xác nhận phân công</button> ' +
      '<a class="btn secondary" href="' + escHtml_(linkTo_('tiepnhan')) + '">Huỷ</a></div>' +
      '</form></div>';
  }

  if (params.view === 'tuchoi' && params.maHoSo) {
    var hs2 = findOne_(SHEET_NAMES.HO_SO, 'MaHoSo', params.maHoSo);
    if (!hs2) throw new Error('Không tìm thấy hồ sơ.');
    return '<div class="card"><h2>Từ chối hồ sơ ' + escHtml_(hs2.MaHoSo) + '</h2>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'rejectHoSo', returnPage: 'tiepnhan', maHoSo: hs2.MaHoSo }) +
      '<div class="field"><label>Lý do từ chối</label><textarea name="lyDo" required></textarea></div>' +
      '<div class="btn-row"><button class="btn danger" type="submit">Xác nhận từ chối</button> ' +
      '<a class="btn secondary" href="' + escHtml_(linkTo_('tiepnhan')) + '">Huỷ</a></div>' +
      '</form></div>';
  }

  var body = rows.map(function (r) {
    var actions = '';
    if (r.TrangThai === 'Mới' || r.TrangThai === 'Đã phân công') {
      actions += '<a class="btn secondary" href="' + escHtml_(linkTo_('tiepnhan', { view: 'phancong', maHoSo: r.MaHoSo })) + '">Phân công</a> ';
    }
    if (r.TrangThai !== 'Từ chối' && r.TrangThai !== 'Đã hoàn thành') {
      actions += '<a class="btn danger" href="' + escHtml_(linkTo_('tiepnhan', { view: 'tuchoi', maHoSo: r.MaHoSo })) + '">Từ chối</a>';
    }
    return '<tr><td>' + escHtml_(r.MaHoSo) + '</td><td>' + escHtml_(r.HoTen) + '<br><span class="muted">' + escHtml_(r.Email) + '</span></td>' +
      '<td>' + escHtml_(r.TieuDe) + '</td><td>' + escHtml_(r.PhanMuc) + '</td><td>' + pillHoSo_(r.TrangThai) + '</td>' +
      '<td>' + escHtml_(r.NguoiPhuTrach) + '</td><td>' + escHtml_(r.ThoiHan) + '</td><td>' + actions + '</td></tr>';
  }).join('');

  return '<div class="card"><h2>Tiếp nhận hồ sơ</h2>' +
    '<div class="section-note">Chọn người phụ trách và thời hạn xử lý để phân công hồ sơ thành công việc, hoặc từ chối kèm lý do.</div>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã hồ sơ</th><th>Người gửi</th><th>Tiêu đề</th><th>Phân mục</th><th>Trạng thái</th><th>Người phụ trách</th><th>Thời hạn</th><th></th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="8"><div class="empty-state">Chưa có hồ sơ nào.</div></td></tr>') + '</tbody></table></div></div>';
}

function doPostAssignHoSo_(e) {
  assignHoSo(getCurrentUser_(), { maHoSo: e.parameter.maHoSo, nguoiPhuTrach: e.parameter.nguoiPhuTrach, thoiHan: e.parameter.thoiHan });
  return { flash: { type: 'ok', msg: 'Đã phân công hồ sơ ' + e.parameter.maHoSo + ' thành công.' } };
}
function doPostRejectHoSo_(e) {
  rejectHoSo(getCurrentUser_(), { maHoSo: e.parameter.maHoSo, lyDo: e.parameter.lyDo });
  return { flash: { type: 'ok', msg: 'Đã từ chối hồ sơ ' + e.parameter.maHoSo + '.' } };
}

// ============================================================
// PageTraCuu.gs
// ============================================================
/**
 * PageTraCuu.gs - Trang "Tra cứu" (dùng POST để tránh lộ mã xác nhận lên URL/lịch sử trình duyệt)
 */
function pageTraCuu_(user, params, ketQua) {
  var html = '<div class="card"><h2>Tra cứu hồ sơ</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'traCuuHoSo', returnPage: 'tracuu' }) +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Mã hồ sơ *</label><input name="maHoSo" placeholder="HS-20260909-0001" required value="' + escHtml_(params.maHoSo || '') + '"></div>' +
    '<div class="field"><label>Mã xác nhận *</label><input name="maXacNhan" placeholder="ABC123" required></div>' +
    '</div>' +
    '<div class="btn-row"><button class="btn" type="submit">Tra cứu</button></div>' +
    '</form></div>';

  if (ketQua) {
    var hoSo = ketQua.hoSo, cv = ketQua.congViec, chat = ketQua.chat;
    var chatHtml = !chat || !chat.length ? '<div class="muted">Chưa có tin nhắn nào.</div>' :
      chat.map(function (m) {
        return '<div class="chat-msg"><b>' + escHtml_(m.NguoiGui) + '</b><span class="t">' + escHtml_(m.ThoiGian) + '</span><div>' + escHtml_(m.NoiDung) + '</div></div>';
      }).join('');

    html += '<div class="card">' +
      '<h2>Kết quả tra cứu</h2>' +
      '<p><b>' + escHtml_(hoSo.TieuDe) + '</b> ' + pillHoSo_(hoSo.TrangThai) + '</p>' +
      '<p class="muted">Mã hồ sơ: ' + escHtml_(hoSo.MaHoSo) + ' — Gửi lúc: ' + escHtml_(hoSo.NgayTao) + '</p>' +
      '<p>Người phụ trách: ' + escHtml_(hoSo.NguoiPhuTrach || '(chưa phân công)') + (hoSo.ThoiHan ? ' — Thời hạn: ' + escHtml_(hoSo.ThoiHan) : '') + '</p>' +
      (hoSo.TrangThai === 'Từ chối' ? '<p>Lý do từ chối: ' + escHtml_(hoSo.LyDoTuChoi) + '</p>' : '') +
      (hoSo.LinkKetQua ? '<p>Link kết quả: ' + linksToHtml_(hoSo.LinkKetQua) + '</p>' : '') +
      (cv ? '<p>Trạng thái xử lý công việc: ' + pillCongViec_(cv.TrangThai) + '</p>' : '') +
      '<h3 style="margin-top:1rem">Trao đổi với người phụ trách</h3>' +
      '<div class="chat-box">' + chatHtml + '</div>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'guiTinTraCuu', returnPage: 'tracuu', maHoSo: hoSo.MaHoSo, maXacNhan: hoSo.MaXacNhan, showResult: '1' }) +
      '<div class="field"><textarea name="noiDung" placeholder="Nhập tin nhắn..." required></textarea></div>' +
      '<div class="btn-row"><button class="btn" type="submit">Gửi</button></div>' +
      '</form>' +
      '</div>';
  }
  return html;
}

function doPostTraCuuHoSo_(e) {
  var ketQua = traCuuHoSo(e.parameter.maHoSo, e.parameter.maXacNhan);
  var html = pageTraCuu_(getCurrentUser_(), { maHoSo: e.parameter.maHoSo }, ketQua);
  return { directHtml: html };
}

function doPostGuiTinTraCuu_(e) {
  guiTinTraCuu({ maHoSo: e.parameter.maHoSo, maXacNhan: e.parameter.maXacNhan, noiDung: e.parameter.noiDung });
  var ketQua = traCuuHoSo(e.parameter.maHoSo, e.parameter.maXacNhan);
  var html = pageTraCuu_(getCurrentUser_(), { maHoSo: e.parameter.maHoSo }, ketQua);
  return { directHtml: html };
}

// ============================================================
// PageCongViec.gs
// ============================================================
/**
 * PageCongViec.gs - Trang "Quản lý công việc" (danh sách + chi tiết)
 */
function pageCongViec_(user, params) {
  if (params.id) {
    return pageCongViecDetail_(user, params.id);
  }
  var rows = listCongViec(user);
  var body = rows.map(function (r) {
    var diem = Number(r.DiemHienTai);
    var diemClass = diem >= 100 ? 'pos' : (diem < 100 ? 'neg' : '');
    return '<tr><td>' + escHtml_(r.MaCongViec) + '</td><td>' + escHtml_(r.NoiDung) + '</td><td>' + escHtml_(r.NguoiPhuTrach) + '</td>' +
      '<td>' + escHtml_(r.PhanLoai) + '</td><td>' + pillCongViec_(r.TrangThai) + '</td><td>' + escHtml_(r.ThoiHan) + '</td>' +
      '<td><span class="score-badge ' + diemClass + '">' + escHtml_(r.DiemHienTai) + '</span></td>' +
      '<td><a class="btn secondary" href="' + escHtml_(linkTo_('congviec', { id: r.MaCongViec })) + '">Chi tiết</a></td></tr>';
  }).join('');

  return '<div class="card"><h2>Quản lý công việc</h2>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã CV</th><th>Nội dung</th><th>Người phụ trách</th><th>Phân loại</th><th>Trạng thái</th><th>Thời hạn</th><th>Điểm</th><th></th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="8"><div class="empty-state">Chưa có công việc nào.</div></td></tr>') + '</tbody></table></div></div>';
}

function pageCongViecDetail_(user, maCongViec) {
  var data = getCongViecChiTiet(user, maCongViec);
  var cv = data.congViec, chat = data.chat;
  var isManager = isTruongNhomTroLen_(user);
  var isQuanLy = isQuanLyTroLen_(user);
  var isOwner = user && user.email === cv.NguoiPhuTrach;
  var backUrl = escHtml_(linkTo_('congviec'));

  var html = '<div class="card">' +
    '<p><a href="' + backUrl + '">&larr; Quay lại danh sách</a></p>' +
    '<h2>' + escHtml_(cv.NoiDung) + '</h2>' +
    '<p class="muted">Mã CV: ' + escHtml_(cv.MaCongViec) + (cv.MaHoSo ? ' — Từ hồ sơ: ' + escHtml_(cv.MaHoSo) : '') + '</p>' +
    '<p><b>Người phụ trách:</b> ' + escHtml_(cv.NguoiPhuTrach) + ' &nbsp; <b>Phân loại:</b> ' + escHtml_(cv.PhanLoai) + '</p>' +
    '<p><b>Mô tả:</b> ' + escHtml_(cv.MoTa) + '</p>' +
    '<p><b>Tài liệu đính kèm:</b><br>' + linksToHtml_(cv.TaiLieuDinhKem) + '</p>' +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Bắt đầu</label><input value="' + escHtml_(cv.ThoiGianBatDau) + '" disabled></div>' +
    '<div class="field"><label>Thời hạn</label><input value="' + escHtml_(cv.ThoiHan) + '" disabled></div>' +
    '</div>';

  html += '<div class="field"><label>Thời gian ghi nhận hoàn thành' + (isQuanLy ? ' (Quản lý có thể sửa)' : '') + '</label>';
  if (isQuanLy) {
    html += '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '" style="display:flex;gap:.5rem;align-items:flex-end">' +
      hiddenInputs_({ action: 'suaThoiGianHoanThanh', returnPage: 'congviec', id: cv.MaCongViec }) +
      '<input name="thoiGianHoanThanh" value="' + escHtml_(cv.ThoiGianHoanThanh) + '" style="flex:1">' +
      '<button class="btn secondary" type="submit">Lưu</button></form>';
  } else {
    html += '<input value="' + escHtml_(cv.ThoiGianHoanThanh) + '" disabled>';
  }
  html += '</div>';

  if (isManager || isOwner) {
    var statusOpts = CONGVIEC_STATUS_LIST.map(function (s) { return { value: s, label: s }; });
    html += '<h3 style="margin-top:1rem">Cập nhật trạng thái</h3>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'capNhatTrangThaiCongViec', returnPage: 'congviec', id: cv.MaCongViec }) +
      '<div class="field"><label>Trạng thái mới</label>' + selectHtml_('trangThaiMoi', statusOpts, cv.TrangThai) + '</div>' +
      (cv.MaHoSo ? '<div class="field"><label>Link trả kết quả (bắt buộc nếu chuyển sang "Đã nộp")</label><textarea name="linkKetQua" placeholder="https://..."></textarea></div>' : '') +
      '<div class="btn-row"><button class="btn" type="submit">Cập nhật trạng thái</button></div>' +
      '</form>';
  }

  if (isQuanLy) {
    var dm = getDanhMucDungChung();
    var madiemOpts = dm.maDiem.map(function (m) { return { value: m.MaDiem, label: m.MaDiem + ' - ' + m.LyDo + ' (' + m.SoDiem + ')' }; });
    html += '<h3 style="margin-top:1rem">Đánh giá của TĐV (chỉ Quản lý)</h3>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'danhGiaTDV', returnPage: 'congviec', id: cv.MaCongViec }) +
      '<div class="field"><label>Mã điểm</label>' + selectHtml_('maDiem', madiemOpts, cv.MaDanhGiaTDV, '-- Chọn mã điểm --') + '</div>' +
      '<div class="field"><label>Ghi chú của TĐV</label><textarea name="ghiChuTDV">' + escHtml_(cv.GhiChuTDV) + '</textarea></div>' +
      '<div class="btn-row"><button class="btn success" type="submit">Lưu đánh giá</button></div>' +
      '</form>';
  } else if (cv.GhiChuTDV || cv.MaDanhGiaTDV) {
    html += '<p><b>Đánh giá TĐV:</b> ' + escHtml_(cv.MaDanhGiaTDV) + ' &nbsp; <b>Ghi chú:</b> ' + escHtml_(cv.GhiChuTDV) + '</p>';
  }

  var chatHtml = !chat || !chat.length ? '<div class="muted">Chưa có tin nhắn nào.</div>' :
    chat.map(function (m) {
      return '<div class="chat-msg"><b>' + escHtml_(m.NguoiGui) + '</b><span class="t">' + escHtml_(m.ThoiGian) + '</span><div>' + escHtml_(m.NoiDung) + '</div></div>';
    }).join('');

  html += '<h3 style="margin-top:1rem">Khung chat công việc</h3>' +
    '<div class="chat-box">' + chatHtml + '</div>';
  if (isManager || isOwner) {
    html += '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'guiChatCongViec', returnPage: 'congviec', id: cv.MaCongViec }) +
      '<div class="field"><textarea name="noiDung" placeholder="Nhắn tin, dán link/ảnh sẽ tự thêm vào Tài liệu đính kèm..." required></textarea></div>' +
      '<div class="btn-row"><button class="btn" type="submit">Gửi</button></div>' +
      '</form>';
  }

  html += '</div>';
  return html;
}

function doPostCapNhatTrangThaiCongViec_(e) {
  capNhatTrangThaiCongViec(getCurrentUser_(), { maCongViec: e.parameter.id, trangThaiMoi: e.parameter.trangThaiMoi, linkKetQua: e.parameter.linkKetQua });
  return { flash: { type: 'ok', msg: 'Đã cập nhật trạng thái công việc ' + e.parameter.id + '.' }, redirectParams: { id: e.parameter.id } };
}
function doPostSuaThoiGianHoanThanh_(e) {
  suaThoiGianHoanThanh(getCurrentUser_(), { maCongViec: e.parameter.id, thoiGianHoanThanh: e.parameter.thoiGianHoanThanh });
  return { flash: { type: 'ok', msg: 'Đã lưu thời gian hoàn thành.' }, redirectParams: { id: e.parameter.id } };
}
function doPostDanhGiaTDV_(e) {
  danhGiaTDV(getCurrentUser_(), { maCongViec: e.parameter.id, maDiem: e.parameter.maDiem, ghiChuTDV: e.parameter.ghiChuTDV });
  return { flash: { type: 'ok', msg: 'Đã lưu đánh giá TĐV.' }, redirectParams: { id: e.parameter.id } };
}
function doPostGuiChatCongViec_(e) {
  guiChatCongViec(getCurrentUser_(), { maCongViec: e.parameter.id, noiDung: e.parameter.noiDung });
  return { flash: null, redirectParams: { id: e.parameter.id } };
}

// ============================================================
// PageDiem.gs
// ============================================================
/**
 * PageDiem.gs - Trang "Điểm cộng/trừ" (Trưởng nhóm trở lên lập phiếu, Quản lý duyệt)
 */
function pageDiem_(user, params) {
  requireRoleAtLeast_(user, ROLES.TRUONG_NHOM);
  var dm = getDanhMucDungChung();
  var nhanSuOpts = dm.nhanSu.map(function (n) { return { value: n.Email, label: n.HoTen }; });
  var maDiemOpts = dm.maDiem.map(function (m) { return { value: m.MaDiem, label: m.MaDiem + ' - ' + m.LyDo + ' (' + m.SoDiem + ')' }; });
  var congViecRows = readAll_(SHEET_NAMES.CONG_VIEC);
  var cvOpts = congViecRows.map(function (c) { return { value: c.MaCongViec, label: c.MaCongViec + ' - ' + c.NoiDung }; });

  var html = '<div class="card"><h2>Lập phiếu ghi nhận điểm cộng/trừ</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'taoPhieuDiem', returnPage: 'diem' }) +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Nhân sự đề xuất *</label>' + selectHtml_('nhanSuDuocDeXuat', nhanSuOpts, '', '-- Chọn --', 'required') + '</div>' +
    '<div class="field"><label>Mã điểm *</label>' + selectHtml_('maDiem', maDiemOpts, '', '-- Chọn --', 'required') + '</div>' +
    '</div>' +
    '<div class="field"><label>Công việc liên quan (không bắt buộc)</label>' + selectHtml_('maCongViecLienQuan', cvOpts, '', '-- Không liên quan công việc cụ thể --') + '</div>' +
    '<div class="field"><label>Nội dung *</label><textarea name="noiDung" required></textarea></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lập phiếu</button></div>' +
    '</form></div>';

  var rows = listPhieuDiem(user);
  var isQuanLy = isQuanLyTroLen_(user);
  var body = rows.map(function (r) {
    var actions = '';
    if (isQuanLy && r.TrangThai === 'Chờ duyệt') {
      actions = '<a class="btn success" href="' + escHtml_(linkTo_('diem', { view: 'duyet', maPhieu: r.MaPhieu })) + '">Duyệt</a> ' +
        '<a class="btn danger" href="' + escHtml_(linkTo_('diem', { view: 'tuchoiphieu', maPhieu: r.MaPhieu })) + '">Từ chối</a>';
    }
    return '<tr><td>' + escHtml_(r.MaPhieu) + '</td><td>' + escHtml_(r.NhanSuDuocDeXuat) + '</td><td>' + escHtml_(r.MaDiem) + '</td>' +
      '<td>' + escHtml_(r.SoDiem) + '</td><td>' + escHtml_(r.NoiDung) + '</td><td>' + pillPhieu_(r.TrangThai) + '</td><td>' + actions + '</td></tr>';
  }).join('');

  html += '<div class="card"><h2>Danh sách phiếu điểm</h2>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã phiếu</th><th>Nhân sự</th><th>Mã điểm</th><th>Điểm</th><th>Nội dung</th><th>Trạng thái</th><th></th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="7"><div class="empty-state">Chưa có phiếu điểm nào.</div></td></tr>') + '</tbody></table></div></div>';

  if (params.view === 'duyet' && params.maPhieu) {
    html += confirmBox_('duyetPhieuDiem', { maPhieu: params.maPhieu }, 'Xác nhận duyệt phiếu điểm ' + params.maPhieu + '?', 'diem', 'success');
  }
  if (params.view === 'tuchoiphieu' && params.maPhieu) {
    html += '<div class="card"><h3>Từ chối phiếu điểm ' + escHtml_(params.maPhieu) + '</h3>' +
      '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
      hiddenInputs_({ action: 'tuChoiPhieuDiem', returnPage: 'diem', maPhieu: params.maPhieu }) +
      '<div class="field"><label>Lý do từ chối</label><textarea name="lyDo" required></textarea></div>' +
      '<div class="btn-row"><button class="btn danger" type="submit">Xác nhận từ chối</button></div>' +
      '</form></div>';
  }
  return html;
}

/** Hộp xác nhận nhanh (nút Duyệt) - submit ngay bằng 1 form ẩn */
function confirmBox_(action, hidden, question, returnPage, btnClass) {
  return '<div class="card"><p>' + escHtml_(question) + '</p>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_(Object.assign({ action: action, returnPage: returnPage }, hidden)) +
    '<div class="btn-row"><button class="btn ' + (btnClass || '') + '" type="submit">Xác nhận</button> ' +
    '<a class="btn secondary" href="' + escHtml_(linkTo_(returnPage)) + '">Huỷ</a></div>' +
    '</form></div>';
}

function doPostTaoPhieuDiem_(e) {
  taoPhieuDiem(getCurrentUser_(), {
    nhanSuDuocDeXuat: e.parameter.nhanSuDuocDeXuat,
    maDiem: e.parameter.maDiem,
    maCongViecLienQuan: e.parameter.maCongViecLienQuan,
    noiDung: e.parameter.noiDung
  });
  return { flash: { type: 'ok', msg: 'Đã lập phiếu, chờ Quản lý duyệt.' } };
}
function doPostDuyetPhieuDiem_(e) {
  duyetPhieuDiem(getCurrentUser_(), { maPhieu: e.parameter.maPhieu });
  return { flash: { type: 'ok', msg: 'Đã duyệt phiếu điểm ' + e.parameter.maPhieu + '.' } };
}
function doPostTuChoiPhieuDiem_(e) {
  tuChoiPhieuDiem(getCurrentUser_(), { maPhieu: e.parameter.maPhieu, lyDo: e.parameter.lyDo });
  return { flash: { type: 'ok', msg: 'Đã từ chối phiếu điểm ' + e.parameter.maPhieu + '.' } };
}

// ============================================================
// PageBaoCao.gs
// ============================================================
/**
 * PageBaoCao.gs - Trang "Báo cáo" (bảng điểm tổng hợp)
 */
function pageBaoCao_(user, params) {
  var rows = baoCaoBangDiem(user);
  var body = rows.map(function (r) {
    return '<tr><td>' + escHtml_(r.hoTen) + '</td><td>' + escHtml_(r.donVi) + '</td><td>' + escHtml_(ROLE_LABELS[r.vaiTro] || r.vaiTro) + '</td>' +
      '<td>' + escHtml_(r.soCongViec) + '</td><td>' + escHtml_(r.diemTrungBinhCongViec) + '</td><td>' + escHtml_(r.tongDiemThuongPhatDaDuyet) + '</td>' +
      '<td><b>' + escHtml_(r.diemTongHop) + '</b></td></tr>';
  }).join('');

  return '<div class="card"><h2>Bảng điểm tổng hợp</h2>' +
    '<div class="table-wrap"><table><thead><tr><th>Nhân sự</th><th>Đơn vị</th><th>Vai trò</th><th>Số CV</th><th>Điểm TB công việc</th><th>Tổng điểm thưởng/phạt</th><th>Điểm tổng hợp</th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="7"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>';
}

// ============================================================
// PageThietLap.gs
// ============================================================
/**
 * PageThietLap.gs - Trang "Thiết lập" (chỉ Admin)
 */
function pageThietLap_(user, params) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  var data = getThietLapDayDu(user);

  function toggleUrl(page, action, keyField, item, curStatus) {
    var next = curStatus === TRANG_THAI_HOAT_DONG.HOAT_DONG ? TRANG_THAI_HOAT_DONG.NGUNG : TRANG_THAI_HOAT_DONG.HOAT_DONG;
    return linkTo_('thietlap', { view: 'toggle', kind: action, key: item[keyField], newStatus: next });
  }

  var donViRows = data.donVi.map(function (d) {
    return '<tr><td>' + escHtml_(d.MaDonVi) + '</td><td>' + escHtml_(d.TenDonVi) + '</td><td>' + escHtml_(d.TrangThai) + '</td>' +
      '<td><a class="btn secondary" href="' + escHtml_(toggleUrl('thietlap', 'donvi', 'MaDonVi', d, d.TrangThai)) + '">' + (d.TrangThai === 'Hoạt động' ? 'Ngừng' : 'Kích hoạt') + '</a></td></tr>';
  }).join('');

  var phanMucRows = data.phanMuc.map(function (p) {
    return '<tr><td>' + escHtml_(p.MaPhanMuc) + '</td><td>' + escHtml_(p.TenPhanMuc) + '</td><td>' + escHtml_(p.TrangThai) + '</td>' +
      '<td><a class="btn secondary" href="' + escHtml_(toggleUrl('thietlap', 'phanmuc', 'MaPhanMuc', p, p.TrangThai)) + '">' + (p.TrangThai === 'Hoạt động' ? 'Ngừng' : 'Kích hoạt') + '</a></td></tr>';
  }).join('');

  var maDiemRows = data.maDiem.map(function (m) {
    return '<tr><td>' + escHtml_(m.MaDiem) + '</td><td>' + escHtml_(m.LyDo) + '</td><td>' + escHtml_(m.SoDiem) + '</td><td>' + escHtml_(m.TrangThai) + '</td>' +
      '<td><a class="btn secondary" href="' + escHtml_(toggleUrl('thietlap', 'madiem', 'MaDiem', m, m.TrangThai)) + '">' + (m.TrangThai === 'Hoạt động' ? 'Ngừng' : 'Kích hoạt') + '</a></td></tr>';
  }).join('');

  var nhanSuRows = data.nhanSu.map(function (n) {
    return '<tr><td>' + escHtml_(n.Email) + '</td><td>' + escHtml_(n.HoTen) + '</td><td>' + escHtml_(n.DonVi) + '</td>' +
      '<td>' + escHtml_(ROLE_LABELS[n.VaiTro] || n.VaiTro) + '</td><td>' + escHtml_(n.TrangThai) + '</td>' +
      '<td><a class="btn secondary" href="' + escHtml_(toggleUrl('thietlap', 'nhansu', 'Email', n, n.TrangThai)) + '">' + (n.TrangThai === 'Hoạt động' ? 'Ngừng' : 'Kích hoạt') + '</a></td></tr>';
  }).join('');

  var donViOpts = data.donVi.map(function (d) { return { value: d.MaDonVi, label: d.TenDonVi }; });
  var vaiTroOpts = Object.keys(ROLE_LABELS).map(function (r) { return { value: r, label: ROLE_LABELS[r] }; });

  return '<div class="card"><h2>Đơn vị / Phòng ban</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'upsertDonVi', returnPage: 'thietlap' }) +
    '<div class="grid grid-2"><div class="field"><label>Mã đơn vị</label><input name="MaDonVi" required></div>' +
    '<div class="field"><label>Tên đơn vị</label><input name="TenDonVi" required></div></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lưu</button></div></form>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã</th><th>Tên</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
    (donViRows || '<tr><td colspan="4"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>' +

    '<div class="card"><h2>Phân mục hồ sơ</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'upsertPhanMuc', returnPage: 'thietlap' }) +
    '<div class="grid grid-2"><div class="field"><label>Mã phân mục</label><input name="MaPhanMuc" required></div>' +
    '<div class="field"><label>Tên phân mục</label><input name="TenPhanMuc" required></div></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lưu</button></div></form>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã</th><th>Tên</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
    (phanMucRows || '<tr><td colspan="4"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>' +

    '<div class="card"><h2>Mã điểm</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'upsertMaDiem', returnPage: 'thietlap' }) +
    '<div class="grid grid-2"><div class="field"><label>Mã điểm</label><input name="MaDiem" required></div>' +
    '<div class="field"><label>Số điểm (+/-)</label><input name="SoDiem" type="number" required></div></div>' +
    '<div class="field"><label>Lý do</label><input name="LyDo" required></div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lưu</button></div></form>' +
    '<div class="table-wrap"><table><thead><tr><th>Mã</th><th>Lý do</th><th>Điểm</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
    (maDiemRows || '<tr><td colspan="5"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>' +

    '<div class="card"><h2>Danh sách nhân sự</h2>' +
    '<form method="POST" action="' + escHtml_(getWebAppUrl_()) + '">' +
    hiddenInputs_({ action: 'upsertNhanSu', returnPage: 'thietlap' }) +
    '<div class="grid grid-2">' +
    '<div class="field"><label>Email</label><input name="Email" type="email" required></div>' +
    '<div class="field"><label>Họ tên</label><input name="HoTen" required></div>' +
    '<div class="field"><label>Đơn vị</label>' + selectHtml_('DonVi', donViOpts, '', '-- Chọn --') + '</div>' +
    '<div class="field"><label>Vai trò</label>' + selectHtml_('VaiTro', vaiTroOpts, ROLES.NHAN_VIEN) + '</div>' +
    '</div>' +
    '<div class="btn-row"><button class="btn" type="submit">Lưu</button></div></form>' +
    '<div class="table-wrap"><table><thead><tr><th>Email</th><th>Họ tên</th><th>Đơn vị</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
    (nhanSuRows || '<tr><td colspan="6"><div class="empty-state">Chưa có dữ liệu.</div></td></tr>') + '</tbody></table></div></div>';
}

/** Xử lý toggle trạng thái qua link GET (an toàn vì chỉ Admin thấy link này, không phải hành động phá huỷ) */
function xuLyToggleThietLap_(user, params) {
  requireRoleAtLeast_(user, ROLES.ADMIN);
  var kind = params.kind, key = params.key, newStatus = params.newStatus;
  if (kind === 'donvi') {
    var d = findOne_(SHEET_NAMES.DON_VI, 'MaDonVi', key);
    upsertDonVi(user, { MaDonVi: key, TenDonVi: d.TenDonVi, TrangThai: newStatus });
  } else if (kind === 'phanmuc') {
    var p = findOne_(SHEET_NAMES.PHAN_MUC, 'MaPhanMuc', key);
    upsertPhanMuc(user, { MaPhanMuc: key, TenPhanMuc: p.TenPhanMuc, TrangThai: newStatus });
  } else if (kind === 'madiem') {
    var m = findOne_(SHEET_NAMES.MA_DIEM, 'MaDiem', key);
    upsertMaDiem(user, { MaDiem: key, LyDo: m.LyDo, SoDiem: m.SoDiem, TrangThai: newStatus });
  } else if (kind === 'nhansu') {
    var n = findOne_(SHEET_NAMES.NHAN_SU, 'Email', key);
    upsertNhanSu(user, { Email: key, HoTen: n.HoTen, DonVi: n.DonVi, VaiTro: n.VaiTro, TrangThai: newStatus });
  }
}

function doPostUpsertDonVi_(e) {
  upsertDonVi(getCurrentUser_(), { MaDonVi: e.parameter.MaDonVi, TenDonVi: e.parameter.TenDonVi });
  return { flash: { type: 'ok', msg: 'Đã lưu đơn vị.' } };
}
function doPostUpsertPhanMuc_(e) {
  upsertPhanMuc(getCurrentUser_(), { MaPhanMuc: e.parameter.MaPhanMuc, TenPhanMuc: e.parameter.TenPhanMuc });
  return { flash: { type: 'ok', msg: 'Đã lưu phân mục.' } };
}
function doPostUpsertMaDiem_(e) {
  upsertMaDiem(getCurrentUser_(), { MaDiem: e.parameter.MaDiem, LyDo: e.parameter.LyDo, SoDiem: e.parameter.SoDiem });
  return { flash: { type: 'ok', msg: 'Đã lưu mã điểm.' } };
}
function doPostUpsertNhanSu_(e) {
  upsertNhanSu(getCurrentUser_(), { Email: e.parameter.Email, HoTen: e.parameter.HoTen, DonVi: e.parameter.DonVi, VaiTro: e.parameter.VaiTro });
  return { flash: { type: 'ok', msg: 'Đã lưu nhân sự.' } };
}



// ============================================================
// Routing: doGet / doPost / renderShell_
// ============================================================

function doGet(e) {
  return handleRequest_(e, {});
}

function doPost(e) {
  var flash = null;
  var forcePage = (e.parameter.returnPage) || 'form';
  var extraParams = {};

  try {
    var result = xuLyAction_(e);
    if (result && result.directHtml) {
      // Một số action (Tra cứu) cần render trực tiếp, không redirect, để
      // tránh đưa Mã xác nhận lên URL lịch sử trình duyệt.
      return renderShell_(getCurrentUser_(), forcePage, result.directHtml, null);
    }
    flash = (result && result.flash) || null;
    extraParams = (result && result.redirectParams) || {};
  } catch (err) {
    flash = { type: 'error', msg: err.message };
    extraParams = {};
    if (e.parameter.id) extraParams.id = e.parameter.id;
  }

  var redirectUrl = linkTo_(forcePage, extraParams);
  return renderRedirect_(redirectUrl, flash);
}

function handleRequest_(e, opts) {
  opts = opts || {};
  khoiTaoDuLieuMauNeuChuaChay_();
  var user = getCurrentUser_();
  var params = (e && e.parameter) || {};
  var page = params.page || 'form';

  if (page === 'thietlap' && params.view === 'toggle') {
    try {
      xuLyToggleThietLap_(user, params);
    } catch (err) {
      return renderShell_(user, 'thietlap', '<div class="card"><p style="color:#D85A30">' + escHtml_(err.message) + '</p></div>', null);
    }
    var target = linkTo_('thietlap');
    return renderRedirect_(target, { type: 'ok', msg: 'Đã cập nhật.' });
  }

  var content;
  try {
    content = buildPageContent_(page, user, params);
  } catch (err) {
    content = '<div class="card"><p style="color:#D85A30"><b>Lỗi:</b> ' + escHtml_(err.message) + '</p></div>';
  }
  return renderShell_(user, page, content, null);
}

function buildPageContent_(page, user, params) {
  switch (page) {
    case 'form': return pageForm_(user, params);
    case 'tiepnhan': return pageTiepNhan_(user, params);
    case 'tracuu': return pageTraCuu_(user, params, null);
    case 'congviec': return pageCongViec_(user, params);
    case 'diem': return pageDiem_(user, params);
    case 'baocao': return pageBaoCao_(user, params);
    case 'thietlap': return pageThietLap_(user, params);
    default: return pageForm_(user, params);
  }
}

/** Dựng trang từ file Index.html (template server-side, không dùng google.script.run) */
function renderShell_(user, page, content, flash) {
  var tpl = HtmlService.createTemplateFromFile('Index');
  tpl.navHtml = renderNav_(user, page);
  tpl.flashHtml = renderFlash_(flash);
  tpl.content = content;
  return tpl.evaluate()
    .setTitle('Quản lý công việc nhóm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Bảng định tuyến các action POST -> hàm xử lý tương ứng */
function xuLyAction_(e) {
  var action = e.parameter.action;
  switch (action) {
    case 'submitHoSo': return doPostSubmitHoSo_(e);
    case 'traCuuHoSo': return doPostTraCuuHoSo_(e);
    case 'guiTinTraCuu': return doPostGuiTinTraCuu_(e);
    case 'assignHoSo': return doPostAssignHoSo_(e);
    case 'rejectHoSo': return doPostRejectHoSo_(e);
    case 'capNhatTrangThaiCongViec': return doPostCapNhatTrangThaiCongViec_(e);
    case 'suaThoiGianHoanThanh': return doPostSuaThoiGianHoanThanh_(e);
    case 'danhGiaTDV': return doPostDanhGiaTDV_(e);
    case 'guiChatCongViec': return doPostGuiChatCongViec_(e);
    case 'taoPhieuDiem': return doPostTaoPhieuDiem_(e);
    case 'duyetPhieuDiem': return doPostDuyetPhieuDiem_(e);
    case 'tuChoiPhieuDiem': return doPostTuChoiPhieuDiem_(e);
    case 'upsertDonVi': return doPostUpsertDonVi_(e);
    case 'upsertPhanMuc': return doPostUpsertPhanMuc_(e);
    case 'upsertMaDiem': return doPostUpsertMaDiem_(e);
    case 'upsertNhanSu': return doPostUpsertNhanSu_(e);
    default: throw new Error('Hành động không hợp lệ: ' + action);
  }
}
