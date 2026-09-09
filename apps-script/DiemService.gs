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
