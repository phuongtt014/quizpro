/**
 * HoSoService.gs — Form nhận hồ sơ, Tab tiếp nhận (phân công/từ chối), Tab tra cứu.
 */

function findHoSoByMa_(maHoSo) {
  var rows = sheetToObjects_(getSheet_(SHEETS.HOSO));
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].MaHoSo) === String(maHoSo)) return rows[i];
  }
  return null;
}

/** entry point: nộp hồ sơ mới. Yêu cầu đã đăng nhập (token hợp lệ). */
function submitHoSo(token, payload) {
  return safeCall_(function () {
    var user = requireSession_(token);
    if (!payload || !payload.tieuDe || !payload.phanMuc || !payload.noiDungChiTiet) {
      return jsonErr_('Vui lòng điền đầy đủ thông tin bắt buộc.');
    }
    var links = (payload.taiLieuLinks || []).filter(Boolean).join('\n');
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    var hoSo;
    try {
      hoSo = {
        MaHoSo: genCode_('HS', 5),
        MaXacNhan: genConfirmCode_(),
        HoTenNguoiGui: payload.hoTen || user.HoTen,
        EmailNguoiGui: payload.email || user.Email,
        SoDienThoaiNguoiGui: payload.soDienThoai || user.SoDienThoai,
        DonVi: payload.donVi || user.DonVi,
        TieuDe: payload.tieuDe,
        PhanMuc: payload.phanMuc,
        NoiDungChiTiet: payload.noiDungChiTiet,
        TaiLieuDinhKem: links,
        NguoiGuiUsername: user.Username,
        TrangThai: 'ChoTiepNhan',
        LyDoTuChoi: '', NguoiXuLy: '', MaCV: '',
        NgayTao: nowStr_(), NgayCapNhat: nowStr_()
      };
      appendObject_(getSheet_(SHEETS.HOSO), SCHEMA[SHEETS.HOSO], hoSo);
    } finally {
      lock.releaseLock();
    }
    mailHoSoTaoMoi_(hoSo);
    return jsonOk_({ maHoSo: hoSo.MaHoSo, maXacNhan: hoSo.MaXacNhan });
  });
}

/** entry point công khai: tra cứu bằng mã hồ sơ + mã xác nhận, không cần đăng nhập. */
function lookupHoSo(maHoSo, maXacNhan) {
  return safeCall_(function () {
    ensureAllSheets_();
    var hoSo = findHoSoByMa_(maHoSo);
    if (!hoSo || String(hoSo.MaXacNhan) !== String(maXacNhan)) {
      return jsonErr_('Không tìm thấy hồ sơ hoặc mã xác nhận không đúng.');
    }
    var congViec = null, chat = [];
    if (hoSo.MaCV) {
      congViec = findCongViecByMa_(hoSo.MaCV);
      if (congViec) chat = listChatByMaCV_(hoSo.MaCV);
    }
    return jsonOk_({ hoSo: hoSo, congViec: congViec, chat: chat });
  });
}

/** entry point công khai: người đề xuất nhắn tin cho người phụ trách qua tab Tra cứu. */
function sendTraCuuMessage(maHoSo, maXacNhan, noiDung) {
  return safeCall_(function () {
    var hoSo = findHoSoByMa_(maHoSo);
    if (!hoSo || String(hoSo.MaXacNhan) !== String(maXacNhan)) {
      return jsonErr_('Không tìm thấy hồ sơ hoặc mã xác nhận không đúng.');
    }
    if (!hoSo.MaCV) return jsonErr_('Hồ sơ chưa được phân công xử lý nên chưa thể nhắn tin.');
    if (!noiDung || !noiDung.trim()) return jsonErr_('Nội dung tin nhắn không được để trống.');
    appendChatMessage_(hoSo.MaCV, hoSo.HoTenNguoiGui + ' (người đề xuất)', 'NguoiDeXuat', noiDung);
    var congViec = findCongViecByMa_(hoSo.MaCV);
    if (congViec && congViec.NguoiPhuTrach) {
      var u = findUserByUsername_(congViec.NguoiPhuTrach);
      if (u) mailNguoiPhuTrachTinNhanTraCuu_(u.Email, hoSo.MaCV, hoSo.HoTenNguoiGui, noiDung);
    }
    return jsonOk_({});
  });
}

/** entry point: Trưởng nhóm trở lên xem danh sách hồ sơ chờ tiếp nhận. */
function listHoSoTiepNhan(token, trangThaiFilter) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'TruongNhom');
    var rows = sheetToObjects_(getSheet_(SHEETS.HOSO));
    if (trangThaiFilter) rows = rows.filter(function (r) { return r.TrangThai === trangThaiFilter; });
    rows.sort(function (a, b) { return new Date(b.NgayTao) - new Date(a.NgayTao); });
    return jsonOk_({ items: rows });
  });
}

/** entry point: phân công hồ sơ -> tạo công việc tương ứng. */
function assignHoSo(token, maHoSo, nguoiPhuTrach, thoiGianBatDau, thoiHan) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'TruongNhom');
    if (!nguoiPhuTrach || !thoiHan) return jsonErr_('Vui lòng chọn người phụ trách và thời hạn xử lý.');

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    var hoSo, congViec;
    try {
      var hoSoSheet = getSheet_(SHEETS.HOSO);
      hoSo = findHoSoByMa_(maHoSo);
      if (!hoSo) throw new Error('Không tìm thấy hồ sơ.');
      if (hoSo.TrangThai !== 'ChoTiepNhan') throw new Error('Hồ sơ này đã được xử lý trước đó.');

      congViec = {
        MaCV: genCode_('CV', 5),
        MaHoSo: hoSo.MaHoSo,
        NoiDung: hoSo.TieuDe,
        NguoiPhuTrach: nguoiPhuTrach,
        MoTa: hoSo.NoiDungChiTiet,
        TaiLieuDinhKem: hoSo.TaiLieuDinhKem,
        TrangThai: 'CanLam',
        PhanLoai: hoSo.PhanMuc,
        ThoiGianBatDau: thoiGianBatDau || nowStr_(),
        ThoiHan: thoiHan,
        ThoiGianHoanThanh: '', LinkKetQua: '',
        DiemNen: 100, MaDiemDanhGia: '', SoDiemDanhGia: '', DiemCuoiCung: '',
        GhiChuTDV: '', NguoiTao: user.Username,
        NgayTao: nowStr_(), NgayCapNhat: nowStr_()
      };
      appendObject_(getSheet_(SHEETS.CONGVIEC), SCHEMA[SHEETS.CONGVIEC], congViec);

      updateObjectById_(hoSoSheet, SCHEMA[SHEETS.HOSO], 'MaHoSo', maHoSo, {
        TrangThai: 'DaPhanCong', NguoiXuLy: user.Username, MaCV: congViec.MaCV, NgayCapNhat: nowStr_()
      });
      hoSo.TrangThai = 'DaPhanCong'; hoSo.MaCV = congViec.MaCV;
    } finally {
      lock.releaseLock();
    }
    mailHoSoPhanCong_(hoSo, congViec);
    var nv = findUserByUsername_(nguoiPhuTrach);
    if (nv) sendMail_(nv.Email, 'Bạn được phân công công việc ' + congViec.MaCV, 'Bạn vừa được phân công xử lý công việc <b>' + congViec.NoiDung + '</b> (mã ' + congViec.MaCV + '), thời hạn <b>' + thoiHan + '</b>. Vui lòng vào tab Quản lý công việc để xử lý.');
    return jsonOk_({ maCV: congViec.MaCV });
  });
}

/** entry point: từ chối hồ sơ, bắt buộc ghi lý do. */
function rejectHoSo(token, maHoSo, lyDo) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'TruongNhom');
    if (!lyDo || !lyDo.trim()) return jsonErr_('Vui lòng nhập lý do từ chối.');
    var hoSo = findHoSoByMa_(maHoSo);
    if (!hoSo) return jsonErr_('Không tìm thấy hồ sơ.');
    if (hoSo.TrangThai !== 'ChoTiepNhan') return jsonErr_('Hồ sơ này đã được xử lý trước đó.');
    updateObjectById_(getSheet_(SHEETS.HOSO), SCHEMA[SHEETS.HOSO], 'MaHoSo', maHoSo, {
      TrangThai: 'TuChoi', LyDoTuChoi: lyDo, NguoiXuLy: user.Username, NgayCapNhat: nowStr_()
    });
    hoSo.TrangThai = 'TuChoi'; hoSo.LyDoTuChoi = lyDo;
    mailHoSoTuChoi_(hoSo);
    return jsonOk_({});
  });
}
