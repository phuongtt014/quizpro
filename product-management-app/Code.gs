/**
 * QUẢN LÝ SẢN PHẨM - PHÒNG GIẢI TRÍ NHÂN VIÊN
 * Google Apps Script Web App - Backend (Code.gs)
 * ------------------------------------------------------------------
 * Sheets used:
 *  - Data_NhapXuat : mọi giao dịch nhập/xuất
 *  - Setup         : danh mục Phân loại Hàng hóa + Phân loại Chi phí & Ngân sách
 *  - NguoiDung     : tài khoản người dùng (MSNV, mật khẩu đã băm, phân quyền...)
 *
 * Quy ước tính "Chi phí":
 *  Tiền thực chi (đối chiếu ngân sách) được ghi nhận tại thời điểm NHẬP KHO
 *  (LoaiGiaoDich = "Nhập kho"). Các giao dịch Xuất (sử dụng/hủy/chuyển) chỉ
 *  là biến động tồn kho của hàng đã mua, không phát sinh chi phí mới.
 *
 * Ma trận phân quyền (xem thêm README.md):
 *  - Người xem : chỉ xem Dashboard/Báo cáo, không tạo/sửa được gì.
 *  - Nhân viên : Nhập kho, Xuất hàng (Xuất sử dụng ghi nhận ngay; Xuất hủy/
 *                Xuất chuyển tạo yêu cầu "Chờ duyệt"), dùng PASTE DATA.
 *  - Quản lý   : như Nhân viên + duyệt yêu cầu Xuất hủy/Xuất chuyển + Thiết
 *                lập danh mục/ngân sách + Quản lý người dùng.
 *  Mọi giao dịch Xuất (cả 3 loại) bắt buộc đính kèm file đề xuất đã ký.
 * ------------------------------------------------------------------
 */

// ==================== CONSTANTS ====================

const SHEET_TRANSACTIONS = 'Data_NhapXuat';
const SHEET_SETUP = 'Setup';
const SHEET_USERS = 'NguoiDung';

const TRANSACTION_HEADERS = [
  'ID_GiaoDich', 'Ngay', 'LoaiGiaoDich', 'TenHangHoa', 'PhanLoaiHangHoa',
  'PhanLoaiChiPhi', 'SoLuong', 'DonGia', 'ThanhTien', 'GhiChu',
  'NguoiTao', 'FileDeXuat', 'TrangThaiDuyet', 'NguoiDuyet', 'NgayDuyet',
  'CoSo', 'DonVi', 'HanSuDung', 'LoNhapId', 'DonId'
  // luôn thêm cột mới ở CUỐI mảng — migration chỉ điền cột trống, chèn giữa sẽ làm lệch dữ liệu cũ
];

const USER_HEADERS = ['MSNV', 'HoTen', 'Email', 'MatKhauHash', 'Salt', 'PhanQuyen', 'TinhTrang', 'NgayTao'];

// Sheet NganSach: ngân sách theo từng Cơ sở x Phân loại chi phí (một dòng / tổ hợp).
// BudgetTuan thêm sau cùng (append-only) để không làm lệch dữ liệu NganSach cũ đã có.
const SHEET_BUDGET = 'NganSach';
const BUDGET_HEADERS = ['CoSo', 'PhanLoaiChiPhi', 'BudgetThang', 'BudgetNam', 'BudgetTuan'];

// Sheet KiemKe: báo cáo kiểm kê (đối chiếu tồn kho hệ thống với thực tế) — một dòng / mặt hàng.
const SHEET_KIEMKE = 'KiemKe';
const KIEMKE_HEADERS = [
  'ID_KiemKe', 'DonKiemKeId', 'Ngay', 'CoSo', 'TenHangHoa', 'PhanLoaiHangHoa', 'DonVi',
  'SoLuongHeThong', 'SoLuongThucTe', 'ChenhLech', 'LyDo', 'PhuongAn', 'GhiChu',
  'NguoiTao', 'TrangThai', 'NguoiDuyet', 'NgayDuyet'
];

// Sheet YeuCauSuaNhapKho: yêu cầu sửa một phiếu Nhập kho đã ghi nhận — Nhân viên tạo yêu cầu
// (chờ Quản lý duyệt mới áp dụng vào Data_NhapXuat), Quản lý sửa thì áp dụng ngay (tự duyệt).
const SHEET_SUANHAPKHO = 'YeuCauSuaNhapKho';
const SUANHAPKHO_HEADERS = [
  'ID_YeuCau', 'ID_GiaoDich', 'NgayYeuCau', 'CoSo', 'TenHangHoa', 'PhanLoaiHangHoa',
  'PhanLoaiChiPhi', 'SoLuong', 'DonVi', 'ThanhTien', 'DonGia', 'HanSuDung', 'GhiChu',
  'LyDoSua', 'NguoiYeuCau', 'TrangThai', 'NguoiDuyet', 'NgayDuyet'
];
// Sheet yêu cầu sửa phiếu Xuất hàng — cùng cấu trúc cột với YeuCauSuaNhapKho ở trên (xem mục
// SỬA PHIẾU XUẤT HÀNG trong Code.gs), chỉ khác tên sheet để tách riêng khỏi yêu cầu sửa Nhập kho.
const SHEET_SUAXUATHANG = 'YeuCauSuaXuatHang';

// Sheet HoaDon: Danh sách hóa đơn đầu vào (nhập bằng cách dán CSV) — dùng để đối chiếu với
// Thành tiền Nhập kho theo cùng khoảng thời gian.
const SHEET_HOADON = 'HoaDon';
const HOADON_HEADERS = [
  'ID_HoaDon', 'NgayXuatHD', 'TenNguoiBan', 'SoHoaDon', 'ThanhTienSauThue',
  'MaTraCuu', 'TrangTraCuu', 'NguoiTao', 'NgayTao',
  'CoSo', 'PhanLoaiChiPhi' // thêm sau (append-only) — không làm lệch dữ liệu HoaDon cũ đã có
];

// Sheet YeuCauSuaHoaDon: yêu cầu sửa một hóa đơn đã nhập — cùng cơ chế với YeuCauSuaNhapKho
// (Nhân viên tạo yêu cầu chờ Quản lý duyệt; Quản lý sửa thì áp dụng ngay).
const SHEET_SUAHOADON = 'YeuCauSuaHoaDon';
const SUAHOADON_HEADERS = [
  'ID_YeuCau', 'ID_HoaDon', 'NgayYeuCau', 'NgayXuatHD', 'TenNguoiBan', 'SoHoaDon',
  'ThanhTienSauThue', 'MaTraCuu', 'TrangTraCuu', 'CoSo', 'PhanLoaiChiPhi',
  'LyDoSua', 'NguoiYeuCau', 'TrangThai', 'NguoiDuyet', 'NgayDuyet'
];

// Setup sheet layout: Col A = Phân loại Hàng hóa | Col C = Phân loại Chi phí (chỉ tên — ngân
// sách nay quản lý theo Cơ sở ở sheet NganSach) | Col G:H = Cấu hình hệ thống (key/value,
// hiện chỉ dùng cho TenHeThong ở hàng 2) | Col J = Cơ sở | Col L = Đơn vị tính
const SETUP_GOODS_COL = 1;   // A
const SETUP_COST_START_COL = 3; // C (D,E giữ lại cho dữ liệu ngân sách cũ, không dùng nữa)
const SETUP_CONFIG_KEY_COL = 7;   // G
const SETUP_CONFIG_VALUE_COL = 8; // H
const SETUP_FACILITY_COL = 10;    // J
const SETUP_UNIT_COL = 12;        // L
const DEFAULT_SYSTEM_NAME = 'Quản lý Sản phẩm - Phòng giải trí nhân viên';
const DEFAULT_FACILITY_NAME = 'Cơ sở chính';
const DEFAULT_UNITS = ['Cái', 'Hộp', 'Gói', 'Chai', 'Kg', 'Lít', 'Thùng'];

const TRANSACTION_TYPES = ['Nhập kho', 'Xuất sử dụng', 'Xuất hủy', 'Xuất chuyển'];
const EXPORT_TYPES = ['Xuất sử dụng', 'Xuất hủy', 'Xuất chuyển']; // đều cần file đề xuất đã ký
const APPROVAL_REQUIRED_TYPES = ['Xuất hủy', 'Xuất chuyển'];       // cần Quản lý duyệt mới tính vào báo cáo
const EXPENSE_TYPES = ['Nhập kho']; // các loại giao dịch được tính là "chi phí" thực chi

const ROLES = ['Quản lý', 'Nhân viên', 'Người xem'];
const STATUSES = ['Hoạt động', 'Ngưng sử dụng'];
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 giờ

const ATTACHMENT_FOLDER_NAME = 'QuanLySanPham_DeXuatDinhKem';
const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024; // 8MB

const TIMEZONE = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';

// ==================== WEB APP ENTRY ====================

function doGet(e) {
  const systemName = getSystemName_();
  const tpl = HtmlService.createTemplateFromFile('Index');
  tpl.systemName = systemName;
  return tpl.evaluate()
    .setTitle(systemName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==================== SHEET HELPERS ====================

function getSs_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateTransactionSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_TRANSACTIONS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_TRANSACTIONS);
    sh.appendRow(TRANSACTION_HEADERS);
    sh.setFrozenRows(1);
    return sh;
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(TRANSACTION_HEADERS);
    sh.setFrozenRows(1);
    return sh;
  }
  // Migration: fill in any header cells left blank by older deployments
  // (append-only — never overwrites an existing non-blank header).
  const headerRange = sh.getRange(1, 1, 1, TRANSACTION_HEADERS.length);
  const headerRow = headerRange.getValues()[0];
  let migrated = false;
  for (let i = 0; i < TRANSACTION_HEADERS.length; i++) {
    if (!headerRow[i]) { headerRow[i] = TRANSACTION_HEADERS[i]; migrated = true; }
  }
  if (migrated) headerRange.setValues([headerRow]);
  return sh;
}

function getOrCreateSetupSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_SETUP);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SETUP);
  }
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1).setValue('PhanLoaiHangHoa');
    sh.getRange(1, 3, 1, 3).setValues([['PhanLoaiChiPhi', 'BudgetThang', 'BudgetNam']]);
    sh.setFrozenRows(1);
    // Sample seed data so the app is usable immediately after first deploy
    const seedGoods = ['Đồ uống', 'Đồ ăn vặt', 'Dụng cụ thể thao', 'Văn phòng phẩm'];
    const seedCost = [
      ['Ăn uống', 3000000, 36000000],
      ['Giải trí - Thể thao', 2000000, 24000000],
      ['Văn phòng phẩm', 1000000, 12000000]
    ];
    sh.getRange(2, 1, seedGoods.length, 1).setValues(seedGoods.map(g => [g]));
    sh.getRange(2, 3, seedCost.length, 3).setValues(seedCost);
  }
  // Migration: ensure the config key/value area exists (added in a later version) —
  // safe to run on both freshly-created and pre-existing Setup sheets.
  if (sh.getRange(1, SETUP_CONFIG_KEY_COL).getValue() === '') {
    sh.getRange(1, SETUP_CONFIG_KEY_COL, 1, 2).setValues([['CauHinh', 'GiaTri']]);
    sh.getRange(2, SETUP_CONFIG_KEY_COL, 1, 2).setValues([['TenHeThong', DEFAULT_SYSTEM_NAME]]);
  }
  // Migration: ensure Cơ sở list exists (added in a later version). Runs once — also moves
  // any legacy per-cost-type budgets (old Col D/E) into NganSach under the default facility
  // so existing budget data set up before this feature isn't lost.
  if (sh.getRange(1, SETUP_FACILITY_COL).getValue() === '') {
    sh.getRange(1, SETUP_FACILITY_COL).setValue('CoSo');
    sh.getRange(2, SETUP_FACILITY_COL).setValue(DEFAULT_FACILITY_NAME);

    const lastRow = sh.getLastRow();
    if (lastRow >= 2) {
      const legacyRange = sh.getRange(2, SETUP_COST_START_COL, lastRow - 1, 3);
      const legacy = legacyRange.getValues()
        .filter(r => r[0] !== '' && r[0] !== null && (Number(r[1]) || Number(r[2])));
      if (legacy.length) {
        const bsh = getOrCreateBudgetSheet_();
        const rows = legacy.map(r => [DEFAULT_FACILITY_NAME, r[0], Number(r[1]) || 0, Number(r[2]) || 0]);
        bsh.getRange(bsh.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
      }
      // Clear the now-unused legacy budget columns (D:E) — names in Col C are kept.
      sh.getRange(2, SETUP_COST_START_COL + 1, lastRow - 1, 2).clearContent();
    }
  }
  // Migration: ensure Đơn vị list exists (added in a later version) — seed with common units.
  if (sh.getRange(1, SETUP_UNIT_COL).getValue() === '') {
    sh.getRange(1, SETUP_UNIT_COL).setValue('DonVi');
    sh.getRange(2, SETUP_UNIT_COL, DEFAULT_UNITS.length, 1).setValues(DEFAULT_UNITS.map(u => [u]));
  }
  return sh;
}

function getOrCreateKiemKeSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_KIEMKE);
  if (!sh) sh = ss.insertSheet(SHEET_KIEMKE);
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, KIEMKE_HEADERS.length).setValues([KIEMKE_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function getOrCreateEditRequestSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_SUANHAPKHO);
  if (!sh) sh = ss.insertSheet(SHEET_SUANHAPKHO);
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, SUANHAPKHO_HEADERS.length).setValues([SUANHAPKHO_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function getOrCreateHoaDonSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_HOADON);
  if (!sh) sh = ss.insertSheet(SHEET_HOADON);
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, HOADON_HEADERS.length).setValues([HOADON_HEADERS]);
    sh.setFrozenRows(1);
    return sh;
  }
  // Migration: fill in any header cells left blank by older deployments (append-only — vd.
  // CoSo/PhanLoaiChiPhi thêm sau này ở cuối các sheet HoaDon đã tồn tại từ trước).
  const headerRange = sh.getRange(1, 1, 1, HOADON_HEADERS.length);
  const headerRow = headerRange.getValues()[0];
  let migrated = false;
  for (let i = 0; i < HOADON_HEADERS.length; i++) {
    if (!headerRow[i]) { headerRow[i] = HOADON_HEADERS[i]; migrated = true; }
  }
  if (migrated) headerRange.setValues([headerRow]);
  return sh;
}

function getOrCreateHoaDonEditRequestSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_SUAHOADON);
  if (!sh) sh = ss.insertSheet(SHEET_SUAHOADON);
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, SUAHOADON_HEADERS.length).setValues([SUAHOADON_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function getOrCreateBudgetSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_BUDGET);
  if (!sh) sh = ss.insertSheet(SHEET_BUDGET);
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, BUDGET_HEADERS.length).setValues([BUDGET_HEADERS]);
    sh.setFrozenRows(1);
    return sh;
  }
  // Migration: fill in any header cells left blank by older deployments (append-only — ví
  // dụ BudgetTuan thêm sau này ở cột E của các sheet NganSach đã tồn tại từ trước).
  const headerRange = sh.getRange(1, 1, 1, BUDGET_HEADERS.length);
  const headerRow = headerRange.getValues()[0];
  let migrated = false;
  for (let i = 0; i < BUDGET_HEADERS.length; i++) {
    if (!headerRow[i]) { headerRow[i] = BUDGET_HEADERS[i]; migrated = true; }
  }
  if (migrated) headerRange.setValues([headerRow]);
  return sh;
}

/** Tên hệ thống hiện tại (đọc từ Setup!H2), có fallback an toàn nếu chưa thiết lập. */
function getSystemName_() {
  try {
    const sh = getOrCreateSetupSheet_();
    const value = sh.getRange(2, SETUP_CONFIG_VALUE_COL).getValue();
    return value ? String(value) : DEFAULT_SYSTEM_NAME;
  } catch (e) {
    return DEFAULT_SYSTEM_NAME;
  }
}

/** Đổi tên hệ thống — hiển thị ở tiêu đề trình duyệt, màn hình đăng nhập, sidebar. Chỉ Quản lý. */
function updateSystemName(token, newName) {
  requireAuth_(token, ['Quản lý']);
  newName = String(newName || '').trim();
  if (!newName) throw new Error('Tên hệ thống không được để trống.');
  if (newName.length > 120) throw new Error('Tên hệ thống tối đa 120 ký tự.');
  const sh = getOrCreateSetupSheet_();
  sh.getRange(2, SETUP_CONFIG_KEY_COL, 1, 2).setValues([['TenHeThong', newName]]);
  return { success: true, systemName: newName };
}

/**
 * Cấu hình dạng key/value tổng quát ở Setup!G:H (mỗi dòng từ hàng 2 trở đi là một cặp
 * CauHinh/GiaTri — TenHeThong luôn ở hàng 2 do getOrCreateSetupSheet_ khởi tạo sẵn; các key
 * thêm sau như HuongDanSuDung sẽ tự tìm dòng trống tiếp theo). Quét tối đa 500 dòng — thừa xa
 * nhu cầu thực tế của một bảng cấu hình hệ thống.
 */
const CONFIG_SCAN_ROWS = 500;

function getConfigValue_(key, defaultValue) {
  try {
    const sh = getOrCreateSetupSheet_();
    const values = sh.getRange(2, SETUP_CONFIG_KEY_COL, CONFIG_SCAN_ROWS, 2).getValues();
    const row = values.find(r => r[0] === key);
    return (row && row[1] !== '' && row[1] !== null) ? row[1] : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setConfigValue_(key, value) {
  const sh = getOrCreateSetupSheet_();
  const values = sh.getRange(2, SETUP_CONFIG_KEY_COL, CONFIG_SCAN_ROWS, 2).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === key) { sh.getRange(i + 2, SETUP_CONFIG_VALUE_COL).setValue(value); return; }
  }
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === '' || values[i][0] === null) {
      sh.getRange(i + 2, SETUP_CONFIG_KEY_COL, 1, 2).setValues([[key, value]]);
      return;
    }
  }
  throw new Error('Không còn chỗ trống để lưu cấu hình mới (đã dùng hết ' + CONFIG_SCAN_ROWS + ' dòng).');
}

// ==================== HƯỚNG DẪN SỬ DỤNG (xem: mọi vai trò; sửa: chỉ Quản lý) ====================

const DEFAULT_USER_GUIDE = 'HƯỚNG DẪN SỬ DỤNG HỆ THỐNG\n' +
  '(Quản lý có thể bấm "✏️ Chỉnh sửa" ở góc trên để viết lại nội dung này cho phù hợp với đơn vị.)\n\n' +
  '1. ĐĂNG NHẬP\n' +
  '- Đăng nhập bằng MSNV hoặc Email + mật khẩu được cấp qua email.\n' +
  '- Vào "🔑 Đổi mật khẩu" ở sidebar để tự đổi mật khẩu sau lần đăng nhập đầu tiên.\n\n' +
  '2. DASHBOARD & BÁO CÁO\n' +
  '- Chọn bộ lọc ở "Fields Parameters" (Cơ sở, Khoảng thời gian, Phân loại) rồi bấm "🔍 Áp dụng".\n' +
  '- Xem nhanh Tổng chi phí, Ngân sách còn lại, Mặt hàng chi tiêu cao nhất, biểu đồ chi phí theo\n' +
  '  thời gian/danh mục, và biểu đồ so sánh Chi phí thực tế với Ngân sách theo Phân loại chi phí.\n' +
  '- Bấm "🖨️ In Dashboard" để in tổng quan này (không in sidebar/topbar).\n' +
  '- Thẻ "📦 Báo cáo Xuất - Nhập - Tồn": xem tồn đầu kỳ/nhập/xuất/tồn cuối kỳ theo mặt hàng, có\n' +
  '  thể lọc "chỉ hiện mặt hàng còn tồn cuối kỳ", in hoặc xuất Excel.\n\n' +
  '3. NHẬP KHO\n' +
  '- Nhập Số lượng và Thành tiền cho từng mặt hàng — hệ thống tự tính Đơn giá.\n' +
  '- Có thể dùng "📋 Dán dữ liệu nhanh" để dán nhiều dòng cùng lúc (chỉ tạo bảng nháp, phải bấm\n' +
  '  "Lưu đơn nhập kho" mới thực sự ghi vào hệ thống).\n' +
  '- Bảng "Lịch sử nhập kho" có bộ lọc Ngày/Cơ sở/Phân loại chi phí/Tên hàng, và 2 nút thao tác\n' +
  '  trên mỗi dòng: "✏️ Sửa" (Nhân viên sửa cần Quản lý duyệt) và "⚡ Xuất nhanh" (chuyển sang\n' +
  '  Xuất hàng với đúng lô đó).\n\n' +
  '4. XUẤT HÀNG\n' +
  '- Chọn loại: Xuất sử dụng (ghi nhận ngay) / Xuất hủy / Xuất chuyển (cần Quản lý duyệt).\n' +
  '- Chọn Cơ sở trước, sau đó gõ hoặc bấm vào ô "Mặt hàng / Lô hàng" để chọn đúng lô còn tồn —\n' +
  '  các lô sắp hết hạn hiện lên trước (FEFO). File đề xuất đã ký là tùy chọn.\n\n' +
  '5. BÁO CÁO KIỂM KÊ\n' +
  '- Chọn Cơ sở + Ngày kiểm kê — hệ thống tự điền sẵn mọi mặt hàng còn tồn kho, chỉ cần nhập Số\n' +
  '  lượng thực tế. Nếu có chênh lệch phải nhập Lý do + Phương án xử lý mới nộp được.\n' +
  '- Sau khi nộp, hệ thống gửi email cho Quản lý; Quản lý duyệt/từ chối theo cả đợt.\n\n' +
  '6. DANH SÁCH HÓA ĐƠN\n' +
  '- Chọn Cơ sở + Phân loại chi phí rồi dán CSV theo đúng thứ tự cột (xem hướng dẫn ngay trong\n' +
  '  thẻ dán) — dữ liệu ghi thẳng vào hệ thống, không qua duyệt.\n' +
  '- Thẻ "Đối chiếu Hóa đơn & Nhập kho" so sánh Tổng thành tiền sau thuế với Tổng thành tiền\n' +
  '  Nhập kho theo cùng khoảng ngày, giúp phát hiện chênh lệch sổ sách.\n\n' +
  '7. THIẾT LẬP & QUẢN LÝ NGƯỜI DÙNG (chỉ Quản lý)\n' +
  '- Quản lý danh mục Cơ sở/Phân loại hàng hóa/Phân loại chi phí/Đơn vị tính, Ngân sách theo\n' +
  '  Tuần/Tháng/Năm cho từng Cơ sở, đổi tên hệ thống, và cấp/thu hồi tài khoản người dùng.\n\n' +
  '8. VAI TRÒ\n' +
  '- Quản lý: toàn quyền, kể cả duyệt yêu cầu và thiết lập hệ thống.\n' +
  '- Nhân viên: nhập/xuất/kiểm kê/hóa đơn hàng ngày, không duyệt được và không vào Thiết lập.\n' +
  '- Người xem: chỉ xem báo cáo/lịch sử, không tạo hay sửa được dữ liệu.';

/** Nội dung Hướng dẫn sử dụng — mọi vai trò đã đăng nhập đều xem được. */
function getUserGuide(token) {
  requireAuth_(token, null);
  return { content: String(getConfigValue_('HuongDanSuDung', DEFAULT_USER_GUIDE)) };
}

/** Ghi lại nội dung Hướng dẫn sử dụng. Chỉ Quản lý. */
function saveUserGuide(token, content) {
  requireAuth_(token, ['Quản lý']);
  content = String(content || '').trim();
  if (!content) throw new Error('Nội dung hướng dẫn không được để trống.');
  setConfigValue_('HuongDanSuDung', content);
  return { success: true };
}

function getOrCreateUsersSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_USERS);
  if (!sh) sh = ss.insertSheet(SHEET_USERS);
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readColumnList_(sheet, col) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  return values.map(r => r[0]).filter(v => v !== '' && v !== null);
}

// ==================== AUTH: PASSWORD HASHING ====================

function getSecretKey_() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('AUTH_SECRET');
  if (!key) {
    key = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('AUTH_SECRET', key);
  }
  return key;
}

function bytesToHex_(bytes) {
  return bytes.map(b => ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0')).join('');
}

function hashPassword_(password, salt) {
  return bytesToHex_(Utilities.computeHmacSha256Signature(String(password), String(salt)));
}

function generateSalt_() {
  return Utilities.getUuid();
}

function generateTempPassword_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
  return pw;
}

// ==================== AUTH: TOKENS ====================

function signToken_(payload) {
  const payloadB64 = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payloadB64, getSecretKey_()));
  return payloadB64 + '.' + sig;
}

function verifyToken_(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') === -1) {
    throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
  }
  const parts = token.split('.');
  const payloadB64 = parts[0], sig = parts[1];
  const expectedSig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payloadB64, getSecretKey_()));
  if (sig !== expectedSig) throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
  let payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString());
  } catch (e) {
    throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
  }
  if (!payload.exp || Date.now() > payload.exp) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  return payload;
}

/**
 * Verify token, re-check the user is still active, and (optionally) enforce a role whitelist.
 * @returns {Object} user record {rowIndex, msnv, hoTen, email, phanQuyen, tinhTrang}
 */
function requireAuth_(token, allowedRoles) {
  const payload = verifyToken_(token);
  const user = findUserByIdentifier_(payload.msnv);
  if (!user) throw new Error('Tài khoản không còn tồn tại.');
  if (user.tinhTrang !== 'Hoạt động') throw new Error('Tài khoản đã bị ngưng sử dụng.');
  if (allowedRoles && allowedRoles.indexOf(user.phanQuyen) === -1) {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
  return user;
}

function publicUser_(u) {
  return { msnv: u.msnv, hoTen: u.hoTen, email: u.email, phanQuyen: u.phanQuyen, tinhTrang: u.tinhTrang };
}

// ==================== AUTH: LOGIN / SESSION ====================

function findUserByIdentifier_(identifier, includeSecrets) {
  const sh = getOrCreateUsersSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  const values = sh.getRange(2, 1, lastRow - 1, USER_HEADERS.length).getValues();
  const idLower = String(identifier || '').trim().toLowerCase();
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    if (String(r[0]).toLowerCase() === idLower || String(r[2]).toLowerCase() === idLower) {
      const user = { rowIndex: i + 2, msnv: r[0], hoTen: r[1], email: r[2], phanQuyen: r[5], tinhTrang: r[6] };
      if (includeSecrets) { user.matKhauHash = r[3]; user.salt = r[4]; }
      return user;
    }
  }
  return null;
}

/** Login with MSNV or Email + mật khẩu. Returns {token, user}. */
function login(identifier, password) {
  const user = findUserByIdentifier_(identifier, true);
  if (!user) throw new Error('MSNV/Email hoặc mật khẩu không đúng.');
  if (user.tinhTrang !== 'Hoạt động') throw new Error('Tài khoản đã bị ngưng sử dụng. Liên hệ Quản lý.');
  if (hashPassword_(password, user.salt) !== user.matKhauHash) {
    throw new Error('MSNV/Email hoặc mật khẩu không đúng.');
  }
  const payload = {
    msnv: user.msnv, hoTen: user.hoTen, email: user.email, phanQuyen: user.phanQuyen,
    iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS
  };
  return { token: signToken_(payload), user: publicUser_(user) };
}

function getCurrentUserFromToken(token) {
  const user = requireAuth_(token, null);
  return publicUser_(user);
}

function changeMyPassword(token, oldPassword, newPassword) {
  const payload = verifyToken_(token);
  const user = findUserByIdentifier_(payload.msnv, true);
  if (!user) throw new Error('Không tìm thấy tài khoản.');
  if (hashPassword_(oldPassword, user.salt) !== user.matKhauHash) throw new Error('Mật khẩu hiện tại không đúng.');
  if (!newPassword || String(newPassword).length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
  const salt = generateSalt_();
  const sh = getOrCreateUsersSheet_();
  sh.getRange(user.rowIndex, 4, 1, 2).setValues([[hashPassword_(newPassword, salt), salt]]);
  return { success: true };
}

// ==================== USERS: CRUD (Quản lý only) ====================

function listUsersRaw_() {
  const sh = getOrCreateUsersSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, USER_HEADERS.length).getValues();
  return values.filter(r => r[0] !== '').map(r => ({
    msnv: r[0], hoTen: r[1], email: r[2], phanQuyen: r[5], tinhTrang: r[6],
    ngayTao: formatDate_(r[7])
  }));
}

function getUsers(token) {
  requireAuth_(token, ['Quản lý']);
  return listUsersRaw_();
}

function sendAccountEmail_(user, tempPassword) {
  const url = ScriptApp.getService().getUrl();
  const subject = 'Tài khoản hệ thống Quản lý Sản phẩm - Phòng Giải trí';
  const body =
    'Xin chào ' + user.hoTen + ',\n\n' +
    'Bạn đã được cấp tài khoản truy cập hệ thống Quản lý Sản phẩm - Phòng Giải trí nhân viên.\n\n' +
    'Đường link truy cập: ' + url + '\n' +
    'Mã số nhân viên (MSNV): ' + user.msnv + '\n' +
    'Mật khẩu tạm thời: ' + tempPassword + '\n\n' +
    'Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.\n\n' +
    'Trân trọng.';
  MailApp.sendEmail(user.email, subject, body);
}

function validateUserPayload_(data, isNew) {
  const errors = [];
  if (isNew && !String(data.msnv || '').trim()) errors.push('Thiếu MSNV.');
  if (!String(data.hoTen || '').trim()) errors.push('Thiếu Họ tên.');
  const email = String(data.email || '').trim();
  if (!email) errors.push('Thiếu Email.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email không hợp lệ.');
  if (ROLES.indexOf(data.phanQuyen) === -1) errors.push('Phân quyền không hợp lệ.');
  if (data.tinhTrang && STATUSES.indexOf(data.tinhTrang) === -1) errors.push('Tình trạng không hợp lệ.');
  return errors;
}

/** Tạo tài khoản mới + gửi email cấp tài khoản kèm link Web App. Chỉ Quản lý. */
function createUser(token, data) {
  requireAuth_(token, ['Quản lý']);
  const errors = validateUserPayload_(data, true);
  if (errors.length) throw new Error(errors.join(' '));

  const msnv = String(data.msnv).trim();
  if (findUserByIdentifier_(msnv)) throw new Error('MSNV "' + msnv + '" đã tồn tại.');

  const sh = getOrCreateUsersSheet_();
  const tempPassword = generateTempPassword_();
  const salt = generateSalt_();
  const hoTen = String(data.hoTen).trim();
  const email = String(data.email).trim();
  sh.appendRow([msnv, hoTen, email, hashPassword_(tempPassword, salt), salt, data.phanQuyen, 'Hoạt động', new Date()]);

  let emailSent = false, emailError = '';
  try { sendAccountEmail_({ msnv: msnv, hoTen: hoTen, email: email }, tempPassword); emailSent = true; }
  catch (e) { emailError = e.message; }

  return { success: true, tempPassword: tempPassword, emailSent: emailSent, emailError: emailError, users: listUsersRaw_() };
}

/** Cập nhật Họ tên / Email / Phân quyền / Tình trạng (không đổi mật khẩu). Chỉ Quản lý. */
function updateUser(token, msnv, data) {
  const admin = requireAuth_(token, ['Quản lý']);
  const user = findUserByIdentifier_(msnv);
  if (!user) throw new Error('Không tìm thấy người dùng "' + msnv + '".');

  const merged = {
    hoTen: data.hoTen !== undefined ? data.hoTen : user.hoTen,
    email: data.email !== undefined ? data.email : user.email,
    phanQuyen: data.phanQuyen !== undefined ? data.phanQuyen : user.phanQuyen,
    tinhTrang: data.tinhTrang !== undefined ? data.tinhTrang : user.tinhTrang
  };
  const errors = validateUserPayload_(merged, false);
  if (errors.length) throw new Error(errors.join(' '));
  if (String(admin.msnv) === String(msnv) && merged.tinhTrang !== 'Hoạt động') {
    throw new Error('Không thể tự ngưng sử dụng tài khoản đang đăng nhập.');
  }
  if (String(admin.msnv) === String(msnv) && merged.phanQuyen !== 'Quản lý') {
    throw new Error('Không thể tự hạ quyền tài khoản đang đăng nhập.');
  }

  const sh = getOrCreateUsersSheet_();
  sh.getRange(user.rowIndex, 2, 1, 2).setValues([[String(merged.hoTen).trim(), String(merged.email).trim()]]);
  sh.getRange(user.rowIndex, 6, 1, 2).setValues([[merged.phanQuyen, merged.tinhTrang]]);
  return listUsersRaw_();
}

/** Cấp lại mật khẩu tạm thời mới + gửi lại email. Chỉ Quản lý. */
function resetUserPassword(token, msnv) {
  requireAuth_(token, ['Quản lý']);
  const user = findUserByIdentifier_(msnv);
  if (!user) throw new Error('Không tìm thấy người dùng "' + msnv + '".');

  const sh = getOrCreateUsersSheet_();
  const tempPassword = generateTempPassword_();
  const salt = generateSalt_();
  sh.getRange(user.rowIndex, 4, 1, 2).setValues([[hashPassword_(tempPassword, salt), salt]]);

  let emailSent = false, emailError = '';
  try { sendAccountEmail_(user, tempPassword); emailSent = true; }
  catch (e) { emailError = e.message; }

  return { success: true, tempPassword: tempPassword, emailSent: emailSent, emailError: emailError };
}

function deleteUser(token, msnv) {
  const admin = requireAuth_(token, ['Quản lý']);
  if (String(admin.msnv) === String(msnv)) throw new Error('Không thể tự xóa tài khoản đang đăng nhập.');
  const user = findUserByIdentifier_(msnv);
  if (!user) throw new Error('Không tìm thấy người dùng "' + msnv + '".');
  getOrCreateUsersSheet_().deleteRow(user.rowIndex);
  return listUsersRaw_();
}

/**
 * Chạy TAY MỘT LẦN từ trình soạn thảo Apps Script (Run > initializeSystem) ngay sau khi
 * deploy, để tạo tài khoản Quản lý đầu tiên (nếu chưa có ai). Không gọi từ client.
 */
function initializeSystem() {
  const sh = getOrCreateUsersSheet_();
  if (sh.getLastRow() >= 2) return 'Hệ thống đã có người dùng — bỏ qua khởi tạo.';

  const email = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail();
  const tempPassword = generateTempPassword_();
  const salt = generateSalt_();
  sh.appendRow(['admin001', 'Quản trị viên', email, hashPassword_(tempPassword, salt), salt, 'Quản lý', 'Hoạt động', new Date()]);

  const msg = 'Đã tạo tài khoản Quản lý đầu tiên:\nMSNV: admin001\nEmail: ' + email +
    '\nMật khẩu tạm thời: ' + tempPassword + '\n\nVui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.';
  Logger.log(msg);
  try {
    MailApp.sendEmail(email, 'Khởi tạo hệ thống Quản lý Sản phẩm', msg + '\n\nĐường link: ' + ScriptApp.getService().getUrl());
  } catch (e) {
    Logger.log('Không gửi được email khởi tạo: ' + e.message);
  }
  return msg;
}

/**
 * CHẨN ĐOÁN — CHỈ ĐỌC, KHÔNG SỬA GÌ CẢ. Quét ID_GiaoDich (Data_NhapXuat), ID_HoaDon (HoaDon)
 * và ID_KiemKe (KiemKe) để tìm các ID bị trùng — hậu quả của lỗi sinh ID cũ trước khi vá
 * (generateTransactionId_/generateHoaDonId_ trước đây chỉ có 90 khả năng cho phần ngẫu nhiên
 * cuối, nên 2 dòng lưu cùng lúc trong 1 đơn nhiều mặt hàng có thể bị trùng ID — khiến mở "chi
 * tiết"/"Sửa" một dòng lại ra dữ liệu dòng khác, và tính sai số lượng tồn theo lô khi Xuất
 * hàng). Chạy TAY MỘT LẦN từ trình soạn thảo Apps Script (chọn hàm timGiaoDichTrungId ở thanh
 * công cụ rồi bấm Run), sau đó xem kết quả ở View > Logs (Ctrl+Enter / Cmd+Enter). Không gọi
 * từ client, không ghi/sửa bất kỳ ô nào.
 */
function timGiaoDichTrungId() {
  const summary = [
    quetTrungId_(SHEET_TRANSACTIONS, 'ID_GiaoDich', 1, ['Ngay', 'LoaiGiaoDich', 'TenHangHoa', 'CoSo'], [2, 3, 4, 16]),
    quetTrungId_(SHEET_HOADON, 'ID_HoaDon', 1, ['NgayXuatHD', 'TenNguoiBan', 'SoHoaDon'], [2, 3, 4]),
    quetTrungId_(SHEET_KIEMKE, 'ID_KiemKe', 1, ['Ngay', 'CoSo', 'TenHangHoa'], [3, 4, 5])
  ].join('\n\n');
  Logger.log(summary);
  return summary;
}

/** Quét cột `idCol` (1-based) của sheet `sheetName` tìm giá trị bị trùng nhau, in kèm vài cột
 *  mô tả (`labelCols`, 1-based, cùng thứ tự với `labelNames`) của từng dòng trùng để dễ đối
 *  chiếu thủ công trên Sheet thật. */
function quetTrungId_(sheetName, idColName, idCol, labelNames, labelCols) {
  const sh = getSs_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return sheetName + ': không có dữ liệu.';

  const lastRow = sh.getLastRow();
  const lastCol = Math.max(idCol, Math.max.apply(null, labelCols));
  const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const byId = {};
  values.forEach((row, i) => {
    const id = row[idCol - 1];
    if (id === '' || id === null) return;
    if (!byId[id]) byId[id] = [];
    byId[id].push({ sheetRow: i + 2, row: row });
  });

  const dup = Object.keys(byId).filter(id => byId[id].length > 1);
  if (!dup.length) return sheetName + ' (' + idColName + '): không phát hiện ID nào bị trùng. ✅';

  const lines = [sheetName + ' (' + idColName + '): phát hiện ' + dup.length + ' ID bị trùng —'];
  dup.forEach(id => {
    lines.push('  • ID "' + id + '" xuất hiện ở ' + byId[id].length + ' dòng:');
    byId[id].forEach(entry => {
      const desc = labelCols.map((c, i) => {
        let v = entry.row[c - 1];
        if (v instanceof Date) v = formatDate_(v);
        return labelNames[i] + '=' + v;
      }).join(', ');
      lines.push('      - Dòng sheet ' + entry.sheetRow + ': ' + desc);
    });
  });
  return lines.join('\n');
}

/**
 * SỬA DỮ LIỆU (CÓ GHI ĐÈ) — CHẠY TAY MỘT LẦN. Dọn các ID_GiaoDich bị trùng ở Data_NhapXuat mà
 * timGiaoDichTrungId() đã phát hiện. NÊN SAO LƯU SHEET (menu Tệp > Tạo bản sao trên Google
 * Sheet) TRƯỚC KHI CHẠY HÀM NÀY.
 *
 * Với mỗi cặp ĐÚNG 2 dòng bị trùng ID_GiaoDich và có Tên hàng hóa KHÁC nhau (đủ để phân biệt
 * chắc chắn dòng nào là dòng nào):
 *  - Giữ nguyên ID ở dòng sheet xuất hiện trước.
 *  - Sinh ID mới, duy nhất, cho dòng sheet xuất hiện sau.
 *  - Tìm mọi dòng Xuất có LoNhapId = ID cũ VÀ Tên hàng hóa khớp đúng tên hàng của dòng vừa đổi
 *    ID (chắc chắn đúng lô, vì hệ thống luôn xuất theo đúng tên hàng của lô đã chọn) — cập
 *    nhật LoNhapId sang ID mới, để không làm sai số lượng tồn kho tính theo lô.
 *  - Cập nhật các yêu cầu đang "Chờ duyệt" ở YeuCauSuaNhapKho/YeuCauSuaXuatHang đang trỏ ID cũ
 *    (khớp theo Tên hàng lưu sẵn trong chính yêu cầu đó) sang ID mới tương ứng.
 *
 * Các nhóm trùng KHÔNG rơi vào trường hợp trên (nhiều hơn 2 dòng cùng ID, hoặc 2 dòng cùng Tên
 * hàng hóa nên không thể phân biệt tự động) sẽ được BỎ QUA và liệt kê riêng để xử lý tay.
 * Chọn hàm này ở thanh công cụ trình soạn thảo Apps Script rồi bấm Run, sau đó xem kết quả ở
 * View > Logs. Không gọi từ client.
 */
function sanLaiIdGiaoDichTrung() {
  const sh = getOrCreateTransactionSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 'Data_NhapXuat: không có dữ liệu.';

  const range = sh.getRange(2, 1, lastRow - 1, TRANSACTION_HEADERS.length);
  const values = range.getValues();

  const byId = {};
  values.forEach((row, i) => {
    const id = row[0];
    if (id === '' || id === null) return;
    if (!byId[id]) byId[id] = [];
    byId[id].push(i);
  });

  const idMap = {}; // "oldId|TenHangHoaDòngBịĐổi" -> newId — chỉ các dòng thực sự bị đổi ID
  const applied = [];
  const skipped = [];

  Object.keys(byId).forEach(oldId => {
    const idxs = byId[oldId];
    if (idxs.length < 2) return;
    if (idxs.length > 2) {
      skipped.push('ID "' + oldId + '": có ' + idxs.length + ' dòng cùng trùng (nhiều hơn 2) — cần xử lý tay.');
      return;
    }
    const [ia, ib] = idxs; // ia < ib vì values theo đúng thứ tự sheet
    const nameA = values[ia][3], nameB = values[ib][3];
    if (nameA === nameB) {
      skipped.push('ID "' + oldId + '" (dòng sheet ' + (ia + 2) + ' & ' + (ib + 2) + '): cùng Tên hàng "' + nameA + '" — không thể phân biệt tự động, cần xử lý tay.');
      return;
    }
    const newId = generateTransactionId_('fix' + (ib + 2));
    values[ib][0] = newId;
    idMap[oldId + '|' + nameB] = newId;
    applied.push('ID "' + oldId + '" → dòng sheet ' + (ib + 2) + ' ("' + nameB + '") đổi thành "' + newId +
      '" (dòng sheet ' + (ia + 2) + ' "' + nameA + '" giữ nguyên ID cũ).');
  });

  if (!applied.length) {
    const msg = 'Không có cặp trùng nào đủ điều kiện tự sửa.' +
      (skipped.length ? ('\n\nCần xử lý tay:\n' + skipped.map(s => '  • ' + s).join('\n')) : '\n\nKhông phát hiện ID nào bị trùng.');
    Logger.log(msg);
    return msg;
  }

  // Cập nhật LoNhapId ở các dòng Xuất đang trỏ tới lô vừa đổi ID — khớp theo Tên hàng để chắc
  // chắn đúng lô (hệ thống luôn xuất theo đúng tên hàng của lô đã chọn).
  let loNhapUpdated = 0;
  values.forEach(row => {
    const lo = row[18]; // LoNhapId — cột 19 (0-based 18)
    if (!lo) return;
    const key = lo + '|' + row[3]; // TenHangHoa — cột 4 (0-based 3)
    if (idMap[key]) { row[18] = idMap[key]; loNhapUpdated++; }
  });

  range.setValues(values); // ghi đè một lần cho cả 2 loại thay đổi (ID_GiaoDich + LoNhapId)

  // Cập nhật các yêu cầu sửa đang "Chờ duyệt" đang trỏ ID cũ (YeuCauSuaNhapKho/YeuCauSuaXuatHang
  // dùng chung cấu trúc cột SUANHAPKHO_HEADERS) — khớp theo Tên hàng lưu sẵn trong yêu cầu.
  let reqUpdated = 0;
  [SHEET_SUANHAPKHO, SHEET_SUAXUATHANG].forEach(sheetName => {
    const rsh = getSs_().getSheetByName(sheetName);
    if (!rsh || rsh.getLastRow() < 2) return;
    const rrange = rsh.getRange(2, 1, rsh.getLastRow() - 1, SUANHAPKHO_HEADERS.length);
    const rvals = rrange.getValues();
    let changed = false;
    rvals.forEach(row => {
      if (row[15] !== 'Chờ duyệt') return; // TrangThai — cột 16 (0-based 15)
      const key = row[1] + '|' + row[4];   // ID_GiaoDich (cột 2) + TenHangHoa (cột 5)
      if (idMap[key]) { row[1] = idMap[key]; changed = true; reqUpdated++; }
    });
    if (changed) rrange.setValues(rvals);
  });

  const lines = [
    'Đã sửa ' + applied.length + ' cặp ID_GiaoDich bị trùng:',
    ...applied.map(l => '  • ' + l),
    '',
    'Đã cập nhật LoNhapId ở ' + loNhapUpdated + ' dòng Xuất tham chiếu tới các lô vừa đổi ID.',
    'Đã cập nhật ' + reqUpdated + ' yêu cầu sửa đang "Chờ duyệt" tham chiếu tới ID cũ.'
  ];
  if (skipped.length) {
    lines.push('', 'CẦN XỬ LÝ TAY (không tự sửa được):');
    skipped.forEach(s => lines.push('  • ' + s));
  }
  const summary = lines.join('\n');
  Logger.log(summary);
  return summary;
}

// ==================== SETUP: READ (mọi vai trò đã đăng nhập) ====================

function getCategories() {
  return readColumnList_(getOrCreateSetupSheet_(), SETUP_GOODS_COL);
}

/** Danh sách tên Phân loại chi phí (không còn kèm ngân sách — xem getBudgets()). */
function getCostTypes() {
  return readColumnList_(getOrCreateSetupSheet_(), SETUP_COST_START_COL);
}

function getFacilities() {
  return readColumnList_(getOrCreateSetupSheet_(), SETUP_FACILITY_COL);
}

function getUnits() {
  return readColumnList_(getOrCreateSetupSheet_(), SETUP_UNIT_COL);
}

/** Combined payload for populating all dropdowns client-side in one round trip. */
function getSetupData(token) {
  const user = requireAuth_(token, null);
  return {
    categories: getCategories(),
    costTypes: getCostTypes(),
    facilities: getFacilities(),
    units: getUnits(),
    transactionTypes: TRANSACTION_TYPES,
    currentUser: publicUser_(user),
    systemName: getSystemName_()
  };
}

// ==================== SETUP: CRUD Phân loại Hàng hóa (chỉ Quản lý) ====================

function addCategory(token, name) {
  requireAuth_(token, ['Quản lý']);
  name = String(name || '').trim();
  if (!name) throw new Error('Tên phân loại không được để trống.');
  const sh = getOrCreateSetupSheet_();
  const existing = readColumnList_(sh, SETUP_GOODS_COL);
  if (existing.some(v => String(v).toLowerCase() === name.toLowerCase())) {
    throw new Error('Phân loại "' + name + '" đã tồn tại.');
  }
  sh.getRange(existing.length + 2, SETUP_GOODS_COL).setValue(name);
  return getCategories();
}

function updateCategory(token, oldName, newName) {
  requireAuth_(token, ['Quản lý']);
  newName = String(newName || '').trim();
  if (!newName) throw new Error('Tên phân loại mới không được để trống.');
  const sh = getOrCreateSetupSheet_();
  const list = readColumnList_(sh, SETUP_GOODS_COL);
  const idx = list.findIndex(v => v === oldName);
  if (idx === -1) throw new Error('Không tìm thấy phân loại "' + oldName + '".');
  sh.getRange(idx + 2, SETUP_GOODS_COL).setValue(newName);
  cascadeRename_(getOrCreateTransactionSheet_(), 5, oldName, newName); // PhanLoaiHangHoa (E)
  return getCategories();
}

function deleteCategory(token, name) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateSetupSheet_();
  const list = readColumnList_(sh, SETUP_GOODS_COL);
  const filtered = list.filter(v => v !== name);
  if (filtered.length === list.length) throw new Error('Không tìm thấy phân loại "' + name + '".');
  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, SETUP_GOODS_COL, lastRow - 1, 1).clearContent();
  if (filtered.length) sh.getRange(2, SETUP_GOODS_COL, filtered.length, 1).setValues(filtered.map(v => [v]));
  return getCategories();
}

// ==================== SETUP: CRUD Phân loại Chi phí (chỉ Quản lý; ngân sách xem mục NGÂN SÁCH) ====================

function addCostType(token, name) {
  requireAuth_(token, ['Quản lý']);
  name = String(name || '').trim();
  if (!name) throw new Error('Tên phân loại chi phí không được để trống.');
  const sh = getOrCreateSetupSheet_();
  const existing = getCostTypes();
  if (existing.some(v => String(v).toLowerCase() === name.toLowerCase())) {
    throw new Error('Phân loại chi phí "' + name + '" đã tồn tại.');
  }
  sh.getRange(existing.length + 2, SETUP_COST_START_COL).setValue(name);
  return getCostTypes();
}

function updateCostType(token, oldName, newName) {
  requireAuth_(token, ['Quản lý']);
  newName = String(newName || '').trim();
  if (!newName) throw new Error('Tên phân loại chi phí mới không được để trống.');
  const sh = getOrCreateSetupSheet_();
  const list = getCostTypes();
  const idx = list.findIndex(v => v === oldName);
  if (idx === -1) throw new Error('Không tìm thấy phân loại chi phí "' + oldName + '".');
  sh.getRange(idx + 2, SETUP_COST_START_COL).setValue(newName);

  if (newName !== oldName) {
    cascadeRename_(getOrCreateTransactionSheet_(), 6, oldName, newName);           // PhanLoaiChiPhi (F)
    cascadeRename_(getOrCreateBudgetSheet_(), 2, oldName, newName);                // NganSach!PhanLoaiChiPhi
  }
  return getCostTypes();
}

function deleteCostType(token, name) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateSetupSheet_();
  const list = getCostTypes();
  const filtered = list.filter(v => v !== name);
  if (filtered.length === list.length) throw new Error('Không tìm thấy phân loại chi phí "' + name + '".');
  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, SETUP_COST_START_COL, lastRow - 1, 1).clearContent();
  if (filtered.length) sh.getRange(2, SETUP_COST_START_COL, filtered.length, 1).setValues(filtered.map(v => [v]));
  return getCostTypes();
}

// ==================== SETUP: CRUD Cơ sở (chỉ Quản lý) ====================

function addFacility(token, name) {
  requireAuth_(token, ['Quản lý']);
  name = String(name || '').trim();
  if (!name) throw new Error('Tên cơ sở không được để trống.');
  const sh = getOrCreateSetupSheet_();
  const existing = getFacilities();
  if (existing.some(v => String(v).toLowerCase() === name.toLowerCase())) {
    throw new Error('Cơ sở "' + name + '" đã tồn tại.');
  }
  sh.getRange(existing.length + 2, SETUP_FACILITY_COL).setValue(name);
  return getFacilities();
}

function updateFacility(token, oldName, newName) {
  requireAuth_(token, ['Quản lý']);
  newName = String(newName || '').trim();
  if (!newName) throw new Error('Tên cơ sở mới không được để trống.');
  const sh = getOrCreateSetupSheet_();
  const list = getFacilities();
  const idx = list.findIndex(v => v === oldName);
  if (idx === -1) throw new Error('Không tìm thấy cơ sở "' + oldName + '".');
  sh.getRange(idx + 2, SETUP_FACILITY_COL).setValue(newName);

  if (newName !== oldName) {
    cascadeRename_(getOrCreateTransactionSheet_(), 16, oldName, newName); // Data_NhapXuat!CoSo
    cascadeRename_(getOrCreateBudgetSheet_(), 1, oldName, newName);       // NganSach!CoSo
  }
  return getFacilities();
}

function deleteFacility(token, name) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateSetupSheet_();
  const list = getFacilities();
  const filtered = list.filter(v => v !== name);
  if (filtered.length === list.length) throw new Error('Không tìm thấy cơ sở "' + name + '".');
  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, SETUP_FACILITY_COL, lastRow - 1, 1).clearContent();
  if (filtered.length) sh.getRange(2, SETUP_FACILITY_COL, filtered.length, 1).setValues(filtered.map(v => [v]));
  return getFacilities();
}

// ==================== SETUP: CRUD Đơn vị tính (chỉ Quản lý) ====================

function addUnit(token, name) {
  requireAuth_(token, ['Quản lý']);
  name = String(name || '').trim();
  if (!name) throw new Error('Tên đơn vị không được để trống.');
  const sh = getOrCreateSetupSheet_();
  const existing = getUnits();
  if (existing.some(v => String(v).toLowerCase() === name.toLowerCase())) {
    throw new Error('Đơn vị "' + name + '" đã tồn tại.');
  }
  sh.getRange(existing.length + 2, SETUP_UNIT_COL).setValue(name);
  return getUnits();
}

function updateUnit(token, oldName, newName) {
  requireAuth_(token, ['Quản lý']);
  newName = String(newName || '').trim();
  if (!newName) throw new Error('Tên đơn vị mới không được để trống.');
  const sh = getOrCreateSetupSheet_();
  const list = getUnits();
  const idx = list.findIndex(v => v === oldName);
  if (idx === -1) throw new Error('Không tìm thấy đơn vị "' + oldName + '".');
  sh.getRange(idx + 2, SETUP_UNIT_COL).setValue(newName);
  if (newName !== oldName) {
    cascadeRename_(getOrCreateTransactionSheet_(), 17, oldName, newName); // Data_NhapXuat!DonVi
  }
  return getUnits();
}

function deleteUnit(token, name) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateSetupSheet_();
  const list = getUnits();
  const filtered = list.filter(v => v !== name);
  if (filtered.length === list.length) throw new Error('Không tìm thấy đơn vị "' + name + '".');
  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, SETUP_UNIT_COL, lastRow - 1, 1).clearContent();
  if (filtered.length) sh.getRange(2, SETUP_UNIT_COL, filtered.length, 1).setValues(filtered.map(v => [v]));
  return getUnits();
}

/** Ghi đè một ô nếu khớp oldValue, trên toàn bộ dữ liệu (từ dòng 2) của `col` trong `sheet`. */
function cascadeRename_(sheet, col, oldValue, newValue) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const range = sheet.getRange(2, col, lastRow - 1, 1);
  const values = range.getValues();
  let changed = false;
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === oldValue) { values[i][0] = newValue; changed = true; }
  }
  if (changed) range.setValues(values);
}

// ==================== NGÂN SÁCH theo Cơ sở (chỉ Quản lý quản lý; dashboard đọc trực tiếp) ====================

function getBudgetRows_() {
  const sh = getOrCreateBudgetSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, BUDGET_HEADERS.length).getValues();
  return values
    .filter(r => r[0] !== '' && r[1] !== '')
    .map(r => ({ coSo: r[0], name: r[1], budgetMonth: Number(r[2]) || 0, budgetYear: Number(r[3]) || 0, budgetWeek: Number(r[4]) || 0 }));
}

function getBudgets(token) {
  requireAuth_(token, ['Quản lý']);
  return getBudgetRows_();
}

/** Thêm mới hoặc cập nhật ngân sách cho một tổ hợp (Cơ sở, Phân loại chi phí). Chỉ Quản lý. */
function setBudget(token, coSo, phanLoaiChiPhi, budgetMonth, budgetYear, budgetWeek) {
  requireAuth_(token, ['Quản lý']);
  coSo = String(coSo || '').trim();
  phanLoaiChiPhi = String(phanLoaiChiPhi || '').trim();
  if (!coSo) throw new Error('Vui lòng chọn Cơ sở.');
  if (!phanLoaiChiPhi) throw new Error('Vui lòng chọn Phân loại chi phí.');
  if (getFacilities().indexOf(coSo) === -1) throw new Error('Cơ sở "' + coSo + '" không tồn tại.');
  if (getCostTypes().indexOf(phanLoaiChiPhi) === -1) throw new Error('Phân loại chi phí "' + phanLoaiChiPhi + '" không tồn tại.');

  const sh = getOrCreateBudgetSheet_();
  const lastRow = sh.getLastRow();
  const bm = Number(budgetMonth) || 0, by = Number(budgetYear) || 0, bw = Number(budgetWeek) || 0;
  if (lastRow >= 2) {
    const values = sh.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === coSo && values[i][1] === phanLoaiChiPhi) {
        sh.getRange(i + 2, 3, 1, 3).setValues([[bm, by, bw]]);
        return getBudgetRows_();
      }
    }
  }
  sh.appendRow([coSo, phanLoaiChiPhi, bm, by, bw]);
  return getBudgetRows_();
}

function deleteBudget(token, coSo, phanLoaiChiPhi) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateBudgetSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const values = sh.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === coSo && values[i][1] === phanLoaiChiPhi) {
        sh.deleteRow(i + 2);
        break;
      }
    }
  }
  return getBudgetRows_();
}

// ==================== TRANSACTIONS: READ ====================

function rowToTransaction_(row) {
  return {
    id: row[0],
    date: formatDate_(row[1]),
    type: row[2],
    itemName: row[3],
    category: row[4],
    costType: row[5],
    qty: Number(row[6]) || 0,
    unitPrice: Number(row[7]) || 0,
    total: Number(row[8]) || 0,
    note: row[9] || '',
    createdBy: row[10] || '',
    attachmentUrl: row[11] || '',
    approvalStatus: row[12] || '',
    approvedBy: row[13] || '',
    approvedDate: row[14] ? formatDate_(row[14]) : '',
    coSo: row[15] || '',
    unit: row[16] || '',
    hanSuDung: row[17] ? formatDate_(row[17]) : '',
    loNhapId: row[18] || '',
    donId: row[19] || ''
  };
}

/** Làm tròn LÊN (không có số thập phân) — dùng cho ThanhTien/Giá trị hiển thị tiền. */
function ceilCurrency_(n) {
  return Math.ceil(Number(n) || 0);
}

/** Giao dịch được tính vào báo cáo/thống kê: Nhập kho & Xuất sử dụng luôn tính;
 *  Xuất hủy/Xuất chuyển chỉ tính sau khi Quản lý duyệt ("Đã duyệt"). */
function isReportable_(t) {
  return APPROVAL_REQUIRED_TYPES.indexOf(t.type) === -1 || t.approvalStatus === 'Đã duyệt';
}

function formatDate_(d) {
  if (d instanceof Date) return Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
  if (!d) return '';
  return String(d).slice(0, 10);
}

/** 'yyyy-MM-dd' -> 'dd-mm-yyyy' — dùng khi ghi ngày vào file Excel xuất ra (hiển thị, không
 *  phải giá trị dùng lại để tính toán). */
function fmtDateDisplay_(isoDate) {
  if (!isoDate) return '';
  const s = String(isoDate);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3] + '-' + m[2] + '-' + m[1]) : s;
}

function getAllTransactions_() {
  const sh = getOrCreateTransactionSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, TRANSACTION_HEADERS.length).getValues();
  return values.filter(r => r[0] !== '').map(rowToTransaction_);
}

/**
 * Recent transactions for tab tables (mọi vai trò đã đăng nhập đều xem được).
 * @param {number} limit
 * @param {string[]} [types] restrict to given LoaiGiaoDich values
 */
function getTransactions(token, limit, types) {
  requireAuth_(token, null);
  let list = getAllTransactions_();
  if (types && types.length) {
    list = list.filter(t => types.indexOf(t.type) !== -1);
  }
  list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)));
  return limit ? list.slice(0, limit) : list;
}

// ==================== TRANSACTIONS: WRITE (Quản lý / Nhân viên) ====================

/**
 * Sinh ID giao dịch duy nhất. `seq` (tùy chọn) là số thứ tự dòng trong cùng một lần lưu hàng
 * loạt (Nhập kho/Xuất hàng nhiều mặt hàng, Kiểm kê nhiều dòng) — BẮT BUỘC truyền vào khi gọi
 * hàm này lặp lại trong một vòng lặp, để đảm bảo không trùng ID cho dù vòng lặp chạy nhanh tới
 * mức nhiều lần gọi rơi vào cùng một mili-giây.
 * (Trước đây chỉ có 2 chữ số ngẫu nhiên cuối — 90 khả năng — nên 2 dòng trong cùng một đơn có
 * thể bị trùng ID_GiaoDich khi được lưu cùng lúc; đã vá bằng cách tăng độ ngẫu nhiên lên 6 chữ
 * số VÀ luôn gắn thêm số thứ tự `seq` khi sinh ID cho nhiều dòng trong cùng một lần lưu.)
 */
function generateTransactionId_(seq) {
  const stamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMddHHmmssSSS');
  const rand = Math.floor(Math.random() * 900000 + 100000);
  const suffix = (seq === undefined || seq === null) ? '' : ('_' + seq);
  return 'GD' + stamp + rand + suffix;
}

/** Validate header (shared) fields of a Nhập kho / Xuất hàng order. */
function validateBatchHeader_(data) {
  const errors = [];
  if (TRANSACTION_TYPES.indexOf(data.type) === -1) errors.push('Loại giao dịch không hợp lệ: ' + data.type);
  if (!data.date) errors.push('Thiếu Ngày.');
  if (!data.coSo) errors.push('Thiếu Cơ sở.');
  return errors;
}

/** Validate one line item within a Nhập kho / Xuất hàng order. requireExpiry: Nhập kho bắt
 *  buộc Hạn sử dụng; Xuất hàng thì Hạn sử dụng đi kèm theo lô đã chọn nên không bắt buộc riêng.
 *  Một dòng cần MỘT trong hai: item.total (Nhập kho — nhập Thành tiền, hệ thống tự suy ra Đơn
 *  giá) hoặc item.unitPrice (Xuất hàng — lấy theo lô đã chọn). */
function validateBatchItem_(item, requireExpiry) {
  const errors = [];
  if (!item.itemName) errors.push('thiếu Tên hàng hóa');
  if (!item.category) errors.push('thiếu Phân loại hàng hóa');
  if (!item.unit) errors.push('thiếu Đơn vị tính');
  if (isNaN(Number(item.qty)) || Number(item.qty) <= 0) errors.push('Số lượng phải là số dương');
  const hasTotal = item.total !== undefined && item.total !== null && item.total !== '';
  if (hasTotal) {
    if (isNaN(Number(item.total)) || Number(item.total) < 0) errors.push('Thành tiền không hợp lệ');
  } else if (isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
    errors.push('Đơn giá không hợp lệ');
  }
  if (requireExpiry && !item.hanSuDung) errors.push('thiếu Hạn sử dụng');
  return errors;
}

function getOrCreateAttachmentFolder_() {
  const it = DriveApp.getFoldersByName(ATTACHMENT_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(ATTACHMENT_FOLDER_NAME);
}

/** attachment: {filename, mimeType, base64} — lưu vào Drive, trả về URL xem file. */
function saveAttachment_(transactionId, attachment) {
  if (!attachment || !attachment.base64) return '';
  const approxBytes = attachment.base64.length * 0.75;
  if (approxBytes > ATTACHMENT_MAX_BYTES) {
    throw new Error('File đính kèm vượt quá giới hạn 8MB.');
  }
  const bytes = Utilities.base64Decode(attachment.base64);
  const blob = Utilities.newBlob(bytes, attachment.mimeType || 'application/octet-stream',
    (transactionId + '_' + (attachment.filename || 'dexuat')));
  const file = getOrCreateAttachmentFolder_().createFile(blob);
  file.setDescription('Đề xuất xuất hàng đã ký - Giao dịch ' + transactionId);
  return file.getUrl();
}

/**
 * Ghi một "đơn" Nhập kho hoặc Xuất hàng gồm nhiều mặt hàng (mỗi mặt hàng vẫn là một dòng
 * riêng trong Data_NhapXuat, cùng chia sẻ một DonId để truy vết). Quản lý/Nhân viên.
 * File đề xuất đã ký cho đơn Xuất là TÙY CHỌN (không bắt buộc).
 * Xuất hủy/Xuất chuyển được ghi ở trạng thái "Chờ duyệt" — chưa tính vào báo cáo cho tới khi
 * Quản lý duyệt qua approveTransaction() (duyệt từng dòng).
 * @param {Object} data {type, date, coSo, note, attachment, items:[{itemName, category,
 *   costType, qty, unit, unitPrice|total, hanSuDung, loNhapId}, ...]}
 *   Mỗi item cần MỘT trong hai: total (Nhập kho — Đơn giá = ceil(total/qty)) hoặc unitPrice
 *   (Xuất hàng — lấy theo lô đã chọn, total = ceil(qty*unitPrice)).
 */
function addTransactionBatch(token, data) {
  const user = requireAuth_(token, ['Quản lý', 'Nhân viên']);
  data = data || {};
  const headerErrors = validateBatchHeader_(data);
  if (headerErrors.length) throw new Error(headerErrors.join(' '));

  const items = data.items || [];
  if (!items.length) throw new Error('Đơn chưa có mặt hàng nào.');

  const isExport = EXPORT_TYPES.indexOf(data.type) !== -1;
  const requireExpiry = data.type === 'Nhập kho';
  items.forEach((item, i) => {
    const errors = validateBatchItem_(item, requireExpiry);
    if (errors.length) throw new Error('Dòng ' + (i + 1) + ' (' + (item.itemName || '?') + '): ' + errors.join(', ') + '.');
  });

  const donId = generateTransactionId_();
  const attachmentUrl = (isExport && data.attachment && data.attachment.base64) ? saveAttachment_(donId, data.attachment) : '';
  const approvalStatus = APPROVAL_REQUIRED_TYPES.indexOf(data.type) !== -1 ? 'Chờ duyệt' : 'Đã duyệt';
  const date = parseFlexibleDate_(data.date);

  const results = [];
  const rows = items.map((item, i) => {
    const id = generateTransactionId_(i);
    const qty = Number(item.qty);
    const hasTotal = item.total !== undefined && item.total !== null && item.total !== '';
    let unitPrice, total;
    if (hasTotal) {
      total = ceilCurrency_(item.total);
      unitPrice = qty > 0 ? Math.ceil(total / qty) : 0;
    } else {
      unitPrice = Number(item.unitPrice);
      total = ceilCurrency_(qty * unitPrice);
    }
    results.push({ id: id, itemName: item.itemName, total: total });
    return [
      id, date, data.type, item.itemName,
      item.category || '', item.costType || '', qty, unitPrice, total, data.note || '',
      user.hoTen, attachmentUrl, approvalStatus, '', '', data.coSo || '',
      item.unit || '', item.hanSuDung ? parseFlexibleDate_(item.hanSuDung) : '', item.loNhapId || '',
      donId
    ];
  });

  const sh = getOrCreateTransactionSheet_();
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, TRANSACTION_HEADERS.length).setValues(rows);

  const grandTotal = results.reduce((s, r) => s + r.total, 0);
  return { success: true, donId: donId, count: rows.length, grandTotal: grandTotal, approvalStatus: approvalStatus, items: results };
}

function parseFlexibleDate_(s) {
  if (s instanceof Date) return s;
  if (!s) return null;
  const str = String(s).trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // yyyy-mm-dd
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/mm/yyyy
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); // dd-mm-yyyy
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// ==================== SỬA PHIẾU NHẬP KHO (Nhân viên yêu cầu → Quản lý duyệt) ====================

function generateEditRequestId_() {
  const stamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMddHHmmssSSS');
  return 'YC' + stamp + Math.floor(Math.random() * 900000 + 100000);
}

/** Áp dụng các trường đã sửa vào đúng dòng Data_NhapXuat có ID_GiaoDich = transactionId. */
function applyTransactionEdit_(transactionId, fields) {
  const sh = getOrCreateTransactionSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy phiếu nhập kho.');
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex(r => r[0] === transactionId);
  if (rowIndex === -1) throw new Error('Không tìm thấy phiếu nhập kho "' + transactionId + '".');
  const sheetRow = rowIndex + 2;
  // Cột: 4 TenHangHoa, 5 PhanLoaiHangHoa, 6 PhanLoaiChiPhi, 7 SoLuong, 8 DonGia, 9 ThanhTien,
  // 10 GhiChu — rồi 17 DonVi, 18 HanSuDung (không đổi Cơ sở/Ngày/Người tạo khi sửa).
  sh.getRange(sheetRow, 4, 1, 7).setValues([[
    fields.itemName, fields.category, fields.costType, fields.qty, fields.unitPrice, fields.total, fields.note || ''
  ]]);
  sh.getRange(sheetRow, 17, 1, 2).setValues([[fields.unit, parseFlexibleDate_(fields.hanSuDung)]]);
  return sheetRow;
}

/**
 * Yêu cầu sửa một phiếu Nhập kho đã ghi nhận. Quản lý sửa thì áp dụng ngay (tự duyệt — vẫn ghi
 * lại một dòng lịch sử "Đã duyệt" để truy vết ai đã sửa gì); Nhân viên sửa thì chỉ tạo yêu cầu
 * "Chờ duyệt", đợi một tài khoản Quản lý xác nhận mới thực sự áp dụng vào Data_NhapXuat.
 * newValues: {itemName, category, costType, qty, unit, total, hanSuDung, note}
 */
function requestEditNhapKho(token, transactionId, newValues, reason) {
  const user = requireAuth_(token, ['Quản lý', 'Nhân viên']);
  if (!transactionId) throw new Error('Thiếu ID phiếu nhập kho.');
  if (!reason || !String(reason).trim()) throw new Error('Vui lòng nhập Lý do sửa.');

  const original = getAllTransactions_().find(t => t.id === transactionId);
  if (!original) throw new Error('Không tìm thấy phiếu nhập kho "' + transactionId + '".');
  if (original.type !== 'Nhập kho') throw new Error('Chỉ có thể sửa phiếu Nhập kho.');

  const errors = validateBatchItem_(newValues, true);
  if (errors.length) throw new Error('Dữ liệu sửa không hợp lệ: ' + errors.join('; '));

  const qty = Number(newValues.qty);
  const total = ceilCurrency_(newValues.total);
  const unitPrice = qty > 0 ? Math.ceil(total / qty) : 0;
  const fields = {
    itemName: newValues.itemName, category: newValues.category, costType: newValues.costType,
    qty: qty, unitPrice: unitPrice, total: total, unit: newValues.unit,
    hanSuDung: newValues.hanSuDung, note: newValues.note || ''
  };

  const sh = getOrCreateEditRequestSheet_();
  const now = new Date();
  const isManager = user.phanQuyen === 'Quản lý';

  if (isManager) {
    applyTransactionEdit_(transactionId, fields);
  }

  sh.getRange(sh.getLastRow() + 1, 1, 1, SUANHAPKHO_HEADERS.length).setValues([[
    generateEditRequestId_(), transactionId, now, original.coSo, fields.itemName, fields.category,
    fields.costType, fields.qty, fields.unit, fields.total, fields.unitPrice,
    fields.hanSuDung ? parseFlexibleDate_(fields.hanSuDung) : '', fields.note, String(reason).trim(),
    user.hoTen, isManager ? 'Đã duyệt' : 'Chờ duyệt', isManager ? user.hoTen : '', isManager ? now : ''
  ]]);

  return { success: true, applied: isManager };
}

/** Danh sách yêu cầu sửa Nhập kho đang "Chờ duyệt" (chỉ Quản lý). */
function getPendingEditRequests(token) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateEditRequestSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, SUANHAPKHO_HEADERS.length).getValues();
  return values.filter(r => r[0] !== '' && r[15] === 'Chờ duyệt').map(rowToEditRequest_).sort((a, b) => a.id < b.id ? 1 : -1);
}

function rowToEditRequest_(row) {
  return {
    id: row[0], transactionId: row[1], requestDate: formatDate_(row[2]), coSo: row[3],
    itemName: row[4], category: row[5], costType: row[6], qty: Number(row[7]) || 0,
    unit: row[8], total: Number(row[9]) || 0, unitPrice: Number(row[10]) || 0,
    hanSuDung: row[11] ? formatDate_(row[11]) : '', note: row[12] || '', reason: row[13] || '',
    requestedBy: row[14] || '', status: row[15] || '', approvedBy: row[16] || '',
    approvedDate: row[17] ? formatDate_(row[17]) : ''
  };
}

/** decision: 'Đã duyệt' | 'Từ chối'. Chỉ Quản lý. Duyệt thì áp dụng thay đổi vào Data_NhapXuat. */
function approveEditNhapKho(token, requestId, decision, note) {
  const manager = requireAuth_(token, ['Quản lý']);
  if (['Đã duyệt', 'Từ chối'].indexOf(decision) === -1) throw new Error('Quyết định duyệt không hợp lệ.');

  const sh = getOrCreateEditRequestSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy yêu cầu sửa.');
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex(r => r[0] === requestId);
  if (rowIndex === -1) throw new Error('Không tìm thấy yêu cầu sửa "' + requestId + '".');

  const sheetRow = rowIndex + 2;
  const currentStatus = sh.getRange(sheetRow, 16).getValue();
  if (currentStatus !== 'Chờ duyệt') throw new Error('Yêu cầu này đã được xử lý trước đó (' + currentStatus + ').');

  if (decision === 'Đã duyệt') {
    const r = sh.getRange(sheetRow, 1, 1, SUANHAPKHO_HEADERS.length).getValues()[0];
    const req = rowToEditRequest_(r);
    applyTransactionEdit_(req.transactionId, {
      itemName: req.itemName, category: req.category, costType: req.costType, qty: req.qty,
      unitPrice: req.unitPrice, total: req.total, unit: req.unit, hanSuDung: req.hanSuDung, note: req.note
    });
  }

  const ghiChuDuyet = note ? (sh.getRange(sheetRow, 13).getValue() + ' | Duyệt: ' + note) : sh.getRange(sheetRow, 13).getValue();
  sh.getRange(sheetRow, 13).setValue(ghiChuDuyet);
  sh.getRange(sheetRow, 16, 1, 3).setValues([[decision, manager.hoTen, new Date()]]);

  return { success: true, id: requestId, decision: decision };
}

// ==================== SỬA PHIẾU XUẤT HÀNG (Nhân viên yêu cầu → Quản lý duyệt) ====================
// Cùng cơ chế với Sửa phiếu nhập kho ở trên (dùng chung applyTransactionEdit_/rowToEditRequest_/
// generateEditRequestId_ vì Data_NhapXuat có cùng cấu trúc cột cho cả Nhập kho lẫn Xuất hàng),
// nhưng lưu vào sheet riêng YeuCauSuaXuatHang để không lẫn với yêu cầu sửa Nhập kho.

function getOrCreateXuatHangEditRequestSheet_() {
  const ss = getSs_();
  let sh = ss.getSheetByName(SHEET_SUAXUATHANG);
  if (!sh) sh = ss.insertSheet(SHEET_SUAXUATHANG);
  if (sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, SUANHAPKHO_HEADERS.length).setValues([SUANHAPKHO_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Yêu cầu sửa một phiếu Xuất hàng đã ghi nhận (Xuất sử dụng/Xuất hủy/Xuất chuyển). Quản lý sửa
 * thì áp dụng ngay (tự duyệt); Nhân viên sửa thì chỉ tạo yêu cầu "Chờ duyệt".
 * newValues: {itemName, category, costType, qty, unit, total, hanSuDung, note} — total ở đây là
 * Giá trị (Thành tiền) của dòng Xuất, giống Thành tiền của Nhập kho.
 */
function requestEditXuatHang(token, transactionId, newValues, reason) {
  const user = requireAuth_(token, ['Quản lý', 'Nhân viên']);
  if (!transactionId) throw new Error('Thiếu ID phiếu xuất hàng.');
  if (!reason || !String(reason).trim()) throw new Error('Vui lòng nhập Lý do sửa.');

  const original = getAllTransactions_().find(t => t.id === transactionId);
  if (!original) throw new Error('Không tìm thấy phiếu xuất hàng "' + transactionId + '".');
  if (EXPORT_TYPES.indexOf(original.type) === -1) throw new Error('Chỉ có thể sửa phiếu Xuất hàng.');

  const errors = validateBatchItem_(newValues, false);
  if (errors.length) throw new Error('Dữ liệu sửa không hợp lệ: ' + errors.join('; '));

  const qty = Number(newValues.qty);
  const total = ceilCurrency_(newValues.total);
  const unitPrice = qty > 0 ? Math.ceil(total / qty) : 0;
  const fields = {
    itemName: newValues.itemName, category: newValues.category, costType: newValues.costType,
    qty: qty, unitPrice: unitPrice, total: total, unit: newValues.unit,
    hanSuDung: newValues.hanSuDung, note: newValues.note || ''
  };

  const sh = getOrCreateXuatHangEditRequestSheet_();
  const now = new Date();
  const isManager = user.phanQuyen === 'Quản lý';

  if (isManager) {
    applyTransactionEdit_(transactionId, fields);
  }

  sh.getRange(sh.getLastRow() + 1, 1, 1, SUANHAPKHO_HEADERS.length).setValues([[
    generateEditRequestId_(), transactionId, now, original.coSo, fields.itemName, fields.category,
    fields.costType, fields.qty, fields.unit, fields.total, fields.unitPrice,
    fields.hanSuDung ? parseFlexibleDate_(fields.hanSuDung) : '', fields.note, String(reason).trim(),
    user.hoTen, isManager ? 'Đã duyệt' : 'Chờ duyệt', isManager ? user.hoTen : '', isManager ? now : ''
  ]]);

  return { success: true, applied: isManager };
}

/** Danh sách yêu cầu sửa Xuất hàng đang "Chờ duyệt" (chỉ Quản lý). */
function getPendingEditRequestsXuatHang(token) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateXuatHangEditRequestSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, SUANHAPKHO_HEADERS.length).getValues();
  return values.filter(r => r[0] !== '' && r[15] === 'Chờ duyệt').map(rowToEditRequest_).sort((a, b) => a.id < b.id ? 1 : -1);
}

/** decision: 'Đã duyệt' | 'Từ chối'. Chỉ Quản lý. Duyệt thì áp dụng thay đổi vào Data_NhapXuat. */
function approveEditXuatHang(token, requestId, decision, note) {
  const manager = requireAuth_(token, ['Quản lý']);
  if (['Đã duyệt', 'Từ chối'].indexOf(decision) === -1) throw new Error('Quyết định duyệt không hợp lệ.');

  const sh = getOrCreateXuatHangEditRequestSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy yêu cầu sửa.');
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex(r => r[0] === requestId);
  if (rowIndex === -1) throw new Error('Không tìm thấy yêu cầu sửa "' + requestId + '".');

  const sheetRow = rowIndex + 2;
  const currentStatus = sh.getRange(sheetRow, 16).getValue();
  if (currentStatus !== 'Chờ duyệt') throw new Error('Yêu cầu này đã được xử lý trước đó (' + currentStatus + ').');

  if (decision === 'Đã duyệt') {
    const r = sh.getRange(sheetRow, 1, 1, SUANHAPKHO_HEADERS.length).getValues()[0];
    const req = rowToEditRequest_(r);
    applyTransactionEdit_(req.transactionId, {
      itemName: req.itemName, category: req.category, costType: req.costType, qty: req.qty,
      unitPrice: req.unitPrice, total: req.total, unit: req.unit, hanSuDung: req.hanSuDung, note: req.note
    });
  }

  const ghiChuDuyet = note ? (sh.getRange(sheetRow, 13).getValue() + ' | Duyệt: ' + note) : sh.getRange(sheetRow, 13).getValue();
  sh.getRange(sheetRow, 13).setValue(ghiChuDuyet);
  sh.getRange(sheetRow, 16, 1, 3).setValues([[decision, manager.hoTen, new Date()]]);

  return { success: true, id: requestId, decision: decision };
}

// ==================== LÔ HÀNG / FEFO (mọi vai trò đã đăng nhập) ====================

/**
 * Danh sách MỌI lô Nhập kho còn tồn kho (SL còn lại > 0), lọc theo Cơ sở nếu chọn — dùng để
 * đổ vào dropdown "Mặt hàng / Lô hàng" trên form Xuất hàng (thay cho gõ tay Tên hàng hóa).
 * Số lượng còn lại của một lô = SL nhập - tổng SL đã xuất (đã duyệt) có LoNhapId trỏ về lô
 * đó. Sắp xếp theo Tên hàng hóa rồi theo Hạn sử dụng tăng dần (gần hết hạn lên trước — FEFO);
 * lô không khai báo Hạn sử dụng (dữ liệu cũ) xếp sau cùng trong nhóm cùng tên hàng.
 * Lô chưa gán Cơ sở (dữ liệu cũ) luôn hiển thị bất kể đang lọc theo Cơ sở nào.
 */
function getAvailableLotsForFacility(token, coSo) {
  requireAuth_(token, null);
  const all = getAllTransactions_();
  const lots = all.filter(t => t.type === 'Nhập kho' && (!coSo || t.coSo === coSo || !t.coSo));
  if (!lots.length) return [];

  const consumedByLot = {};
  all.filter(t => t.type !== 'Nhập kho' && t.loNhapId && isReportable_(t)).forEach(t => {
    consumedByLot[t.loNhapId] = (consumedByLot[t.loNhapId] || 0) + t.qty;
  });

  return lots
    .map(lot => ({
      id: lot.id,
      itemName: lot.itemName,
      category: lot.category,
      costType: lot.costType,
      unit: lot.unit,
      unitPrice: lot.unitPrice,
      hanSuDung: lot.hanSuDung,
      coSo: lot.coSo,
      remainingQty: Math.round((lot.qty - (consumedByLot[lot.id] || 0)) * 1e6) / 1e6
    }))
    .filter(l => l.remainingQty > 0)
    .sort((a, b) => {
      if (a.itemName !== b.itemName) return a.itemName.localeCompare(b.itemName, 'vi');
      const ea = a.hanSuDung || '9999-12-31', eb = b.hanSuDung || '9999-12-31';
      return ea < eb ? -1 : ea > eb ? 1 : 0;
    });
}

// ==================== APPROVALS (chỉ Quản lý) ====================

/** Danh sách các yêu cầu Xuất hủy/Xuất chuyển đang "Chờ duyệt". */
function getPendingApprovals(token) {
  requireAuth_(token, ['Quản lý']);
  return getAllTransactions_()
    .filter(t => APPROVAL_REQUIRED_TYPES.indexOf(t.type) !== -1 && t.approvalStatus === 'Chờ duyệt')
    .sort((a, b) => (a.id < b.id ? 1 : -1));
}

/** decision: 'Đã duyệt' | 'Từ chối'. Chỉ Quản lý. */
function approveTransaction(token, id, decision, note) {
  const manager = requireAuth_(token, ['Quản lý']);
  if (['Đã duyệt', 'Từ chối'].indexOf(decision) === -1) throw new Error('Quyết định duyệt không hợp lệ.');

  const sh = getOrCreateTransactionSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy giao dịch.');
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex(r => r[0] === id);
  if (rowIndex === -1) throw new Error('Không tìm thấy giao dịch "' + id + '".');

  const sheetRow = rowIndex + 2;
  const currentStatus = sh.getRange(sheetRow, 13).getValue();
  if (currentStatus !== 'Chờ duyệt') throw new Error('Giao dịch này đã được xử lý trước đó (' + currentStatus + ').');

  const ghiChuDuyet = note ? (sh.getRange(sheetRow, 10).getValue() + ' | Duyệt: ' + note) : sh.getRange(sheetRow, 10).getValue();
  sh.getRange(sheetRow, 10).setValue(ghiChuDuyet);
  sh.getRange(sheetRow, 13, 1, 3).setValues([[decision, manager.hoTen, new Date()]]);

  return { success: true, id: id, decision: decision };
}

// ==================== KIỂM KÊ (Quản lý/Nhân viên nộp; chỉ Quản lý duyệt) ====================

/**
 * Tồn kho hệ thống hiện tại theo từng mặt hàng tại một Cơ sở, tính đến hết `dateStr` (mặc
 * định hôm nay) — dùng để đối chiếu khi lập báo cáo kiểm kê. Chỉ tính giao dịch đã ghi nhận
 * chính thức (isReportable_).
 */
function getStockLevels(token, coSo, dateStr) {
  requireAuth_(token, null);
  coSo = String(coSo || '').trim();
  if (!coSo) return [];
  const asOf = dateStr ? formatDate_(parseFlexibleDate_(dateStr)) : Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');

  const all = getAllTransactions_().filter(t =>
    (t.coSo === coSo || !t.coSo) && t.date <= asOf && isReportable_(t)
  );
  const groups = {}; // itemName -> {category, unit, qty, lastDate}
  all.forEach(t => {
    if (!groups[t.itemName]) groups[t.itemName] = { itemName: t.itemName, category: '', unit: '', qty: 0, lastDate: '' };
    const g = groups[t.itemName];
    g.qty += (t.type === 'Nhập kho' ? t.qty : -t.qty);
    if (t.date >= g.lastDate) { g.category = t.category || g.category; g.unit = t.unit || g.unit; g.lastDate = t.date; }
  });

  return Object.values(groups)
    .map(g => ({ itemName: g.itemName, category: g.category, unit: g.unit, systemQty: round2_(g.qty) }))
    .filter(g => g.systemQty > 0) // mặt hàng đã hết tồn (= 0) không đưa vào danh sách để kiểm kê
    .sort((a, b) => a.itemName.localeCompare(b.itemName, 'vi'));
}

function getActiveManagerEmails_() {
  return listUsersRaw_()
    .filter(u => u.phanQuyen === 'Quản lý' && u.tinhTrang === 'Hoạt động')
    .map(u => u.email)
    .filter(Boolean);
}

function sendKiemKeNotification_(donKiemKeId, submitter, coSo, date, items) {
  const managers = getActiveManagerEmails_();
  if (!managers.length) return;
  const url = ScriptApp.getService().getUrl();
  const variances = items.filter(it => Number(it.chenhLech) !== 0);
  const lines = items.map(it =>
    '- ' + it.itemName + ': hệ thống ' + it.soLuongHeThong + ', thực tế ' + it.soLuongThucTe +
    ', chênh lệch ' + (it.chenhLech > 0 ? '+' : '') + it.chenhLech +
    (it.lyDo ? ' | Lý do: ' + it.lyDo : '') + (it.phuongAn ? ' | Phương án: ' + it.phuongAn : '')
  );
  const subject = 'Báo cáo kiểm kê chờ duyệt - ' + coSo + ' (' + date + ')' +
    (variances.length ? ' - ' + variances.length + ' mặt hàng chênh lệch' : '');
  const body =
    submitter + ' vừa nộp báo cáo kiểm kê tại "' + coSo + '" ngày ' + date + ' (' + items.length + ' mặt hàng, ' +
    variances.length + ' mặt hàng có chênh lệch), đang chờ Quản lý duyệt.\n\n' +
    lines.join('\n') + '\n\n' +
    'Vào ứng dụng để xem chi tiết và duyệt: ' + url + '\nMã đợt kiểm kê: ' + donKiemKeId;
  managers.forEach(email => {
    try { MailApp.sendEmail(email, subject, body); } catch (e) { Logger.log('Không gửi được email kiểm kê tới ' + email + ': ' + e.message); }
  });
}

/**
 * Nộp báo cáo kiểm kê gồm nhiều mặt hàng. Mặt hàng nào có chênh lệch (thực tế ≠ hệ thống) bắt
 * buộc phải có Lý do và Phương án xử lý. Toàn bộ đợt kiểm kê được ghi ở trạng thái "Chờ duyệt"
 * và gửi email thông báo cho các tài khoản Quản lý đang hoạt động. Quản lý/Nhân viên.
 * @param {Object} header {date, coSo, note}
 * @param {Object[]} items [{itemName, category, unit, systemQty, actualQty, reason, plan}]
 */
function submitKiemKe(token, header, items) {
  const user = requireAuth_(token, ['Quản lý', 'Nhân viên']);
  header = header || {};
  if (!header.date) throw new Error('Thiếu Ngày kiểm kê.');
  if (!header.coSo) throw new Error('Thiếu Cơ sở.');
  items = items || [];
  if (!items.length) throw new Error('Đợt kiểm kê chưa có mặt hàng nào.');

  items.forEach((it, i) => {
    if (!it.itemName) throw new Error('Dòng ' + (i + 1) + ': thiếu Tên hàng hóa.');
    if (isNaN(Number(it.actualQty))) throw new Error('Dòng ' + (i + 1) + ' (' + it.itemName + '): Số lượng thực tế không hợp lệ.');
    const chenhLech = round2_(Number(it.actualQty) - Number(it.systemQty || 0));
    if (chenhLech !== 0 && (!it.reason || !String(it.reason).trim())) {
      throw new Error('Dòng ' + (i + 1) + ' (' + it.itemName + '): có chênh lệch, bắt buộc nhập Lý do.');
    }
    if (chenhLech !== 0 && (!it.plan || !String(it.plan).trim())) {
      throw new Error('Dòng ' + (i + 1) + ' (' + it.itemName + '): có chênh lệch, bắt buộc nhập Phương án xử lý.');
    }
  });

  const donKiemKeId = generateTransactionId_();
  const date = parseFlexibleDate_(header.date);
  const rows = [];
  const emailItems = [];
  items.forEach((it, i) => {
    const id = generateTransactionId_(i);
    const systemQty = round2_(Number(it.systemQty) || 0);
    const actualQty = round2_(Number(it.actualQty));
    const chenhLech = round2_(actualQty - systemQty);
    rows.push([
      id, donKiemKeId, date, header.coSo, it.itemName, it.category || '', it.unit || '',
      systemQty, actualQty, chenhLech, it.reason || '', it.plan || '', header.note || '',
      user.hoTen, 'Chờ duyệt', '', ''
    ]);
    emailItems.push({ itemName: it.itemName, soLuongHeThong: systemQty, soLuongThucTe: actualQty, chenhLech: chenhLech, lyDo: it.reason || '', phuongAn: it.plan || '' });
  });

  const sh = getOrCreateKiemKeSheet_();
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, KIEMKE_HEADERS.length).setValues(rows);

  let emailSent = false, emailError = '';
  try { sendKiemKeNotification_(donKiemKeId, user.hoTen, header.coSo, formatDate_(date), emailItems); emailSent = true; }
  catch (e) { emailError = e.message; }

  return { success: true, donKiemKeId: donKiemKeId, count: rows.length, emailSent: emailSent, emailError: emailError };
}

function rowToKiemKe_(row) {
  return {
    id: row[0], donKiemKeId: row[1], date: formatDate_(row[2]), coSo: row[3],
    itemName: row[4], category: row[5], unit: row[6],
    systemQty: Number(row[7]) || 0, actualQty: Number(row[8]) || 0, variance: Number(row[9]) || 0,
    reason: row[10] || '', plan: row[11] || '', note: row[12] || '',
    createdBy: row[13] || '', status: row[14] || '',
    approvedBy: row[15] || '', approvedDate: row[16] ? formatDate_(row[16]) : ''
  };
}

function getAllKiemKe_() {
  const sh = getOrCreateKiemKeSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, KIEMKE_HEADERS.length).getValues();
  return values.filter(r => r[0] !== '').map(rowToKiemKe_);
}

/** Lịch sử kiểm kê gần đây (mọi vai trò đã đăng nhập đều xem được). */
function getKiemKeHistory(token, limit) {
  requireAuth_(token, null);
  const list = getAllKiemKe_().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)));
  return limit ? list.slice(0, limit) : list;
}

/** Các đợt kiểm kê đang "Chờ duyệt". Chỉ Quản lý. */
function getPendingKiemKe(token) {
  requireAuth_(token, ['Quản lý']);
  return getAllKiemKe_()
    .filter(r => r.status === 'Chờ duyệt')
    .sort((a, b) => (a.donKiemKeId < b.donKiemKeId ? 1 : -1));
}

/** Duyệt/Từ chối TOÀN BỘ các dòng thuộc một đợt kiểm kê (donKiemKeId) cùng lúc. Chỉ Quản lý.
 *  Lưu ý: duyệt kiểm kê chỉ xác nhận đã xem xét/ghi nhận chênh lệch — KHÔNG tự động tạo giao
 *  dịch điều chỉnh Nhập/Xuất trong Data_NhapXuat; nếu cần sửa lại số tồn trong hệ thống, hãy
 *  lập phiếu Nhập kho/Xuất hủy thủ công và ghi chú tham chiếu mã đợt kiểm kê. */
function approveKiemKe(token, donKiemKeId, decision, note) {
  const manager = requireAuth_(token, ['Quản lý']);
  if (['Đã duyệt', 'Từ chối'].indexOf(decision) === -1) throw new Error('Quyết định duyệt không hợp lệ.');

  const sh = getOrCreateKiemKeSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy đợt kiểm kê.');
  const values = sh.getRange(2, 1, lastRow - 1, KIEMKE_HEADERS.length).getValues();
  let changed = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i][1] !== donKiemKeId) continue;
    if (values[i][14] !== 'Chờ duyệt') continue;
    const sheetRow = i + 2;
    if (note) sh.getRange(sheetRow, 13).setValue((values[i][12] || '') + ' | Duyệt: ' + note);
    sh.getRange(sheetRow, 15, 1, 3).setValues([[decision, manager.hoTen, new Date()]]);
    changed++;
  }
  if (!changed) throw new Error('Đợt kiểm kê "' + donKiemKeId + '" không có dòng nào đang chờ duyệt.');
  return { success: true, donKiemKeId: donKiemKeId, decision: decision, count: changed };
}

// ==================== HÓA ĐƠN (Danh sách hóa đơn — dán CSV import; đối chiếu Nhập kho) ====================

/** Cùng lý do cần `seq` như generateTransactionId_ — xem chú thích ở đó. */
function generateHoaDonId_(seq) {
  const stamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMddHHmmssSSS');
  const rand = Math.floor(Math.random() * 900000 + 100000);
  const suffix = (seq === undefined || seq === null) ? '' : ('_' + seq);
  return 'HD' + stamp + rand + suffix;
}

function rowToHoaDon_(row) {
  return {
    id: row[0], ngayXuatHD: formatDate_(row[1]), tenNguoiBan: row[2] || '', soHoaDon: row[3] || '',
    thanhTienSauThue: Number(row[4]) || 0, maTraCuu: row[5] || '', trangTraCuu: row[6] || '',
    nguoiTao: row[7] || '', ngayTao: row[8] ? formatDate_(row[8]) : '',
    coSo: row[9] || '', phanLoaiChiPhi: row[10] || ''
  };
}

/**
 * Nhập một loạt hóa đơn đã dán vào (đã parse ở client). coSo/phanLoaiChiPhi dùng chung cho cả
 * đợt dán (giống Cơ sở/Ngày ở form Nhập kho). Mỗi item: {thanhTien, tenNguoiBan, soHoaDon,
 * maTraCuu, trangTraCuu, ngayXuatHD}. Ghi thẳng vào hệ thống (không qua bước duyệt).
 */
function importHoaDonBatch(token, coSo, phanLoaiChiPhi, items) {
  const user = requireAuth_(token, ['Quản lý', 'Nhân viên']);
  coSo = String(coSo || '').trim();
  phanLoaiChiPhi = String(phanLoaiChiPhi || '').trim();
  if (!coSo) throw new Error('Vui lòng chọn Cơ sở.');
  if (!phanLoaiChiPhi) throw new Error('Vui lòng chọn Phân loại chi phí.');
  if (getFacilities().indexOf(coSo) === -1) throw new Error('Cơ sở "' + coSo + '" không tồn tại.');
  if (getCostTypes().indexOf(phanLoaiChiPhi) === -1) throw new Error('Phân loại chi phí "' + phanLoaiChiPhi + '" không tồn tại.');
  if (!items || !items.length) throw new Error('Không có hóa đơn nào để nhập.');

  const now = new Date();
  const rows = items.map((it, i) => {
    const lineNo = i + 1;
    const thanhTien = Number(it.thanhTien);
    if (isNaN(thanhTien) || thanhTien < 0) throw new Error('Dòng ' + lineNo + ': Thành tiền sau thuế không hợp lệ.');
    if (!it.tenNguoiBan) throw new Error('Dòng ' + lineNo + ': thiếu Tên người bán.');
    if (!it.ngayXuatHD) throw new Error('Dòng ' + lineNo + ': thiếu Ngày xuất HĐ.');
    const ngay = parseFlexibleDate_(it.ngayXuatHD);
    if (!ngay) throw new Error('Dòng ' + lineNo + ': Ngày xuất HĐ không hợp lệ ("' + it.ngayXuatHD + '").');
    return [
      generateHoaDonId_(i), ngay, it.tenNguoiBan, it.soHoaDon || '', ceilCurrency_(thanhTien),
      it.maTraCuu || '', it.trangTraCuu || '', user.hoTen, now, coSo, phanLoaiChiPhi
    ];
  });

  const sh = getOrCreateHoaDonSheet_();
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HOADON_HEADERS.length).setValues(rows);

  const grandTotal = rows.reduce((s, r) => s + r[4], 0);
  return { success: true, count: rows.length, grandTotal: grandTotal };
}

/** Toàn bộ danh sách hóa đơn (mọi vai trò đã đăng nhập đều xem được — lọc theo Ngày/Người bán ở client). */
function getHoaDonList(token) {
  requireAuth_(token, null);
  const sh = getOrCreateHoaDonSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, HOADON_HEADERS.length).getValues();
  return values.filter(r => r[0] !== '').map(rowToHoaDon_)
    .sort((a, b) => (a.ngayXuatHD < b.ngayXuatHD ? 1 : a.ngayXuatHD > b.ngayXuatHD ? -1 : (a.id < b.id ? 1 : -1)));
}

/** Xóa một hóa đơn nhập nhầm. Chỉ Quản lý. */
function deleteHoaDon(token, id) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateHoaDonSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy hóa đơn.');
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex(r => r[0] === id);
  if (rowIndex === -1) throw new Error('Không tìm thấy hóa đơn "' + id + '".');
  sh.deleteRow(rowIndex + 2);
  return { success: true };
}

// ==================== SỬA HÓA ĐƠN (Nhân viên yêu cầu → Quản lý duyệt) ====================

/** Áp dụng các trường đã sửa vào đúng dòng HoaDon có ID_HoaDon = hoaDonId. */
function applyHoaDonEdit_(hoaDonId, fields) {
  const sh = getOrCreateHoaDonSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy hóa đơn.');
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex(r => r[0] === hoaDonId);
  if (rowIndex === -1) throw new Error('Không tìm thấy hóa đơn "' + hoaDonId + '".');
  const sheetRow = rowIndex + 2;
  // Cột: 2 NgayXuatHD, 3 TenNguoiBan, 4 SoHoaDon, 5 ThanhTienSauThue, 6 MaTraCuu, 7 TrangTraCuu
  // — rồi 10 CoSo, 11 PhanLoaiChiPhi (không đổi NguoiTao/NgayTao khi sửa).
  sh.getRange(sheetRow, 2, 1, 6).setValues([[
    fields.ngayXuatHD, fields.tenNguoiBan, fields.soHoaDon || '', fields.thanhTienSauThue,
    fields.maTraCuu || '', fields.trangTraCuu || ''
  ]]);
  sh.getRange(sheetRow, 10, 1, 2).setValues([[fields.coSo, fields.phanLoaiChiPhi]]);
  return sheetRow;
}

function rowToHoaDonEditRequest_(row) {
  return {
    id: row[0], hoaDonId: row[1], requestDate: formatDate_(row[2]), ngayXuatHD: formatDate_(row[3]),
    tenNguoiBan: row[4] || '', soHoaDon: row[5] || '', thanhTienSauThue: Number(row[6]) || 0,
    maTraCuu: row[7] || '', trangTraCuu: row[8] || '', coSo: row[9] || '', phanLoaiChiPhi: row[10] || '',
    reason: row[11] || '', requestedBy: row[12] || '', status: row[13] || '',
    approvedBy: row[14] || '', approvedDate: row[15] ? formatDate_(row[15]) : ''
  };
}

/**
 * Yêu cầu sửa một hóa đơn đã nhập. Quản lý sửa thì áp dụng ngay (tự duyệt); Nhân viên sửa thì
 * chỉ tạo yêu cầu "Chờ duyệt", đợi một tài khoản Quản lý xác nhận mới thực sự áp dụng.
 * newValues: {ngayXuatHD, tenNguoiBan, soHoaDon, thanhTienSauThue, maTraCuu, trangTraCuu, coSo, phanLoaiChiPhi}
 */
function requestEditHoaDon(token, hoaDonId, newValues, reason) {
  const user = requireAuth_(token, ['Quản lý', 'Nhân viên']);
  if (!hoaDonId) throw new Error('Thiếu ID hóa đơn.');
  if (!reason || !String(reason).trim()) throw new Error('Vui lòng nhập Lý do sửa.');

  const thanhTien = Number(newValues.thanhTienSauThue);
  if (isNaN(thanhTien) || thanhTien < 0) throw new Error('Thành tiền sau thuế không hợp lệ.');
  const tenNguoiBan = String(newValues.tenNguoiBan || '').trim();
  if (!tenNguoiBan) throw new Error('Vui lòng nhập Tên người bán.');
  const ngay = parseFlexibleDate_(newValues.ngayXuatHD);
  if (!ngay) throw new Error('Ngày xuất HĐ không hợp lệ.');
  const coSo = String(newValues.coSo || '').trim();
  const phanLoaiChiPhi = String(newValues.phanLoaiChiPhi || '').trim();
  if (!coSo) throw new Error('Vui lòng chọn Cơ sở.');
  if (!phanLoaiChiPhi) throw new Error('Vui lòng chọn Phân loại chi phí.');
  if (getFacilities().indexOf(coSo) === -1) throw new Error('Cơ sở "' + coSo + '" không tồn tại.');
  if (getCostTypes().indexOf(phanLoaiChiPhi) === -1) throw new Error('Phân loại chi phí "' + phanLoaiChiPhi + '" không tồn tại.');

  const original = getHoaDonList(token).find(h => h.id === hoaDonId);
  if (!original) throw new Error('Không tìm thấy hóa đơn "' + hoaDonId + '".');

  const fields = {
    ngayXuatHD: newValues.ngayXuatHD, tenNguoiBan: tenNguoiBan, soHoaDon: newValues.soHoaDon || '',
    thanhTienSauThue: ceilCurrency_(thanhTien), maTraCuu: newValues.maTraCuu || '',
    trangTraCuu: newValues.trangTraCuu || '', coSo: coSo, phanLoaiChiPhi: phanLoaiChiPhi
  };

  const sh = getOrCreateHoaDonEditRequestSheet_();
  const now = new Date();
  const isManager = user.phanQuyen === 'Quản lý';

  if (isManager) {
    applyHoaDonEdit_(hoaDonId, fields);
  }

  sh.getRange(sh.getLastRow() + 1, 1, 1, SUAHOADON_HEADERS.length).setValues([[
    generateEditRequestId_(), hoaDonId, now, ngay, fields.tenNguoiBan, fields.soHoaDon,
    fields.thanhTienSauThue, fields.maTraCuu, fields.trangTraCuu, fields.coSo, fields.phanLoaiChiPhi,
    String(reason).trim(), user.hoTen, isManager ? 'Đã duyệt' : 'Chờ duyệt',
    isManager ? user.hoTen : '', isManager ? now : ''
  ]]);

  return { success: true, applied: isManager };
}

/** Danh sách yêu cầu sửa hóa đơn đang "Chờ duyệt" (chỉ Quản lý). */
function getPendingHoaDonEditRequests(token) {
  requireAuth_(token, ['Quản lý']);
  const sh = getOrCreateHoaDonEditRequestSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, SUAHOADON_HEADERS.length).getValues();
  return values.filter(r => r[0] !== '' && r[13] === 'Chờ duyệt').map(rowToHoaDonEditRequest_).sort((a, b) => a.id < b.id ? 1 : -1);
}

/** decision: 'Đã duyệt' | 'Từ chối'. Chỉ Quản lý. Duyệt thì áp dụng thay đổi vào HoaDon. */
function approveHoaDonEdit(token, requestId, decision, note) {
  const manager = requireAuth_(token, ['Quản lý']);
  if (['Đã duyệt', 'Từ chối'].indexOf(decision) === -1) throw new Error('Quyết định duyệt không hợp lệ.');

  const sh = getOrCreateHoaDonEditRequestSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Không tìm thấy yêu cầu sửa.');
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex(r => r[0] === requestId);
  if (rowIndex === -1) throw new Error('Không tìm thấy yêu cầu sửa "' + requestId + '".');

  const sheetRow = rowIndex + 2;
  const currentStatus = sh.getRange(sheetRow, 14).getValue();
  if (currentStatus !== 'Chờ duyệt') throw new Error('Yêu cầu này đã được xử lý trước đó (' + currentStatus + ').');

  if (decision === 'Đã duyệt') {
    const r = sh.getRange(sheetRow, 1, 1, SUAHOADON_HEADERS.length).getValues()[0];
    const req = rowToHoaDonEditRequest_(r);
    applyHoaDonEdit_(req.hoaDonId, {
      ngayXuatHD: req.ngayXuatHD, tenNguoiBan: req.tenNguoiBan, soHoaDon: req.soHoaDon,
      thanhTienSauThue: req.thanhTienSauThue, maTraCuu: req.maTraCuu, trangTraCuu: req.trangTraCuu,
      coSo: req.coSo, phanLoaiChiPhi: req.phanLoaiChiPhi
    });
  }

  sh.getRange(sheetRow, 14, 1, 3).setValues([[decision, manager.hoTen, new Date()]]);
  if (note) sh.getRange(sheetRow, 12).setValue(sh.getRange(sheetRow, 12).getValue() + ' | Duyệt: ' + note);

  return { success: true, id: requestId, decision: decision };
}

// ==================== DASHBOARD ====================

function getDateRangeForPeriod_(period, customStart, customEnd) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let start, end;
  switch (period) {
    case 'thisWeek': {
      const day = now.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
      const diffToMonday = (day === 0 ? -6 : 1 - day); // quy về Thứ 2 đầu tuần (quy ước VN)
      start = new Date(y, m, now.getDate() + diffToMonday);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      break;
    }
    case 'thisMonth':
      start = new Date(y, m, 1); end = new Date(y, m + 1, 0);
      break;
    case 'thisQuarter': {
      const q = Math.floor(m / 3);
      start = new Date(y, q * 3, 1); end = new Date(y, q * 3 + 3, 0);
      break;
    }
    case 'thisYear':
      start = new Date(y, 0, 1); end = new Date(y, 11, 31);
      break;
    case 'custom':
      start = parseFlexibleDate_(customStart) || new Date(y, m, 1);
      end = parseFlexibleDate_(customEnd) || now;
      break;
    default:
      start = new Date(y, m, 1); end = new Date(y, m + 1, 0);
  }
  return {
    start: Utilities.formatDate(start, TIMEZONE, 'yyyy-MM-dd'),
    end: Utilities.formatDate(end, TIMEZONE, 'yyyy-MM-dd')
  };
}

function monthsBetween_(startStr, endStr) {
  const s = new Date(startStr), e = new Date(endStr);
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  return Math.max(1, months);
}

/**
 * Main dashboard payload: KPI cards + both charts, respecting Parameters filters.
 * Mọi vai trò đã đăng nhập đều xem được (Người xem chỉ xem, không sửa).
 * @param {Object} filters {period, startDate, endDate, category, costType}
 */
function getDashboardData(token, filters) {
  requireAuth_(token, null);
  filters = filters || {};
  const range = getDateRangeForPeriod_(filters.period || 'thisMonth', filters.startDate, filters.endDate);
  const all = getAllTransactions_();

  const matchesFilter = (t) =>
    t.date >= range.start && t.date <= range.end &&
    (!filters.category || t.category === filters.category) &&
    (!filters.costType || t.costType === filters.costType) &&
    (!filters.facility || t.coSo === filters.facility);

  const inRange = all.filter(matchesFilter).filter(isReportable_);
  const expenses = inRange.filter(t => EXPENSE_TYPES.indexOf(t.type) !== -1);

  const totalCost = expenses.reduce((s, t) => s + t.total, 0);

  // Budget: sum across NganSach rows matching the selected Cơ sở (or all facilities, when
  // "Tất cả" is chosen) and cost type (when chosen).
  const budgetRows = getBudgetRows_().filter(b =>
    (!filters.facility || b.coSo === filters.facility) &&
    (!filters.costType || b.name === filters.costType)
  );
  const budget = budgetRows.reduce((s, b) => s + budgetAmountForPeriod_(b, filters, range), 0);

  // Cost by category (bar chart)
  const byCategory = {};
  expenses.forEach(t => { byCategory[t.category || 'Khác'] = (byCategory[t.category || 'Khác'] || 0) + t.total; });
  const costByCategory = Object.keys(byCategory).map(k => ({ label: k, value: byCategory[k] }))
    .sort((a, b) => b.value - a.value);

  // Chi phí thực tế vs Ngân sách theo Phân loại chi phí (biểu đồ so sánh trên Dashboard).
  const spendByCostType = {};
  expenses.forEach(t => { const k = t.costType || 'Khác'; spendByCostType[k] = (spendByCostType[k] || 0) + t.total; });
  const budgetByCostTypeMap = {};
  budgetRows.forEach(b => {
    const k = b.name || 'Khác';
    budgetByCostTypeMap[k] = (budgetByCostTypeMap[k] || 0) + budgetAmountForPeriod_(b, filters, range);
  });
  const costTypeKeys = Array.from(new Set(Object.keys(spendByCostType).concat(Object.keys(budgetByCostTypeMap))));
  const budgetByCostType = costTypeKeys
    .map(k => ({ label: k, spend: spendByCostType[k] || 0, budget: budgetByCostTypeMap[k] || 0 }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

  // Top spending items
  const byItem = {};
  expenses.forEach(t => { byItem[t.itemName] = (byItem[t.itemName] || 0) + t.total; });
  const topItems = Object.keys(byItem).map(k => ({ name: k, value: byItem[k] }))
    .sort((a, b) => b.value - a.value).slice(0, 5);

  // Cost over time - fixed last 30 days window (still honors category/costType filters)
  const today = new Date();
  const start30 = new Date(today); start30.setDate(start30.getDate() - 29);
  const start30Str = Utilities.formatDate(start30, TIMEZONE, 'yyyy-MM-dd');
  const today30Str = Utilities.formatDate(today, TIMEZONE, 'yyyy-MM-dd');

  const last30 = all.filter(t =>
    EXPENSE_TYPES.indexOf(t.type) !== -1 &&
    t.date >= start30Str && t.date <= today30Str &&
    (!filters.category || t.category === filters.category) &&
    (!filters.costType || t.costType === filters.costType) &&
    (!filters.facility || t.coSo === filters.facility)
  );
  const byDay = {};
  last30.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.total; });
  const costOverTime = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start30); d.setDate(d.getDate() + i);
    const key = Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
    costOverTime.push({ date: key, value: byDay[key] || 0 });
  }

  const pendingApprovalsCount = all.filter(t => APPROVAL_REQUIRED_TYPES.indexOf(t.type) !== -1 && t.approvalStatus === 'Chờ duyệt').length;

  return {
    range: range,
    totalCost: totalCost,
    budget: budget,
    budgetRemaining: budget - totalCost,
    transactionCount: inRange.length,
    topItems: topItems,
    costByCategory: costByCategory,
    costByCostTypeVsBudget: budgetByCostType,
    costOverTime: costOverTime,
    pendingApprovalsCount: pendingApprovalsCount
  };
}

/** Quy đổi Ngân sách/Tháng + Ngân sách/Năm của một dòng NganSach về đúng số tiền áp dụng cho
 *  khoảng thời gian filters.period đang chọn (dùng chung cho tổng ngân sách và ngân sách theo
 *  từng Phân loại chi phí). */
function budgetAmountForPeriod_(budgetRow, filters, range) {
  if (filters.period === 'thisYear') return budgetRow.budgetYear;
  if (filters.period === 'thisQuarter') return budgetRow.budgetMonth * 3;
  if (filters.period === 'thisWeek') return budgetRow.budgetWeek;
  if (filters.period === 'custom') return budgetRow.budgetMonth * monthsBetween_(range.start, range.end);
  return budgetRow.budgetMonth;
}

/**
 * Báo cáo Xuất - Nhập - Tồn: với mỗi (Cơ sở, Tên hàng hóa), tính Tồn đầu kỳ / Nhập trong kỳ /
 * Xuất trong kỳ (đã duyệt) / Tồn cuối kỳ, đơn giá bình quân gia quyền (từ toàn bộ Nhập kho
 * tính đến hết ngày cuối kỳ) và giá trị tồn kho = Tồn cuối kỳ × đơn giá bình quân.
 * Khoảng thời gian và bộ lọc Cơ sở/Phân loại dùng chung với Fields Parameters của Dashboard
 * (period: thisMonth/thisQuarter/thisYear/custom).
 */
function getInventoryReport(token, filters) {
  requireAuth_(token, null);
  filters = filters || {};
  const range = getDateRangeForPeriod_(filters.period || 'thisMonth', filters.startDate, filters.endDate);

  const all = getAllTransactions_()
    .filter(t => (!filters.category || t.category === filters.category))
    .filter(t => (!filters.costType || t.costType === filters.costType))
    .filter(t => (!filters.facility || t.coSo === filters.facility))
    .filter(isReportable_); // chỉ tính giao dịch đã ghi nhận chính thức

  const groups = {}; // key: coSo + '||' + itemName
  all.forEach(t => {
    if (t.date > range.end) return; // giao dịch sau kỳ báo cáo không ảnh hưởng số liệu
    const key = (t.coSo || '') + '||' + t.itemName;
    if (!groups[key]) {
      groups[key] = {
        coSo: t.coSo || '', itemName: t.itemName, unit: '', unitDate: '',
        openInQty: 0, openOutQty: 0, periodInQty: 0, periodOutQty: 0,
        upToEndInQty: 0, upToEndInAmount: 0
      };
    }
    const g = groups[key];
    const isIn = t.type === 'Nhập kho';

    if (isIn) { g.upToEndInQty += t.qty; g.upToEndInAmount += t.total; }

    if (t.date < range.start) {
      if (isIn) g.openInQty += t.qty; else g.openOutQty += t.qty;
    } else {
      if (isIn) g.periodInQty += t.qty; else g.periodOutQty += t.qty;
    }
    if (t.unit && t.date >= g.unitDate) { g.unit = t.unit; g.unitDate = t.date; }
  });

  let rows = Object.keys(groups).map(key => {
    const g = groups[key];
    const openingQty = g.openInQty - g.openOutQty;
    const closingQty = openingQty + g.periodInQty - g.periodOutQty;
    const avgUnitCost = g.upToEndInQty > 0 ? g.upToEndInAmount / g.upToEndInQty : 0;
    return {
      // round3_ (không phải round2_) để giữ đúng số lượng thật — một số mặt hàng nhập/xuất có
      // đơn vị lẻ tới 3 chữ số thập phân (vd. 1.234 kg), làm tròn 2 số sẽ sai lệch số liệu.
      coSo: g.coSo, itemName: g.itemName, unit: g.unit,
      openingQty: round3_(openingQty), inQty: round3_(g.periodInQty), outQty: round3_(g.periodOutQty),
      closingQty: round3_(closingQty), avgUnitCost: avgUnitCost, closingValue: closingQty * avgUnitCost
    };
  }).filter(r => r.openingQty !== 0 || r.inQty !== 0 || r.outQty !== 0 || r.closingQty !== 0)
    .sort((a, b) => a.coSo === b.coSo ? a.itemName.localeCompare(b.itemName, 'vi') : a.coSo.localeCompare(b.coSo, 'vi'));

  // Lọc "chỉ hiện mặt hàng còn tồn cuối kỳ" (Tồn cuối kỳ ≠ 0) nếu người dùng bật tùy chọn này
  // trên Dashboard — áp dụng TRƯỚC khi tính tổng để thẻ tổng hợp khớp với bảng đang hiển thị.
  if (filters.onlyInStock) rows = rows.filter(r => r.closingQty !== 0);

  const totalClosingValue = rows.reduce((s, r) => s + r.closingValue, 0);

  return { range: range, rows: rows, totalClosingValue: totalClosingValue, itemCount: rows.length };
}

function round2_(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function round3_(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

// ==================== EXPORT EXCEL (Nhập kho / Xuất kho / Báo cáo Xuất-Nhập-Tồn) ====================

/**
 * Dựng file .xlsx từ một header + ma trận dữ liệu bằng cách tạo tạm một Google Sheet, đổ dữ
 * liệu vào, xuất qua endpoint export của Sheets rồi xóa file tạm — cách này không cần thêm thư
 * viện ngoài, chỉ dùng các dịch vụ Apps Script sẵn có (SpreadsheetApp/DriveApp/UrlFetchApp).
 * @returns {string} nội dung file .xlsx dạng base64
 */
function buildExcelBase64_(sheetTitle, headers, rows) {
  const ss = SpreadsheetApp.create('export_tmp_' + Utilities.getUuid());
  try {
    const sheet = ss.getSheets()[0];
    sheet.setName(String(sheetTitle).substring(0, 100));
    if (headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    }
    if (rows.length) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    if (headers.length) sheet.autoResizeColumns(1, headers.length);
    SpreadsheetApp.flush();
    const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
    const resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) {
      throw new Error('Không tạo được file Excel (mã lỗi ' + resp.getResponseCode() + ').');
    }
    return Utilities.base64Encode(resp.getBlob().getBytes());
  } finally {
    DriveApp.getFileById(ss.getId()).setTrashed(true);
  }
}

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Xuất toàn bộ lịch sử Nhập kho ra file Excel. */
function exportNhapKhoExcel(token) {
  requireAuth_(token, null);
  const headers = ['ID', 'Ngày', 'Cơ sở', 'Tên hàng', 'Phân loại', 'Chi phí', 'SL', 'ĐVT', 'Đơn giá', 'Thành tiền', 'Hạn sử dụng', 'Người tạo', 'Ghi chú'];
  const list = getTransactions(token, null, ['Nhập kho']);
  const rows = list.map(t => [t.id, fmtDateDisplay_(t.date), t.coSo, t.itemName, t.category, t.costType, t.qty, t.unit, t.unitPrice, t.total, fmtDateDisplay_(t.hanSuDung), t.createdBy, t.note]);
  return {
    base64: buildExcelBase64_('Nhập kho', headers, rows),
    filename: 'NhapKho_' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd_HHmmss') + '.xlsx',
    mimeType: EXCEL_MIME_TYPE
  };
}

/** Xuất toàn bộ lịch sử Xuất hàng (cả 3 loại) ra file Excel. */
function exportXuatKhoExcel(token) {
  requireAuth_(token, null);
  const headers = ['ID', 'Ngày', 'Cơ sở', 'Loại', 'Tên hàng', 'Phân loại', 'SL', 'ĐVT', 'Hạn sử dụng', 'Đơn giá', 'Giá trị', 'Người tạo', 'File đề xuất', 'Trạng thái', 'Người duyệt', 'Ghi chú'];
  const list = getTransactions(token, null, ['Xuất sử dụng', 'Xuất hủy', 'Xuất chuyển']);
  const rows = list.map(t => [t.id, fmtDateDisplay_(t.date), t.coSo, t.type, t.itemName, t.category, t.qty, t.unit, fmtDateDisplay_(t.hanSuDung), t.unitPrice, t.total, t.createdBy, t.attachmentUrl || '', t.approvalStatus, t.approvedBy, t.note]);
  return {
    base64: buildExcelBase64_('Xuất kho', headers, rows),
    filename: 'XuatKho_' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd_HHmmss') + '.xlsx',
    mimeType: EXCEL_MIME_TYPE
  };
}

/** Xuất Báo cáo Xuất - Nhập - Tồn (theo cùng bộ lọc Fields Parameters đang áp dụng) ra Excel. */
function exportInventoryReportExcel(token, filters) {
  requireAuth_(token, null);
  const report = getInventoryReport(token, filters);
  const headers = ['Cơ sở', 'Tên hàng', 'ĐVT', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ', 'Đơn giá BQ', 'Giá trị tồn kho'];
  const rows = report.rows.map(r => [r.coSo, r.itemName, r.unit, r.openingQty, r.inQty, r.outQty, r.closingQty, Math.round(r.avgUnitCost), Math.round(r.closingValue)]);
  return {
    base64: buildExcelBase64_('Xuat-Nhap-Ton', headers, rows),
    filename: 'BaoCaoXuatNhapTon_' + report.range.start + '_' + report.range.end + '.xlsx',
    mimeType: EXCEL_MIME_TYPE
  };
}

/**
 * Xuất một bảng dữ liệu bất kỳ đã chuẩn bị sẵn ở client ra Excel — dùng cho các bảng NHÁP chưa
 * có RPC lấy dữ liệu riêng phía server (vd. phiếu kiểm kê đang lập, chưa bấm Nộp). Không giới
 * hạn vai trò cụ thể vì bản thân dữ liệu đến từ client, giống các nút Xuất Excel khác.
 */
function exportGenericExcel(token, sheetTitle, headers, rows, filename) {
  requireAuth_(token, null);
  return {
    base64: buildExcelBase64_(sheetTitle, headers, rows),
    filename: filename || (String(sheetTitle).replace(/[^A-Za-z0-9_-]+/g, '_') + '_' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd_HHmmss') + '.xlsx'),
    mimeType: EXCEL_MIME_TYPE
  };
}
