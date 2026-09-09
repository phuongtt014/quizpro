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
