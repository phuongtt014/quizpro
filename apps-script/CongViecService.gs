/**
 * CongViecService.gs — Tab Quản lý công việc: CRUD, chuyển trạng thái, khung chat.
 */

function findCongViecByMa_(maCV) {
  var rows = sheetToObjects_(getSheet_(SHEETS.CONGVIEC));
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].MaCV) === String(maCV)) return rows[i];
  }
  return null;
}

function listChatByMaCV_(maCV) {
  var rows = sheetToObjects_(getSheet_(SHEETS.CHATLOG)).filter(function (r) { return String(r.MaCV) === String(maCV); });
  rows.sort(function (a, b) { return new Date(a.ThoiGian) - new Date(b.ThoiGian); });
  return rows;
}

/** Ghi 1 dòng chat + tự động gom link vào Tài liệu đính kèm của công việc. */
function appendChatMessage_(maCV, nguoiGuiDisplay, nhanXung, noiDung) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    appendObject_(getSheet_(SHEETS.CHATLOG), SCHEMA[SHEETS.CHATLOG], {
      Id: genCode_('CL', 6), MaCV: maCV, NguoiGui: nguoiGuiDisplay, NhanXung: nhanXung,
      NoiDung: noiDung, ThoiGian: nowStr_()
    });
    var links = extractLinks_(noiDung);
    if (links.length) {
      var cvSheet = getSheet_(SHEETS.CONGVIEC);
      var cv = findCongViecByMa_(maCV);
      if (cv) {
        var merged = mergeLinks_(cv.TaiLieuDinhKem, links);
        updateObjectById_(cvSheet, SCHEMA[SHEETS.CONGVIEC], 'MaCV', maCV, { TaiLieuDinhKem: merged, NgayCapNhat: nowStr_() });
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function canSeeCongViec_(user, cv) {
  if (ROLE_RANK[user.VaiTro] >= ROLE_RANK.TruongNhom) return true;
  return cv.NguoiPhuTrach === user.Username;
}

/** entry point: danh sách công việc (theo phạm vi quyền của user). filters: {trangThai, phanLoai, nguoiPhuTrach} */
function listCongViec(token, filters) {
  return safeCall_(function () {
    var user = requireSession_(token);
    filters = filters || {};
    var rows = sheetToObjects_(getSheet_(SHEETS.CONGVIEC));
    if (ROLE_RANK[user.VaiTro] < ROLE_RANK.TruongNhom) {
      rows = rows.filter(function (r) { return r.NguoiPhuTrach === user.Username; });
    }
    if (filters.trangThai) rows = rows.filter(function (r) { return r.TrangThai === filters.trangThai; });
    if (filters.phanLoai) rows = rows.filter(function (r) { return r.PhanLoai === filters.phanLoai; });
    if (filters.nguoiPhuTrach) rows = rows.filter(function (r) { return r.NguoiPhuTrach === filters.nguoiPhuTrach; });
    rows.sort(function (a, b) { return new Date(b.NgayTao) - new Date(a.NgayTao); });
    return jsonOk_({ items: rows });
  });
}

/** entry point: chi tiết 1 công việc + lịch sử chat. */
function getCongViecDetail(token, maCV) {
  return safeCall_(function () {
    var user = requireSession_(token);
    var cv = findCongViecByMa_(maCV);
    if (!cv) return jsonErr_('Không tìm thấy công việc.');
    if (!canSeeCongViec_(user, cv)) return jsonErr_('Bạn không có quyền xem công việc này.');
    return jsonOk_({ congViec: cv, chat: listChatByMaCV_(maCV) });
  });
}

/** entry point: Trưởng nhóm+ tạo công việc trực tiếp (không qua hồ sơ). */
function createCongViecDirect(token, payload) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'TruongNhom');
    if (!payload || !payload.noiDung || !payload.nguoiPhuTrach || !payload.thoiHan) {
      return jsonErr_('Vui lòng điền đầy đủ Nội dung, Người phụ trách và Thời hạn.');
    }
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    var cv;
    try {
      cv = {
        MaCV: genCode_('CV', 5), MaHoSo: '', NoiDung: payload.noiDung,
        NguoiPhuTrach: payload.nguoiPhuTrach, MoTa: payload.moTa || '',
        TaiLieuDinhKem: (payload.taiLieuLinks || []).filter(Boolean).join('\n'),
        TrangThai: 'CanLam', PhanLoai: payload.phanLoai || '',
        ThoiGianBatDau: payload.thoiGianBatDau || nowStr_(), ThoiHan: payload.thoiHan,
        ThoiGianHoanThanh: '', LinkKetQua: '', DiemNen: 100,
        MaDiemDanhGia: '', SoDiemDanhGia: '', DiemCuoiCung: '', GhiChuTDV: '',
        NguoiTao: user.Username, NgayTao: nowStr_(), NgayCapNhat: nowStr_()
      };
      appendObject_(getSheet_(SHEETS.CONGVIEC), SCHEMA[SHEETS.CONGVIEC], cv);
    } finally {
      lock.releaseLock();
    }
    var nv = findUserByUsername_(payload.nguoiPhuTrach);
    if (nv) queueMail_(nv.Email, 'Bạn được giao công việc mới ' + cv.MaCV, 'Bạn vừa được giao công việc <b>' + cv.NoiDung + '</b> (mã ' + cv.MaCV + '), thời hạn <b>' + cv.ThoiHan + '</b>.');
    return jsonOk_({ maCV: cv.MaCV });
  });
}

/** entry point: người phụ trách (hoặc Trưởng nhóm+) chuyển trạng thái Cần làm / Đang làm / Đã nộp / Tạm ngưng / Hủy bỏ. */
function updateTrangThai(token, maCV, trangThaiMoi, extra) {
  return safeCall_(function () {
    var user = requireSession_(token);
    var cv = findCongViecByMa_(maCV);
    if (!cv) return jsonErr_('Không tìm thấy công việc.');
    extra = extra || {};

    var isAssignee = cv.NguoiPhuTrach === user.Username;
    var isManagerish = ROLE_RANK[user.VaiTro] >= ROLE_RANK.TruongNhom;
    if (!isAssignee && !isManagerish) return jsonErr_('Bạn không có quyền cập nhật công việc này.');

    if (trangThaiMoi === 'TDVXacNhan') {
      return jsonErr_('Trạng thái "TĐV xác nhận" chỉ được thiết lập bởi Quản lý kèm đánh giá điểm.');
    }
    if (TASK_STATUSES.indexOf(trangThaiMoi) < 0) return jsonErr_('Trạng thái không hợp lệ.');
    if ((trangThaiMoi === 'TamNgung' || trangThaiMoi === 'HuyBo') && !isManagerish) {
      return jsonErr_('Chỉ Trưởng nhóm trở lên mới được tạm ngưng/hủy bỏ công việc.');
    }

    var patch = { TrangThai: trangThaiMoi, NgayCapNhat: nowStr_() };
    if (trangThaiMoi === 'DaNop') {
      if (cv.MaHoSo && (!extra.linkKetQua || !extra.linkKetQua.trim())) {
        return jsonErr_('Công việc gắn với hồ sơ — vui lòng nhập link trả kết quả trước khi chuyển sang Đã nộp.');
      }
      patch.ThoiGianHoanThanh = nowStr_();
      if (extra.linkKetQua) patch.LinkKetQua = extra.linkKetQua;
    }

    var updated = updateObjectById_(getSheet_(SHEETS.CONGVIEC), SCHEMA[SHEETS.CONGVIEC], 'MaCV', maCV, patch);

    if (trangThaiMoi === 'DaNop' && cv.MaHoSo) {
      var hoSo = findHoSoByMa_(cv.MaHoSo);
      mailCongViecDaNop_(hoSo, updated);
    }
    return jsonOk_({ congViec: updated });
  });
}

/** entry point: Quản lý+ sửa thời gian hoàn thành / chuyển "TĐV xác nhận" kèm điểm + ghi chú / tạm ngưng-hủy. */
function managerUpdateCongViec(token, maCV, patch) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'QuanLy');
    var cv = findCongViecByMa_(maCV);
    if (!cv) return jsonErr_('Không tìm thấy công việc.');
    patch = patch || {};

    var out = { NgayCapNhat: nowStr_() };
    if (patch.thoiGianHoanThanh !== undefined) out.ThoiGianHoanThanh = patch.thoiGianHoanThanh;

    if (patch.xacNhanTDV) {
      var soDiem = 0;
      if (patch.maDiemDanhGia) {
        var maDiemRow = sheetToObjects_(getSheet_(SHEETS.SET_MADIEM)).filter(function (r) { return r.MaDiem === patch.maDiemDanhGia; })[0];
        if (!maDiemRow) return jsonErr_('Mã điểm không hợp lệ.');
        soDiem = Number(maDiemRow.SoDiem);
      }
      var diemNen = Number(cv.DiemNen) || 100;
      out.TrangThai = 'TDVXacNhan';
      out.MaDiemDanhGia = patch.maDiemDanhGia || '';
      out.SoDiemDanhGia = soDiem;
      out.DiemCuoiCung = diemNen + soDiem;
      out.GhiChuTDV = patch.ghiChuTDV || '';
      if (!out.ThoiGianHoanThanh && !cv.ThoiGianHoanThanh) out.ThoiGianHoanThanh = nowStr_();
    } else if (patch.ghiChuTDV !== undefined) {
      out.GhiChuTDV = patch.ghiChuTDV;
    }

    var updated = updateObjectById_(getSheet_(SHEETS.CONGVIEC), SCHEMA[SHEETS.CONGVIEC], 'MaCV', maCV, out);
    return jsonOk_({ congViec: updated });
  });
}

/** entry point: gửi tin nhắn trong khung chat công việc (người dùng đã đăng nhập). */
function addChatMessage(token, maCV, noiDung) {
  return safeCall_(function () {
    var user = requireSession_(token);
    var cv = findCongViecByMa_(maCV);
    if (!cv) return jsonErr_('Không tìm thấy công việc.');
    if (!canSeeCongViec_(user, cv)) return jsonErr_('Bạn không có quyền nhắn tin trong công việc này.');
    if (!noiDung || !noiDung.trim()) return jsonErr_('Nội dung không được để trống.');
    appendChatMessage_(maCV, user.HoTen, user.VaiTro, noiDung);
    return jsonOk_({ chat: listChatByMaCV_(maCV) });
  });
}
