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
