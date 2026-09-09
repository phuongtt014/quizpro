/**
 * DiemService.gs — Tab Ghi nhận điểm cộng/trừ: Nhập phiếu đề xuất -> Quản lý duyệt -> Tính vào hệ thống.
 */

/** entry point: bất kỳ ai đăng nhập đều được đề xuất phiếu điểm cho 1 nhân sự. */
function proposeDiem(token, payload) {
  return safeCall_(function () {
    var user = requireSession_(token);
    if (!payload || !payload.nhanSu || !payload.maDiem) return jsonErr_('Vui lòng chọn nhân sự và mã điểm.');
    var maDiemRow = sheetToObjects_(getSheet_(SHEETS.SET_MADIEM)).filter(function (r) { return r.MaDiem === payload.maDiem; })[0];
    if (!maDiemRow) return jsonErr_('Mã điểm không hợp lệ.');
    var nv = findUserByUsername_(payload.nhanSu);
    if (!nv || nv.TrangThai !== 'Active') return jsonErr_('Nhân sự không hợp lệ hoặc không còn hoạt động.');

    var rec = {
      Id: genCode_('DX', 5), NhanSu: payload.nhanSu, NguoiDeXuat: user.Username,
      MaDiem: payload.maDiem, SoDiem: maDiemRow.SoDiem, NoiDung: payload.noiDung || '',
      TrangThai: 'ChoDuyet', NguoiDuyet: '', NgayDeXuat: nowStr_(), NgayDuyet: ''
    };
    appendObject_(getSheet_(SHEETS.DIEM), SCHEMA[SHEETS.DIEM], rec);
    return jsonOk_({ id: rec.Id });
  });
}

/** entry point: danh sách phiếu điểm. Quản lý+ xem tất cả; người khác chỉ xem phiếu mình đề xuất hoặc liên quan mình. */
function listDiemCongTru(token, filters) {
  return safeCall_(function () {
    var user = requireSession_(token);
    filters = filters || {};
    var rows = sheetToObjects_(getSheet_(SHEETS.DIEM));
    if (ROLE_RANK[user.VaiTro] < ROLE_RANK.QuanLy) {
      rows = rows.filter(function (r) { return r.NguoiDeXuat === user.Username || r.NhanSu === user.Username; });
    }
    if (filters.trangThai) rows = rows.filter(function (r) { return r.TrangThai === filters.trangThai; });
    if (filters.nhanSu) rows = rows.filter(function (r) { return r.NhanSu === filters.nhanSu; });
    rows.sort(function (a, b) { return new Date(b.NgayDeXuat) - new Date(a.NgayDeXuat); });
    return jsonOk_({ items: rows });
  });
}

/** entry point: Quản lý+ duyệt hoặc từ chối phiếu điểm. action: 'DaDuyet' | 'TuChoi' */
function approveDiem(token, id, action) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'QuanLy');
    if (['DaDuyet', 'TuChoi'].indexOf(action) < 0) return jsonErr_('Hành động không hợp lệ.');
    var sh = getSheet_(SHEETS.DIEM);
    var rows = sheetToObjects_(sh);
    var rec = rows.filter(function (r) { return r.Id === id; })[0];
    if (!rec) return jsonErr_('Không tìm thấy phiếu điểm.');
    if (rec.TrangThai !== 'ChoDuyet') return jsonErr_('Phiếu điểm này đã được xử lý.');
    var updated = updateObjectById_(sh, SCHEMA[SHEETS.DIEM], 'Id', id, {
      TrangThai: action, NguoiDuyet: user.Username, NgayDuyet: nowStr_()
    });
    return jsonOk_({ record: updated });
  });
}

/** Tổng điểm tích luỹ (đã duyệt) của 1 nhân sự — điểm cá nhân, độc lập với điểm 100đ/công việc. */
function getUserAccumulatedScore_(username, fromDate, toDate) {
  var rows = sheetToObjects_(getSheet_(SHEETS.DIEM)).filter(function (r) {
    if (r.NhanSu !== username || r.TrangThai !== 'DaDuyet') return false;
    if (fromDate && new Date(r.NgayDuyet) < new Date(fromDate)) return false;
    if (toDate && new Date(r.NgayDuyet) > new Date(toDate)) return false;
    return true;
  });
  return rows.reduce(function (sum, r) { return sum + Number(r.SoDiem || 0); }, 0);
}
