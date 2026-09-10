/**
 * SettingsService.gs — Tab Thiết lập: người dùng, đơn vị/phòng ban, phân mục hồ sơ, mã điểm.
 * Các hàm liệt kê (list*) dùng chung cho dropdown ở các tab khác, chỉ cần đăng nhập.
 * Các hàm thêm/sửa/xoá yêu cầu vai trò Admin.
 */

/* ---------- Đơn vị / phòng ban ---------- */

/** entry point CÔNG KHAI: danh sách đơn vị dùng cho dropdown ở Form nộp hồ sơ (không cần đăng nhập). */
function listDonVi(token) {
  return safeCall_(function () {
    return jsonOk_({ items: sheetToObjects_(getSheet_(SHEETS.SET_DONVI)) });
  });
}

function addDonVi(token, tenDonVi) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    if (!tenDonVi || !tenDonVi.trim()) return jsonErr_('Tên đơn vị không được để trống.');
    appendObject_(getSheet_(SHEETS.SET_DONVI), SCHEMA[SHEETS.SET_DONVI], { Id: genCode_('DV', 3), TenDonVi: tenDonVi.trim() });
    return jsonOk_({});
  });
}

/** entry point (Admin): sửa tên đơn vị. */
function updateDonVi(token, id, tenDonVi) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    if (!tenDonVi || !tenDonVi.trim()) return jsonErr_('Tên đơn vị không được để trống.');
    updateObjectById_(getSheet_(SHEETS.SET_DONVI), SCHEMA[SHEETS.SET_DONVI], 'Id', id, { TenDonVi: tenDonVi.trim() });
    return jsonOk_({});
  });
}

function removeDonVi(token, id) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    deleteRowById_(getSheet_(SHEETS.SET_DONVI), 'Id', id);
    return jsonOk_({});
  });
}

/* ---------- Phân mục hồ sơ ---------- */

/** entry point CÔNG KHAI: danh sách phân mục dùng cho dropdown ở Form nộp hồ sơ (không cần đăng nhập). */
function listPhanMuc(token) {
  return safeCall_(function () {
    return jsonOk_({ items: sheetToObjects_(getSheet_(SHEETS.SET_PHANMUC)) });
  });
}

function addPhanMuc(token, tenPhanMuc) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    if (!tenPhanMuc || !tenPhanMuc.trim()) return jsonErr_('Tên phân mục không được để trống.');
    appendObject_(getSheet_(SHEETS.SET_PHANMUC), SCHEMA[SHEETS.SET_PHANMUC], { Id: genCode_('PM', 3), TenPhanMuc: tenPhanMuc.trim() });
    return jsonOk_({});
  });
}

/** entry point (Admin): sửa tên phân mục. */
function updatePhanMuc(token, id, tenPhanMuc) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    if (!tenPhanMuc || !tenPhanMuc.trim()) return jsonErr_('Tên phân mục không được để trống.');
    updateObjectById_(getSheet_(SHEETS.SET_PHANMUC), SCHEMA[SHEETS.SET_PHANMUC], 'Id', id, { TenPhanMuc: tenPhanMuc.trim() });
    return jsonOk_({});
  });
}

function removePhanMuc(token, id) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    deleteRowById_(getSheet_(SHEETS.SET_PHANMUC), 'Id', id);
    return jsonOk_({});
  });
}

/* ---------- Mã điểm cộng/trừ ---------- */

function listMaDiem(token) {
  return safeCall_(function () {
    requireSession_(token);
    return jsonOk_({ items: sheetToObjects_(getSheet_(SHEETS.SET_MADIEM)) });
  });
}

function addMaDiem(token, payload) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    if (!payload || !payload.maDiem || !payload.moTa || payload.soDiem === undefined || payload.soDiem === '') {
      return jsonErr_('Vui lòng nhập đầy đủ Mã điểm, Mô tả, Số điểm.');
    }
    var existed = sheetToObjects_(getSheet_(SHEETS.SET_MADIEM)).some(function (r) { return r.MaDiem === payload.maDiem; });
    if (existed) return jsonErr_('Mã điểm đã tồn tại.');
    appendObject_(getSheet_(SHEETS.SET_MADIEM), SCHEMA[SHEETS.SET_MADIEM], {
      MaDiem: payload.maDiem, MoTa: payload.moTa, SoDiem: Number(payload.soDiem)
    });
    return jsonOk_({});
  });
}

/** entry point (Admin): sửa mô tả/số điểm của 1 mã điểm (không cho đổi chính mã điểm vì có thể
 * đã bị tham chiếu ở công việc/phiếu điểm cũ — muốn đổi mã thì xoá rồi thêm mã mới). */
function updateMaDiem(token, maDiem, payload) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    if (!payload || !payload.moTa || payload.soDiem === undefined || payload.soDiem === '') {
      return jsonErr_('Vui lòng nhập đầy đủ Mô tả, Số điểm.');
    }
    updateObjectById_(getSheet_(SHEETS.SET_MADIEM), SCHEMA[SHEETS.SET_MADIEM], 'MaDiem', maDiem, {
      MoTa: payload.moTa, SoDiem: Number(payload.soDiem)
    });
    return jsonOk_({});
  });
}

function removeMaDiem(token, maDiem) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    deleteRowById_(getSheet_(SHEETS.SET_MADIEM), 'MaDiem', maDiem);
    return jsonOk_({});
  });
}

/* ---------- Người dùng ---------- */

/** entry point: danh sách user đang hoạt động, dùng cho dropdown (phân công, đề xuất điểm...). Chỉ cần đăng nhập. */
function listActiveUsers(token) {
  return safeCall_(function () {
    requireSession_(token);
    var rows = sheetToObjects_(getSheet_(SHEETS.USERS)).filter(function (r) { return r.TrangThai === 'Active'; });
    return jsonOk_({
      items: rows.map(function (u) {
        return { username: u.Username, hoTen: u.HoTen, donVi: u.DonVi, vaiTro: u.VaiTro, vaiTroLabel: ROLE_LABEL[u.VaiTro] };
      })
    });
  });
}

/** entry point: Admin xem toàn bộ user (kể cả bị khoá). */
function listAllUsers(token) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    var rows = sheetToObjects_(getSheet_(SHEETS.USERS));
    return jsonOk_({ items: rows.map(publicUser_) });
  });
}

/** entry point: Admin tạo tài khoản mới. */
function createUser(token, payload) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    if (!payload || !payload.hoTen || !payload.username || !payload.email || !payload.vaiTro) {
      return jsonErr_('Vui lòng điền đầy đủ Họ tên, Username, Email, Vai trò.');
    }
    if (ROLES.indexOf(payload.vaiTro) < 0) return jsonErr_('Vai trò không hợp lệ.');
    if (findUserByUsername_(payload.username)) return jsonErr_('Username đã tồn tại.');

    var salt = genSalt_();
    var pw = payload.password && payload.password.length >= 6 ? payload.password : '123456';
    appendObject_(getSheet_(SHEETS.USERS), SCHEMA[SHEETS.USERS], {
      Id: genCode_('U', 4), HoTen: payload.hoTen, Email: payload.email,
      SoDienThoai: payload.soDienThoai || '', DonVi: payload.donVi || '',
      Username: payload.username, PasswordHash: hashPassword_(pw, salt), Salt: salt,
      VaiTro: payload.vaiTro, TrangThai: 'Active', NgayTao: nowStr_()
    });
    return jsonOk_({ matKhauMacDinh: pw });
  });
}

/** entry point: Admin sửa thông tin / vai trò / trạng thái user. */
function updateUser(token, username, patch) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    var target = findUserByUsername_(username);
    if (!target) return jsonErr_('Không tìm thấy tài khoản.');
    patch = patch || {};
    var out = {};
    ['HoTen', 'Email', 'SoDienThoai', 'DonVi', 'VaiTro', 'TrangThai'].forEach(function (k) {
      var payloadKey = k.charAt(0).toLowerCase() + k.slice(1);
      if (patch[payloadKey] !== undefined) out[k] = patch[payloadKey];
    });
    if (out.VaiTro && ROLES.indexOf(out.VaiTro) < 0) return jsonErr_('Vai trò không hợp lệ.');
    updateObjectById_(getSheet_(SHEETS.USERS), SCHEMA[SHEETS.USERS], 'Id', target.Id, out);
    return jsonOk_({});
  });
}

/** entry point: Admin đặt lại mật khẩu cho user. */
function resetPassword(token, username, newPassword) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    var target = findUserByUsername_(username);
    if (!target) return jsonErr_('Không tìm thấy tài khoản.');
    var pw = newPassword && newPassword.length >= 6 ? newPassword : '123456';
    var salt = genSalt_();
    updateObjectById_(getSheet_(SHEETS.USERS), SCHEMA[SHEETS.USERS], 'Id', target.Id, {
      PasswordHash: hashPassword_(pw, salt), Salt: salt
    });
    return jsonOk_({ matKhauMoi: pw });
  });
}

/** entry point: liệt kê danh sách vai trò hợp lệ (dùng cho dropdown tạo/sửa user). */
function listRoles() {
  return jsonOk_({ items: ROLES.map(function (r) { return { value: r, label: ROLE_LABEL[r] }; }) });
}

/**
 * entry point CÔNG KHAI, KHÔNG đụng tới Sheet/Auth: kiểm tra kết nối client-server cơ bản.
 * Nếu hàm này cũng trả về null/không phản hồi thì lỗi nằm ở tầng kết nối (mạng trường học,
 * trình duyệt, hoặc deploy sai bản) — không liên quan gì tới logic đọc Sheet của app.
 */
function ping() {
  return { ok: true, pong: true, time: new Date().toISOString(), appBuild: APP_BUILD };
}

/**
 * entry point (Admin) — bước 1 của bài test ghi-rồi-đọc-ngay: ghi 1 dòng đánh dấu riêng vào
 * sheet Counters (không ảnh hưởng dữ liệu thật) và trả về mã đánh dấu đó. Dùng appendObject_
 * (hàm CRUD dùng chung có gọi SpreadsheetApp.flush() — nếu DB.gs đang chạy là bản CŨ chưa có
 * flush() thì bước 2 verify ngay sau đó có thể không đọc thấy).
 */
function debugWriteTest(token) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    var tag = 'DEBUGTEST-' + Utilities.getUuid().slice(0, 8);
    appendObject_(getSheet_(SHEETS.COUNTERS), SCHEMA[SHEETS.COUNTERS], { Key: tag, Value: 1 });
    return jsonOk_({ tag: tag });
  });
}

/** entry point (Admin) — bước 2: đọc lại NGAY (ở 1 lượt thực thi HOÀN TOÀN MỚI, y như khi client
 * bấm sang tab khác) xem có thấy dòng vừa ghi ở debugWriteTest không, rồi dọn dẹp dòng test đó. */
function debugReadTest(token, tag) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    var rows = sheetToObjects_(getSheet_(SHEETS.COUNTERS));
    var found = rows.some(function (r) { return r.Key === tag; });
    deleteRowById_(getSheet_(SHEETS.COUNTERS), 'Key', tag);
    return jsonOk_({ found: found });
  });
}

/** entry point (Admin): xem trực tiếp vài dòng mới nhất của HoSo/CongViec đang đọc được từ
 * server — dùng để chẩn đoán khi báo "ghi vào Sheet nhưng tab khác không thấy".
 * Viết phòng thủ theo từng phần (try/catch riêng) + ép mọi giá trị đọc từ Sheet về String
 * trước khi trả về — Google Sheets có thể tự chuyển các ô giống ngày/giờ thành kiểu Date,
 * mà việc trả thẳng đối tượng Date qua google.script.run đôi khi làm hỏng cả phản hồi (client
 * nhận về null dù server không hề báo lỗi gì). */
function debugSheetInfo(token) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'Admin');
    var out = {};

    try {
      var ss = getSS_();
      out.spreadsheetId = String(ss.getId());
      out.spreadsheetUrl = String(ss.getUrl());
      out.allSheetNames = ss.getSheets().map(function (s) { return s.getName(); });
    } catch (e) {
      out.spreadsheetError = String(e && e.message ? e.message : e);
    }

    try {
      var hoSoSheet = getSheet_(SHEETS.HOSO);
      var hoSoRows = sheetToObjects_(hoSoSheet);
      out.hoSoSheetName = String(hoSoSheet.getName());
      out.hoSoRowCount = hoSoRows.length;
      out.hoSoLast5 = hoSoRows.slice(-5).map(function (r) {
        return {
          MaHoSo: String(r.MaHoSo || ''), MaXacNhan: String(r.MaXacNhan || ''),
          TrangThai: String(r.TrangThai || ''), NgayTao: String(r.NgayTao || '')
        };
      });
    } catch (e) {
      out.hoSoError = String(e && e.message ? e.message : e);
    }

    try {
      var cvSheet = getSheet_(SHEETS.CONGVIEC);
      var cvRows = sheetToObjects_(cvSheet);
      out.congViecSheetName = String(cvSheet.getName());
      out.congViecRowCount = cvRows.length;
    } catch (e) {
      out.congViecError = String(e && e.message ? e.message : e);
    }

    // Gọi TRỰC TIẾP đúng hàm mà tab Tiếp nhận gọi, ngay trong request này — để so sánh thẳng
    // với hoSoRowCount/hoSoLast5 ở trên, loại trừ khả năng lỗi nằm ở phía client/nút bấm.
    try {
      out.currentUser = { username: user.Username, vaiTro: user.VaiTro };
      var tnAll = listHoSoTiepNhan(token, '');
      out.listHoSoTiepNhan_TatCa = { ok: tnAll.ok, soLuong: tnAll.items ? tnAll.items.length : null, loi: tnAll.message || null };
      var tnCho = listHoSoTiepNhan(token, 'ChoTiepNhan');
      out.listHoSoTiepNhan_ChoTiepNhan = { ok: tnCho.ok, soLuong: tnCho.items ? tnCho.items.length : null, loi: tnCho.message || null };
    } catch (e) {
      out.listHoSoTiepNhanError = String(e && e.message ? e.message : e);
    }

    out.serverTimeNow = new Date().toISOString();
    return jsonOk_(out);
  });
}
