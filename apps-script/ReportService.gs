/**
 * ReportService.gs — Tab Báo cáo hiệu suất: xếp hạng điểm, thống kê trạng thái/đúng-trễ hạn,
 * tổng quan theo phòng ban/phân mục. Xuất PDF được thực hiện ở client (window.print()).
 */

/** entry point: dữ liệu tổng hợp báo cáo. params: {loaiKy:'thang'|'quy', ky:'YYYY-MM'|'YYYY-Q#'} (bỏ trống = tất cả thời gian) */
function getReportData(token, params) {
  return safeCall_(function () {
    var user = requireSession_(token);
    requireMinRole_(user, 'TruongNhom');
    params = params || {};
    var loaiKy = params.loaiKy || 'thang';

    var congViec = sheetToObjects_(getSheet_(SHEETS.CONGVIEC));
    var diem = sheetToObjects_(getSheet_(SHEETS.DIEM)).filter(function (r) { return r.TrangThai === 'DaDuyet'; });
    var users = sheetToObjects_(getSheet_(SHEETS.USERS));
    var hoSo = sheetToObjects_(getSheet_(SHEETS.HOSO));

    function matchKy(dateStr) {
      if (!params.ky || !dateStr) return !params.ky ? true : false;
      return periodKey_(dateStr, loaiKy) === params.ky;
    }

    var cvInKy = params.ky ? congViec.filter(function (r) { return r.NgayCapNhat && matchKy(r.NgayCapNhat); }) : congViec;
    var diemInKy = params.ky ? diem.filter(function (r) { return r.NgayDuyet && matchKy(r.NgayDuyet); }) : diem;
    var hoSoInKy = params.ky ? hoSo.filter(function (r) { return r.NgayTao && matchKy(r.NgayTao); }) : hoSo;

    // Bảng xếp hạng điểm theo nhân sự
    var rankMap = {};
    users.forEach(function (u) {
      if (u.TrangThai !== 'Active') return;
      rankMap[u.Username] = { username: u.Username, hoTen: u.HoTen, donVi: u.DonVi, diemCongViec: 0, soCongViecHoanThanh: 0, diemCongTru: 0, tongDiem: 0 };
    });
    cvInKy.forEach(function (r) {
      if (r.TrangThai === 'TDVXacNhan' && rankMap[r.NguoiPhuTrach]) {
        rankMap[r.NguoiPhuTrach].diemCongViec += Number(r.DiemCuoiCung || 0);
        rankMap[r.NguoiPhuTrach].soCongViecHoanThanh += 1;
      }
    });
    diemInKy.forEach(function (r) {
      if (rankMap[r.NhanSu]) rankMap[r.NhanSu].diemCongTru += Number(r.SoDiem || 0);
    });
    var ranking = Object.keys(rankMap).map(function (k) {
      var r = rankMap[k];
      r.tongDiem = r.diemCongViec + r.diemCongTru;
      return r;
    }).sort(function (a, b) { return b.tongDiem - a.tongDiem; });

    // Thống kê theo trạng thái + đúng/trễ hạn
    var statusCount = {};
    TASK_STATUSES.forEach(function (s) { statusCount[s] = 0; });
    var dungHan = 0, treHan = 0;
    cvInKy.forEach(function (r) {
      statusCount[r.TrangThai] = (statusCount[r.TrangThai] || 0) + 1;
      if (r.TrangThai === 'TDVXacNhan' || r.TrangThai === 'DaNop') {
        if (isLate_(r.ThoiHan, r.ThoiGianHoanThanh)) treHan++; else dungHan++;
      }
    });

    // Theo phòng ban (dựa trên đơn vị của người phụ trách) & theo phân loại
    var byDonVi = {}, byPhanLoai = {};
    cvInKy.forEach(function (r) {
      var u = users.filter(function (x) { return x.Username === r.NguoiPhuTrach; })[0];
      var dv = u ? u.DonVi : 'Khác';
      byDonVi[dv] = (byDonVi[dv] || 0) + 1;
      var pl = r.PhanLoai || 'Khác';
      byPhanLoai[pl] = (byPhanLoai[pl] || 0) + 1;
    });
    var byPhanMucHoSo = {};
    hoSoInKy.forEach(function (r) {
      var pm = r.PhanMuc || 'Khác';
      byPhanMucHoSo[pm] = (byPhanMucHoSo[pm] || 0) + 1;
    });

    return jsonOk_({
      ranking: ranking,
      statusCount: statusCount,
      statusLabel: TASK_STATUS_LABEL,
      dungHan: dungHan,
      treHan: treHan,
      byDonVi: byDonVi,
      byPhanLoai: byPhanLoai,
      byPhanMucHoSo: byPhanMucHoSo,
      tongSoHoSo: hoSoInKy.length,
      tongSoCongViec: cvInKy.length
    });
  });
}
