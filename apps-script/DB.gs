/**
 * DB.gs — Định nghĩa schema các sheet, khởi tạo & seed dữ liệu mẫu,
 * và các hàm CRUD chung dùng lại cho mọi service.
 *
 * Toàn bộ sheet dữ liệu được coi là "bảng", dòng 1 là tên cột (header).
 */

var SHEETS = {
  USERS: 'Users',
  SESSIONS: 'Sessions',
  HOSO: 'HoSo',
  CONGVIEC: 'CongViec',
  CHATLOG: 'ChatLog',
  DIEM: 'DiemCongTru',
  SET_DONVI: 'Settings_DonVi',
  SET_PHANMUC: 'Settings_PhanMuc',
  SET_MADIEM: 'Settings_MaDiem',
  COUNTERS: 'Counters',
  MAILQUEUE: 'MailQueue'
};

var SCHEMA = {};
SCHEMA[SHEETS.USERS] = ['Id', 'HoTen', 'Email', 'SoDienThoai', 'DonVi', 'Username', 'PasswordHash', 'Salt', 'VaiTro', 'TrangThai', 'NgayTao'];
SCHEMA[SHEETS.SESSIONS] = ['Token', 'Username', 'HetHan'];
SCHEMA[SHEETS.HOSO] = ['MaHoSo', 'MaXacNhan', 'HoTenNguoiGui', 'EmailNguoiGui', 'SoDienThoaiNguoiGui', 'DonVi', 'TieuDe', 'PhanMuc', 'NoiDungChiTiet', 'TaiLieuDinhKem', 'NguoiGuiUsername', 'TrangThai', 'LyDoTuChoi', 'NguoiXuLy', 'MaCV', 'NgayTao', 'NgayCapNhat'];
SCHEMA[SHEETS.CONGVIEC] = ['MaCV', 'MaHoSo', 'NoiDung', 'NguoiPhuTrach', 'MoTa', 'TaiLieuDinhKem', 'TrangThai', 'PhanLoai', 'ThoiGianBatDau', 'ThoiHan', 'ThoiGianHoanThanh', 'LinkKetQua', 'DiemNen', 'MaDiemDanhGia', 'SoDiemDanhGia', 'DiemCuoiCung', 'GhiChuTDV', 'NguoiTao', 'NgayTao', 'NgayCapNhat'];
SCHEMA[SHEETS.CHATLOG] = ['Id', 'MaCV', 'NguoiGui', 'NhanXung', 'NoiDung', 'ThoiGian'];
SCHEMA[SHEETS.DIEM] = ['Id', 'NhanSu', 'NguoiDeXuat', 'MaDiem', 'SoDiem', 'NoiDung', 'TrangThai', 'NguoiDuyet', 'NgayDeXuat', 'NgayDuyet'];
SCHEMA[SHEETS.SET_DONVI] = ['Id', 'TenDonVi'];
SCHEMA[SHEETS.SET_PHANMUC] = ['Id', 'TenPhanMuc'];
SCHEMA[SHEETS.SET_MADIEM] = ['MaDiem', 'MoTa', 'SoDiem'];
SCHEMA[SHEETS.COUNTERS] = ['Key', 'Value'];
SCHEMA[SHEETS.MAILQUEUE] = ['Id', 'ToEmail', 'Subject', 'Body', 'TrangThai', 'NgayTao', 'NgayGui'];

var ROLES = ['NhanVien', 'TruongNhom', 'QuanLy', 'Admin'];
var ROLE_RANK = { NhanVien: 1, TruongNhom: 2, QuanLy: 3, Admin: 4 };
var ROLE_LABEL = { NhanVien: 'Nhân viên', TruongNhom: 'Trưởng nhóm', QuanLy: 'Quản lý', Admin: 'Admin hệ thống' };

var TASK_STATUSES = ['CanLam', 'DangLam', 'DaNop', 'TDVXacNhan', 'TamNgung', 'HuyBo'];
var TASK_STATUS_LABEL = {
  CanLam: 'Cần làm', DangLam: 'Đang làm', DaNop: 'Đã nộp',
  TDVXacNhan: 'TĐV xác nhận', TamNgung: 'Tạm ngưng', HuyBo: 'Hủy bỏ'
};
var HOSO_STATUS_LABEL = { ChoTiepNhan: 'Chờ tiếp nhận', DaPhanCong: 'Đã phân công', TuChoi: 'Từ chối' };

/** Các cột dạng số-chuỗi (mã xác nhận, số điện thoại) dễ bị Google Sheets tự hiểu nhầm thành số
 * và làm mất số 0 ở đầu (VD "012345" -> 12345) nếu không ép định dạng "Văn bản thuần". */
var TEXT_FORMAT_COLUMNS = {};
TEXT_FORMAT_COLUMNS[SHEETS.HOSO] = ['MaXacNhan', 'SoDienThoaiNguoiGui'];
TEXT_FORMAT_COLUMNS[SHEETS.USERS] = ['SoDienThoai'];

/*
 * ---------- Cache trong phạm vi 1 lượt thực thi ----------
 * Mỗi lệnh gọi tới dịch vụ Spreadsheet (kể cả chỉ để lấy tham chiếu sheet hay kiểm tra header)
 * tốn khoảng 100-400ms. Cache Spreadsheet, các Sheet đã lấy và dữ liệu bảng đã đọc trong phạm vi
 * 1 lần thực thi giúp giảm hẳn số lệnh gọi khi tạo mới công việc / mục thiết lập — đây là
 * nguyên nhân chính gây chậm. Mỗi lần gọi từ client (google.script.run) là 1 lượt thực thi mới
 * nên các biến cache dưới đây luôn khởi tạo lại "sạch", không lo dữ liệu cũ giữa các request.
 */
var _ssCache_ = null;
var _sheetCache_ = {};
var _tableCache_ = {};

/**
 * Reset toàn bộ cache — PHẢI gọi ở đầu mỗi lượt xử lý 1 lệnh gọi từ client (xem safeCall_ ở
 * Utils.gs và doGet ở Code.gs). Apps Script đôi khi tái sử dụng cùng 1 tiến trình cho các lệnh
 * gọi liên tiếp nên biến toàn cục có thể "sống sót" qua nhiều lượt — nếu không reset, 1 tab có
 * thể đọc phải dữ liệu cache cũ từ trước khi 1 tab khác vừa ghi thêm dữ liệu mới (VD: vừa nộp hồ
 * sơ xong, sang tab Tra cứu/Tiếp nhận lại không thấy).
 */
function _resetRequestCache_() {
  _ssCache_ = null;
  _sheetCache_ = {};
  _tableCache_ = {};
}

function getSS_() {
  if (!_ssCache_) _ssCache_ = SpreadsheetApp.getActiveSpreadsheet();
  return _ssCache_;
}

function getSheet_(name) {
  if (_sheetCache_[name]) return _sheetCache_[name];
  var ss = getSS_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var headers = SCHEMA[name];
  // Chỉ ghi header khi sheet thực sự trống, tránh phải đọc dữ liệu (getValues) chỉ để so sánh.
  if (headers && sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  _sheetCache_[name] = sh;
  return sh;
}

function _invalidateTableCache_(name) {
  delete _tableCache_[name];
}

/** entry point nội bộ: xoá 1 dòng theo id + tự invalidate cache đọc của sheet đó. */
function deleteRowById_(sheet, idCol, idVal) {
  var idx = findRowIndexById_(sheet, idCol, idVal);
  if (idx > 0) {
    sheet.deleteRow(idx);
    SpreadsheetApp.flush();
    _invalidateTableCache_(sheet.getName());
  }
  return idx > 0;
}

/** Đảm bảo toàn bộ sheet cần thiết tồn tại + seed dữ liệu mẫu lần đầu + có trigger gửi mail hàng đợi. Gọi ở đầu doGet. */
function ensureAllSheets_() {
  Object.keys(SHEETS).forEach(function (k) { getSheet_(SHEETS[k]); });
  seedIfEmpty_();
  ensureMailTrigger_();
  ensureTextColumns_();
}

/** Ép định dạng "Văn bản thuần" cho các cột trong TEXT_FORMAT_COLUMNS — chỉ chạy 1 lần thật sự
 * (đánh dấu bằng Script Properties) để không tốn thêm lệnh gọi Spreadsheet ở các lần sau. */
function ensureTextColumns_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('textColumnsReady') === '1') return;
  Object.keys(TEXT_FORMAT_COLUMNS).forEach(function (sheetName) {
    var sh = getSheet_(sheetName);
    var headers = SCHEMA[sheetName];
    TEXT_FORMAT_COLUMNS[sheetName].forEach(function (colName) {
      var idx = headers.indexOf(colName);
      if (idx < 0) return;
      sh.getRange(2, idx + 1, 10000, 1).setNumberFormat('@');
    });
  });
  props.setProperty('textColumnsReady', '1');
}

function seedIfEmpty_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var usersSheet = getSheet_(SHEETS.USERS);
    if (usersSheet.getLastRow() < 2) {
      var seedUsers = [
        { HoTen: 'Quản trị hệ thống', Email: 'admin@vaschools.edu.vn', SoDienThoai: '', DonVi: 'Ban Giám hiệu', Username: 'admin', VaiTro: 'Admin' },
        { HoTen: 'Nguyễn Văn Quản Lý', Email: 'quanly@vaschools.edu.vn', SoDienThoai: '', DonVi: 'Ban Giám hiệu', Username: 'quanly', VaiTro: 'QuanLy' },
        { HoTen: 'Trần Thị Trưởng Nhóm', Email: 'truongnhom@vaschools.edu.vn', SoDienThoai: '', DonVi: 'Phòng Hành chính', Username: 'truongnhom', VaiTro: 'TruongNhom' },
        { HoTen: 'Lê Văn Nhân Viên', Email: 'nhanvien@vaschools.edu.vn', SoDienThoai: '', DonVi: 'Phòng Hành chính', Username: 'nhanvien', VaiTro: 'NhanVien' }
      ];
      seedUsers.forEach(function (u) {
        var salt = genSalt_();
        appendObject_(usersSheet, SCHEMA[SHEETS.USERS], {
          Id: genCode_('U', 4),
          HoTen: u.HoTen, Email: u.Email, SoDienThoai: u.SoDienThoai, DonVi: u.DonVi,
          Username: u.Username, PasswordHash: hashPassword_('123456', salt), Salt: salt,
          VaiTro: u.VaiTro, TrangThai: 'Active', NgayTao: nowStr_()
        });
      });
    }

    var donViSheet = getSheet_(SHEETS.SET_DONVI);
    if (donViSheet.getLastRow() < 2) {
      ['Phòng Hành chính', 'Phòng Đào tạo', 'Phòng Tài chính - Kế toán', 'Phòng Công nghệ thông tin', 'Ban Giám hiệu'].forEach(function (t) {
        appendObject_(donViSheet, SCHEMA[SHEETS.SET_DONVI], { Id: genCode_('DV', 3), TenDonVi: t });
      });
    }

    var phanMucSheet = getSheet_(SHEETS.SET_PHANMUC);
    if (phanMucSheet.getLastRow() < 2) {
      ['Đề xuất mua sắm', 'Yêu cầu hỗ trợ kỹ thuật', 'Đề nghị thanh toán', 'Góp ý - Phản ánh', 'Khác'].forEach(function (t) {
        appendObject_(phanMucSheet, SCHEMA[SHEETS.SET_PHANMUC], { Id: genCode_('PM', 3), TenPhanMuc: t });
      });
    }

    var maDiemSheet = getSheet_(SHEETS.SET_MADIEM);
    if (maDiemSheet.getLastRow() < 2) {
      var seedMaDiem = [
        ['C1', 'Hoàn thành xuất sắc, đúng/trước hạn', 10],
        ['C2', 'Hoàn thành tốt', 5],
        ['C3', 'Sáng kiến cải tiến được ghi nhận', 15],
        ['T1', 'Trễ hạn không lý do chính đáng', -10],
        ['T2', 'Chất lượng chưa đạt, phải làm lại', -15],
        ['T3', 'Vi phạm quy trình làm việc', -20]
      ];
      seedMaDiem.forEach(function (r) {
        appendObject_(maDiemSheet, SCHEMA[SHEETS.SET_MADIEM], { MaDiem: r[0], MoTa: r[1], SoDiem: r[2] });
      });
    }
  } finally {
    lock.releaseLock();
  }
}

/* ---------- CRUD helpers chung ---------- */

function sheetToObjects_(sheet) {
  var name = sheet.getName();
  if (_tableCache_[name]) return _tableCache_[name];
  var values = sheet.getDataRange().getValues();
  var out = [];
  if (values.length >= 2) {
    var headers = values[0];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (row.join('') === '') continue;
      var obj = {};
      headers.forEach(function (h, idx) { obj[h] = row[idx]; });
      out.push(obj);
    }
  }
  _tableCache_[name] = out;
  return out;
}

function appendObject_(sheet, headers, obj) {
  var row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
  // flush() bắt buộc: Apps Script có thể gộp các thay đổi lại và chưa "chốt" ngay xuống
  // Sheet thật — nếu không flush, 1 request KHÁC (VD tab Tra cứu/Tiếp nhận mở ngay sau đó)
  // đọc dữ liệu có thể vẫn thấy trạng thái CŨ, dù trên giao diện Sheet đã hiển thị dòng mới.
  SpreadsheetApp.flush();
  _invalidateTableCache_(sheet.getName());
  return obj;
}

function findRowIndexById_(sheet, idCol, idVal) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var colIdx = headers.indexOf(idCol);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][colIdx]) === String(idVal)) return i + 1;
  }
  return -1;
}

function updateObjectById_(sheet, headers, idCol, idVal, patch) {
  var rowIdx = findRowIndexById_(sheet, idCol, idVal);
  if (rowIdx < 0) throw new Error('Không tìm thấy dữ liệu với ' + idCol + ' = ' + idVal);
  var currentRow = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  var obj = {};
  headers.forEach(function (h, i) { obj[h] = currentRow[i]; });
  Object.keys(patch).forEach(function (k) { obj[k] = patch[k]; });
  var newRow = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.getRange(rowIdx, 1, 1, headers.length).setValues([newRow]);
  SpreadsheetApp.flush();
  _invalidateTableCache_(sheet.getName());
  return obj;
}

function getNextSeq_(key) {
  var sh = getSheet_(SHEETS.COUNTERS);
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      var newVal = Number(values[i][1]) + 1;
      sh.getRange(i + 1, 2).setValue(newVal);
      SpreadsheetApp.flush();
      return newVal;
    }
  }
  sh.appendRow([key, 1]);
  SpreadsheetApp.flush();
  return 1;
}
