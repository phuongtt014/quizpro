/**
 * Code.gs
 * Điểm vào của Web App (doGet) + hàm include HTML partials.
 */

function doGet(e) {
  khoiTaoDuLieuMau();
  var tpl = HtmlService.createTemplateFromFile('Index');
  return tpl.evaluate()
    .setTitle('Quản lý công việc nhóm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Gọi 1 lần khi ứng dụng client khởi động: trả về user hiện tại + danh mục dùng chung */
function boSungBoiCanh() {
  var user = getCurrentUser_();
  var danhMuc = getDanhMucDungChung();
  return {
    user: user,
    roleLabels: ROLE_LABELS,
    hoSoStatus: HOSO_STATUS,
    congViecStatus: CONGVIEC_STATUS,
    congViecStatusList: CONGVIEC_STATUS_LIST,
    phieuDiemStatus: PHIEU_DIEM_STATUS,
    danhMuc: danhMuc
  };
}

/**
 * Cổng gọi API chung từ client (google.script.run) cho các thao tác cần biết
 * user hiện tại - tránh phải truyền lại user thủ công dễ bị giả mạo phía client.
 * Mỗi hàm service dưới đây tự lấy user thật từ Session ở server.
 */
function apiSubmitHoSo(payload) {
  return submitHoSo(payload);
}
function apiTraCuuHoSo(params) {
  return traCuuHoSo(params.maHoSo, params.maXacNhan);
}
function apiGuiTinTraCuu(params) {
  return guiTinTraCuu(params);
}
function apiListHoSoTiepNhan() {
  return listHoSoTiepNhan(getCurrentUser_());
}
function apiAssignHoSo(params) {
  return assignHoSo(getCurrentUser_(), params);
}
function apiRejectHoSo(params) {
  return rejectHoSo(getCurrentUser_(), params);
}
function apiListCongViec() {
  return listCongViec(getCurrentUser_());
}
function apiGetCongViecChiTiet(maCongViec) {
  return getCongViecChiTiet(getCurrentUser_(), maCongViec);
}
function apiCapNhatTrangThaiCongViec(params) {
  return capNhatTrangThaiCongViec(getCurrentUser_(), params);
}
function apiSuaThoiGianHoanThanh(params) {
  return suaThoiGianHoanThanh(getCurrentUser_(), params);
}
function apiCapNhatCongViec(params) {
  return capNhatCongViec(getCurrentUser_(), params);
}
function apiDanhGiaTDV(params) {
  return danhGiaTDV(getCurrentUser_(), params);
}
function apiGuiChatCongViec(params) {
  return guiChatCongViec(getCurrentUser_(), params);
}
function apiTaoPhieuDiem(params) {
  return taoPhieuDiem(getCurrentUser_(), params);
}
function apiListPhieuDiem() {
  return listPhieuDiem(getCurrentUser_());
}
function apiDuyetPhieuDiem(params) {
  return duyetPhieuDiem(getCurrentUser_(), params);
}
function apiTuChoiPhieuDiem(params) {
  return tuChoiPhieuDiem(getCurrentUser_(), params);
}
function apiBaoCaoBangDiem() {
  return baoCaoBangDiem(getCurrentUser_());
}
function apiGetThietLapDayDu() {
  return getThietLapDayDu(getCurrentUser_());
}
function apiUpsertDonVi(item) {
  return upsertDonVi(getCurrentUser_(), item);
}
function apiUpsertPhanMuc(item) {
  return upsertPhanMuc(getCurrentUser_(), item);
}
function apiUpsertMaDiem(item) {
  return upsertMaDiem(getCurrentUser_(), item);
}
function apiUpsertNhanSu(item) {
  return upsertNhanSu(getCurrentUser_(), item);
}
