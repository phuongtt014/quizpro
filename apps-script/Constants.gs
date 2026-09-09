/**
 * Constants.gs
 * Tên sheet, tên cột, danh sách trạng thái và hằng số dùng chung toàn hệ thống.
 */

// ID của Google Spreadsheet dùng làm cơ sở dữ liệu.
// Nếu để trống, script sẽ dùng Spreadsheet đang active (khi bound script)
// hoặc tạo/mở theo SCRIPT_PROPERTIES key "SPREADSHEET_ID".
var SPREADSHEET_ID_PROPERTY_KEY = 'SPREADSHEET_ID';

var SHEET_NAMES = {
  NHAN_SU: 'NhanSu',
  DON_VI: 'DonVi',
  PHAN_MUC: 'PhanMuc',
  MA_DIEM: 'MaDiem',
  HO_SO: 'HoSo',
  CONG_VIEC: 'CongViec',
  CHAT_CONG_VIEC: 'ChatCongViec',
  CHAT_TRA_CUU: 'ChatTraCuu',
  PHIEU_DIEM: 'PhieuDiem'
};

// Vai trò hệ thống (thấp -> cao)
var ROLES = {
  NHAN_VIEN: 'NhanVien',
  TRUONG_NHOM: 'TruongNhom',
  QUAN_LY: 'QuanLy', // Trưởng đơn vị / TĐV - duyệt & đánh giá công việc
  ADMIN: 'Admin'     // Quản trị hệ thống - toàn quyền Thiết lập
};

var ROLE_LABELS = {
  NhanVien: 'Nhân viên',
  TruongNhom: 'Trưởng nhóm',
  QuanLy: 'Quản lý (Trưởng đơn vị)',
  Admin: 'Admin hệ thống'
};

var ROLE_RANK = {
  NhanVien: 1,
  TruongNhom: 2,
  QuanLy: 3,
  Admin: 4
};

// Trạng thái hồ sơ
var HOSO_STATUS = {
  MOI: 'Mới',
  DA_PHAN_CONG: 'Đã phân công',
  DANG_XU_LY: 'Đang xử lý',
  DA_HOAN_THANH: 'Đã hoàn thành',
  TU_CHOI: 'Từ chối'
};

// Trạng thái công việc
var CONGVIEC_STATUS = {
  CAN_LAM: 'Cần làm',
  DANG_LAM: 'Đang làm',
  DA_NOP: 'Đã nộp',
  TDV_XAC_NHAN: 'TĐV xác nhận',
  TAM_NGUNG: 'Tạm ngưng',
  HUY_BO: 'Hủy bỏ'
};

var CONGVIEC_STATUS_LIST = [
  CONGVIEC_STATUS.CAN_LAM,
  CONGVIEC_STATUS.DANG_LAM,
  CONGVIEC_STATUS.DA_NOP,
  CONGVIEC_STATUS.TDV_XAC_NHAN,
  CONGVIEC_STATUS.TAM_NGUNG,
  CONGVIEC_STATUS.HUY_BO
];

// Trạng thái phiếu điểm
var PHIEU_DIEM_STATUS = {
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  TU_CHOI: 'Từ chối'
};

var DIEM_MAC_DINH_CONG_VIEC = 100;

// Cột (header) từng sheet - dùng để tạo sheet mới & đọc/ghi theo tên cột an toàn
var COLUMNS = {
  NHAN_SU: ['Email', 'HoTen', 'DonVi', 'VaiTro', 'TrangThai', 'NgayTao'],
  DON_VI: ['MaDonVi', 'TenDonVi', 'TrangThai'],
  PHAN_MUC: ['MaPhanMuc', 'TenPhanMuc', 'TrangThai'],
  MA_DIEM: ['MaDiem', 'LyDo', 'SoDiem', 'TrangThai'],
  HO_SO: [
    'MaHoSo', 'MaXacNhan', 'HoTen', 'Email', 'SoDienThoai', 'DonVi',
    'TieuDe', 'PhanMuc', 'NoiDungChiTiet', 'TaiLieuDinhKem',
    'TrangThai', 'NguoiPhuTrach', 'ThoiHan', 'LyDoTuChoi', 'LinkKetQua',
    'MaCongViec', 'NgayTao', 'NgayCapNhat'
  ],
  CONG_VIEC: [
    'MaCongViec', 'MaHoSo', 'NoiDung', 'NguoiPhuTrach', 'MoTa',
    'TaiLieuDinhKem', 'TrangThai', 'PhanLoai', 'ThoiGianBatDau', 'ThoiHan',
    'ThoiGianHoanThanh', 'DiemHienTai', 'MaDanhGiaTDV', 'GhiChuTDV',
    'NguoiTao', 'NgayTao', 'NgayCapNhat'
  ],
  CHAT_CONG_VIEC: ['MaCongViec', 'ThoiGian', 'NguoiGui', 'NoiDung'],
  CHAT_TRA_CUU: ['MaHoSo', 'ThoiGian', 'NguoiGui', 'NoiDung'],
  PHIEU_DIEM: [
    'MaPhieu', 'NgayTao', 'NguoiTao', 'NhanSuDuocDeXuat', 'MaDiem',
    'SoDiem', 'NoiDung', 'MaCongViecLienQuan', 'TrangThai',
    'NguoiDuyet', 'NgayDuyet', 'LyDoTuChoi'
  ]
};

var TRANG_THAI_HOAT_DONG = {
  HOAT_DONG: 'Hoạt động',
  NGUNG: 'Ngừng'
};
