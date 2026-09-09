/**
 * Auth.gs
 * Xác định người dùng hiện tại (qua Google account) và vai trò của họ
 * dựa trên danh sách nhân sự cấu hình trong tab Thiết lập (sheet NhanSu).
 */

/** Trả về thông tin người dùng hiện tại: {email, hoTen, donVi, vaiTro, dangHoatDong} */
function getCurrentUser_() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    // Trường hợp không lấy được email (hiếm khi web app deploy "Anyone")
    throw new Error('Không xác định được tài khoản Google. Vui lòng đăng nhập bằng tài khoản Google được cấp quyền.');
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
