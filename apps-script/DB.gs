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
  COUNTERS: 'Counters'
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

var ROLES = ['NhanVien', 'TruongNhom', 'QuanLy', 'Admin'];
var ROLE_RANK = { NhanVien: 1, TruongNhom: 2, QuanLy: 3, Admin: 4 };
var ROLE_LABEL = { NhanVien: 'Nhân viên', TruongNhom: 'Trưởng nhóm', QuanLy: 'Quản lý', Admin: 'Admin hệ thống' };

var TASK_STATUSES = ['CanLam', 'DangLam', 'DaNop', 'TDVXacNhan', 'TamNgung', 'HuyBo'];
var TASK_STATUS_LABEL = {
  CanLam: 'Cần làm', DangLam: 'Đang làm', DaNop: 'Đã nộp',
  TDVXacNhan: 'TĐV xác nhận', TamNgung: 'Tạm ngưng', HuyBo: 'Hủy bỏ'
};
var HOSO_STATUS_LABEL = { ChoTiepNhan: 'Chờ tiếp nhận', DaPhanCong: 'Đã phân công', TuChoi: 'Từ chối' };

function getSS_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  var ss = getSS_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var headers = SCHEMA[name];
  if (headers) {
    var firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    if (firstRow.join('') !== headers.join('')) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

/** Đảm bảo toàn bộ sheet cần thiết tồn tại + seed dữ liệu mẫu lần đầu. Gọi ở đầu doGet. */
function ensureAllSheets_() {
  Object.keys(SHEETS).forEach(function (k) { getSheet_(SHEETS[k]); });
  seedIfEmpty_();
}

function seedIfEmpty_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
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
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join('') === '') continue;
    var obj = {};
    headers.forEach(function (h, idx) { obj[h] = row[idx]; });
    out.push(obj);
  }
  return out;
}

function appendObject_(sheet, headers, obj) {
  var row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
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
  return obj;
}

function getNextSeq_(key) {
  var sh = getSheet_(SHEETS.COUNTERS);
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      var newVal = Number(values[i][1]) + 1;
      sh.getRange(i + 1, 2).setValue(newVal);
      return newVal;
    }
  }
  sh.appendRow([key, 1]);
  return 1;
}
