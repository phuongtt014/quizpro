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
