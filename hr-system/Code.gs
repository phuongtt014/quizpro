// ============================================================
// CODE.GS — HR System v4
// - Tất cả trường là custom fields (có thể ẩn/hiện, chỉnh sửa)
// - Import cấu hình dạng danh sách (mỗi dòng 1 giá trị)
// - Tab Chi tiết hợp đồng (lưu nhiều HĐ/phụ lục)
// - Tab Phát triển bản thân (lưu nhiều năm)
// ============================================================

// ── SHEET NAMES ──────────────────────────────────────────────
const SN = {
  EMPLOYEES:   'NhanSu',
  CONFIG:      'CauHinh',
  FIELDS:      'TruongHoSo',
  CONTRACTS:   'HopDong',
  CONTRACT_FIELDS: 'TruongHopDong',
  SELFDEV:     'PhatTrienBanThan',
  SELFDEV_FIELDS:  'TruongPhatTrien',
  POLICY:      'ChinhSach',        // NEW: cấu hình chính sách / mức thưởng
  PROPOSALS:   'DeXuat',           // NEW: đề xuất
  PROPOSAL_TYPES: 'LoaiDeXuat',    // NEW: loại đề xuất + trường tùy chọn
  LOG:         'NhatKy'
};

// ── SECTIONS trong form hồ sơ ────────────────────────────────
const FORM_SECTIONS = [
  { key:'toChuc',    label:'🏢 Thông Tin Tổ Chức' },
  { key:'caNhan',    label:'👤 Thông Tin Cá Nhân' },
  { key:'giayTo',    label:'🪪 Giấy Tờ Tùy Thân' },
  { key:'lienHe',    label:'📞 Liên Hệ & Chức Vụ' },
  { key:'hopDong',   label:'💼 Hợp Đồng & Ngân Hàng' },
  { key:'trangThai', label:'📋 Trạng Thái & Quản Lý' },
];

// ── DEFAULT FIELDS (seed lần đầu) ────────────────────────────
const DEFAULT_FIELDS = [
  // key, label, type, cfgKey, section, required, order
  ['maNV',         'Mã Nhân Viên',            'text',     '',             'toChuc',    true,  1],
  ['maNVGoc',      'Mã NV Gốc',               'text',     '',             'toChuc',    false, 2],
  ['phanLoaiHD',   'Phân Loại Hợp Đồng',      'dropdown', 'hopDong',      'toChuc',    true,  2],
  ['phapNhanChinh','Pháp Nhân Chính',          'dropdown', 'phapNhanChinh','toChuc',    false, 3],
  ['phapNhanPhu',  'Pháp Nhân Phụ',            'dropdown', 'phapNhanPhu',  'toChuc',    false, 4],
  ['maDonVi',      'Mã Đơn Vị',               'text',     '',             'toChuc',    false, 5],
  ['donVi',        'Đơn Vị',                  'dropdown', 'donVi',        'toChuc',    false, 6],
  ['boPhan',       'Bộ Phận',                 'text',     '',             'toChuc',    false, 7],
  ['capBac',       'Phân Loại Cấp Bậc',       'dropdown', 'capBac',       'toChuc',    false, 8],
  ['donViPhong',   'Đơn Vị Phòng',            'text',     '',             'toChuc',    false, 9],
  ['boPhancT',     'Bộ Phận Chi Tiết',        'text',     '',             'toChuc',    false, 10],
  ['coSo',         'Cơ Sở',                   'dropdown', 'coSo',         'toChuc',    false, 11],
  ['hoTen',        'Họ Tên',                  'text',     '',             'caNhan',    true,  12],
  ['chucVuChinh',  'Chức Vụ Chính',           'dropdown', 'chucVuChinh',  'caNhan',    false, 13],
  ['chucVuKiem',   'Chức Vụ Kiêm Nhiệm',      'text',     '',             'caNhan',    false, 14],
  ['ngayBoNhiem',  'Ngày Bổ Nhiệm',           'date',     '',             'caNhan',    false, 15],
  ['chucDanhBHXH', 'Chức Danh BHXH',          'text',     '',             'caNhan',    false, 16],
  ['gioiTinh',     'Giới Tính',               'dropdown', 'gioiTinh',     'caNhan',    true,  17],
  ['ngaySinh',     'Ngày Sinh',               'date',     '',             'caNhan',    false, 18],
  ['quocTich',     'Quốc Tịch',               'dropdown', 'quocTich',     'caNhan',    false, 19],
  ['noiSinh',      'Nơi Sinh',                'text',     '',             'caNhan',    false, 20],
  ['nguyenQuan',   'Nguyên Quán',             'text',     '',             'caNhan',    false, 21],
  ['danToc',       'Dân Tộc',                 'dropdown', 'danToc',       'caNhan',    false, 22],
  ['tonGiao',      'Tôn Giáo',                'dropdown', 'tonGiao',      'caNhan',    false, 23],
  ['soCMND',       'Số CMND/CCCD/Passport',   'text',     '',             'giayTo',    false, 24],
  ['ngayCap',      'Ngày Cấp',                'date',     '',             'giayTo',    false, 25],
  ['noiCap',       'Nơi Cấp',                 'text',     '',             'giayTo',    false, 26],
  ['diaChiTT',     'Địa Chỉ Thường Trú',      'textarea', '',             'giayTo',    false, 27],
  ['diaChiTam',    'Địa Chỉ Tạm Trú',         'textarea', '',             'giayTo',    false, 28],
  ['soDT',         'Số Điện Thoại',            'tel',      '',             'lienHe',    false, 29],
  ['emailCN',      'Email Cá Nhân',            'email',    '',             'lienHe',    false, 30],
  ['emailCT',      'Email Công Ty',            'email',    '',             'lienHe',    false, 31],
  ['ngayVaoLam',   'Ngày Vào Làm',             'date',     '',             'hopDong',   false, 32],
  ['ngayVaoLamTT', 'Ngày Vào Làm Thực Tế',    'date',     '',             'hopDong',   false, 33],
  ['soTKNH',       'Số Tài Khoản NH',          'text',     '',             'hopDong',   false, 33],
  ['nganHang',     'Tên Ngân Hàng',            'dropdown', 'nganHang',     'hopDong',   false, 34],
  ['chiNhanhNH',   'Chi Nhánh NH',             'text',     '',             'hopDong',   false, 35],
  ['maSoThue',     'Mã Số Thuế',               'text',     '',             'hopDong',   false, 36],
  ['maSoBHXH',     'Mã Số BHXH',               'text',     '',             'hopDong',   false, 37],
  ['noiKCB',       'Nơi ĐKKCB',                'dropdown', 'noiKCB',       'hopDong',   false, 38],
  ['trangThai',    'Trạng Thái',               'dropdown', 'trangThai',    'trangThai', true,  39],
  ['nsQuanLy',     'Nhân Sự Quản Lý',          'text',     '',             'trangThai', false, 40],
  ['nguoiPheDuyetHS','Người Phê Duyệt Hồ Sơ',  'dropdown', 'nguoiPheDuyetHS','trangThai',false,41],
  ['ghiChu',       'Ghi Chú',                  'textarea', '',             'trangThai', false, 42],
];

// DEFAULT CONFIG VALUES
const DEFAULT_CONFIG = [
  ['Phân Loại Hợp Đồng','hopDong',['Hợp đồng xác định thời hạn','Hợp đồng không xác định thời hạn','Hợp đồng thử việc','Hợp đồng thời vụ','Cộng tác viên']],
  ['Pháp Nhân Chính','phapNhanChinh',['Trường THPT A','Trường THCS B','Trường Tiểu học C','Phòng GD&ĐT']],
  ['Pháp Nhân Phụ','phapNhanPhu',['Không','Trung tâm ngoại ngữ','CLB Thể thao','Nhà văn hóa']],
  ['Phân Loại Cấp Bậc','capBac',['Ban Giám Hiệu','Tổ Trưởng','Giáo Viên','Nhân Viên','Bảo Vệ','Phục Vụ']],
  ['Cơ Sở','coSo',['Cơ sở 1','Cơ sở 2','Cơ sở 3','Cơ sở 4']],
  ['Chức Vụ Chính','chucVuChinh',['Hiệu Trưởng','Phó Hiệu Trưởng','Tổ Trưởng','Tổ Phó','Giáo Viên','Chuyên Viên','Nhân Viên','Kế Toán','Thủ Quỹ','Y Tế','Bảo Vệ']],
  ['Giới Tính','gioiTinh',['Nam','Nữ','Khác']],
  ['Quốc Tịch','quocTich',['Việt Nam','Nước ngoài']],
  ['Dân Tộc','danToc',['Kinh','Tày','Thái','Mường','Khmer','Hoa','Nùng','HMông','Dao','Gia Rai','Ê Đê','Ba Na','Sán Chay','Chăm','Cờ Ho']],
  ['Tôn Giáo','tonGiao',['Không','Phật Giáo','Công Giáo','Tin Lành','Hòa Hảo','Cao Đài','Hồi Giáo','Khác']],
  ['Tên Ngân Hàng','nganHang',['Vietcombank','VietinBank','BIDV','Agribank','Techcombank','MB Bank','VPBank','TPBank','ACB','Sacombank','HDBank','SHB']],
  ['Trạng Thái','trangThai',['Đang làm việc','Nghỉ việc','Không hưởng lương','Thai sản','Tạm ngưng']],
  // Người phê duyệt hồ sơ — điền email, lấy qua lookup khi gửi đề xuất
  ['Người Phê Duyệt Hồ Sơ','nguoiPheDuyetHS',[
    'Không có',
  ]],
  ['Đơn Vị','donVi',['Phòng Hành Chính','Phòng Kế Toán','Phòng Đào Tạo','Tổ Văn','Tổ Toán','Tổ Lý','Tổ Hóa','Tổ Sinh','Tổ Sử','Tổ Địa','Tổ GDCD','Tổ Anh Văn','Ban Giám Hiệu']],
  ['Nơi ĐKKCB','noiKCB',['BV Chợ Rẫy','BV Bạch Mai','BV Nhi Đồng 1','BV Nhi Đồng 2','BV Từ Dũ','BV Nhân Dân 115','BV Quận 1','Trạm Y Tế Phường/Xã']],
  // Config cho hợp đồng
  ['Loại Hợp Đồng/PL','loaiHopDong',['Hợp đồng lao động','Phụ lục hợp đồng','Hợp đồng thử việc','Biên bản thanh lý']],
  ['Hình Thức Ký','hinhThucKy',['Ký tay','Chữ ký số','Ký điện tử']],
  // Config cho phát triển bản thân
  ['Loại Bằng Cấp','loaiBangCap',['Đại học','Cao đẳng','Trung cấp','Thạc sĩ','Tiến sĩ','Chứng chỉ nghề','Chứng chỉ ngoại ngữ','Chứng chỉ tin học']],
  ['Xếp Loại','xepLoai',['Xuất sắc','Giỏi','Khá','Trung bình khá','Trung bình']],
  ['Cơ Sở Đào Tạo','coSoDaoTao',['Đại học Quốc gia HCM','Đại học Sư Phạm','Đại học Kinh tế','Đại học Bách Khoa','Khác']],
];

// DEFAULT CONTRACT FIELDS
const DEFAULT_CONTRACT_FIELDS = [
  ['soHD',        'Số HĐ/Phụ Lục',     'text',     '',             true,  1],
  ['loaiHD',      'Loại HĐ/Phụ Lục',   'dropdown', 'loaiHopDong',  true,  2],
  ['ngayKy',      'Ngày Ký',            'date',     '',             true,  3],
  ['ngayHL',      'Ngày Hiệu Lực',      'date',     '',             false, 4],
  ['ngayHH',      'Ngày Hết Hạn',       'date',     '',             false, 5],
  ['hinhThucKy',  'Hình Thức Ký',       'dropdown', 'hinhThucKy',   false, 6],
  ['luong',       'Mức Lương',          'number',   '',             false, 7],
  ['ghiChuHD',    'Ghi Chú HĐ',         'textarea', '',             false, 8],
];

// DEFAULT SELF-DEV FIELDS
const DEFAULT_SELFDEV_FIELDS = [
  ['loaiBang',    'Loại Bằng/Chứng Chỉ','dropdown', 'loaiBangCap',  true,  1],
  ['tenBang',     'Tên Bằng/Chứng Chỉ', 'text',     '',             true,  2],
  ['ngayCap',     'Ngày Cấp',           'date',     '',             true,  3],
  ['coSoDaoTao',  'Cơ Sở Đào Tạo',      'dropdown', 'coSoDaoTao',   false, 4],
  ['chuyenNganh', 'Chuyên Ngành',        'text',     '',             false, 5],
  ['xepLoai',     'Xếp Loại',           'dropdown', 'xepLoai',      false, 6],
  ['ghiChuPT',    'Ghi Chú',            'textarea', '',             false, 7],
];

// ── WEB APP ───────────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Hệ Thống Quản Lý Nhân Sự v4')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width,initial-scale=1');
}

// ── DISPATCHER: điểm vào duy nhất cho mọi hàm cần xác thực ───
// Mỗi request từ client gửi kèm token → set vào _REQ_TOKEN_ trước khi gọi hàm thực
function dispatch(token, fnName, ...args) {
  try {
    // Set token của request này vào biến thread-local
    _setCurrentRequestToken_(token || '');

    // Danh sách hàm được phép gọi qua dispatch (whitelist)
    const ALLOWED = {
      // ── Auth & Session ─────────────────────────────────────
      getMyPermission, checkSession, logout, changePassword, resetPassword,

      // ── Config (danh mục dropdown) ─────────────────────────
      getConfigs, getConfigDetail, getConfigByKey,
      addConfigValue, deleteConfigRow, updateConfigRow,
      saveConfigValues, importConfigList,
      renameCategoryKey, deleteCategory, deletePlaceholder,
      getApproverList,

      // ── Fields (trường dữ liệu) ────────────────────────────
      getProfileFields, getContractFields, getSelfDevFields, getFormSections,
      saveField, toggleField, deleteField,

      // ── Employees ─────────────────────────────────────────
      getAllEmployees, getEmployeeById, getEmployee,
      addEmployee, updateEmployee, deleteEmployee,
      updateEmployeeStatus, checkEmployeeLocked,
      getEmployeeHistory, saveHistory, deleteHistory,
      submitUnlockRequest, processUnlockApproval,

      // ── Contracts ─────────────────────────────────────────
      getContracts, saveContract, deleteContract,
      importContracts, getContractImportHeaders, syncContractsToProfiles,
      getExpiringContracts, sendExpiryReminderEmail,

      // ── SelfDev ───────────────────────────────────────────
      getSelfDev, saveSelfDev, deleteSelfDev,
      importSelfDev, getSelfDevImportHeaders,

      // ── Import / Export ───────────────────────────────────
      importEmployees, getEmpImportHeaders, exportToSheet,

      // ── Dashboard & Reports ───────────────────────────────
      getDashboardStats, getIncomeByUnit,
      getPayrollReport, getSalaryReport,
      getCostReport, getHeadcountReport,

      // ── Approvals & Proposals ─────────────────────────────
      submitApproval, getApprovals, processApproval,
      getPolicies, savePolicy, deletePolicy,
      getPolicyGroups, getProposalTypes, saveProposalType, deleteProposalType,
      getProposals, saveProposal, deleteProposal, updateProposalStatus,
      saveBirthdayList, exportBirthdaySheet,

      // ── Dropdown Requests (DDR) ───────────────────────────
      submitDropdownRequest, getDropdownRequests,
      approveDropdownRequest, rejectDropdownRequest,

      // ── Users & Permissions ───────────────────────────────
      getUsers, saveUser, deleteUser,

      // ── Logs ──────────────────────────────────────────────
      getLogs,
    };

    if (!ALLOWED[fnName]) {
      return { success:false, error:'Hàm không được phép: ' + fnName };
    }

    return ALLOWED[fnName](...args);
  } catch(e) {
    Logger.log('dispatch error [' + fnName + ']: ' + e.message);
    return { success:false, error:e.message };
  } finally {
    // Reset token sau khi xử lý xong
    _setCurrentRequestToken_('');
  }
}

// ── SPREADSHEET ───────────────────────────────────────────────
const SSID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
function getSS() {
  if (SSID) return SpreadsheetApp.openById(SSID);
  try { return SpreadsheetApp.getActiveSpreadsheet(); }
  catch(e) { throw new Error('Chưa cấu hình SPREADSHEET_ID'); }
}
function setupSpreadsheetId() {
  const id = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
  Logger.log('✅ Saved: ' + id);
}
function getSheet(name) {
  const ss = getSS();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// ── SETUP ─────────────────────────────────────────────────────
function setupSheets() {
  _setupConfig();
  _setupFields(SN.FIELDS,       DEFAULT_FIELDS,          ['KEY','LABEL','TYPE','CFG_KEY','SECTION','REQUIRED','ACTIVE','ORDER','SPAN2'], 8);
  _setupFields(SN.CONTRACT_FIELDS, DEFAULT_CONTRACT_FIELDS, ['KEY','LABEL','TYPE','CFG_KEY','REQUIRED','ACTIVE','ORDER'], 5);
  _setupFields(SN.SELFDEV_FIELDS,  DEFAULT_SELFDEV_FIELDS,  ['KEY','LABEL','TYPE','CFG_KEY','REQUIRED','ACTIVE','ORDER'], 5);
  _ensureEmployeeSheet();
  _ensureSubSheet(SN.CONTRACTS,  ['_ID','MaNV','NgayTao','NgaySua']);
  _ensureSubSheet(SN.SELFDEV,    ['_ID','MaNV','NgayTao','NgaySua']);
  _ensurePolicySheet();
  _ensureProposalSheets();
  _ensureLogSheet();
  return { success:true, message:'Setup hoàn tất 11 sheet' };
}

function _setupConfig() {
  const s = getSheet(SN.CONFIG);
  if (s.getLastRow() > 0) return; // đã có dữ liệu
  s.appendRow(['KEY','LABEL','VALUE']);
  s.getRange(1,1,1,3).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
  DEFAULT_CONFIG.forEach(([label, key, vals]) => {
    vals.forEach(v => s.appendRow([key, label, v]));
  });
  s.setColumnWidth(1,140); s.setColumnWidth(2,160); s.setColumnWidth(3,300);
}

function _setupFields(sheetName, defaults, colHeaders, activeCol) {
  const s = getSheet(sheetName);
  if (s.getLastRow() > 0) return;
  s.appendRow(colHeaders);
  s.getRange(1,1,1,colHeaders.length).setBackground('#4a1a7a').setFontColor('#fff').setFontWeight('bold');
  defaults.forEach(row => {
    const fullRow = [...row];
    // Chèn ACTIVE=TRUE trước ORDER
    fullRow.splice(activeCol, 0, 'TRUE');
    s.appendRow(fullRow);
  });
}

function _ensureEmployeeSheet() {
  const s = getSheet(SN.EMPLOYEES);
  if (s.getLastRow() > 0) return;
  const fields = _getProfileFields();
  const headers = ['_RowID', ...fields.map(f=>f.label)];
  s.appendRow(headers);
  s.getRange(1,1,1,headers.length).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold').setFontSize(10);
  s.setFrozenRows(1);
}

function _ensureSubSheet(sheetName, extraCols) {
  const s = getSheet(sheetName);
  if (s.getLastRow() > 0) return;
  const fields = sheetName === SN.CONTRACTS ? _getContractFields() : _getSelfDevFields();
  const headers = [...extraCols, ...fields.map(f=>f.label)];
  s.appendRow(headers);
  s.getRange(1,1,1,headers.length).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
  s.setFrozenRows(1);
}

function _ensureLogSheet() {
  const s = getSheet(SN.LOG);
  if (s.getLastRow() > 0) return;
  s.appendRow(['Thời Gian','Hành Động','Mã NV','Người TH','Chi Tiết']);
  s.getRange(1,1,1,5).setBackground('#2d4a22').setFontColor('#fff').setFontWeight('bold');
}

// ── READ FIELDS ───────────────────────────────────────────────
function _readFieldSheet(sheetName) {
  const s = getSheet(sheetName);
  const data = s.getDataRange().getValues();
  if (data.length <= 1) return [];
  const h = data[0];
  return data.slice(1).map((r,i) => {
    const obj = { _rowIndex: i+2 };
    h.forEach((col,j) => obj[col.toLowerCase()] = r[j]);
    obj.active = String(obj.active).toUpperCase() === 'TRUE';
    obj.required = String(obj.required).toUpperCase() === 'TRUE';
    obj.order = Number(obj.order) || 0;
    return obj;
  }).sort((a,b) => a.order - b.order);
}

function _getProfileFields(activeOnly=true) {
  const all = _readFieldSheet(SN.FIELDS);
  return activeOnly ? all.filter(f=>f.active) : all;
}
function _getContractFields(activeOnly=true) {
  const all = _readFieldSheet(SN.CONTRACT_FIELDS);
  return activeOnly ? all.filter(f=>f.active) : all;
}
function _getSelfDevFields(activeOnly=true) {
  const all = _readFieldSheet(SN.SELFDEV_FIELDS);
  return activeOnly ? all.filter(f=>f.active) : all;
}

// ── API: GET FIELD DEFINITIONS ────────────────────────────────
function getProfileFields()  { try { return { success:true, data:_readFieldSheet(SN.FIELDS) }; } catch(e) { return {success:false,error:e.message}; } }
function getContractFields() { try { return { success:true, data:_readFieldSheet(SN.CONTRACT_FIELDS) }; } catch(e) { return {success:false,error:e.message}; } }
function getSelfDevFields()  { try { return { success:true, data:_readFieldSheet(SN.SELFDEV_FIELDS) }; } catch(e) { return {success:false,error:e.message}; } }
function getFormSections()   { return { success:true, data:FORM_SECTIONS }; }

// ── DEBUG: Chạy thủ công trong GAS Editor để kiểm tra ────────
// Dán tên cột cũ và mới vào rồi Run hàm này
function debugRenameCol() {
  const OLD_LABEL = 'Phân Loại Hợp Đồng'; // ← sửa thành tên cũ
  const NEW_LABEL = 'Phân Loại';           // ← sửa thành tên mới
  const result = _renameColHeader(SN.EMPLOYEES, OLD_LABEL, NEW_LABEL);
  Logger.log('Kết quả rename: ' + result);
  // In tất cả header hiện tại của sheet NhanSu
  const s = getSheet(SN.EMPLOYEES);
  if(s.getLastRow() > 0){
    const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    Logger.log('Headers hiện tại: ' + JSON.stringify(headers));
  }
}

// ── SAVE FIELD ────────────────────────────────────────────────
// ── RENAME CỘT HEADER TRONG DATA SHEET KHI ĐỔI TÊN TRƯỜNG ───
function _renameColHeader(sheetName, oldLabel, newLabel) {
  if (!oldLabel || !newLabel) return false;
  const oldTrim = String(oldLabel).trim();
  const newTrim = String(newLabel).trim();
  if (oldTrim === newTrim) return false;
  try {
    const s = getSheet(sheetName);
    if (s.getLastRow() === 0) return false;
    const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
    // Dùng trim() khi so sánh để tránh lỗi khoảng trắng
    const colIdx = headers.findIndex(h => String(h).trim() === oldTrim);
    if (colIdx >= 0) {
      s.getRange(1, colIdx + 1).setValue(newTrim);
      writeLog('ĐỔI TÊN CỘT', sheetName, `Cột ${colIdx+1}: "${oldTrim}" → "${newTrim}"`);
      return true;
    } else {
      writeLog('CẢNH BÁO', sheetName, `Không tìm thấy cột "${oldTrim}" để đổi tên`);
      return false;
    }
  } catch(e) {
    writeLog('LỖI RENAME', sheetName, e.message);
    return false;
  }
}

function saveField(fieldType, field) {
  // fieldType: 'profile' | 'contract' | 'selfdev'
  try {
    const sheetMap = { profile:SN.FIELDS, contract:SN.CONTRACT_FIELDS, selfdev:SN.SELFDEV_FIELDS };
    const s = getSheet(sheetMap[fieldType]);
    const isProfile = fieldType === 'profile';
    // SỐ CỘT THỰC TẾ: profile=9, contract/selfdev=7 — phải đọc đúng
    const numCols = isProfile ? 9 : 7;

    if (field._rowIndex) {
      // Đọc đúng số cột để lấy oldLabel tại index [1]
      const oldRow = s.getRange(field._rowIndex, 1, 1, numCols).getValues()[0];
      const oldLabel = String(oldRow[1] || '').trim();
      const newLabel = String(field.label || '').trim();
      const labelChanged = oldLabel !== newLabel;

      // Ghi cập nhật vào sheet định nghĩa trường
      if (isProfile) {
        s.getRange(field._rowIndex, 1, 1, 9).setValues([[
          field.key, newLabel, field.type, field.cfg_key||'',
          field.section||'', field.required?'TRUE':'FALSE',
          field.active!==false?'TRUE':'FALSE', field.order||0,
          field.span2?'TRUE':'FALSE'
        ]]);
        if (labelChanged) _renameColHeader(SN.EMPLOYEES, oldLabel, newLabel);
      } else {
        s.getRange(field._rowIndex, 1, 1, 7).setValues([[
          field.key, newLabel, field.type, field.cfg_key||'',
          field.required?'TRUE':'FALSE', field.active!==false?'TRUE':'FALSE', field.order||0
        ]]);
        const dataSheet = fieldType === 'contract' ? SN.CONTRACTS : SN.SELFDEV;
        if (labelChanged) _renameColHeader(dataSheet, oldLabel, newLabel);
      }

      writeLog('SỬA TRƯỜNG', field.key, `${fieldType}: "${oldLabel}" → "${newLabel}"`);
      const msg = labelChanged
        ? `Đã cập nhật và đổi tên cột "${oldLabel}" → "${newLabel}" trong Google Sheet`
        : 'Cập nhật trường thành công';
      return { success:true, message: msg };
    }

    // CHECK DUPLICATE KEY
    const existing = s.getDataRange().getValues();
    if (existing.slice(1).some(r => r[0] === field.key))
      return { success:false, error:'Key đã tồn tại: ' + field.key };

    // ADD
    if (isProfile) {
      s.appendRow([field.key,field.label,field.type,field.cfg_key||'',field.section||'',field.required?'TRUE':'FALSE','TRUE',field.order||99,'FALSE']);
      _addColToEmployee(field.label);
    } else {
      s.appendRow([field.key,field.label,field.type,field.cfg_key||'',field.required?'TRUE':'FALSE','TRUE',field.order||99]);
      _addColToSubSheet(fieldType==='contract'?SN.CONTRACTS:SN.SELFDEV, field.label);
    }
    writeLog('THÊM TRƯỜNG', field.key, `${fieldType}: ${field.label}`);
    return { success:true, message:'Thêm trường thành công' };
  } catch(e) { return { success:false, error:e.message }; }
}

function toggleField(fieldType, rowIndex, active) {
  try {
    const sheetMap = { profile:SN.FIELDS, contract:SN.CONTRACT_FIELDS, selfdev:SN.SELFDEV_FIELDS };
    const s = getSheet(sheetMap[fieldType]);
    const activeCol = fieldType==='profile' ? 7 : 6;
    s.getRange(rowIndex, activeCol).setValue(active?'TRUE':'FALSE');
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

function deleteField(fieldType, rowIndex, key) {
  try {
    const sheetMap = { profile:SN.FIELDS, contract:SN.CONTRACT_FIELDS, selfdev:SN.SELFDEV_FIELDS };
    getSheet(sheetMap[fieldType]).deleteRow(rowIndex);
    writeLog('XÓA TRƯỜNG', key, fieldType);
    return { success:true, message:'Đã xóa trường: '+key };
  } catch(e) { return { success:false, error:e.message }; }
}

function _addColToEmployee(label) {
  try {
    const s = getSheet(SN.EMPLOYEES);
    if (s.getLastRow()===0) return;
    const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    if (!headers.includes(label)) {
      const nc = s.getLastColumn()+1;
      s.getRange(1,nc).setValue(label).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
    }
  } catch(e){}
}
function _addColToSubSheet(sheetName, label) {
  try {
    const s = getSheet(sheetName);
    if (s.getLastRow()===0) return;
    const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    if (!headers.includes(label)) {
      const nc = s.getLastColumn()+1;
      s.getRange(1,nc).setValue(label).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
    }
  } catch(e){}
}

// ── CONFIG (danh mục dropdown) ────────────────────────────────
// Cấu trúc sheet: cột A=KEY, cột B=LABEL, cột C=VALUE
// Dòng anchor (VALUE='__EMPTY__') dùng để đăng ký key mới chưa có giá trị
function getConfigs() {
  try {
    const s = getSheet(SN.CONFIG);
    const data = s.getDataRange().getValues();
    const map = {};
    data.slice(1).forEach(r => {
      const key   = String(r[0]||'').trim();
      const label = String(r[1]||'').trim();
      const val   = String(r[2]||'').trim();
      if (!key) return;
      // Luôn đăng ký key ngay cả khi chưa có giá trị
      if (!map[key]) map[key] = { label: label||key, values:[] };
      // Chỉ bỏ qua giá trị đặc biệt dùng làm anchor
      if (val && val !== '__EMPTY__') map[key].values.push(val);
    });
    return { success:true, data:map };
  } catch(e) { return { success:false, error:e.message }; }
}

// Lấy 1 config key duy nhất — dùng trong submitDropdownRequest để kiểm tra trùng
function getConfigByKey(key) {
  try {
    const s = getSheet(SN.CONFIG);
    const data = s.getDataRange().getValues();
    const values = [];
    data.slice(1).forEach(r => {
      if (String(r[0]||'').trim() === key) {
        const v = String(r[2]||'').trim();
        if (v && v !== '__EMPTY__') values.push(v);
      }
    });
    return { values };
  } catch(e) { return { values:[] }; }
}

function getConfigDetail(key) {
  try {
    const s = getSheet(SN.CONFIG);
    const data = s.getDataRange().getValues();
    const rows = data.slice(1).map((r,i)=>({_rowIndex:i+2, key:r[0], label:r[1], value:r[2]}))
      .filter(r=>r.key===key);
    return { success:true, data:rows };
  } catch(e) { return { success:false, error:e.message }; }
}

// Xóa dòng anchor __EMPTY__ khi đã có giá trị thật
function deletePlaceholder(key) {
  try {
    const s = getSheet(SN.CONFIG);
    const data = s.getDataRange().getValues();
    for (let i = data.length-1; i >= 1; i--) {
      if (String(data[i][0]).trim() === key && String(data[i][2]).trim() === '__EMPTY__') {
        s.deleteRow(i+1);
      }
    }
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

// Lưu toàn bộ values của 1 key (xóa cũ, ghi mới)
function saveConfigValues(key, label, values) {
  try {
    const s = getSheet(SN.CONFIG);
    const data = s.getDataRange().getValues();
    // Xóa tất cả dòng cũ của key này (từ dưới lên)
    for (let i = data.length-1; i >= 1; i--) {
      if (String(data[i][0]).trim() === key) s.deleteRow(i+1);
    }
    const filtered = (values||[]).filter(v => String(v).trim());
    if (filtered.length > 0) {
      // Ghi các giá trị thật
      filtered.forEach(v => s.appendRow([key, label, String(v).trim()]));
    } else {
      // Không có giá trị → ghi dòng anchor để key vẫn tồn tại
      s.appendRow([key, label, '__EMPTY__']);
    }
    return { success:true, message:`Đã lưu ${filtered.length} giá trị cho "${label}"` };
  } catch(e) { return { success:false, error:e.message }; }
}

// Thêm 1 dòng config mới
function addConfigValue(key, label, value) {
  try {
    const s = getSheet(SN.CONFIG);
    s.appendRow([key, label, value.trim()]);
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

// Xóa 1 dòng config
function deleteConfigRow(rowIndex) {
  try {
    getSheet(SN.CONFIG).deleteRow(rowIndex);
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

// Sửa 1 dòng config
function updateConfigRow(rowIndex, value) {
  try {
    const s = getSheet(SN.CONFIG);
    const row = s.getRange(rowIndex,1,1,3).getValues()[0];
    s.getRange(rowIndex,3).setValue(value.trim());
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

// Import cấu hình từ CSV dạng danh sách (mỗi dòng: KEY,LABEL,VALUE)
function importConfigList(rows) {
  // rows: [{KEY,LABEL,VALUE}, ...]
  try {
    const s = getSheet(SN.CONFIG);
    let added=0, errors=[];
    rows.forEach((r,i)=>{
      try {
        const key   = (r['KEY']  ||r['key']  ||'').trim();
        const label = (r['LABEL']||r['label']||r['FIELD']||r['field']||'').trim();
        const value = (r['VALUE']||r['value']||'').trim();
        if(!key||!value){ errors.push(`Dòng ${i+1}: Thiếu KEY hoặc VALUE`); return; }
        s.appendRow([key, label||key, value]);
        added++;
      } catch(e){ errors.push(`Dòng ${i+1}: ${e.message}`); }
    });
    return { success:true, message:`Đã import ${added} giá trị cấu hình, ${errors.length} lỗi`, errors };
  } catch(e){ return { success:false, error:e.message }; }
}

// ── EMPLOYEES ─────────────────────────────────────────────────
function _getEmpHeaders() {
  const s = getSheet(SN.EMPLOYEES);
  if (s.getLastRow()===0) return ['_RowID'];
  return s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
}

function getAllEmployees() {
  try {
    const s = getSheet(SN.EMPLOYEES);
    const data = s.getDataRange().getValues();
    if (data.length<=1) return { success:true, data:[], headers:data[0]||[] };
    const headers = data[0];
    let rows = data.slice(1).map((row,i)=>{
      const obj={_rowIndex:i+2};
      headers.forEach((h,j)=>{
        let val = row[j];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
        } else {
          val = String(val ?? '');
          if (val.startsWith("'")) val = val.slice(1);
        }
        obj[h] = val;
      });
      // Normalize _Locked → _locked (boolean-like) để frontend đọc nhất quán
      obj._locked = String(obj['_Locked']||'').trim().toUpperCase() === 'TRUE';
      return obj;
    });

    // Employee: chỉ thấy NV do mình quản lý (trường Nhân Sự Quản Lý)
    const perm = _getMyPermission();
    if (perm.level === 2) { // EMPLOYEE
      const me = perm.email.toLowerCase();
      rows = rows.filter(e => {
        const nsQL = String(e['Nhân Sự Quản Lý']||'').trim().toLowerCase();
        return nsQL === me;
      });
    }

    return { success:true, data:rows, headers };
  } catch(e){ return { success:false, error:e.message }; }
}

function getEmployeeById(maNV) {
  try {
    const s = getSheet(SN.EMPLOYEES);
    const data = s.getDataRange().getValues();
    const headers = data[0];
    const maNVIdx = headers.indexOf('Mã Nhân Viên');
    if (maNVIdx<0) return { success:false, error:'Không tìm thấy cột Mã Nhân Viên' };
    for (let i=1;i<data.length;i++){
      if (String(data[i][maNVIdx]).trim()===String(maNV).trim()){
        const obj={_rowIndex:i+1};
        headers.forEach((h,j)=>{
          let val = data[i][j];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
          } else {
            val = String(val ?? '');
            if (val.startsWith("'")) val = val.slice(1);
          }
          obj[h] = val;
        });
        obj._locked = String(obj['_Locked']||'').trim().toUpperCase() === 'TRUE';
        return { success:true, data:obj };
      }
    }
    return { success:false, error:'Không tìm thấy' };
  } catch(e){ return { success:false, error:e.message }; }
}

// Normalize giá trị trước khi ghi vào sheet
// Ngày dạng dd/MM/yyyy cần thêm apostrophe để GSheet không tự convert thành Date
function _normalizeValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (!trimmed) return '';

  // Ngày tháng dd/MM/yyyy → prefix ' để tránh GSheets convert thành Date
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    return "'" + trimmed;
  }

  // Số có leading zero (SĐT, CMND, MST, MSBHXH, mã số...) → prefix '
  // Nhận diện: toàn số, bắt đầu bằng 0, dài từ 8-15 ký tự
  if (/^0\d{7,14}$/.test(trimmed)) {
    return "'" + trimmed;
  }

  return trimmed;
}

function addEmployee(empData) {
  try {
    // Kiểm tra quyền: cần ít nhất EMPLOYEE (level 2)
    const perm = _getMyPermission();
    if (perm.level < 2) return { success:false, error:'Bạn không có quyền thêm nhân viên' };

    const s = getSheet(SN.EMPLOYEES);
    if (!empData['Mã Nhân Viên']) return { success:false, error:'Mã NV không được trống' };
    if (getEmployeeById(empData['Mã Nhân Viên']).success) return { success:false, error:'Mã NV đã tồn tại' };
    const headers = _getEmpHeaders();
    const rowId = 'EMP_'+Date.now();
    const row = headers.map(h => h==='_RowID' ? rowId : _normalizeValue(empData[h]||''));
    s.appendRow(row);
    writeLog('THÊM NV', empData['Mã Nhân Viên'], JSON.stringify(empData['Họ Tên']||''));
    return { success:true, message:'Thêm nhân viên thành công', rowId };
  } catch(e){ return { success:false, error:e.message }; }
}

function updateEmployee(empData) {
  try {
    // Kiểm tra quyền
    const perm = _getMyPermission();
    if (perm.level < 2) return { success:false, error:'Bạn không có quyền chỉnh sửa hồ sơ nhân viên' };

    const s = getSheet(SN.EMPLOYEES);
    const maNV = String(empData['Mã Nhân Viên']||'').trim();
    if (!maNV) return { success:false, error:'Thiếu Mã Nhân Viên' };

    // ✅ FIX rowIndex bug: tra theo Mã NV thay vì tin _rowIndex từ client
    const allHeaders = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    const maNVCol = allHeaders.findIndex(h=>String(h).trim()==='Mã Nhân Viên');
    if (maNVCol < 0) return { success:false, error:'Không tìm thấy cột Mã Nhân Viên' };
    const lastRow = s.getLastRow();
    let ri = -1;
    if (lastRow >= 2) {
      const col = s.getRange(2, maNVCol+1, lastRow-1, 1).getValues();
      for (let i=0; i<col.length; i++) {
        if (String(col[i][0]||'').trim() === maNV) { ri = i+2; break; }
      }
    }
    // Fallback: dùng _rowIndex client gửi nhưng verify Mã NV khớp
    if (ri < 0 && empData._rowIndex) {
      const checkMa = String(s.getRange(empData._rowIndex, maNVCol+1).getValue()||'').trim();
      if (checkMa === maNV) ri = empData._rowIndex;
    }
    if (ri < 0) return { success:false, error:'Không tìm thấy nhân viên: '+maNV+'. Vui lòng F5 để load lại danh sách.' };

    // Nếu là EMPLOYEE (level 2): chỉ được sửa NV mà mình là Nhân Sự Quản Lý
    if (perm.level === 2) {
      const nsQLCol = allHeaders.findIndex(h=>String(h).trim()==='Nhân Sự Quản Lý');
      if (nsQLCol >= 0) {
        const nsQL = String(_readCellValue(s.getRange(ri, nsQLCol+1).getValue())||'').trim().toLowerCase();
        if (nsQL !== perm.email.toLowerCase()) {
          return { success:false, error:'Bạn chỉ có quyền chỉnh sửa hồ sơ nhân sự mà bạn phụ trách (Nhân Sự Quản Lý)' };
        }
      } else {
        return { success:false, error:'Không tìm thấy trường Nhân Sự Quản Lý trong hệ thống' };
      }
    }

    const headers = _getEmpHeaders();
    // Đọc row cũ để so sánh
    const oldRow = s.getRange(ri,1,1,headers.length).getValues()[0];

    // ✅ Detect thay đổi Trạng Thái
    const ttIdx = headers.findIndex(h=>String(h).trim()==='Trạng Thái');
    const oldStatus = ttIdx>=0 ? String(_readCellValue(oldRow[ttIdx])||'').trim() : '';
    const newStatus = String(empData['Trạng Thái']||'').trim();
    const statusChanged = ttIdx>=0 && newStatus && newStatus !== oldStatus;

    // Nếu Trạng Thái đổi → bắt buộc có _statusChange.ngayHieuLuc
    let statusChange = null;
    if (statusChanged) {
      statusChange = empData._statusChange || {};
      const ngayHieuLuc = String(statusChange.ngayHieuLuc||'').trim();
      if (!ngayHieuLuc) {
        return { success:false, error:'Vui lòng nhập "Ngày hiệu lực" khi thay đổi Trạng Thái' };
      }
      // Kiểm tra khoá: không cho đổi trạng thái nếu hồ sơ đang khoá
      const lockedIdx = headers.findIndex(h=>String(h).trim()==='_Locked');
      if (lockedIdx >= 0 && String(_readCellValue(oldRow[lockedIdx])||'').trim() === 'TRUE') {
        return { success:false, error:'Hồ sơ đang bị khoá. Cần gửi yêu cầu mở khoá trước.' };
      }
    }

    // Ghi log các thay đổi (không log 3 field ảo _statusChange)
    const changes = [];
    headers.forEach((h,i)=>{
      const newVal = String(empData[h]||'').trim();
      const oldVal = _readCellValue(oldRow[i]);
      if(newVal !== oldVal && h !== '_RowID' && !h.startsWith('_')){
        changes.push(`${h}: "${oldVal}" → "${newVal}"`);
      }
    });

    // Auto-lock nếu đổi sang "Đã nghỉ việc"
    if (statusChanged && newStatus === 'Đã nghỉ việc') {
      empData['_Locked'] = 'TRUE';
    }

    const row = headers.map(h => h==='_RowID' ? (empData['_RowID']||'') : _normalizeValue(empData[h]||''));
    s.getRange(ri,1,1,row.length).setValues([row]);
    writeLog('SỬA NV', maNV, changes.length>0?changes.join('; '):'(không thay đổi)');

    // ✅ Auto-record lịch sử nếu Trạng Thái đổi
    if (statusChanged) {
      _autoRecordHistory(maNV, newStatus, {
        'Từ Ngày': statusChange.ngayHieuLuc||'',
        'Đến Ngày': statusChange.ngayKetThuc||'',
        'Lý Do': statusChange.lyDo||''
      });
    }

    return { success:true, message:'Cập nhật thành công'+(statusChanged?' (đã ghi lịch sử đổi trạng thái)':'') };
  } catch(e){ return { success:false, error:e.message }; }
}

function deleteEmployee(maNV, rowIndex) {
  try {
    const perm = _getMyPermission();
    if (perm.level < 3) return { success:false, error:'Chỉ Manager/Admin mới có quyền xóa nhân viên' };
    getSheet(SN.EMPLOYEES).deleteRow(rowIndex);
    writeLog('XÓA NV', maNV, '');
    return { success:true, message:'Đã xóa nhân viên' };
  } catch(e){ return { success:false, error:e.message }; }
}

// ── CONTRACTS ─────────────────────────────────────────────────
// Các trường của HĐ được đồng bộ về hồ sơ nhân viên: label HĐ → label NhanSu
const CONTRACT_SYNC_FIELDS = {
  'Chức Vụ Chính':       'Chức Vụ Chính',
  'Chức Vụ Kiêm Nhiệm':  'Chức Vụ Kiêm Nhiệm',
  'Đơn Vị Phòng':        'Đơn Vị Phòng',
};

// Helper đọc giá trị từ cell, xử lý Date và apostrophe
function _readCellValue(val) {
  if (val instanceof Date) {
    // Dùng timezone của Spreadsheet (không phải script) để tránh lệch ngày UTC vs local
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
    return Utilities.formatDate(val, tz, 'dd/MM/yyyy');
  }
  const s = String(val ?? '');
  // Loại bỏ prefix ' (Google Sheets text-prefix để tránh auto-convert)
  return s.startsWith("'") ? s.slice(1) : s;
}

function getContracts(maNV) {
  try {
    const s = getSheet(SN.CONTRACTS);
    const data = s.getDataRange().getValues();
    if (data.length<=1) return { success:true, data:[] };
    const headers = data[0];
    const rows = data.slice(1)
      .map((r,i)=>{ const o={_rowIndex:i+2}; headers.forEach((h,j)=>o[h]=_readCellValue(r[j])); return o; })
      .filter(r=>r['MaNV']===String(maNV));
    rows.sort((a,b)=>{ const da=_parseDate(String(a['Ngày Ký']||'')), db=_parseDate(String(b['Ngày Ký']||'')); return db-da; });
    return { success:true, data:rows };
  } catch(e){ return { success:false, error:e.message }; }
}

function saveContract(maNV, contractData) {
  try {
    const s = getSheet(SN.CONTRACTS);
    const headers = s.getLastRow()>0 ? s.getRange(1,1,1,s.getLastColumn()).getValues()[0] : [];
    if (contractData._rowIndex) {
      const row = headers.map(h=>h==='MaNV'?maNV:(h==='_ID'?contractData['_ID']:_normalizeValue(contractData[h]||'')));
      s.getRange(contractData._rowIndex,1,1,row.length).setValues([row]);
      writeLog('SỬA HĐ', maNV, contractData['Số HĐ/Phụ Lục']||'');
    } else {
      const id = 'HD_'+Date.now();
      const now = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
      const row = headers.map(h=>{
        if(h==='_ID') return id;
        if(h==='MaNV') return maNV;
        if(h==='NgayTao') return now;
        if(h==='NgaySua') return now;
        return _normalizeValue(contractData[h]||'');
      });
      s.appendRow(row);
      writeLog('THÊM HĐ', maNV, contractData['Số HĐ/Phụ Lục']||'');
    }

    // ── SYNC CÁC TRƯỜNG TỪ HĐ VỀ HỒ SƠ NHÂN VIÊN ─────────────
    const SYNC_FIELDS = CONTRACT_SYNC_FIELDS;
    const syncChanges = [];
    Object.keys(SYNC_FIELDS).forEach(hdLabel => {
      if (contractData[hdLabel] !== undefined && contractData[hdLabel] !== '') {
        syncChanges.push({ hdLabel, nsLabel: SYNC_FIELDS[hdLabel], val: contractData[hdLabel] });
      }
    });

    if (syncChanges.length > 0) {
      const empSheet = getSheet(SN.EMPLOYEES);
      const empHeaders = empSheet.getRange(1,1,1,empSheet.getLastColumn()).getValues()[0];
      const maNVCol = empHeaders.findIndex(h=>String(h).trim()==='Mã Nhân Viên');
      if (maNVCol >= 0) {
        const empData = empSheet.getDataRange().getValues();
        for (let i=1; i<empData.length; i++) {
          if (String(empData[i][maNVCol]).trim() === String(maNV).trim()) {
            syncChanges.forEach(sc => {
              const nsCol = empHeaders.findIndex(h=>String(h).trim()===sc.nsLabel);
              if (nsCol >= 0) {
                empSheet.getRange(i+1, nsCol+1).setValue(_normalizeValue(sc.val));
                Logger.log(`Sync HĐ→NV: ${maNV} ${sc.nsLabel} = ${sc.val}`);
              }
            });
            break;
          }
        }
      }
    }

    const synced = syncChanges.map(s=>s.nsLabel).join(', ');
    const msg = contractData._rowIndex
      ? `Cập nhật hợp đồng thành công${synced?` · Đã sync: ${synced}`:''}`
      : `Thêm hợp đồng thành công${synced?` · Đã sync: ${synced}`:''}`;
    return { success:true, message:msg, syncedFields: syncChanges.map(s=>s.nsLabel) };
  } catch(e){ return { success:false, error:e.message }; }
}

// Import hợp đồng hàng loạt từ CSV — upsert theo "Số HĐ/Phụ Lục"
function importContracts(rows) {
  try {
    const s = getSheet(SN.CONTRACTS);
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

    // Đảm bảo header tồn tại
    if (s.getLastRow() === 0) {
      // Sheet trống — sẽ được tạo header từ dòng đầu tiên
    }
    const allData = s.getLastRow() > 0 ? s.getDataRange().getValues() : [[]];
    const headers = allData[0];

    // Tìm cột "Số HĐ/Phụ Lục" và "MaNV" để dùng làm key upsert
    const soHDCol  = headers.indexOf('Số HĐ/Phụ Lục');
    const maNVCol  = headers.indexOf('MaNV');
    const ngaySuaCol = headers.indexOf('NgaySua');

    // Build lookup map: "MaNV|SoHD" → rowIndex (1-based, tính cả header)
    const existingMap = {};
    if (soHDCol >= 0 && maNVCol >= 0) {
      allData.slice(1).forEach((r, i) => {
        const key = String(r[maNVCol]||'').trim() + '|' + String(r[soHDCol]||'').trim();
        if (key !== '|') existingMap[key] = i + 2; // +2 vì slice(1) + 1-based
      });
    }

    let added = 0, updated = 0, errors = [];
    rows.forEach((row, idx) => {
      try {
        const maNV  = (row['MaNV']||row['Mã Nhân Viên']||'').trim();
        const soHD  = (row['Số HĐ/Phụ Lục']||'').trim();
        if (!maNV) { errors.push(`Dòng ${idx+1}: Thiếu MaNV`); return; }

        const lookupKey = maNV + '|' + soHD;
        const existRow  = soHD ? existingMap[lookupKey] : null;

        if (existRow) {
          // ── UPDATE: chỉ ghi đè các cột có giá trị mới, giữ nguyên cột còn lại
          headers.forEach((h, colIdx) => {
            if (h === '_ID' || h === 'MaNV' || h === 'NgayTao') return; // không đụng
            const newVal = row[h];
            if (newVal !== undefined && String(newVal).trim() !== '') {
              s.getRange(existRow, colIdx + 1).setValue(_normalizeValue(newVal));
            }
          });
          if (ngaySuaCol >= 0) s.getRange(existRow, ngaySuaCol + 1).setValue(now);
          updated++;
        } else {
          // ── INSERT mới
          const id = 'HD_' + Date.now() + '_' + idx;
          const newRow = headers.map(h => {
            if (h === '_ID')    return id;
            if (h === 'MaNV')   return maNV;
            if (h === 'NgayTao') return now;
            if (h === 'NgaySua') return now;
            return _normalizeValue(row[h] || '');
          });
          s.appendRow(newRow);
          // Cập nhật map để tránh insert trùng trong cùng file
          if (soHDCol >= 0) existingMap[lookupKey] = s.getLastRow();
          added++;
        }
      } catch(e) { errors.push(`Dòng ${idx+1}: ${e.message}`); }
    });

    writeLog('IMPORT HĐ', '', `${added} thêm mới, ${updated} cập nhật`);
    return { success:true, message:`Import xong: ${added} thêm mới, ${updated} cập nhật, ${errors.length} lỗi`, errors, added, updated };
  } catch(e) { return { success:false, error:e.message }; }
}

// Đồng bộ hàng loạt HĐ → hồ sơ NV (dùng sau khi import HĐ, vì import không tự sync).
// Với mỗi NV và từng trường trong CONTRACT_SYNC_FIELDS: lấy giá trị từ HĐ/PL đang
// hiệu lực tại hôm nay (Ngày Hiệu Lực <= hôm nay, chưa hết hạn; nhiều bản → Ngày Hiệu
// Lực lớn nhất, bằng nhau → dòng nằm sau). Bản ghi bỏ trống trường đó thì bỏ qua.
// dryRun=true: chỉ trả về danh sách sẽ thay đổi, không ghi.
function syncContractsToProfiles(dryRun) {
  try {
    const perm = _getMyPermission();
    if (perm.level < 3) return { success:false, error:'Chỉ Manager/Admin mới có quyền cập nhật hàng loạt hồ sơ' };

    const tz  = Session.getScriptTimeZone();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Nhãn các cột ngày theo định nghĩa trường HĐ (phòng khi đã đổi tên)
    const ctFields = _getContractFields(true);
    const lbl = (key, def) => (ctFields.find(f => f.key === key) || {}).label || def;
    const dateHL = lbl('ngayHL', 'Ngày Hiệu Lực');
    const dateHH = lbl('ngayHH', 'Ngày Hết Hạn');
    const dateKy = lbl('ngayKy', 'Ngày Ký');

    // 1. Đọc HĐ → với mỗi NV, mỗi trường: bản ghi hiệu lực mới nhất có giá trị
    const hdSheet = getSheet(SN.CONTRACTS);
    if (hdSheet.getLastRow() < 2) return { success:true, message:'Chưa có hợp đồng nào', changes:[], updated:0, checked:0 };
    const hdData = hdSheet.getDataRange().getValues();
    const hdHeaders = hdData[0].map(h => String(h).trim());
    const hdMaNV = hdHeaders.indexOf('MaNV');
    if (hdMaNV < 0) return { success:false, error:'Sheet HopDong thiếu cột MaNV' };
    const colOf = {};
    Object.keys(CONTRACT_SYNC_FIELDS).forEach(l => { colOf[l] = hdHeaders.indexOf(l); });

    const best = {}; // maNV → { hdLabel: { ts, val } }
    hdData.slice(1).forEach(r => {
      const maNV = String(r[hdMaNV] || '').trim();
      if (!maNV) return;
      const iHL = hdHeaders.indexOf(dateHL), iKy = hdHeaders.indexOf(dateKy), iHH = hdHeaders.indexOf(dateHH);
      const hlTs = _parseDate(String((iHL >= 0 && _readCellValue(r[iHL])) || (iKy >= 0 && _readCellValue(r[iKy])) || ''));
      if (!hlTs || hlTs > today) return;                    // chưa hiệu lực
      const hhStr = iHH >= 0 ? String(_readCellValue(r[iHH]) || '').trim() : '';
      const hhTs = hhStr ? _parseDate(hhStr) : 0;
      if (hhTs && hhTs < today) return;                     // đã hết hạn
      best[maNV] = best[maNV] || {};
      Object.keys(colOf).forEach(l => {
        if (colOf[l] < 0) return;
        const v = String(_readCellValue(r[colOf[l]]) || '').trim();
        if (!v) return;
        const cur = best[maNV][l];
        if (!cur || hlTs >= cur.ts) best[maNV][l] = { ts: hlTs, val: v };
      });
    });

    // 2. So sánh với hồ sơ NV
    const empSheet = getSheet(SN.EMPLOYEES);
    if (empSheet.getLastRow() < 2) return { success:true, message:'Chưa có nhân viên nào', changes:[], updated:0, checked:0 };
    const empData = empSheet.getDataRange().getValues();
    const empHeaders = empData[0].map(h => String(h).trim());
    const empMaNV = empHeaders.indexOf('Mã Nhân Viên');
    if (empMaNV < 0) return { success:false, error:'Không tìm thấy cột Mã Nhân Viên' };
    const empHoTen = empHeaders.indexOf('Họ Tên');

    const cellChanges = []; // { row, col, val }
    const changes = [];     // để báo cho người dùng
    let checked = 0;
    const touched = {};
    empData.slice(1).forEach((r, i) => {
      const maNV = String(r[empMaNV] || '').trim();
      const info = best[maNV];
      if (!info) return;
      checked++;
      Object.keys(info).forEach(hdLabel => {
        const nsLabel = CONTRACT_SYNC_FIELDS[hdLabel];
        const nsCol = empHeaders.indexOf(nsLabel);
        if (nsCol < 0) return;
        const oldVal = String(_readCellValue(r[nsCol]) || '').trim();
        const newVal = info[hdLabel].val;
        if (oldVal === newVal) return;
        cellChanges.push({ row: i + 2, col: nsCol + 1, val: newVal });
        touched[maNV] = true;
        changes.push({ maNV, hoTen: empHoTen >= 0 ? String(r[empHoTen] || '') : '', field: nsLabel, from: oldVal, to: newVal });
      });
    });

    const updatedEmp = Object.keys(touched).length;
    if (dryRun) {
      return { success:true, dryRun:true, checked, updated:updatedEmp, changes,
               message: updatedEmp ? `Có ${updatedEmp} hồ sơ (${changes.length} trường) khác với hợp đồng hiệu lực`
                                   : 'Tất cả hồ sơ đã khớp với hợp đồng hiệu lực' };
    }

    // 3. Ghi
    cellChanges.forEach(c => empSheet.getRange(c.row, c.col).setValue(_normalizeValue(c.val)));
    if (changes.length) {
      writeLog('SYNC HĐ→NV', '', `${updatedEmp} hồ sơ, ${changes.length} trường: ` +
        changes.slice(0, 30).map(c => `${c.maNV} ${c.field}: "${c.from}"→"${c.to}"`).join('; '));
    }
    return { success:true, dryRun:false, checked, updated:updatedEmp, changes,
             message: updatedEmp ? `Đã cập nhật ${updatedEmp} hồ sơ (${changes.length} trường) theo hợp đồng hiệu lực`
                                 : 'Tất cả hồ sơ đã khớp với hợp đồng hiệu lực' };
  } catch(e) { return { success:false, error:e.message }; }
}

// Lấy template headers cho import HĐ kèm metadata (bắt buộc, loại, mô tả)
function getContractImportHeaders() {
  try {
    const fields = _getContractFields(false);
    const cfgMap = (getConfigs().data) || {};
    const meta = [
      { label:'MaNV', required:true, type:'text', note:'Mã Nhân Viên — phải tồn tại trong hệ thống', allowedValues:[] },
      ...fields.map(f=>{
        const ck = f.cfg_key||f.cfgKey||'';
        const allowed = ck && cfgMap[ck] ? (cfgMap[ck].values||[]) : [];
        return {
          label: f.label,
          required: !!(f.required==='TRUE'||f.required===true),
          type: f.type||'text',
          cfgKey: ck,
          allowedValues: allowed,
          note: f.type==='date'?'Định dạng: dd/mm/yyyy':
                f.type==='number'?'Chỉ nhập số, không dấu chấm phẩy':
                allowed.length?'Phải chọn đúng một trong các giá trị cho phép':''
        };
      })
    ];
    const alwaysReq = ['Số HĐ/Phụ Lục','Loại HĐ/PL','Ngày Ký','Ngày Hiệu Lực'];
    meta.forEach(m=>{ if(alwaysReq.includes(m.label)) m.required=true; });
    const headers = meta.map(m=>m.label);
    return { success:true, headers, meta };
  } catch(e){ return { success:false, error:e.message }; }
}

// Import phát triển bản thân hàng loạt
function importSelfDev(rows) {
  try {
    const s = getSheet(SN.SELFDEV);
    const headers = s.getLastRow()>0 ? s.getRange(1,1,1,s.getLastColumn()).getValues()[0] : [];
    const now = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    let added=0, errors=[];
    rows.forEach((row,idx)=>{
      try {
        const maNV = (row['MaNV']||row['Mã Nhân Viên']||'').trim();
        if(!maNV){ errors.push(`Dòng ${idx+1}: Thiếu MaNV`); return; }
        const id = 'PT_'+Date.now()+'_'+idx;
        const newRow = headers.map(h=>{
          if(h==='_ID') return id;
          if(h==='MaNV') return maNV;
          if(h==='NgayTao') return now;
          if(h==='NgaySua') return now;
          return _normalizeValue(row[h]||'');
        });
        s.appendRow(newRow);
        added++;
      } catch(e){ errors.push(`Dòng ${idx+1}: ${e.message}`); }
    });
    writeLog('IMPORT PT', '', `${added} bản ghi`);
    return { success:true, message:`Import xong: ${added} bản ghi, ${errors.length} lỗi`, errors };
  } catch(e){ return { success:false, error:e.message }; }
}

// Lấy template headers cho import PTBT kèm metadata
function getSelfDevImportHeaders() {
  try {
    const fields = _getSelfDevFields(false);
    const cfgMap = (getConfigs().data) || {};
    const meta = [
      { label:'MaNV', required:true, type:'text', note:'Mã Nhân Viên — phải tồn tại trong hệ thống', allowedValues:[] },
      ...fields.map(f=>{
        const ck = f.cfg_key||f.cfgKey||'';
        const allowed = ck && cfgMap[ck] ? (cfgMap[ck].values||[]) : [];
        return {
          label: f.label,
          required: !!(f.required==='TRUE'||f.required===true),
          type: f.type||'text',
          cfgKey: ck,
          allowedValues: allowed,
          note: f.type==='date'?'Định dạng: dd/mm/yyyy':
                f.type==='number'?'Chỉ nhập số':
                allowed.length?'Phải chọn đúng một trong các giá trị cho phép':''
        };
      })
    ];
    const alwaysReq = ['Loại Bằng/Chứng Chỉ','Tên Bằng/Chứng Chỉ'];
    meta.forEach(m=>{ if(alwaysReq.includes(m.label)) m.required=true; });
    const headers = meta.map(m=>m.label);
    return { success:true, headers, meta };
  } catch(e){ return { success:false, error:e.message }; }
}

function deleteContract(rowIndex, maNV) {
  try {
    getSheet(SN.CONTRACTS).deleteRow(rowIndex);
    writeLog('XÓA HĐ', maNV, '');
    return { success:true, message:'Đã xóa hợp đồng' };
  } catch(e){ return { success:false, error:e.message }; }
}

// ── SELF DEVELOPMENT ──────────────────────────────────────────
function getSelfDev(maNV) {
  try {
    const s = getSheet(SN.SELFDEV);
    const data = s.getDataRange().getValues();
    if (data.length<=1) return { success:true, data:[] };
    const headers = data[0];
    const rows = data.slice(1)
      .map((r,i)=>{ const o={_rowIndex:i+2}; headers.forEach((h,j)=>o[h]=_readCellValue(r[j])); return o; })
      .filter(r=>r['MaNV']===String(maNV));
    rows.sort((a,b)=>{ const da=_parseDate(String(a['Ngày Cấp']||'')), db=_parseDate(String(b['Ngày Cấp']||'')); return db-da; });
    return { success:true, data:rows };
  } catch(e){ return { success:false, error:e.message }; }
}

function saveSelfDev(maNV, sdData) {
  try {
    const s = getSheet(SN.SELFDEV);
    const headers = s.getLastRow()>0 ? s.getRange(1,1,1,s.getLastColumn()).getValues()[0] : [];
    if (sdData._rowIndex) {
      const row = headers.map(h=>h==='MaNV'?maNV:(h==='_ID'?sdData['_ID']:sdData[h]||''));
      s.getRange(sdData._rowIndex,1,1,row.length).setValues([row]);
      writeLog('SỬA PT', maNV, sdData['Tên Bằng/Chứng Chỉ']||'');
      return { success:true, message:'Cập nhật thành công' };
    }
    const id = 'PT_'+Date.now();
    const now = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    const row = headers.map(h=>{
      if(h==='_ID') return id;
      if(h==='MaNV') return maNV;
      if(h==='NgayTao') return now;
      if(h==='NgaySua') return now;
      return _normalizeValue(sdData[h]||'');
    });
    s.appendRow(row);
    writeLog('THÊM PT', maNV, sdData['Tên Bằng/Chứng Chỉ']||'');
    return { success:true, message:'Thêm bằng cấp thành công' };
  } catch(e){ return { success:false, error:e.message }; }
}

function deleteSelfDev(rowIndex, maNV) {
  try {
    getSheet(SN.SELFDEV).deleteRow(rowIndex);
    writeLog('XÓA PT', maNV, '');
    return { success:true, message:'Đã xóa' };
  } catch(e){ return { success:false, error:e.message }; }
}

// ── STATS ─────────────────────────────────────────────────────
function getDashboardStats(params) {
  // params: { fromDate, toDate, phapNhans:[], donViPhongs:[] }
  try {
    params = params || {};
    const fromTs = params.fromDate ? _parseDate(params.fromDate) : 0;
    const toTs   = params.toDate   ? _parseDate(params.toDate)   : 0;
    const pnFilter  = (params.phapNhans  || []).filter(Boolean);
    const dvFilter  = (params.donViPhongs|| []).filter(Boolean);

    const r = getAllEmployees(); if(!r.success) return r;
    let emps = r.data;

    // Lọc theo pháp nhân & đơn vị phòng (multi-select)
    if(pnFilter.length)  emps = emps.filter(e => pnFilter.includes(e['Pháp Nhân Chính']||''));
    if(dvFilter.length)  emps = emps.filter(e => dvFilter.includes(e['Đơn Vị Phòng']||e['Đơn Vị']||''));

    // Lọc theo ngày vào làm (nếu có fromDate/toDate → chỉ tính NV vào trong kỳ)
    let empsByDate = emps;
    if(fromTs || toTs) {
      empsByDate = emps.filter(e => {
        const vl = _parseDate(String(e['Ngày Vào Làm']||''));
        if(fromTs && vl < fromTs) return false;
        if(toTs   && vl > toTs)   return false;
        return true;
      });
    }

    // ── BASIC COUNTS ──────────────────────────────────────────
    const byStatus={}, byUnit={}, byGender={}, byContract={}, byPhapNhan={};
    emps.forEach(e=>{
      const s=e['Trạng Thái']||'N/A'; byStatus[s]=(byStatus[s]||0)+1;
      const u=e['Đơn Vị Phòng']||e['Đơn Vị']||'N/A'; byUnit[u]=(byUnit[u]||0)+1;
      const g=e['Giới Tính']||'N/A'; byGender[g]=(byGender[g]||0)+1;
      const c=e['Phân Loại Hợp Đồng']||'N/A'; byContract[c]=(byContract[c]||0)+1;
      const pn=e['Pháp Nhân Chính']||'N/A'; byPhapNhan[pn]=(byPhapNhan[pn]||0)+1;
    });

    // ── ĐỘ TUỔI ───────────────────────────────────────────────
    const byAge = {'Dưới 25':0,'25 - 35':0,'35 - 45':0,'Trên 45':0};
    const thisYear = new Date().getFullYear();
    emps.forEach(e=>{
      const dob = String(e['Ngày Sinh']||'');
      if(!dob) return;
      const yr = parseInt((dob.split('/')||[])[2]||0);
      if(!yr) return;
      const age = thisYear - yr;
      if(age < 25)       byAge['Dưới 25']++;
      else if(age <= 35) byAge['25 - 35']++;
      else if(age <= 45) byAge['35 - 45']++;
      else               byAge['Trên 45']++;
    });

    // ── NHÂN SỰ THEO THÁNG VÀO LÀM ───────────────────────────
    const byJoinMonth = {};
    // Nhân sự mới theo tháng vào làm
    emps.forEach(e=>{
      const vl=String(e['Ngày Vào Làm']||'').trim();
      if(!vl) return;
      const p=vl.split('/');
      if(p.length===3){
        const mk=p[1].padStart(2,'0')+'/'+p[2];
        byJoinMonth[mk]=(byJoinMonth[mk]||0)+1;
      }
    });

    const byLeaveMonth = {};
    const leaveByMaNV = {}; // maNV → 'MM/YYYY' — dedup mỗi NV chỉ tính 1 lần

    // Nguồn 1: LichSuNhanSu — lấy ngày chính xác nhất
    try {
      const histSheet = getSheet('LichSuNhanSu');
      if(histSheet && histSheet.getLastRow() > 1){
        const hd = histSheet.getDataRange().getValues();
        const hh = hd[0];
        hd.slice(1).forEach(row=>{
          const o={}; hh.forEach((col,j)=>o[col]=_readCellValue(row[j]));
          const maNV = String(o.MaNV||'').trim();
          if(!maNV) return;
          if(String(o.LOAI||'').trim() !== 'Trạng Thái') return;
          const moTa = String(o.MO_TA||'').toLowerCase();
          if(!moTa.includes('nghỉ việc') && !moTa.includes('đã nghỉ')) return;
          const ng = String(o.TU_NGAY||o.NGAY_GHI_NHAN||'').trim();
          if(!ng) return;
          const p=ng.split('/');
          if(p.length===3){
            const mk=p[1].padStart(2,'0')+'/'+p[2];
            // Ưu tiên record mới nhất (ghi đè nếu có nhiều record)
            leaveByMaNV[maNV]=mk;
          }
        });
      }
    } catch(er){ Logger.log('byLeaveMonth error: '+er.message); }

    // Tổng hợp — mỗi NV chỉ đếm 1 lần
    Object.values(leaveByMaNV).forEach(mk=>{
      byLeaveMonth[mk]=(byLeaveMonth[mk]||0)+1;
    });

    // ── BẰNG CẤP CAO NHẤT từ PhatTrienBanThan ─────────────────
    const byDegree = {};
    const DEGREE_RANK = {'Tiến Sĩ':7,'Tiến sĩ':7,'Thạc Sĩ':6,'Thạc sĩ':6,
      'Đại Học':5,'Đại học':5,'Cao Đẳng':4,'Cao đẳng':4,
      'Trung Cấp':3,'Trung cấp':3,'THPT':2,'Chứng chỉ nghề':2,
      'Chứng chỉ ngoại ngữ':1,'Chứng chỉ tin học':1,'Khác':1};
    try {
      const ptSheet = getSheet(SN.SELFDEV);
      const ptFields = _readFieldSheet(SN.SELFDEV_FIELDS);
      // Tìm field có key 'loaiBang' hoặc label chứa 'Loại Bằng'
      const degreeField = ptFields.find(f=>f.key==='loaiBang') ||
                          ptFields.find(f=>String(f.label).includes('Loại Bằng'));
      const degreeLabel = degreeField ? degreeField.label : 'Loại Bằng/Chứng Chỉ';

      if(ptSheet && ptSheet.getLastRow() > 1){
        const pd = ptSheet.getDataRange().getValues();
        const ph = pd[0].map(String);
        const degCol = ph.indexOf(degreeLabel);
        const maNVCol2 = ph.indexOf('MaNV');

        const maNVBest = {};
        pd.slice(1).forEach(row=>{
          const maNV = String(row[maNVCol2]||'').trim();
          if(!maNV) return;
          const loai = degCol>=0 ? String(_readCellValue(row[degCol])||'') : '';
          if(!loai) return;
          const rank = DEGREE_RANK[loai] || 0;
          const prev = maNVBest[maNV];
          if(!prev || (DEGREE_RANK[prev]||0) < rank) maNVBest[maNV] = loai;
        });
        Object.values(maNVBest).forEach(deg=>{ byDegree[deg]=(byDegree[deg]||0)+1; });
        const noData = emps.filter(e=>!maNVBest[e['Mã Nhân Viên']]).length;
        if(noData>0) byDegree['Chưa cập nhật'] = noData;
      }
    } catch(er){ Logger.log('byDegree error: '+er.message+'\n'+er.stack); }

    // ── THU NHẬP TỪ HỢP ĐỒNG HIỆU LỰC ────────────────────────
    // Lấy trường number từ contract fields
    const incomeByMonth = {}, incomeByUnit = {};
    try {
      const ctFields = _readFieldSheet(SN.CONTRACT_FIELDS);
      const numberFields = ctFields.filter(f=>f.type==='number').map(f=>f.label);
      const dateFieldHL  = (ctFields.find(f=>f.key==='ngayHL')||{}).label||'Ngày Hiệu Lực';
      const dateFieldHH  = (ctFields.find(f=>f.key==='ngayHH')||{}).label||'Ngày Hết Hạn';
      const asOfNow = Date.now();

      const ctSheet = getSheet(SN.CONTRACTS);
      if(ctSheet && ctSheet.getLastRow() > 1 && numberFields.length > 0){
        const cd = ctSheet.getDataRange().getValues();
        const ch = cd[0].map(String);
        const maNVCol3 = ch.indexOf('MaNV');
        const hlCol = ch.indexOf(dateFieldHL);
        const hhCol = ch.indexOf(dateFieldHH);

        // Tìm HĐ hiệu lực mới nhất cho từng NV
        const maNVBestHD = {}; // maNV → {row, hlTs}
        cd.slice(1).forEach(row=>{
          const maNV = String(_readCellValue(row[maNVCol3])||'').trim();
          if(!maNV) return;
          const hlStr = hlCol>=0 ? String(_readCellValue(row[hlCol])||'') : '';
          const hhStr = hhCol>=0 ? String(_readCellValue(row[hhCol])||'') : '';
          const hlTs = hlStr ? _parseDate(hlStr) : 0;
          const hhTs = hhStr ? _parseDate(hhStr) : 0;
          if(!hlTs || hlTs > asOfNow) return;
          if(hhTs && hhTs < asOfNow) return;
          const prev = maNVBestHD[maNV];
          if(!prev || hlTs > prev.hlTs) maNVBestHD[maNV] = {row, hlTs};
        });

        // Tính thu nhập từng NV và nhóm theo tháng vào làm + đơn vị
        emps.forEach(e=>{
          const maNV = e['Mã Nhân Viên'];
          const hd = maNVBestHD[maNV];
          if(!hd) return;
          let total = 0;
          numberFields.forEach(fLabel=>{
            const col = ch.indexOf(fLabel);
            if(col>=0){
              const raw=String(_readCellValue(hd.row[col])||'0').replace(/[^\d.]/g,'');
              total += parseFloat(raw)||0;
            }
          });
          if(!total) return;
          // Nhóm theo tháng vào làm
          const vl = String(e['Ngày Vào Làm']||'');
          if(vl){
            const p=vl.split('/');
            if(p.length===3){const mk=`${p[1]}/${p[2]}`;incomeByMonth[mk]=(incomeByMonth[mk]||0)+total;}
          }
          // Nhóm theo đơn vị phòng
          const dv = String(e['Đơn Vị Phòng']||e['Đơn Vị']||'Khác');
          incomeByUnit[dv]=(incomeByUnit[dv]||0)+total;
        });
      }
    } catch(er){ Logger.log('incomeByContract error: '+er.message+'\n'+er.stack); }

    // ── FILTER OPTIONS cho multi-select ───────────────────────
    const allPN  = [...new Set(r.data.map(e=>e['Pháp Nhân Chính']||'').filter(Boolean))].sort();
    const allDVP = [...new Set(r.data.map(e=>e['Đơn Vị Phòng']||e['Đơn Vị']||'').filter(Boolean))].sort();

    return { success:true, data:{
      total: emps.length,
      active: (byStatus['Đang làm việc']||0),
      byStatus, byUnit, byGender, byContract, byPhapNhan,
      byAge, byJoinMonth, byLeaveMonth, byDegree,
      incomeByMonth, incomeByUnit,
      filterOptions:{ phapNhans: allPN, donViPhongs: allDVP },
    }};
  } catch(e){
    Logger.log('getDashboardStats error: '+e.message+'\n'+e.stack);
    return { success:false, error:e.message };
  }
}

// ── EXPORT ────────────────────────────────────────────────────
function exportToSheet() {
  try {
    // Dùng getAllEmployees() — hàm này đã lọc đúng theo phân quyền
    // Employee (level 2): chỉ NV có Nhân Sự Quản Lý = email mình
    // Manager/Admin (level 3+): tất cả NV
    const result = getAllEmployees();
    if (!result.success) return { success:false, error:result.error };

    const filteredRows = result.data || [];
    const headers      = result.headers || [];
    if (!headers.length) return { success:false, error:'Không có dữ liệu' };

    // Chuyển object rows → array rows theo đúng thứ tự headers
    const rowArrays = filteredRows.map(emp =>
      headers.map(h => {
        if (h === '_rowIndex') return '';
        const v = emp[h];
        return (v === undefined || v === null) ? '' : v;
      })
    );

    // Tạo sheet tạm để export xlsx
    const ss   = getSS();
    const name = 'DanhSachNhanSu_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm');
    let ex = ss.getSheetByName(name);
    if (ex) ss.deleteSheet(ex);
    ex = ss.insertSheet(name);

    const exportData = [headers, ...rowArrays];
    ex.getRange(1, 1, exportData.length, headers.length).setValues(exportData);
    ex.getRange(1, 1, 1, headers.length).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
    ex.autoResizeColumns(1, headers.length);

    const exportUrl = 'https://docs.google.com/spreadsheets/d/' + ss.getId()
                    + '/export?format=xlsx&gid=' + ex.getSheetId();
    writeLog('XUẤT EXCEL', 'DanhSachNhanSu', filteredRows.length + ' NV');
    return { success:true, message:'Đang tải file Excel (' + filteredRows.length + ' nhân sự)...', exportUrl };
  } catch(e) {
    Logger.log('exportToSheet error: ' + e.message);
    return { success:false, error:e.message };
  }
}

// Lấy template headers cho import nhân sự kèm metadata đầy đủ
function getEmpImportHeaders() {
  try {
    const fields  = _getProfileFields(false); // tất cả trường, kể cả inactive
    const cfgMap  = (getConfigs().data) || {};

    // Trường được sync từ HĐ → không xuất hiện trong template import nhân sự
    const CONTRACT_SYNC = ['Chức Vụ Chính','Chức Vụ Kiêm Nhiệm','Đơn Vị Phòng'];

    // Trường luôn bắt buộc
    const ALWAYS_REQ = ['Mã Nhân Viên','Họ Tên'];

    const meta = fields
      .filter(f => f.active && !CONTRACT_SYNC.includes(f.label))
      .map(f => {
        const ck      = f.cfg_key || '';
        const allowed = ck && cfgMap[ck] ? (cfgMap[ck].values || []) : [];
        const isReq   = !!(f.required === 'TRUE' || f.required === true) || ALWAYS_REQ.includes(f.label);
        return {
          label:         f.label,
          required:      isReq,
          type:          f.type || 'text',
          cfgKey:        ck,
          allowedValues: allowed,
          note: f.type === 'date'   ? 'Định dạng: dd/mm/yyyy'
              : f.type === 'number' ? 'Chỉ nhập số'
              : allowed.length      ? 'Phải chọn đúng một trong các giá trị cho phép'
              : '',
          fromContract:  false,
        };
      });

    // Thêm nhóm ghi chú về trường lấy từ HĐ (chỉ để tham khảo, không import)
    const contractNote = {
      label:        '--- Các trường sau lấy tự động từ Hợp Đồng (không cần nhập) ---',
      required:     false,
      type:         'info',
      cfgKey:       '',
      allowedValues:[],
      note:         CONTRACT_SYNC.join(', '),
      fromContract: true,
    };

    const headers = meta.map(m => m.label);
    return { success:true, headers, meta, contractSyncFields: CONTRACT_SYNC };
  } catch(e) { return { success:false, error:e.message }; }
}

// Chạy 1 lần để thêm trường Mã NV Gốc vào hệ thống đang chạy
function addMaNVGocField() {
  try {
    const s = getSheet(SN.FIELDS);
    const data = s.getDataRange().getValues();
    const headers = data[0];
    const labelCol = headers.indexOf('LABEL');
    // Kiểm tra đã có chưa
    const exists = data.slice(1).some(r => String(r[labelCol]||'').trim() === 'Mã NV Gốc');
    if (exists) { Logger.log('Mã NV Gốc đã tồn tại'); return { success:true, message:'Trường đã tồn tại' }; }
    // Thêm dòng mới sau dòng Mã Nhân Viên
    const keyCol    = headers.indexOf('KEY');
    const typeCol   = headers.indexOf('TYPE');
    const cfgCol    = headers.indexOf('CFG_KEY');
    const sectionCol= headers.indexOf('SECTION');
    const reqCol    = headers.indexOf('REQUIRED');
    const orderCol  = headers.indexOf('ORDER');
    const activeCol = headers.indexOf('ACTIVE');
    // Tìm dòng Mã Nhân Viên để chèn sau
    const maNVRow = data.findIndex(r => String(r[labelCol]||'').trim() === 'Mã Nhân Viên');
    const insertAt = maNVRow > 0 ? maNVRow + 2 : s.getLastRow() + 1; // +2 vì 1-indexed
    const newRow = headers.map((_,i) => {
      if(i===keyCol)     return 'maNVGoc';
      if(i===labelCol)   return 'Mã NV Gốc';
      if(i===typeCol)    return 'text';
      if(i===cfgCol)     return '';
      if(i===sectionCol) return 'toChuc';
      if(i===reqCol)     return 'FALSE';
      if(i===orderCol)   return 2;
      if(i===activeCol)  return 'TRUE';
      return '';
    });
    s.insertRowBefore(insertAt);
    s.getRange(insertAt, 1, 1, newRow.length).setValues([newRow]);
    Logger.log('Đã thêm trường Mã NV Gốc tại dòng ' + insertAt);
    return { success:true, message:'Đã thêm trường "Mã NV Gốc" vào hệ thống' };
  } catch(e) { return { success:false, error:e.message }; }
}

// Alias để chạy từ GAS Editor
function setupMaNVGoc() {
  const r = addMaNVGocField();
  Logger.log(JSON.stringify(r));
  return r;
}

// Thêm trường Ngày Vào Làm Thực Tế vào hệ thống đang chạy
function addNgayVaoLamTTField() {
  try {
    const s = getSheet(SN.FIELDS);
    const data = s.getDataRange().getValues();
    const headers = data[0];
    const labelCol   = headers.indexOf('LABEL');
    const keyCol     = headers.indexOf('KEY');
    const typeCol    = headers.indexOf('TYPE');
    const cfgCol     = headers.indexOf('CFG_KEY');
    const sectionCol = headers.indexOf('SECTION');
    const reqCol     = headers.indexOf('REQUIRED');
    const orderCol   = headers.indexOf('ORDER');
    const activeCol  = headers.indexOf('ACTIVE');

    // Kiểm tra đã có chưa
    const exists = data.slice(1).some(r => String(r[labelCol]||'').trim() === 'Ngày Vào Làm Thực Tế');
    if (exists) {
      Logger.log('Ngày Vào Làm Thực Tế đã tồn tại');
      return { success:true, message:'Trường đã tồn tại' };
    }

    // Tìm dòng "Ngày Vào Làm" để chèn ngay sau
    const nvlRow = data.findIndex(r => String(r[labelCol]||'').trim() === 'Ngày Vào Làm');
    const insertAt = nvlRow > 0 ? nvlRow + 2 : s.getLastRow() + 1;

    const newRow = headers.map((_,i) => {
      if (i === keyCol)      return 'ngayVaoLamTT';
      if (i === labelCol)    return 'Ngày Vào Làm Thực Tế';
      if (i === typeCol)     return 'date';
      if (i === cfgCol)      return '';
      if (i === sectionCol)  return 'hopDong';
      if (i === reqCol)      return 'FALSE';
      if (i === orderCol)    return 33;
      if (i === activeCol)   return 'TRUE';
      return '';
    });

    s.insertRowBefore(insertAt);
    s.getRange(insertAt, 1, 1, newRow.length).setValues([newRow]);
    Logger.log('Đã thêm trường "Ngày Vào Làm Thực Tế" tại dòng ' + insertAt);
    return { success:true, message:'Đã thêm trường "Ngày Vào Làm Thực Tế" vào hệ thống. Nhấn 🔄 Làm Mới trong hệ thống để thấy trường mới.' };
  } catch(e) { return { success:false, error:e.message }; }
}

// Alias để chạy từ GAS Editor
function setupNgayVaoLamTT() {
  const r1 = addMaNVGocField();      // Đảm bảo Mã NV Gốc cũng đã có
  const r2 = addNgayVaoLamTTField(); // Thêm Ngày Vào Làm Thực Tế
  Logger.log('Mã NV Gốc: ' + JSON.stringify(r1));
  Logger.log('Ngày VL Thực Tế: ' + JSON.stringify(r2));
  return { maNVGoc: r1, ngayVLTT: r2 };
}

function importEmployees(rows) {
  try {
    let added=0,updated=0,errors=[];
    rows.forEach((row,i)=>{
      try {
        if(!row['Mã Nhân Viên']){errors.push(`Dòng ${i+1}: Thiếu Mã NV`);return;}
        const ex=getEmployeeById(row['Mã Nhân Viên']);
        if(ex.success){row._rowIndex=ex.data._rowIndex;updateEmployee(row);updated++;}
        else{addEmployee(row);added++;}
      }catch(e){errors.push(`Dòng ${i+1}: ${e.message}`);}
    });
    return { success:true, message:`${added} thêm mới, ${updated} cập nhật, ${errors.length} lỗi`, errors };
  } catch(e){ return { success:false, error:e.message }; }
}

// ── LOG ───────────────────────────────────────────────────────
function _getSessionEmail() {
  // Đọc email từ token được client gửi lên — hỗ trợ nhiều user đồng thời
  try {
    const token = _currentRequestToken_();
    if (token) {
      const email = _getEmailFromToken(token);
      if (email) return email;
    }
    // Fallback: UserProperties (legacy)
    const raw = PropertiesService.getUserProperties().getProperty('SESSION_TOKEN');
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.email) return d.email;
    }
  } catch(e) {}
  return 'unknown';
}

// Token từ request hiện tại — được set bởi doPost dispatcher
let _REQ_TOKEN_ = '';
function _setCurrentRequestToken_(t) { _REQ_TOKEN_ = t || ''; }
function _currentRequestToken_() { return _REQ_TOKEN_; }

function writeLog(action, maNV, detail) {
  try {
    const u = _getSessionEmail();
    const t = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
    const s = getSheet(SN.LOG);
    // Đảm bảo header tồn tại
    if (s.getLastRow() === 0) {
      s.appendRow(['Thời Gian','Hành Động','Đối Tượng','Người Thực Hiện','Chi Tiết']);
      s.getRange(1,1,1,5).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
    }
    s.appendRow([t, action, maNV, u, detail]);
  } catch(e) { Logger.log('writeLog error: '+e.message); }
}

function getLogs() {
  try {
    const s = getSheet(SN.LOG);
    if (!s || s.getLastRow() === 0) return { success:true, data:[] };
    const lastRow = s.getLastRow();
    const lastCol = Math.min(s.getLastColumn(), 5); // tối đa 5 cột
    if (lastRow <= 1) return { success:true, data:[] };
    // Lấy 200 dòng gần nhất (đọc từ cuối lên để tránh đọc toàn bộ)
    const startRow = Math.max(2, lastRow - 199);
    const numRows  = lastRow - startRow + 1;
    const data = s.getRange(startRow, 1, numRows, lastCol).getValues();
    // Chuẩn hóa về string để tránh Date objects
    const rows = data.map(r => r.map(cell => {
      if (cell instanceof Date) return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
      return String(cell || '');
    })).reverse(); // mới nhất lên đầu
    return { success:true, data:rows };
  } catch(e) {
    Logger.log('getLogs error: ' + e.message);
    return { success:false, error:e.message };
  }
}

// ── HELPERS ───────────────────────────────────────────────────
function _parseDate(str) {
  if (!str) return 0;
  const p=str.split('/');
  if(p.length===3) return new Date(p[2],p[1]-1,p[0]).getTime();
  return new Date(str).getTime()||0;
}

// ============================================================
// V5 ADDITIONS
// ============================================================

// ── POLICY SHEET SETUP ───────────────────────────────────────
function _ensurePolicySheet() {
  const s = getSheet(SN.POLICY);
  if (s.getLastRow() > 0) return;
  const h = ['_ID','NHOM','TEN_CHINH_SACH','MO_TA','GIA_TRI','DON_VI','DIEU_KIEN','ACTIVE','NGAY_AP_DUNG','GHI_CHU'];
  s.appendRow(h);
  s.getRange(1,1,1,h.length).setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
  // Seed dữ liệu mẫu
  const samples = [
    ['POL_001','Thưởng','Thưởng Tết Nguyên Đán','Thưởng tết hàng năm',1000000,'VNĐ','Tất cả nhân viên đang làm việc','TRUE','01/01/2025',''],
    ['POL_002','Thưởng','Thưởng Hiệu Suất Xuất Sắc','KPI đạt >95%',2000000,'VNĐ','Xếp loại xuất sắc','TRUE','01/01/2025',''],
    ['POL_003','Thưởng','Thưởng Thâm Niên 5 Năm','Làm việc đủ 5 năm',3000000,'VNĐ','Thâm niên >= 5 năm','TRUE','01/01/2025',''],
    ['POL_004','Phụ Cấp','Phụ Cấp Trách Nhiệm','Tổ trưởng / Trưởng bộ phận',500000,'VNĐ/tháng','Chức vụ Tổ Trưởng trở lên','TRUE','01/01/2025',''],
    ['POL_005','Phụ Cấp','Phụ Cấp Đi Lại','Hỗ trợ đi lại',200000,'VNĐ/tháng','Tất cả','TRUE','01/01/2025',''],
    ['POL_006','Hỗ Trợ','Hỗ Trợ Thai Sản','Hỗ trợ thêm ngoài BHXH',1500000,'VNĐ','Nhân viên thai sản','TRUE','01/01/2025',''],
  ];
  s.getRange(2,1,samples.length,h.length).setValues(samples);
  [80,120,200,250,100,100,200,60,100,150].forEach((w,i)=>s.setColumnWidth(i+1,w));
}

// ── PROPOSAL SHEET SETUP ─────────────────────────────────────
function _ensureProposalSheets() {
  // Sheet loại đề xuất + trường tùy chọn
  const st = getSheet(SN.PROPOSAL_TYPES);
  if (st.getLastRow() === 0) {
    const h = ['_ID','TEN_LOAI','MO_TA','TRUONG_CHON','ACTIVE'];
    st.appendRow(h);
    st.getRange(1,1,1,h.length).setBackground('#ea580c').setFontColor('#fff').setFontWeight('bold');
    const types = [
      ['PT_001','Đề Xuất Tăng Lương','Đề xuất điều chỉnh mức lương','Họ Tên|Đơn Vị|Chức Vụ Chính|Ngày Vào Làm|Mức Lương Hiện Tại|Mức Lương Đề Xuất|Lý Do|Ghi Chú','TRUE'],
      ['PT_002','Đề Xuất Thưởng','Đề xuất khen thưởng cá nhân/tập thể','Họ Tên|Đơn Vị|Thành Tích|Loại Thưởng|Số Tiền Thưởng|Nguồn Chính Sách|Ghi Chú','TRUE'],
      ['PT_003','Đề Xuất Bổ Nhiệm','Đề xuất bổ nhiệm chức vụ','Họ Tên|Đơn Vị|Chức Vụ Cũ|Chức Vụ Mới|Ngày Hiệu Lực|Lý Do|Ghi Chú','TRUE'],
    ];
    st.getRange(2,1,types.length,h.length).setValues(types);
  }
  // Sheet đề xuất
  const sp = getSheet(SN.PROPOSALS);
  if (sp.getLastRow() === 0) {
    const h = ['_ID','LOAI_DX','TRANG_THAI','NGAY_TAO','NGUOI_TAO','NGAY_DUYET','NGUOI_DUYET','GHI_CHU_DUYET','DATA_JSON'];
    sp.appendRow(h);
    sp.getRange(1,1,1,h.length).setBackground('#ea580c').setFontColor('#fff').setFontWeight('bold');
    [80,140,100,100,140,100,140,200,400].forEach((w,i)=>sp.setColumnWidth(i+1,w));
  }
}

// ── POLICY CRUD ───────────────────────────────────────────────
function getPolicies() {
  try {
    const s = getSheet(SN.POLICY);
    const data = s.getDataRange().getValues();
    if (data.length <= 1) return { success:true, data:[] };
    const h = data[0];
    const rows = data.slice(1).map((r,i) => {
      const o = {_rowIndex:i+2};
      h.forEach((col,j) => o[col] = _readCellValue(r[j]));
      return o;
    });
    return { success:true, data:rows };
  } catch(e) { return {success:false,error:e.message}; }
}

function savePolicy(p) {
  try {
    const s = getSheet(SN.POLICY);
    const row = [p._ID||'POL_'+Date.now(), p.NHOM||'', p.TEN_CHINH_SACH||'', p.MO_TA||'',
      p.GIA_TRI||'', p.DON_VI||'VNĐ', p.DIEU_KIEN||'', p.ACTIVE!==false?'TRUE':'FALSE',
      p.NGAY_AP_DUNG||'', p.GHI_CHU||''];
    if (p._rowIndex) {
      s.getRange(p._rowIndex,1,1,row.length).setValues([row]);
      return {success:true, message:'Cập nhật chính sách thành công'};
    }
    s.appendRow(row);
    writeLog('THÊM CS', p.TEN_CHINH_SACH, p.NHOM);
    return {success:true, message:'Thêm chính sách thành công'};
  } catch(e) { return {success:false,error:e.message}; }
}

function deletePolicy(rowIndex, name) {
  try {
    getSheet(SN.POLICY).deleteRow(rowIndex);
    writeLog('XÓA CS', name, '');
    return {success:true, message:'Đã xóa chính sách'};
  } catch(e) { return {success:false,error:e.message}; }
}

function getPolicyGroups() {
  try {
    const r = getPolicies();
    if (!r.success) return r;
    const groups = {};
    r.data.filter(p=>p.ACTIVE==='TRUE').forEach(p => {
      if (!groups[p.NHOM]) groups[p.NHOM] = [];
      groups[p.NHOM].push(p);
    });
    return {success:true, data:groups};
  } catch(e) { return {success:false,error:e.message}; }
}

// ── PROPOSAL TYPES ────────────────────────────────────────────
function getProposalTypes() {
  try {
    const s = getSheet(SN.PROPOSAL_TYPES);
    const data = s.getDataRange().getValues();
    if (data.length <= 1) return {success:true, data:[]};
    const h = data[0];
    return {success:true, data: data.slice(1).map((r,i)=>{
      const o={_rowIndex:i+2};
      h.forEach((col,j)=>o[col]=_readCellValue(r[j]));
      return o;
    })};
  } catch(e) { return {success:false,error:e.message}; }
}

function saveProposalType(pt) {
  try {
    const s = getSheet(SN.PROPOSAL_TYPES);
    const row = [pt._ID||'PT_'+Date.now(), pt.TEN_LOAI||'', pt.MO_TA||'',
      Array.isArray(pt.TRUONG_CHON)?pt.TRUONG_CHON.join('|'):pt.TRUONG_CHON||'',
      pt.ACTIVE!==false?'TRUE':'FALSE'];
    if (pt._rowIndex) { s.getRange(pt._rowIndex,1,1,5).setValues([row]); return {success:true,message:'Cập nhật loại đề xuất'}; }
    s.appendRow(row);
    return {success:true,message:'Thêm loại đề xuất thành công'};
  } catch(e) { return {success:false,error:e.message}; }
}

function deleteProposalType(rowIndex) {
  try { getSheet(SN.PROPOSAL_TYPES).deleteRow(rowIndex); return {success:true}; }
  catch(e) { return {success:false,error:e.message}; }
}

// ── PROPOSALS ─────────────────────────────────────────────────
function getProposals(filters) {
  try {
    const s = getSheet(SN.PROPOSALS);
    const data = s.getDataRange().getValues();
    if (data.length <= 1) return {success:true, data:[]};
    const h = data[0];
    let rows = data.slice(1).map((r,i)=>{
      const o={_rowIndex:i+2};
      h.forEach((col,j)=>o[col]=_readCellValue(r[j]));
      try { o._data = o.DATA_JSON ? JSON.parse(o.DATA_JSON) : {}; } catch(e){o._data={};}
      return o;
    });
    if (filters) {
      if (filters.loai)     rows = rows.filter(r=>r.LOAI_DX===filters.loai);
      if (filters.trangThai) rows = rows.filter(r=>r.TRANG_THAI===filters.trangThai);
    }
    rows.sort((a,b)=>new Date(b.NGAY_TAO)-new Date(a.NGAY_TAO));
    return {success:true, data:rows};
  } catch(e) { return {success:false,error:e.message}; }
}

function saveProposal(p) {
  try {
    const s = getSheet(SN.PROPOSALS);
    const now = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    const user = _getSessionEmail()||'?';
    const dataJson = JSON.stringify(p._data||{});
    const row = [p._ID||'DX_'+Date.now(), p.LOAI_DX||'', p.TRANG_THAI||'Chờ duyệt',
      p.NGAY_TAO||now, p.NGUOI_TAO||user, p.NGAY_DUYET||'', p.NGUOI_DUYET||'',
      p.GHI_CHU_DUYET||'', dataJson];
    if (p._rowIndex) {
      s.getRange(p._rowIndex,1,1,row.length).setValues([row]);
      writeLog('SỬA ĐX', p.LOAI_DX, p.TRANG_THAI);
      return {success:true,message:'Cập nhật đề xuất thành công'};
    }
    s.appendRow(row);
    writeLog('THÊM ĐX', p.LOAI_DX, p.TRANG_THAI);
    return {success:true,message:'Tạo đề xuất thành công'};
  } catch(e) { return {success:false,error:e.message}; }
}

function deleteProposal(rowIndex) {
  try { getSheet(SN.PROPOSALS).deleteRow(rowIndex); writeLog('XÓA ĐX','',''); return {success:true}; }
  catch(e) { return {success:false,error:e.message}; }
}

function updateProposalStatus(rowIndex, status, note) {
  try {
    const s = getSheet(SN.PROPOSALS);
    const now = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    const user = _getSessionEmail()||'?';
    s.getRange(rowIndex,3).setValue(status);
    s.getRange(rowIndex,6).setValue(now);
    s.getRange(rowIndex,7).setValue(user);
    s.getRange(rowIndex,8).setValue(note||'');
    writeLog('DUYỆT ĐX', status, note);
    return {success:true,message:'Cập nhật trạng thái thành công'};
  } catch(e) { return {success:false,error:e.message}; }
}

// ── SALARY PAYROLL REPORT ─────────────────────────────────────
// Logic: tại ngày asOfDate → mỗi NV tìm bản ghi HĐ hiệu lực gần nhất
// → lấy TẤT CẢ trường number trong bản ghi đó làm các khoản thu nhập thực tế
function getPayrollReport(params) {
  try {
    const asOf = params.asOfDate ? _parseDate(params.asOfDate) : Date.now();

    // 1. Lấy định nghĩa trường HĐ để biết trường nào là number
    const ctFields    = _getContractFields(true);
    // Loại trừ các trường đơn giá và Mức Lương (lương cơ bản không phải thu nhập thực nhận)
    const EXCLUDE_FROM_TOTAL = ['Mức thưởng năng suất 1 giờ','Đơn Giá','Đơn giá','Mức thưởng/giờ','Mức Lương'];
    const numberFields = ctFields.filter(f => f.type === 'number').map(f => f.label);
    const incomeFields = numberFields.filter(f => !EXCLUDE_FROM_TOTAL.includes(f));
    const dateFieldHL  = ctFields.find(f => f.key === 'ngayHL')?.label  || 'Ngày Hiệu Lực';
    const dateFieldHH  = ctFields.find(f => f.key === 'ngayHH')?.label  || 'Ngày Hết Hạn';
    const dateFieldKy  = ctFields.find(f => f.key === 'ngayKy')?.label  || 'Ngày Ký';
    const soHDField    = ctFields.find(f => f.key === 'soHD')?.label    || 'Số HĐ/Phụ Lục';
    const loaiHDField  = ctFields.find(f => f.key === 'loaiHD')?.label  || 'Loại HĐ/Phụ Lục';

    // 2. Lấy danh sách NV theo filter
    let emps = getAllEmployees().data || [];
    if (params.donVi)     emps = emps.filter(e => (e['Đơn Vị Phòng']||e['Đơn Vị']) === params.donVi);
    if (params.phapNhan)  emps = emps.filter(e => String(e['Pháp Nhân Chính']||'').trim() === params.phapNhan);
    if (params.coSo)      emps = emps.filter(e => e['Cơ Sở']      === params.coSo);
    if (params.trangThai) emps = emps.filter(e => e['Trạng Thái'] === params.trangThai);
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      emps = emps.filter(e => [e['Họ Tên'], e['Mã Nhân Viên']].join(' ').toLowerCase().includes(kw));
    }

    // 3. Đọc toàn bộ sheet HopDong một lần
    const hdSheet   = getSheet(SN.CONTRACTS);
    const hdData    = hdSheet.getLastRow() > 1 ? hdSheet.getDataRange().getValues() : [];
    const hdHeaders = hdData.length ? hdData[0] : [];
    const allContracts = hdData.slice(1).map(r => {
      const o = {};
      hdHeaders.forEach((h, j) => { o[h] = _readCellValue(r[j]); });
      return o;
    });

    // 4. Với mỗi NV, tìm HĐ hiệu lực tại asOf
    // Điều kiện: Ngày Hiệu Lực <= asOf VÀ (Ngày Hết Hạn trống HOẶC >= asOf)
    // Nếu nhiều HĐ cùng hợp lệ -> lấy bản có Ngày Hiệu Lực LỚN NHẤT (gần asOf nhất)
    const rows = emps.map(emp => {
      const maNV = emp['Mã Nhân Viên'];
      const myContracts = allContracts.filter(c =>
        String(c['MaNV'] || '').trim() === String(maNV).trim()
      );

      let activeHD = null;
      let bestHLTs = -1;
      myContracts.forEach(c => {
        const hlTs = _parseDate(String(c[dateFieldHL] || c[dateFieldKy] || ''));
        if (!hlTs || hlTs > asOf) return; // chưa hiệu lực

        const hhStr = String(c[dateFieldHH] || '').trim();
        const hhTs  = hhStr ? _parseDate(hhStr) : 0;
        if (hhTs && hhTs < asOf) return; // đã hết hạn

        if (hlTs > bestHLTs) { bestHLTs = hlTs; activeHD = c; }
      });

      // Lấy từng trường number từ bản HĐ hiệu lực -> đây là các khoản thu nhập thực tế
      const moneyData = {};
      let tongThuNhap = 0;
      numberFields.forEach(fieldLabel => {
        const raw = activeHD ? String(activeHD[fieldLabel] || '0').replace(/[^\d.]/g, '') : '0';
        const val = parseFloat(raw) || 0;
        moneyData[fieldLabel] = val;
        // Chỉ cộng vào tổng thu nhập nếu không phải đơn giá
        if (incomeFields.includes(fieldLabel)) tongThuNhap += val;
      });

      return {
        ...emp,
        '__soHD':        activeHD ? (activeHD[soHDField]   || '') : '(Chưa có HĐ)',
        '__loaiHD':      activeHD ? (activeHD[loaiHDField] || '') : '',
        '__ngayHL':      activeHD ? (activeHD[dateFieldHL] || '') : '',
        '__ngayHH':      activeHD ? (activeHD[dateFieldHH] || '') : '',
        ...moneyData,
        '__tongThuNhap': tongThuNhap,
      };
    });

    return {
      success:      true,
      data:         rows,
      numberFields: numberFields,  // frontend dùng để build cột tiền động
      asOfDate:     params.asOfDate,
    };
  } catch(e) { return { success:false, error:e.message }; }
}
function getSalaryReport(filters) {
  try {
    const empResult = getAllEmployees();
    if (!empResult.success) return empResult;
    let emps = empResult.data;
    if (filters) {
      if (filters.donVi)     emps = emps.filter(e=>(e['Đơn Vị Phòng']||e['Đơn Vị'])===filters.donVi);
      if (filters.phapNhan)  emps = emps.filter(e=>String(e['Pháp Nhân Chính']||'').trim()===filters.phapNhan);
      if (filters.coSo)      emps = emps.filter(e=>e['Cơ Sở']===filters.coSo);
      if (filters.trangThai) emps = emps.filter(e=>e['Trạng Thái']===filters.trangThai);
      if (filters.keyword) {
        const kw=filters.keyword.toLowerCase();
        emps=emps.filter(e=>[e['Họ Tên'],e['Mã Nhân Viên']].join(' ').toLowerCase().includes(kw));
      }
    }
    return {success:true, data:emps};
  } catch(e) { return {success:false,error:e.message}; }
}

// ── CONFIG: RENAME/DELETE CATEGORY ────────────────────────────
function renameCategoryKey(oldKey, newKey, newLabel) {
  try {
    const s = getSheet(SN.CONFIG);
    const data = s.getDataRange().getValues();
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === oldKey) {
        s.getRange(i+1,1).setValue(newKey);
        if (newLabel) s.getRange(i+1,2).setValue(newLabel);
        count++;
      }
    }
    writeLog('ĐỔI KEY', oldKey, `→ ${newKey}`);
    return {success:true, message:`Đã cập nhật ${count} dòng`};
  } catch(e) { return {success:false,error:e.message}; }
}

function deleteCategory(key) {
  try {
    const s = getSheet(SN.CONFIG);
    const data = s.getDataRange().getValues();
    let count = 0;
    for (let i = data.length-1; i >= 1; i--) {
      if (String(data[i][0]).trim() === key) { s.deleteRow(i+1); count++; }
    }
    writeLog('XÓA DM', key, `${count} dòng`);
    return {success:true, message:`Đã xóa danh mục "${key}" (${count} dòng)`};
  } catch(e) { return {success:false,error:e.message}; }
}

// ── BIRTHDAY LIST ─────────────────────────────────────────────
function saveBirthdayList(rows, title) {
  try {
    const ss = getSS();
    const sheetName = title.substring(0,75).replace(/[\\\/\?\*\[\]:]/g,'_');
    let s = ss.getSheetByName(sheetName);
    if(s) ss.deleteSheet(s);
    s = ss.insertSheet(sheetName);

    // ── Cấu hình cột ──────────────────────────────────────────
    // A=STT B=MSNV C=HọTên D=PhápNhân E=ĐơnVị F=ChứcVụ
    // G=NgàySinh H=SNNămNay I=TiềnCT J=TiềnCĐ K=Tổng
    const COL = { STT:1, MSNV:2, HO_TEN:3, PHAP_NHAN:4, DON_VI:5, CHUC_VU:6,
                  NGAY_SINH:7, SN_NAM_NAY:8, TIEN_CT:9, TIEN_CD:10, TONG:11 };
    const TOTAL_COLS = 11;

    // ── Chiều rộng cột ────────────────────────────────────────
    const widths = [6, 12, 22, 20, 20, 18, 13, 15, 16, 16, 16];
    widths.forEach((w,i) => { s.setColumnWidth(i+1, w*6.5); }); // approx pixel

    // ── DÒNG 1: Tên đơn vị (góc trái) ────────────────────────
    s.getRange('A1').setValue('HỆ THỐNG TRƯỜNG VIỆT MỸ');
    s.getRange('A1').setFontWeight('bold').setFontSize(11).setFontColor('#1a3c5e');
    s.getRange('A2').setValue('Phòng Hành Chính Nhân Sự');
    s.getRange('A2').setFontSize(10).setFontColor('#475569');

    // ── DÒNG 3: Tiêu đề chính (căn giữa toàn bảng) ───────────
    s.getRange(4, 1, 1, TOTAL_COLS).merge();
    s.getRange(4, 1).setValue(title)
      .setFontWeight('bold').setFontSize(14).setFontColor('#0d1b2a')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(4, 36);

    // Ngày tháng xuất báo cáo
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    s.getRange(5, 1, 1, TOTAL_COLS).merge();
    s.getRange(5, 1).setValue(`(Báo cáo ngày ${now})`)
      .setFontSize(9).setFontColor('#64748b').setHorizontalAlignment('center').setItalic(true);

    // ── DÒNG 6: Header bảng ───────────────────────────────────
    const headerRow = 6;
    const headers = ['STT','MSNV','Họ Tên','Pháp Nhân Chính',
      'Đơn Vị Phòng','Chức Vụ Chính','Ngày Sinh','Sinh Nhật Năm Nay',
      'Tiền Công Ty\n(VNĐ)','Tiền Chi Thay Công Đoàn\n(VNĐ)','Tổng Cộng\n(VNĐ)'];
    s.getRange(headerRow, 1, 1, TOTAL_COLS).setValues([headers])
      .setBackground('#1a3c5e').setFontColor('#ffffff').setFontWeight('bold')
      .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    s.setRowHeight(headerRow, 42);

    // ── Dữ liệu ───────────────────────────────────────────────
    const dataStart = headerRow + 1;
    rows.forEach((e, i) => {
      const r = dataStart + i;
      const tienCT = Number(e['_tienCT'])||0;
      const tienCD = Number(e['_tienCD'])||0;
      s.getRange(r, COL.STT).setValue(i+1).setHorizontalAlignment('center');
      s.getRange(r, COL.MSNV).setValue(e['Mã Nhân Viên']||'');
      s.getRange(r, COL.HO_TEN).setValue(e['Họ Tên']||'').setFontWeight('bold');
      s.getRange(r, COL.PHAP_NHAN).setValue(e['Pháp Nhân Chính']||'');
      s.getRange(r, COL.DON_VI).setValue(e['Đơn Vị Phòng']||e['Đơn Vị']||'');
      s.getRange(r, COL.CHUC_VU).setValue(e['Chức Vụ Chính']||'');
      s.getRange(r, COL.NGAY_SINH).setValue(e['Ngày Sinh']||'').setHorizontalAlignment('center');
      s.getRange(r, COL.SN_NAM_NAY).setValue(e['_snNamNay']||'').setHorizontalAlignment('center');
      s.getRange(r, COL.TIEN_CT).setValue(tienCT).setNumberFormat('#,##0').setHorizontalAlignment('right');
      s.getRange(r, COL.TIEN_CD).setValue(tienCD).setNumberFormat('#,##0').setHorizontalAlignment('right');
      s.getRange(r, COL.TONG).setFormula(`=I${r}+J${r}`).setNumberFormat('#,##0')
        .setHorizontalAlignment('right').setFontWeight('bold').setFontColor('#1a3c5e');
      // Zebra striping
      if(i%2===1) s.getRange(r, 1, 1, TOTAL_COLS).setBackground('#f0f4f8');
      s.setRowHeight(r, 22);
    });

    // ── Dòng TỔNG CỘNG ────────────────────────────────────────
    const totalRow = dataStart + rows.length;
    const lastDataRow = totalRow - 1;
    s.getRange(totalRow, 1, 1, COL.TIEN_CT-1).merge();
    s.getRange(totalRow, 1).setValue('TỔNG CỘNG').setHorizontalAlignment('center')
      .setFontWeight('bold').setFontSize(11);
    s.getRange(totalRow, COL.TIEN_CT)
      .setFormula(`=SUM(I${dataStart}:I${lastDataRow})`)
      .setNumberFormat('#,##0').setHorizontalAlignment('right').setFontWeight('bold');
    s.getRange(totalRow, COL.TIEN_CD)
      .setFormula(`=SUM(J${dataStart}:J${lastDataRow})`)
      .setNumberFormat('#,##0').setHorizontalAlignment('right').setFontWeight('bold');
    s.getRange(totalRow, COL.TONG)
      .setFormula(`=SUM(K${dataStart}:K${lastDataRow})`)
      .setNumberFormat('#,##0').setHorizontalAlignment('right').setFontWeight('bold').setFontColor('#16a34a');
    s.getRange(totalRow, 1, 1, TOTAL_COLS)
      .setBackground('#f0a500').setFontColor('#0d1b2a').setFontSize(11);
    s.setRowHeight(totalRow, 28);

    // ── BORDER cho toàn bảng ──────────────────────────────────
    const tableRange = s.getRange(headerRow, 1, rows.length+2, TOTAL_COLS);
    tableRange.setBorder(true, true, true, true, true, true,
      '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    // ── Phần CHỮ KÝ ───────────────────────────────────────────
    const sigRow = totalRow + 3;
    // Ngày ký
    s.getRange(sigRow, 1, 1, TOTAL_COLS).merge();
    s.getRange(sigRow, 1).setValue(`TP. Hồ Chí Minh, ngày       tháng       năm ${new Date().getFullYear()}`)
      .setHorizontalAlignment('right').setItalic(true).setFontSize(10);
    s.setRowHeight(sigRow, 22);

    // Tiêu đề chữ ký - 2 cột (trái và phải)
    const sigTitleRow = sigRow + 1;
    s.getRange(sigTitleRow, 1, 1, 4).merge();
    s.getRange(sigTitleRow, 1).setValue('NGƯỜI LẬP BẢNG')
      .setHorizontalAlignment('center').setFontWeight('bold').setFontSize(10);
    s.getRange(sigTitleRow, 7, 1, 5).merge();
    s.getRange(sigTitleRow, 7).setValue('TRƯỞNG PHÒNG HÀNH CHÍNH - NHÂN SỰ')
      .setHorizontalAlignment('center').setFontWeight('bold').setFontSize(10);

    // Ghi chú ký tên
    const sigNoteRow = sigTitleRow + 1;
    s.getRange(sigNoteRow, 1, 1, 4).merge();
    s.getRange(sigNoteRow, 1).setValue('(Ký, ghi rõ họ tên)')
      .setHorizontalAlignment('center').setFontSize(9).setItalic(true).setFontColor('#64748b');
    s.getRange(sigNoteRow, 7, 1, 5).merge();
    s.getRange(sigNoteRow, 7).setValue('(Ký, ghi rõ họ tên)')
      .setHorizontalAlignment('center').setFontSize(9).setItalic(true).setFontColor('#64748b');

    // Dòng ký (để trống)
    for(let r=sigNoteRow+1; r<=sigNoteRow+3; r++) s.setRowHeight(r, 22);

    // Tên người ký (để trống cho điền tay)
    const sigNameRow = sigNoteRow + 4;
    s.getRange(sigNameRow, 1, 1, 4).merge();
    s.getRange(sigNameRow, 1).setValue('').setHorizontalAlignment('center').setFontWeight('bold');
    s.getRange(sigNameRow, 7, 1, 5).merge();
    s.getRange(sigNameRow, 7).setValue('').setHorizontalAlignment('center').setFontWeight('bold');

    // ── Cài đặt IN ────────────────────────────────────────────
    s.setFrozenRows(headerRow); // Freeze đến header
    // Print area và page setup
    s.getRange(`A1:K${sigNameRow}`).activate();
    const pageSetup = s.getPageSetup ? s.getPageSetup() : null;
    // Set print area
    s.getRange(1, 1, sigNameRow, TOTAL_COLS).activate();
    const ss2 = getSS();
    // Page breaks nếu nhiều nhân sự
    if(rows.length > 30){
      for(let br=dataStart+29; br<totalRow; br+=30){
        s.insertHorizontalPageBreak(br);
      }
    }

    // ── URL tải về Excel ──────────────────────────────────────
    const fileId = ss.getId();
    const sheetId = s.getSheetId();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx&gid=${sheetId}`;

    writeLog('XUẤT DS SN', title, `${rows.length} NV`);
    return {
      success: true,
      message: `Đã tạo sheet "${sheetName}"`,
      exportUrl: exportUrl,
      sheetName: sheetName
    };
  } catch(e) { return { success:false, error:e.message }; }
}

function exportBirthdaySheet(rows, title) {
  return saveBirthdayList(rows, title);
}

// ── EXPIRING CONTRACTS ────────────────────────────────────────
function getExpiringContracts(fromDateStr, days) {
  try {
    const fromTs = fromDateStr ? _parseDate(fromDateStr) : Date.now();
    const toTs   = fromTs + (parseInt(days)||45)*86400000;

    // Đọc định nghĩa trường HĐ
    const ctFields   = _getContractFields(true);
    const dateHL     = ctFields.find(f=>f.key==='ngayHL')?.label || 'Ngày Hiệu Lực';
    const dateHH     = ctFields.find(f=>f.key==='ngayHH')?.label || 'Ngày Hết Hạn';
    const dateKy     = ctFields.find(f=>f.key==='ngayKy')?.label || 'Ngày Ký';
    const soHDField  = ctFields.find(f=>f.key==='soHD')?.label   || 'Số HĐ/Phụ Lục';
    const loaiHDField= ctFields.find(f=>f.key==='loaiHD')?.label || 'Loại HĐ/Phụ Lục';

    // Đọc sheet HĐ
    const hdSheet = getSheet(SN.CONTRACTS);
    const hdData  = hdSheet.getLastRow()>1 ? hdSheet.getDataRange().getValues() : [];
    const hdHeaders = hdData.length ? hdData[0] : [];
    const allHD = hdData.slice(1).map(r=>{
      const o={}; hdHeaders.forEach((h,j)=>o[h]=_readCellValue(r[j])); return o;
    });

    // Đọc NV để lấy thông tin
    const empMap = {};
    getAllEmployees().data.forEach(e=>empMap[e['Mã Nhân Viên']]=e);

    // Tìm HĐ hết hạn trong khoảng [fromTs, toTs]
    // Với mỗi NV, chỉ lấy HĐ hiệu lực gần nhất (không lấy HĐ đã bị thay thế)
    const empBestHD = {};
    allHD.forEach(c=>{
      const maNV = String(c['MaNV']||'').trim();
      if(!maNV) return;
      const hlTs = _parseDate(String(c[dateHL]||c[dateKy]||''));
      if(!hlTs) return;
      const hhStr = String(c[dateHH]||'').trim();
      const hhTs  = hhStr ? _parseDate(hhStr) : 0;
      if(!hhTs) return; // bỏ qua HĐ không xác định thời hạn
      if(hhTs < fromTs-86400000) return; // đã hết hạn trước fromTs

      // Lưu HĐ có ngày hiệu lực mới nhất cho mỗi NV
      if(!empBestHD[maNV] || hlTs > empBestHD[maNV]._hlTs) {
        empBestHD[maNV] = { ...c, _hlTs:hlTs, _hhTs:hhTs };
      }
    });

    // Lọc những HĐ hết hạn trong khoảng [fromTs, toTs]
    const results = [];
    Object.entries(empBestHD).forEach(([maNV, c])=>{
      if(c._hhTs >= fromTs && c._hhTs <= toTs) {
        const emp = empMap[maNV] || {};
        results.push({
          ...emp,
          '_soHD':   c[soHDField]  || '',
          '_loaiHD': c[loaiHDField]|| '',
          '_ngayHL': c[dateHL]     || '',
          '_ngayHH': c[dateHH]     || '',
          '_emailCT': emp['Email Công Ty'] || '',
        });
      }
    });

    // Sort theo ngày hết hạn tăng dần (sắp hết nhất lên đầu)
    results.sort((a,b)=>_parseDate(a['_ngayHH'])-_parseDate(b['_ngayHH']));
    writeLog('XEM HĐ HẾT HẠN', '', `${results.length} HĐ trong ${days} ngày`);
    return { success:true, data:results };
  } catch(e) { return { success:false, error:e.message }; }
}

// ── SEND EMAIL REMINDER ───────────────────────────────────────
function sendExpiryReminderEmail(rows, to, cc, subject, extraBody) {
  try {
    if(!rows||!rows.length) return { success:false, error:'Không có dữ liệu HĐ' };
    if(!to) return { success:false, error:'Thiếu email người nhận' };

    // Build HTML table
    let tableHtml = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;width:100%">
      <tr style="background:#1a3c5e;color:#fff">
        <th>#</th><th>MSNV</th><th>Họ Tên</th><th>Đơn Vị</th>
        <th>Số HĐ</th><th>Loại HĐ</th><th>Ngày HLực</th><th>Ngày Hết Hạn</th>
      </tr>`;
    rows.forEach((r,i)=>{
      const hhTs = _parseDate(String(r['_ngayHH']||''));
      const conLai = hhTs ? Math.round((hhTs-Date.now())/86400000) : '?';
      const color = conLai<14?'#dc2626':conLai<30?'#ea580c':'#f0a500';
      tableHtml += `<tr style="background:${i%2?'#f8f9fa':'#fff'}">
        <td style="text-align:center">${i+1}</td>
        <td><b>${r['Mã Nhân Viên']||''}</b></td>
        <td>${r['Họ Tên']||''}</td>
        <td>${r['Đơn Vị Phòng']||r['Đơn Vị']||''}</td>
        <td>${r['_soHD']||''}</td>
        <td>${r['_loaiHD']||''}</td>
        <td>${r['_ngayHL']||''}</td>
        <td style="color:${color};font-weight:bold">${r['_ngayHH']||''} (còn ${conLai} ngày)</td>
      </tr>`;
    });
    tableHtml += '</table>';

    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:900px">
        <div style="background:#1a3c5e;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">⚠️ Nhắc Nhở: Hợp Đồng Sắp Hết Hạn</h2>
          <p style="margin:6px 0 0;opacity:.8">Hệ thống HR Management · ${now}</p>
        </div>
        <div style="padding:16px 20px;border:1px solid #e2e8f0;border-top:none">
          ${extraBody ? `<p>${extraBody}</p>` : ''}
          <p>Kính gửi Phụ Trách Nhân Sự,</p>
          <p>Hệ thống phát hiện <strong>${rows.length} hợp đồng</strong> sắp hết hạn. Vui lòng kiểm tra và xử lý kịp thời:</p>
          ${tableHtml}
          <p style="margin-top:16px;color:#64748b;font-size:12px">Email này được gửi tự động từ Hệ Thống Quản Lý Nhân Sự.</p>
        </div>
      </div>`;

    GmailApp.sendEmail(to, subject, '', {
      htmlBody: htmlBody,
      cc: cc || '',
    });

    writeLog('GỬI EMAIL', to, `${rows.length} HĐ sắp hết hạn`);
    return { success:true, message:`Đã gửi email đến ${to}` };
  } catch(e) { return { success:false, error:e.message }; }
}

// ============================================================
// APPROVAL & COST TRACKING SYSTEM
// ============================================================

const SN2 = {
  APPROVALS:  'YeuCauDuyet',    // yêu cầu phê duyệt
  COSTS:      'ChiPhiNhanSu',   // chi phí nhân sự đã duyệt
  DDR:        'DeXuatDanhMuc',  // đề xuất giá trị dropdown mới
};

// ── SETUP APPROVAL SHEETS ─────────────────────────────────────
function setupApprovalSheets() {
  // Sheet yêu cầu duyệt
  const sa = getSheet(SN2.APPROVALS);
  if (sa.getLastRow() === 0) {
    const h = ['_ID','LOAI','TIEU_DE','NGAY_TAO','NGUOI_TAO',
               'TRANG_THAI','NGAY_DUYET','NGUOI_DUYET','LY_DO_TU_CHOI','DATA_JSON'];
    sa.appendRow(h);
    sa.getRange(1,1,1,h.length)
      .setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
    [80,120,200,110,140,100,110,140,200,400].forEach((w,i)=>sa.setColumnWidth(i+1,w));
  }
  // Sheet chi phí
  const sc = getSheet(SN2.COSTS);
  if (sc.getLastRow() === 0) {
    const h = ['_ID','NGAY_PHAT_SINH','THANG','NAM','LOAI_CHI_PHI',
               'MO_TA','MA_NV','HO_TEN','DON_VI','SO_TIEN','NGUON','YEU_CAU_ID','GHI_CHU'];
    sc.appendRow(h);
    sc.getRange(1,1,1,h.length)
      .setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
    [80,110,60,60,130,200,80,140,120,110,120,100,160].forEach((w,i)=>sc.setColumnWidth(i+1,w));
  }
  return { success:true, message:'Đã tạo sheet YeuCauDuyet và ChiPhiNhanSu' };
}

// ── SUBMIT APPROVAL REQUEST ────────────────────────────────────
// Lấy danh sách người có thể phê duyệt (Manager + Admin)
function getApproverList() {
  try {
    const s = _ensurePermSheet();
    const data = s.getDataRange().getValues();
    const h = data[0];
    const emailCol  = h.indexOf('EMAIL');
    const nameCol   = h.indexOf('HO_TEN');
    const quyenCol  = h.indexOf('QUYEN');
    const activeCol = h.indexOf('ACTIVE');
    const approvers = data.slice(1)
      .filter(r => {
        const quyen  = String(r[quyenCol]||'').toLowerCase();
        const active = String(r[activeCol]||'').toUpperCase();
        return (quyen === 'admin' || quyen === 'manager') && active === 'TRUE';
      })
      .map(r => ({
        email: String(r[emailCol]||'').trim(),
        name:  String(r[nameCol]||r[emailCol]||'').trim(),
        quyen: String(r[quyenCol]||'').trim(),
      }))
      .filter(a => a.email.includes('@'));
    return { success:true, data:approvers };
  } catch(e) { return { success:false, error:e.message, data:[] }; }
}

function submitApproval(loai, tieuDe, dataRows, approverEmailFromFrontend) {
  try {
    const s = getSheet(SN2.APPROVALS);
    const HEADERS = ['_ID','LOAI','TIEU_DE','NGAY_TAO','NGUOI_TAO',
                     'TRANG_THAI','NGAY_DUYET','NGUOI_DUYET','LY_DO_TU_CHOI','DATA_JSON',
                     'EMAIL_DE_XUAT','EMAIL_PHE_DUYET'];

    if (s.getLastRow() === 0) {
      s.appendRow(HEADERS);
      s.getRange(1,1,1,HEADERS.length)
        .setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
    } else {
      const firstCell = String(s.getRange(1,1).getValue()||'').trim();
      if (firstCell !== '_ID') {
        s.insertRowBefore(1);
        s.getRange(1,1,1,HEADERS.length).setValues([HEADERS])
          .setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
      }
    }

    const id   = 'YC_' + Date.now();
    const now  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const user = _getSessionEmail();
    const dataToSave = Array.isArray(dataRows) ? dataRows : [];

    // Ưu tiên email người phê duyệt từ frontend (người dùng đã chọn)
    let approverEmail = String(approverEmailFromFrontend||'').trim();

    // Fallback nếu không có: tự tìm từ hồ sơ hoặc Admin
    if (!approverEmail) {
      try {
        const empRows = getAllEmployees().data || [];
        const creator = empRows.find(e => e['Email Công Ty'] === user
                                       || e['Nhân Sự Quản Lý'] === user
                                       || e['Email'] === user);
        if (creator && creator['Người Phê Duyệt Hồ Sơ']) {
          const pdKey = String(creator['Người Phê Duyệt Hồ Sơ']).trim();
          if (pdKey && pdKey !== 'Không có') approverEmail = pdKey;
        }
        if (!approverEmail) {
          approverEmail = (_getAdminEmails() || []).join(',');
        }
      } catch(eApprover) {
        approverEmail = (_getAdminEmails() || []).join(',');
      }
    }

    s.appendRow([id, loai, tieuDe, now, user, 'Chờ duyệt', '', '', '',
                 JSON.stringify(dataToSave), user, approverEmail]);
    writeLog('GỬI DUYỆT', loai, tieuDe + ' (' + dataToSave.length + ' NV)');

    // Gửi email thông báo đến người phê duyệt
    if (approverEmail) {
      try {
        const toList = approverEmail.split(',').map(e=>e.trim()).filter(e=>e.includes('@'));
        if (toList.length) {
          const subject = `[HR] Yêu cầu phê duyệt: ${tieuDe}`;
          const htmlBody = _buildApprovalRequestEmail(tieuDe, loai, user, now, dataToSave.length, id);
          toList.forEach(to => {
            try { GmailApp.sendEmail(to, subject, '', { htmlBody }); } catch(e) {}
          });
        }
      } catch(emailErr) { Logger.log('submitApproval email error: ' + emailErr.message); }
    }

    return { success:true, message:'Đã gửi yêu cầu phê duyệt đến ' + approverEmail, id };
  } catch(e) {
    Logger.log('submitApproval error: ' + e.message);
    return { success:false, error:e.message };
  }
}

// Email template gửi người phê duyệt
function _buildApprovalRequestEmail(tieuDe, loai, nguoiGui, ngay, soNguoi, id) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0">
  <tr><td style="padding:6px 32px;background:#1a1a1a"></td></tr>
  <tr><td style="padding:24px 32px;border-bottom:1px solid #e0e0e0">
    <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Hệ thống Quản lý Nhân sự</p>
    <h1 style="margin:8px 0 0;font-size:20px;color:#1a1a1a;font-weight:700">Yêu cầu phê duyệt đề xuất</h1>
  </td></tr>
  <tr><td style="padding:24px 32px">
    <p style="margin:0 0 16px;color:#333;font-size:14px">Kính gửi,</p>
    <p style="margin:0 0 20px;color:#333;font-size:14px">Có một yêu cầu phê duyệt mới đang chờ xử lý của bạn:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;margin-bottom:20px">
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;width:38%;border-bottom:1px solid #e0e0e0">Tiêu đề</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${tieuDe}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Loại đề xuất</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${loai}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Người đề xuất</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${nguoiGui}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Số nhân sự liên quan</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${soNguoi} người</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555">Thời gian gửi</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a">${ngay}</td></tr>
    </table>
    <p style="margin:0 0 16px;color:#333;font-size:14px">Vui lòng đăng nhập hệ thống, vào tab <strong>Phê Duyệt</strong> để xem chi tiết và xử lý.</p>
    <p style="margin:0;font-size:12px;color:#999;border-top:1px solid #e0e0e0;padding-top:16px">Mã yêu cầu: ${id} · Email này được gửi tự động từ hệ thống HR.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── GET APPROVAL REQUESTS ──────────────────────────────────────
function getApprovals(filter) {
  try {
    const s = getSheet(SN2.APPROVALS);
    if (s.getLastRow() === 0) return { success:true, data:[] };

    const allData = s.getDataRange().getValues();
    if (!allData.length) return { success:true, data:[] };

    // Auto-detect: nếu row đầu tiên là header (bắt đầu bằng '_ID')
    // thì slice từ index 1, ngược lại đọc từ đầu với header cố định
    const FIXED_HEADERS = ['_ID','LOAI','TIEU_DE','NGAY_TAO','NGUOI_TAO',
                           'TRANG_THAI','NGAY_DUYET','NGUOI_DUYET','LY_DO_TU_CHOI','DATA_JSON'];

    let headers, dataRows;
    const firstCell = String(allData[0][0] || '').trim();

    if (firstCell === '_ID') {
      // Row đầu là header đúng
      headers  = allData[0].map(h => String(h).trim());
      dataRows = allData.slice(1);
    } else {
      // Không có header row — dùng header cố định
      headers  = FIXED_HEADERS;
      dataRows = allData;
    }

    // Đảm bảo headers đủ độ dài
    while (headers.length < FIXED_HEADERS.length) headers.push('');

    let rows = dataRows
      .filter(r => String(r[0]||'').trim() !== '' && String(r[0]||'').trim() !== '_ID')
      .map((r, i) => {
        const o = { _rowIndex: (firstCell === '_ID' ? i+2 : i+1) };
        headers.forEach((col, j) => {
          o[col] = _readCellValue(r[j]);
        });
        // Parse DATA_JSON
        try {
          const jsonStr = String(o['DATA_JSON'] || o[FIXED_HEADERS[9]] || '');
          o._data = jsonStr ? JSON.parse(jsonStr) : [];
        } catch(e) { o._data = []; }
        return o;
      });

    // Lọc theo trạng thái nếu có
    if (filter && filter.trangThai) {
      rows = rows.filter(r => r.TRANG_THAI === filter.trangThai);
    }

    // Sort mới nhất lên đầu
    rows.sort((a, b) => _parseDatetime(String(b.NGAY_TAO||'')) - _parseDatetime(String(a.NGAY_TAO||'')));

    Logger.log('getApprovals: found ' + rows.length + ' rows (header=' + firstCell + ')');
    return { success:true, data:rows };
  } catch(e) {
    Logger.log('getApprovals error: ' + e.message);
    return { success:false, error:e.message };
  }
}

// Parse dd/MM/yyyy HH:mm
function _parseDatetime(str) {
  if (!str) return 0;
  const parts = str.trim().split(' ');
  const d = parts[0] ? _parseDate(parts[0]) : 0;
  if (!d) return 0;
  if (parts[1]) {
    const tp = parts[1].split(':');
    return d + (Number(tp[0]||0)*3600 + Number(tp[1]||0)*60) * 1000;
  }
  return d;
}

// ── APPROVE / REJECT ───────────────────────────────────────────
function processApproval(rowIndex, action, lyDo) {
  try {
    const sa  = getSheet(SN2.APPROVALS);
    const lastCol = sa.getLastColumn();
    const row = sa.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    const id             = String(row[0] || '');
    const loai           = String(row[1] || '');
    const tieuDe         = String(row[2] || '');
    const ngayTao        = String(row[3] || '');
    const currentStatus  = String(row[5] || '').trim();
    const emailDeXuat    = String(row[10] || '').trim(); // cột 11 (index 10)
    const now     = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const approver= _getSessionEmail();

    if (currentStatus === 'Đã duyệt') {
      return { success:false, error:'Yêu cầu này đã được PHÊ DUYỆT trước đó. Không thể thay đổi.' };
    }
    if (currentStatus === 'Từ chối') {
      return { success:false, error:'Yêu cầu này đã bị TỪ CHỐI. Không thể thay đổi.' };
    }
    if (currentStatus !== 'Chờ duyệt') {
      return { success:false, error:'Trạng thái không hợp lệ: ' + currentStatus };
    }

    let dataRows = [];
    try { dataRows = JSON.parse(String(row[9] || '[]')); } catch(e) { dataRows = []; }

    if (action === 'approve') {
      // ── XỬ LÝ ĐẶC BIỆT: Mở Khoá Hồ Sơ ─────────────────────
      if (loai === 'Mở Khoá Hồ Sơ') {
        const maNVMatch = tieuDe.match(/NV:\s*(\S+)/);
        if (!maNVMatch) return { success:false, error:'Không tìm được Mã NV từ: ' + tieuDe };
        const maNV      = maNVMatch[1].trim();
        const empSheet  = getSheet(SN.EMPLOYEES);
        const empHdr    = empSheet.getRange(1,1,1,empSheet.getLastColumn()).getValues()[0];
        const lockedCol = empHdr.findIndex(h=>String(h).trim()==='_Locked');
        const maNVCol   = empHdr.findIndex(h=>String(h).trim()==='Mã Nhân Viên');
        if (lockedCol < 0) return { success:false, error:'Sheet NhanSu chưa có cột _Locked' };
        const empData = empSheet.getDataRange().getValues();
        let found = false;
        for (let i=1; i<empData.length; i++) {
          if (String(empData[i][maNVCol]||'').trim() === maNV) {
            empSheet.getRange(i+1, lockedCol+1).setValue('FALSE');
            found = true;
            break;
          }
        }
        if (!found) return { success:false, error:'Không tìm thấy nhân viên: ' + maNV };
        sa.getRange(rowIndex,6).setValue('Đã duyệt');
        sa.getRange(rowIndex,7).setValue(now);
        sa.getRange(rowIndex,8).setValue(approver);
        writeLog('MỞ KHOÁ', maNV, 'Phê duyệt bởi ' + approver);
        if (emailDeXuat && emailDeXuat.includes('@')) {
          try {
            const html = _buildApprovalResultEmail(tieuDe, loai, 'approve', approver, now, '');
            GmailApp.sendEmail(emailDeXuat, '[HR] Hồ sơ của bạn đã được mở khoá', '', { htmlBody:html });
          } catch(e) {}
        }
        return { success:true, message:'✅ Đã phê duyệt mở khoá hồ sơ ' + maNV };
      }

      // ── XỬ LÝ THÔNG THƯỜNG: Ghi chi phí ─────────────────────
      const sc = getSheet(SN2.COSTS);
      if (sc.getLastRow() > 1) {
        const existingData = sc.getDataRange().getValues();
        const alreadyRecorded = existingData.slice(1).some(r => String(r[11]) === id);
        if (alreadyRecorded) {
          sa.getRange(rowIndex, 6).setValue('Đã duyệt');
          sa.getRange(rowIndex, 7).setValue(now);
          sa.getRange(rowIndex, 8).setValue(approver);
          writeLog('PHÊ DUYỆT (đã có CP)', loai, tieuDe);
          return { success:true, message:'Đã phê duyệt (chi phí đã được ghi trước đó)' };
        }
      }
      sa.getRange(rowIndex, 6).setValue('Đã duyệt');
      sa.getRange(rowIndex, 7).setValue(now);
      sa.getRange(rowIndex, 8).setValue(approver);
      sa.getRange(rowIndex, 9).setValue('');
      _recordCosts(id, loai, tieuDe, dataRows);
      writeLog('PHÊ DUYỆT', loai, tieuDe);

      // Gửi email thông báo DUYỆT cho người đề xuất
      if (emailDeXuat && emailDeXuat.includes('@')) {
        try {
          const subj = `[HR] Đề xuất của bạn đã được phê duyệt`;
          const html = _buildApprovalResultEmail(tieuDe, loai, 'approve', approver, now, '');
          GmailApp.sendEmail(emailDeXuat, subj, '', { htmlBody: html });
        } catch(e) {}
      }
      return { success:true, message:'✅ Đã phê duyệt và ghi nhận chi phí nhân sự' };

    } else {
      sa.getRange(rowIndex, 6).setValue('Từ chối');
      sa.getRange(rowIndex, 7).setValue(now);
      sa.getRange(rowIndex, 8).setValue(approver);
      sa.getRange(rowIndex, 9).setValue(lyDo || '');
      writeLog('TỪ CHỐI', loai, tieuDe + ' | ' + (lyDo||''));

      // Gửi email thông báo TỪ CHỐI cho người đề xuất
      if (emailDeXuat && emailDeXuat.includes('@')) {
        try {
          const subj = `[HR] Phản hồi về đề xuất của bạn`;
          const html = _buildApprovalResultEmail(tieuDe, loai, 'reject', approver, now, lyDo||'');
          GmailApp.sendEmail(emailDeXuat, subj, '', { htmlBody: html });
        } catch(e) {}
      }
      return { success:true, message:'❌ Đã từ chối yêu cầu' };
    }
  } catch(e) {
    Logger.log('processApproval error: ' + e.message);
    return { success:false, error:e.message };
  }
}

// Email template gửi người đề xuất sau khi được xử lý
function _buildApprovalResultEmail(tieuDe, loai, action, nguoiDuyet, ngay, lyDo) {
  const isDuyet = action === 'approve';
  const accentColor = isDuyet ? '#16a34a' : '#dc2626';
  const statusText  = isDuyet ? 'Đã được phê duyệt' : 'Không được phê duyệt';
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0">
  <tr><td style="padding:6px 32px;background:#1a1a1a"></td></tr>
  <tr><td style="padding:24px 32px;border-bottom:1px solid #e0e0e0">
    <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Hệ thống Quản lý Nhân sự</p>
    <h1 style="margin:8px 0 0;font-size:20px;color:#1a1a1a;font-weight:700">Kết quả xử lý đề xuất</h1>
  </td></tr>
  <tr><td style="padding:24px 32px">
    <p style="margin:0 0 16px;color:#333;font-size:14px">Xin chào,</p>
    <p style="margin:0 0 20px;color:#333;font-size:14px">Đề xuất của bạn đã được xem xét và xử lý:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;margin-bottom:20px">
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;width:38%;border-bottom:1px solid #e0e0e0">Tiêu đề đề xuất</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${tieuDe}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Loại</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${loai}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Kết quả</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${accentColor};border-bottom:1px solid #e0e0e0">${isDuyet?'✅ ':' ❌ '}${statusText}</td></tr>
      ${!isDuyet && lyDo ? `<tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Lý do không phê duyệt</td>
          <td style="padding:10px 14px;font-size:13px;color:#dc2626;font-weight:700;border-bottom:1px solid #e0e0e0">${lyDo}</td></tr>` : ''}
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Người xử lý</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${nguoiDuyet}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555">Thời gian</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a">${ngay}</td></tr>
    </table>
    ${isDuyet ? '<p style="margin:0 0 16px;color:#333;font-size:14px">Đề xuất đã được ghi nhận vào hệ thống chi phí nhân sự.</p>' : '<p style="margin:0 0 16px;color:#333;font-size:14px">Nếu có thắc mắc, vui lòng liên hệ người phê duyệt.</p>'}
    <p style="margin:0;font-size:12px;color:#999;border-top:1px solid #e0e0e0;padding-top:16px">Email này được gửi tự động từ hệ thống HR.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── XÓA CHI PHÍ TRÙNG (chạy thủ công trong GAS Editor nếu cần) ──
function cleanupDuplicateCosts() {
  try {
    const sc = getSheet(SN2.COSTS);
    if (sc.getLastRow() <= 1) { Logger.log('Không có data'); return; }
    const data = sc.getDataRange().getValues();
    const headers = data[0];
    // Tạo key = YeuCauId + MaNV + LoaiChiPhi
    const seen = {};
    const toDelete = [];
    data.slice(1).forEach((row, i) => {
      const key = `${row[11]}_${row[6]}_${row[5]}`; // YEU_CAU_ID + MA_NV + MO_TA
      if (seen[key]) {
        toDelete.push(i + 2); // rowIndex (1-based + header)
        Logger.log(`Duplicate at row ${i+2}: ${key}`);
      } else {
        seen[key] = true;
      }
    });
    // Xóa từ dưới lên để không lệch index
    toDelete.reverse().forEach(r => sc.deleteRow(r));
    Logger.log(`Đã xóa ${toDelete.length} dòng chi phí trùng`);
    return { deleted: toDelete.length };
  } catch(e) {
    Logger.log('cleanupDuplicateCosts error: ' + e.message);
  }
}

// ── RECORD COSTS ───────────────────────────────────────────────
function _recordCosts(yeuCauId, loai, tieuDe, dataRows) {
  const sc    = getSheet(SN2.COSTS);
  const now   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const today = new Date();
  const thang = today.getMonth() + 1;
  const nam   = today.getFullYear();

  // Đảm bảo sheet có header
  if (sc.getLastRow() === 0) {
    const h = ['_ID','NGAY_PHAT_SINH','THANG','NAM','LOAI_CHI_PHI',
               'MO_TA','MA_NV','HO_TEN','DON_VI','SO_TIEN','NGUON','YEU_CAU_ID','GHI_CHU'];
    sc.appendRow(h);
    sc.getRange(1,1,1,h.length).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
  }

  // dataRows có thể là format compact {maNV, hoTen, donVi, tienCT, tienCD}
  // hoặc format cũ {'Mã Nhân Viên', 'Họ Tên', '_tienCT', '_tienCD'}
  dataRows.forEach((e, i) => {
    const maNV  = e.maNV  || e['Mã Nhân Viên'] || '';
    const hoTen = e.hoTen || e['Họ Tên']        || '';
    const donVi = e.donVi || e['Đơn Vị Phòng']  || e['Đơn Vị'] || '';
    const tienCT = Number(e.tienCT || e['_tienCT']) || 0;
    const tienCD = Number(e.tienCD || e['_tienCD']) || 0;

    if (tienCT > 0) {
      sc.appendRow(['CP_CT_'+Date.now()+'_'+i, now, thang, nam, loai,
        tieuDe + ' - Tiền Công Ty', maNV, hoTen, donVi, tienCT, 'Công Ty', yeuCauId, '']);
    }
    if (tienCD > 0) {
      sc.appendRow(['CP_CD_'+Date.now()+'_'+i, now, thang, nam, loai,
        tieuDe + ' - Tiền Chi Thay Công Đoàn', maNV, hoTen, donVi, tienCD, 'Công Đoàn', yeuCauId, '']);
    }
  });
}

// ── COST REPORT ─────────────────────────────────────────────────
function getCostReport(params) {
  // params: { fromDate, toDate, loai, donVi }  (dd/MM/yyyy)
  try {
    const sc = getSheet(SN2.COSTS);
    const data = sc.getDataRange().getValues();
    if (data.length <= 1) return { success:true, data:[], summary:{} };
    const h = data[0];

    let rows = data.slice(1).map(r => {
      const o = {};
      h.forEach((col,j) => o[col] = _readCellValue(r[j]));
      return o;
    });

    // Lọc theo khoảng ngày
    const fromTs = params.fromDate ? _parseDate(params.fromDate) : 0;
    const toTs   = params.toDate   ? _parseDate(params.toDate)   : 0;
    if (fromTs) rows = rows.filter(r => {
      const ts = _parseDate(String(r.NGAY_PHAT_SINH||''));
      return ts >= fromTs;
    });
    if (toTs) rows = rows.filter(r => {
      const ts = _parseDate(String(r.NGAY_PHAT_SINH||''));
      return ts <= toTs;
    });

    if (params.loai)  rows = rows.filter(r => r.LOAI_CHI_PHI === params.loai);
    if (params.donVi) rows = rows.filter(r => r.DON_VI       === params.donVi);

    const byLoai = {}, byMonth = {};
    let tongCong = 0;
    rows.forEach(r => {
      const so = Number(r.SO_TIEN) || 0;
      tongCong += so;
      byLoai[r.LOAI_CHI_PHI] = (byLoai[r.LOAI_CHI_PHI]||0) + so;
      const mk = `${r.THANG}/${r.NAM}`;
      byMonth[mk] = (byMonth[mk]||0) + so;
    });

    return { success:true, data:rows, summary:{ byLoai, byMonth, tongCong } };
  } catch(e) { return { success:false, error:e.message }; }
}


// ============================================================
// ĐỀ XUẤT GIÁ TRỊ DANH MỤC (DROPDOWN SUGGESTION)
// ============================================================

function _ensureDDRSheet() {
  const ss = getSS();
  let s = ss.getSheetByName(SN2.DDR);
  if (!s) {
    s = ss.insertSheet(SN2.DDR);
    const h = ['_ID','CFG_KEY','CFG_LABEL','GIA_TRI_MOI','MO_TA','NGUOI_DE_XUAT',
                'EMAIL_DE_XUAT','NGAY_DE_XUAT','TRANG_THAI','NGUOI_DUYET',
                'NGAY_DUYET','LY_DO'];
    s.appendRow(h);
    s.getRange(1,1,1,h.length).setBackground('#0891b2').setFontColor('#fff').setFontWeight('bold');
  }
  return s;
}

function submitDropdownRequest(data) {
  // data: { cfgKey, cfgLabel, newValue, description }
  try {
    const email = _getSessionEmail();
    const s = _ensureDDRSheet();
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const id = 'DDR_' + Date.now();

    // Kiểm tra trùng (cùng cfgKey, cùng giá trị, đang chờ duyệt)
    const rows = s.getLastRow() > 1 ? s.getDataRange().getValues() : [];
    const h = rows[0] || [];
    const keyCol = h.indexOf('CFG_KEY'), valCol = h.indexOf('GIA_TRI_MOI'), stCol = h.indexOf('TRANG_THAI');
    if (rows.length > 1) {
      const dup = rows.slice(1).find(r =>
        String(r[keyCol]||'').toLowerCase() === String(data.cfgKey||'').toLowerCase() &&
        String(r[valCol]||'').toLowerCase() === String(data.newValue||'').trim().toLowerCase() &&
        String(r[stCol]||'') === 'Chờ duyệt'
      );
      if (dup) return { success:false, error:'Đã có đề xuất tương tự đang chờ phê duyệt.' };
    }

    // Kiểm tra trùng với giá trị đã có trong danh mục
    const existingVals = (getConfigByKey(data.cfgKey).values || []).map(v => v.toLowerCase());
    if (existingVals.includes(String(data.newValue||'').trim().toLowerCase())) {
      return { success:false, error:'Giá trị này đã tồn tại trong danh mục.' };
    }

    s.appendRow([id, data.cfgKey, data.cfgLabel, String(data.newValue||'').trim(),
                 data.description||'', email, email, now,
                 'Chờ duyệt', '', '', '']);

    // Gửi email thông báo đến Admin
    try {
      const admins = _getAdminEmails();
      if (admins.length) {
        const subject = `[HR] Yêu cầu phê duyệt: Đề xuất giá trị mới cho danh mục "${data.cfgLabel}"`;
        const htmlBody = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0">
  <tr><td style="padding:24px 32px;border-bottom:3px solid #1a1a1a">
    <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Hệ thống Quản lý Nhân sự</p>
    <h1 style="margin:8px 0 0;font-size:20px;color:#1a1a1a;font-weight:700">Yêu cầu phê duyệt đề xuất</h1>
  </td></tr>
  <tr><td style="padding:24px 32px">
    <p style="margin:0 0 16px;color:#333;font-size:14px">Kính gửi Quản trị viên,</p>
    <p style="margin:0 0 20px;color:#333;font-size:14px">Có một đề xuất mới cần phê duyệt. Vui lòng đăng nhập hệ thống để xem xét và xử lý.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;margin-bottom:20px">
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;width:38%;border-bottom:1px solid #e0e0e0">Danh mục</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${data.cfgLabel}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Giá trị đề xuất</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${data.newValue}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Lý do đề xuất</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${data.description||'Không có mô tả'}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Người đề xuất</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${email}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555">Thời gian</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a">${now}</td></tr>
    </table>
    <p style="margin:0;font-size:12px;color:#999;border-top:1px solid #e0e0e0;padding-top:16px">Mã đề xuất: ${id} · Email này được gửi tự động từ hệ thống HR.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
        admins.forEach(a => {
          try { GmailApp.sendEmail(a, subject, '', { htmlBody }); } catch(e) {}
        });
      }
    } catch(emailErr) { Logger.log('DDR email error: '+emailErr.message); }

    writeLog('ĐỀ XUẤT DM', data.cfgKey, `"${data.newValue}" bởi ${email}`);
    return { success:true, message:'Đề xuất đã được gửi! Admin sẽ xem xét và phản hồi qua email.' };
  } catch(e) { return { success:false, error:e.message }; }
}

function getDropdownRequests(params) {
  // params: { status } — 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối' | ''
  try {
    const s = _ensureDDRSheet();
    const data = s.getLastRow() > 1 ? s.getDataRange().getValues() : [[]];
    if (data.length <= 1) return { success:true, data:[] };
    const h = data[0];
    let rows = data.slice(1).map((r,i)=>{
      const o={_rowIndex:i+2}; h.forEach((col,j)=>o[col]=String(r[j]||'').trim()); return o;
    });
    if (params && params.status) rows = rows.filter(r=>r.TRANG_THAI===params.status);
    rows.sort((a,b)=>b.NGAY_DE_XUAT.localeCompare(a.NGAY_DE_XUAT));
    return { success:true, data:rows };
  } catch(e) { return { success:false, error:e.message }; }
}

function approveDropdownRequest(rowIndex, cfgKey, newValue, cfgLabel) {
  try {
    const approver = _getSessionEmail();
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const s = _ensureDDRSheet();
    const h = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    const stCol = h.indexOf('TRANG_THAI')+1, dvCol = h.indexOf('NGUOI_DUYET')+1,
          dtCol = h.indexOf('NGAY_DUYET')+1;
    s.getRange(rowIndex,stCol).setValue('Đã duyệt');
    s.getRange(rowIndex,dvCol).setValue(approver);
    s.getRange(rowIndex,dtCol).setValue(now);

    // Thêm vào danh mục cấu hình — cấu trúc sheet: KEY | LABEL | VALUE
    const cfgSheet = getSheet(SN.CONFIG);
    cfgSheet.appendRow([cfgKey, cfgLabel, newValue]);
    // Xóa placeholder __EMPTY__ nếu có
    deletePlaceholder(cfgKey);

    // Gửi email thông báo người đề xuất
    try {
      const emailCol = s.getRange(1,1,1,s.getLastColumn()).getValues()[0].indexOf('EMAIL_DE_XUAT');
      const proposerEmail = String(s.getRange(rowIndex, emailCol+1).getValue()||'');
      if (proposerEmail && proposerEmail.includes('@')) {
        const subject = `[HR] Đề xuất của bạn đã được phê duyệt`;
        const htmlBody = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0">
  <tr><td style="padding:6px 32px;background:#1a1a1a"></td></tr>
  <tr><td style="padding:24px 32px;border-bottom:1px solid #e0e0e0">
    <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Hệ thống Quản lý Nhân sự</p>
    <h1 style="margin:8px 0 0;font-size:20px;color:#1a1a1a;font-weight:700">Đề xuất đã được phê duyệt</h1>
  </td></tr>
  <tr><td style="padding:24px 32px">
    <p style="margin:0 0 16px;color:#333;font-size:14px">Xin chào,</p>
    <p style="margin:0 0 20px;color:#333;font-size:14px">Đề xuất của bạn đã được xem xét và <strong>phê duyệt</strong>. Giá trị mới sẽ có hiệu lực ngay trong hệ thống.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;margin-bottom:20px">
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;width:38%;border-bottom:1px solid #e0e0e0">Danh mục</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${cfgLabel}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Giá trị được thêm</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${newValue}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Người phê duyệt</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${approver}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555">Thời gian</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a">${now}</td></tr>
    </table>
    <p style="margin:0;font-size:12px;color:#999;border-top:1px solid #e0e0e0;padding-top:16px">Email này được gửi tự động từ hệ thống HR.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
        GmailApp.sendEmail(proposerEmail, subject, '', { htmlBody });
      }
    } catch(e) {}

    writeLog('DUYỆT DM', cfgKey, `"${newValue}" bởi ${approver}`);
    return { success:true, message:`Đã phê duyệt và thêm "${newValue}" vào danh mục "${cfgLabel}"` };
  } catch(e) { return { success:false, error:e.message }; }
}

function rejectDropdownRequest(rowIndex, cfgKey, newValue, cfgLabel, reason) {
  try {
    if (!reason || !reason.trim()) return { success:false, error:'Vui lòng nhập lý do từ chối.' };
    const approver = _getSessionEmail();
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const s = _ensureDDRSheet();
    const h = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    const stCol = h.indexOf('TRANG_THAI')+1, dvCol = h.indexOf('NGUOI_DUYET')+1,
          dtCol = h.indexOf('NGAY_DUYET')+1, lyDoCol = h.indexOf('LY_DO')+1;
    s.getRange(rowIndex,stCol).setValue('Từ chối');
    s.getRange(rowIndex,dvCol).setValue(approver);
    s.getRange(rowIndex,dtCol).setValue(now);
    s.getRange(rowIndex,lyDoCol).setValue(reason);

    // Gửi email thông báo từ chối
    try {
      const emailCol = h.indexOf('EMAIL_DE_XUAT');
      const proposerEmail = String(s.getRange(rowIndex, emailCol+1).getValue()||'');
      if (proposerEmail && proposerEmail.includes('@')) {
        const subject = `[HR] Phản hồi về đề xuất của bạn`;
        const htmlBody = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0">
  <tr><td style="padding:6px 32px;background:#1a1a1a"></td></tr>
  <tr><td style="padding:24px 32px;border-bottom:1px solid #e0e0e0">
    <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Hệ thống Quản lý Nhân sự</p>
    <h1 style="margin:8px 0 0;font-size:20px;color:#1a1a1a;font-weight:700">Đề xuất không được phê duyệt</h1>
  </td></tr>
  <tr><td style="padding:24px 32px">
    <p style="margin:0 0 16px;color:#333;font-size:14px">Xin chào,</p>
    <p style="margin:0 0 20px;color:#333;font-size:14px">Sau khi xem xét, đề xuất của bạn chưa được chấp thuận. Thông tin chi tiết bên dưới:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;margin-bottom:20px">
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;width:38%;border-bottom:1px solid #e0e0e0">Danh mục</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${cfgLabel}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Giá trị đề xuất</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${newValue}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Lý do không phê duyệt</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${reason}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #e0e0e0">Người xử lý</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e0e0e0">${approver}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#555">Thời gian</td>
          <td style="padding:10px 14px;font-size:13px;color:#1a1a1a">${now}</td></tr>
    </table>
    <p style="margin:0 0 16px;color:#333;font-size:14px">Nếu có thắc mắc, vui lòng liên hệ quản trị viên hệ thống.</p>
    <p style="margin:0;font-size:12px;color:#999;border-top:1px solid #e0e0e0;padding-top:16px">Email này được gửi tự động từ hệ thống HR.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
        GmailApp.sendEmail(proposerEmail, subject, '', { htmlBody });
      }
    } catch(e) {}

    writeLog('TỪ CHỐI DM', cfgKey, `"${newValue}" — ${reason}`);
    return { success:true, message:`Đã từ chối đề xuất "${newValue}"` };
  } catch(e) { return { success:false, error:e.message }; }
}

function _getAdminEmails() {
  try {
    const s = _ensurePermSheet();
    const data = s.getDataRange().getValues();
    const h = data[0];
    const emailCol = h.indexOf('EMAIL'), quyenCol = h.indexOf('QUYEN'), activeCol = h.indexOf('ACTIVE');
    return data.slice(1)
      .filter(r => String(r[quyenCol]||'').toLowerCase()==='admin' && String(r[activeCol]||'').toUpperCase()==='TRUE')
      .map(r => String(r[emailCol]||'').trim())
      .filter(e => e.includes('@'));
  } catch(e) { return []; }
}

// ── DEBUG: Chạy trong GAS Editor để kiểm tra ─────────────────
function debugApprovals() {
  try {
    const s = getSheet(SN2.APPROVALS);
    Logger.log('Sheet name: ' + s.getName());
    Logger.log('Last row: ' + s.getLastRow());
    Logger.log('Last col: ' + s.getLastColumn());
    if (s.getLastRow() > 0) {
      const data = s.getDataRange().getValues();
      Logger.log('Header: ' + JSON.stringify(data[0]));
      if (data.length > 1) {
        Logger.log('Row 2 (first data): ' + JSON.stringify(data[1]));
        Logger.log('DATA_JSON length: ' + String(data[1][9]||'').length);
      }
    }
    // Test getApprovals
    const r = getApprovals({});
    Logger.log('getApprovals result: success=' + r.success + ' count=' + (r.data||[]).length);
    if (r.error) Logger.log('Error: ' + r.error);
  } catch(e) {
    Logger.log('debugApprovals error: ' + e.message + '\n' + e.stack);
  }
}

function debugFixApprovalSheet() {
  // Gọi hàm này nếu sheet YeuCauDuyet bị thiếu header
  const s = getSheet(SN2.APPROVALS);
  const lastRow = s.getLastRow();
  Logger.log('Current lastRow: ' + lastRow);

  if (lastRow === 0) {
    const h = ['_ID','LOAI','TIEU_DE','NGAY_TAO','NGUOI_TAO',
               'TRANG_THAI','NGAY_DUYET','NGUOI_DUYET','LY_DO_TU_CHOI','DATA_JSON'];
    s.appendRow(h);
    s.getRange(1,1,1,h.length).setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
    Logger.log('Created header row');
  } else {
    const firstRow = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    Logger.log('First row: ' + JSON.stringify(firstRow));
    // Kiểm tra có phải header không
    if (firstRow[0] === '_ID') {
      Logger.log('Header OK');
    } else {
      Logger.log('WARNING: First row is NOT header - it may be data without header');
      Logger.log('Inserting header at row 1...');
      s.insertRowBefore(1);
      const h = ['_ID','LOAI','TIEU_DE','NGAY_TAO','NGUOI_TAO',
                 'TRANG_THAI','NGAY_DUYET','NGUOI_DUYET','LY_DO_TU_CHOI','DATA_JSON'];
      s.getRange(1,1,1,h.length).setValues([h])
        .setBackground('#7c3aed').setFontColor('#fff').setFontWeight('bold');
      Logger.log('Inserted header');
    }
  }
}

// ── DEBUG CHI TIẾT ────────────────────────────────────────────
function debugApprovalDetail() {
  const s = getSheet(SN2.APPROVALS);
  const lastRow = s.getLastRow();
  const lastCol = s.getLastColumn();
  Logger.log('=== SHEET INFO ===');
  Logger.log('Sheet: ' + s.getName());
  Logger.log('Rows: ' + lastRow + ', Cols: ' + lastCol);

  if (lastRow === 0) { Logger.log('Sheet RỖNG'); return; }

  const allData = s.getDataRange().getValues();
  Logger.log('\n=== ROW 1 (header?) ===');
  Logger.log(JSON.stringify(allData[0]));

  if (allData.length > 1) {
    Logger.log('\n=== ROW 2 (data) ===');
    const row2 = allData[1];
    row2.forEach((v,i) => {
      Logger.log(`Col ${i+1}: ${JSON.stringify(String(v).substring(0,80))}`);
    });
  }

  Logger.log('\n=== TEST getApprovals ===');
  // Thử đọc thủ công không dùng header map
  const raw = s.getRange(2, 1, Math.min(lastRow-1,3), lastCol).getValues();
  raw.forEach((r,i) => {
    Logger.log(`Data row ${i+2}: ID=${r[0]}, LOAI=${r[1]}, TIEU_DE=${r[2]}, TRANG_THAI=${r[5]}`);
  });
}

// ============================================================
// STATUS MANAGEMENT & RECORD LOCKING
// ============================================================

// Các trạng thái cần thông tin bổ sung
const STATUS_EXTRA = {
  'Không hưởng lương': {fields:['Từ Ngày','Đến Ngày','Lý Do'], lock:false},
  'Thai sản':          {fields:['Từ Ngày','Đến Ngày','Lý Do'], lock:false},
  'Tạm ngưng':         {fields:['Từ Ngày','Đến Ngày','Lý Do'], lock:false},
  'Nghỉ việc':         {fields:['Ngày Nghỉ Dự Kiến','Lý Do Nghỉ'], lock:false},
  'Đã nghỉ việc':      {fields:['Ngày Nghỉ Chính Thức','Ghi Chú'], lock:true},
};

// Cập nhật trạng thái nhân viên với thông tin bổ sung
function updateEmployeeStatus(maNV, rowIndex, newStatus, extraInfo) {
  try {
    const s = getSheet(SN.EMPLOYEES);
    const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];

    // Tìm cột Trạng Thái
    const ttCol = headers.findIndex(h=>String(h).trim()==='Trạng Thái');
    if (ttCol < 0) return {success:false, error:'Không tìm thấy cột Trạng Thái'};

    // ✅ FIX: Tra cứu theo Mã NV thay vì tin rowIndex từ client
    // (rowIndex có thể lệch nếu sheet bị sort/insert/delete sau khi client load data)
    const maNVCol = headers.findIndex(h=>String(h).trim()==='Mã Nhân Viên');
    if (maNVCol < 0) return {success:false, error:'Không tìm thấy cột Mã Nhân Viên'};
    if (!maNV) return {success:false, error:'Thiếu Mã Nhân Viên'};

    const maNVTrim = String(maNV).trim();
    const lastRow = s.getLastRow();
    let actualRowIndex = -1;
    if (lastRow >= 2) {
      const maNVCol1D = s.getRange(2, maNVCol+1, lastRow-1, 1).getValues();
      for (let i=0; i<maNVCol1D.length; i++) {
        if (String(maNVCol1D[i][0]||'').trim() === maNVTrim) {
          actualRowIndex = i + 2; // +2 vì bỏ header và index bắt đầu từ 0
          break;
        }
      }
    }

    // Fallback: nếu không tra được (edge case), thử rowIndex client gửi
    // nhưng bắt buộc phải khớp Mã NV để tuyệt đối không ghi nhầm NV khác
    if (actualRowIndex < 0 && rowIndex) {
      const checkMaNV = String(s.getRange(rowIndex, maNVCol+1).getValue()||'').trim();
      if (checkMaNV === maNVTrim) actualRowIndex = rowIndex;
    }

    if (actualRowIndex < 0) {
      return {success:false, error:'Không tìm thấy nhân viên: ' + maNV + '. Vui lòng F5 để load lại danh sách.'};
    }

    // Kiểm tra hồ sơ có bị khoá không
    const lockedCol = headers.findIndex(h=>String(h).trim()==='_Locked');
    if (lockedCol >= 0) {
      const isLocked = String(s.getRange(actualRowIndex, lockedCol+1).getValue()).trim();
      if (isLocked === 'TRUE') {
        return {success:false, error:'Hồ sơ đã bị khoá. Cần gửi yêu cầu mở hồ sơ và được Admin phê duyệt.'};
      }
    }

    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const user = _getSessionEmail()||'Unknown';

    // Ghi trạng thái mới
    s.getRange(actualRowIndex, ttCol+1).setValue(newStatus);

    // Khoá hồ sơ nếu nghỉ việc hoàn tất
    if (newStatus === 'Đã nghỉ việc') {
      if (lockedCol >= 0) {
        s.getRange(actualRowIndex, lockedCol+1).setValue('TRUE');
      } else {
        const newCol = s.getLastColumn()+1;
        s.getRange(1, newCol).setValue('_Locked');
        s.getRange(actualRowIndex, newCol).setValue('TRUE');
      }
    }

    writeLog('ĐỔI TRẠNG THÁI', maNV, `${newStatus} | ${JSON.stringify(extraInfo||{})}`);
    // Ghi nhận tự động vào sheet LichSuNhanSu (không ghi vào Ghi Chú nữa)
    _autoRecordHistory(maNV, newStatus, extraInfo||{});
    return {success:true, message:`Đã cập nhật trạng thái: ${newStatus}`};
  } catch(e) { return {success:false, error:e.message}; }
}

// Gửi yêu cầu mở khoá hồ sơ
function submitUnlockRequest(maNV, rowIndex, lyDo) {
  try {
    const tieuDe = `Yêu Cầu Mở Khoá Hồ Sơ NV: ${maNV}`;
    const compact = [{
      maNV, hoTen:'', donVi:'',
      lyDo: lyDo||'', tienCT:0, tienCD:0
    }];
    return submitApproval('Mở Khoá Hồ Sơ', tieuDe, compact);
  } catch(e) { return {success:false, error:e.message}; }
}

// Admin phê duyệt mở khoá
function processUnlockApproval(rowIndex, action, lyDo) {
  try {
    const sa = getSheet(SN2.APPROVALS);
    const row = sa.getRange(rowIndex,1,1,10).getValues()[0];
    const loai    = String(row[1]||'');
    const tieuDe  = String(row[2]||'');
    const now     = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const user    = _getSessionEmail()||'Unknown';

    if (loai !== 'Mở Khoá Hồ Sơ') {
      return {success:false, error:'Không phải yêu cầu mở khoá'};
    }

    if (action === 'approve') {
      // Tìm MaNV từ tieuDe
      const maNVMatch = tieuDe.match(/NV:\s*(\S+)/);
      if (maNVMatch) {
        const maNV = maNVMatch[1];
        const empSheet = getSheet(SN.EMPLOYEES);
        const headers = empSheet.getRange(1,1,1,empSheet.getLastColumn()).getValues()[0];
        const lockedCol = headers.findIndex(h=>String(h).trim()==='_Locked');
        const maNVCol   = headers.findIndex(h=>String(h).trim()==='Mã Nhân Viên');
        if (lockedCol >= 0 && maNVCol >= 0) {
          const data = empSheet.getDataRange().getValues();
          for (let i=1; i<data.length; i++) {
            if (String(data[i][maNVCol]).trim()===String(maNV).trim()) {
              empSheet.getRange(i+1, lockedCol+1).setValue('FALSE');
              break;
            }
          }
        }
      }
      sa.getRange(rowIndex,6).setValue('Đã duyệt');
      sa.getRange(rowIndex,7).setValue(now);
      sa.getRange(rowIndex,8).setValue(user);
      writeLog('MỞ KHOÁ', tieuDe, user);
      return {success:true, message:'Đã phê duyệt mở khoá hồ sơ'};
    } else {
      sa.getRange(rowIndex,6).setValue('Từ chối');
      sa.getRange(rowIndex,7).setValue(now);
      sa.getRange(rowIndex,8).setValue(user);
      sa.getRange(rowIndex,9).setValue(lyDo||'');
      return {success:true, message:'Đã từ chối yêu cầu mở khoá'};
    }
  } catch(e) { return {success:false, error:e.message}; }
}

// Kiểm tra hồ sơ có bị khoá không
function checkEmployeeLocked(rowIndex) {
  try {
    const s = getSheet(SN.EMPLOYEES);
    const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    const lockedCol = headers.findIndex(h=>String(h).trim()==='_Locked');
    if (lockedCol < 0) return {success:true, locked:false};
    const val = String(s.getRange(rowIndex, lockedCol+1).getValue()||'').trim();
    return {success:true, locked: val==='TRUE'};
  } catch(e) { return {success:false, error:e.message}; }
}

// ============================================================
// LỊCH SỬ NHÂN SỰ (tab Ghi Nhận Quá Trình)
// ============================================================
function _ensureHistorySheet() {
  const s = getSheet('LichSuNhanSu');
  if (s.getLastRow() > 0) return s;
  const h = ['_ID','MaNV','NGAY_GHI_NHAN','LOAI','MO_TA','TU_NGAY','DEN_NGAY','LY_DO','NGUOI_TAO','NGAY_TAO'];
  s.appendRow(h);
  s.getRange(1,1,1,h.length).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
  [80,90,110,140,280,100,100,200,150,120].forEach((w,i)=>s.setColumnWidth(i+1,w));
  return s;
}

function getEmployeeHistory(maNV) {
  try {
    const s = _ensureHistorySheet();
    if (s.getLastRow() <= 1) return {success:true, data:[]};
    const data = s.getDataRange().getValues();
    const h = data[0];
    const rows = data.slice(1)
      .map((r,i)=>{ const o={_rowIndex:i+2}; h.forEach((col,j)=>o[col]=_readCellValue(r[j])); return o; })
      .filter(r=>String(r.MaNV||'').trim()===String(maNV).trim());
    rows.sort((a,b)=>_parseDatetime(String(b.NGAY_TAO||''))-_parseDatetime(String(a.NGAY_TAO||'')));
    return {success:true, data:rows};
  } catch(e) { return {success:false, error:e.message}; }
}

function saveHistory(maNV, entry) {
  try {
    const s = _ensureHistorySheet();
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
    const now = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm');
    const user = _getSessionEmail()||'Unknown';
    const id = entry._ID || ('LS_'+Date.now());

    // _normalizeValue đảm bảo ngày dd/MM/yyyy được prefix ' tránh GSheets auto-convert thành Date
    const safeDate = (v) => _normalizeValue(String(v||'').trim());

    if (entry._rowIndex) {
      // Cập nhật dòng hiện có
      const row = [id, maNV,
        safeDate(entry.NGAY_GHI_NHAN), entry.LOAI||'', entry.MO_TA||'',
        safeDate(entry.TU_NGAY), safeDate(entry.DEN_NGAY), entry.LY_DO||'',
        user, now];
      s.getRange(entry._rowIndex, 1, 1, row.length).setValues([row]);
      writeLog('SỬA LS', maNV, entry.LOAI);
      return {success:true, message:'Đã cập nhật ghi nhận'};
    }
    s.appendRow([id, maNV,
      safeDate(entry.NGAY_GHI_NHAN||now.split(' ')[0]), entry.LOAI||'', entry.MO_TA||'',
      safeDate(entry.TU_NGAY), safeDate(entry.DEN_NGAY), entry.LY_DO||'',
      user, now]);
    writeLog('THÊM LS', maNV, entry.LOAI);
    return {success:true, message:'Đã ghi nhận thành công'};
  } catch(e) { return {success:false, error:e.message}; }
}

function deleteHistory(rowIndex) {
  try {
    _ensureHistorySheet().deleteRow(rowIndex);
    writeLog('XÓA LS', '', '');
    return {success:true};
  } catch(e) { return {success:false, error:e.message}; }
}

// Ghi nhận tự động khi đổi trạng thái → gọi trong updateEmployeeStatus
function _autoRecordHistory(maNV, newStatus, extraInfo) {
  try {
    const s = _ensureHistorySheet();
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const user = _getSessionEmail()||'Unknown';
    const id = 'LS_AUTO_'+Date.now();
    const moTa = 'Đổi trạng thái → ' + newStatus
      + (extraInfo && Object.keys(extraInfo).length
        ? ' (' + Object.entries(extraInfo).map(([k,v])=>k+': '+v).join(', ') + ')'
        : '');
    const safeDate = (v) => _normalizeValue(String(v||'').trim());
    s.appendRow([id, maNV,
      safeDate(now.split(' ')[0]), 'Trạng Thái', moTa,
      safeDate(extraInfo['Từ Ngày']||extraInfo['Ngày Nghỉ Dự Kiến']||extraInfo['Ngày Nghỉ Chính Thức']||''),
      safeDate(extraInfo['Đến Ngày']||''),
      extraInfo['Lý Do']||extraInfo['Lý Do Nghỉ']||'',
      user, now]);
  } catch(e) { Logger.log('_autoRecordHistory error: '+e.message); }
}

// Chạy hàm này trong GAS Editor để tạo sheet LichSuNhanSu ngay
function createHistorySheet() {
  const s = _ensureHistorySheet();
  Logger.log('✅ Sheet "' + s.getName() + '" đã sẵn sàng. Dòng hiện tại: ' + s.getLastRow());
  return {success: true, message: 'Sheet LichSuNhanSu đã sẵn sàng'};
}

// ============================================================
// HEADCOUNT REPORT
// ============================================================
function getHeadcountReport(params) {
  // params: { fromDate, toDate, phapNhan }
  try {
    const fromTs = _parseDate(params.fromDate);
    const toTs   = _parseDate(params.toDate);
    const prevTs = fromTs - 86400000;
    if (!fromTs || !toTs) return {success:false, error:'Ngày không hợp lệ'};

    const allEmps = getAllEmployees().data || [];

    // Lấy ngày nghỉ từ LichSuNhanSu dùng getSheet() — tránh lỗi openById
    const ngayNghiMap = {};
    const histSheet = getSheet('LichSuNhanSu');
    if (histSheet && histSheet.getLastRow() > 1) {
      const hData = histSheet.getDataRange().getValues();
      const hH = hData[0];
      hData.slice(1).forEach(r => {
        const o = {}; hH.forEach((col,j) => o[col] = _readCellValue(r[j]));
        const loai = String(o.LOAI||'');
        const moTa = String(o.MO_TA||'').toLowerCase();
        if (loai === 'Trạng Thái' && (moTa.includes('nghỉ việc') || moTa.includes('đã nghỉ'))) {
          const maNV    = String(o.MaNV||'').trim();
          const ngayStr = String(o.TU_NGAY||o.NGAY_GHI_NHAN||'');
          const ts      = ngayStr ? _parseDate(ngayStr) : 0;
          if (ts && (!ngayNghiMap[maNV] || ts > ngayNghiMap[maNV].ts)) {
            ngayNghiMap[maNV] = { ts, ngayStr, lyDo: String(o.LY_DO||'') };
          }
        }
      });
    }

    // Lọc theo Pháp Nhân Chính
    let emps = allEmps;
    if (params.phapNhan) emps = emps.filter(e => e['Pháp Nhân Chính'] === params.phapNhan);

    // Phân loại
    const newEmps=[], leftEmps=[];
    emps.forEach(e => {
      const maNV   = e['Mã Nhân Viên'];
      const vaoLam = _parseDate(String(e['Ngày Vào Làm']||''));
      if (vaoLam && vaoLam >= fromTs && vaoLam <= toTs) newEmps.push(e);
      const ni = ngayNghiMap[maNV];
      if (ni && ni.ts >= fromTs && ni.ts <= toTs)
        leftEmps.push({...e, '_ngayNghi': ni.ngayStr, '_lyDoNghi': ni.lyDo});
    });

    // Tồn đầu kỳ
    const nghiTruoc = new Set(Object.keys(ngayNghiMap).filter(mv => ngayNghiMap[mv].ts < fromTs));
    const tonDauEmps = emps.filter(e => {
      const vaoLam = _parseDate(String(e['Ngày Vào Làm']||''));
      if (!vaoLam || vaoLam > prevTs) return false;
      if (nghiTruoc.has(e['Mã Nhân Viên'])) return false;
      return true;
    });

    // Matrix theo Đơn Vị → Chức Vụ (sort alphabet)
    const matrix = {};
    const add = (dv, cv, field) => {
      dv = dv||'(Chưa có Đơn Vị Phòng)'; cv = cv||'(Chưa có Chức Vụ)';
      if (!matrix[dv]) matrix[dv]={};
      if (!matrix[dv][cv]) matrix[dv][cv]={tonDau:0,moi:0,nghi:0};
      matrix[dv][cv][field]++;
    };
    tonDauEmps.forEach(e => add(e['Đơn Vị Phòng']||e['Đơn Vị'], e['Chức Vụ Chính'], 'tonDau'));
    newEmps.forEach(e    => add(e['Đơn Vị Phòng']||e['Đơn Vị'], e['Chức Vụ Chính'], 'moi'));
    leftEmps.forEach(e   => add(e['Đơn Vị Phòng']||e['Đơn Vị'], e['Chức Vụ Chính'], 'nghi'));

    const sorted = {};
    Object.keys(matrix).sort((a,b)=>a.localeCompare(b,'vi')).forEach(dv => {
      sorted[dv]={};
      Object.keys(matrix[dv]).sort((a,b)=>a.localeCompare(b,'vi')).forEach(cv => {
        const d=matrix[dv][cv];
        sorted[dv][cv]={...d, tonCuoi: d.tonDau+d.moi-d.nghi};
      });
    });

    return {
      success:true, matrix:sorted, newEmps, leftEmps,
      tonDauTotal:tonDauEmps.length, moiTotal:newEmps.length,
      nghiTotal:leftEmps.length, tonCuoiTotal:tonDauEmps.length+newEmps.length-leftEmps.length,
    };
  } catch(e) {
    Logger.log('getHeadcountReport error: '+e.message+'\n'+e.stack);
    return {success:false, error:e.message};
  }
}


// Lấy 1 nhân viên theo mã NV (dùng để reload hồ sơ sau sync)
function getEmployee(maNV) {
  try {
    const all = getAllEmployees();
    if (!all.success) return all;
    const emp = all.data.find(e => String(e['Mã Nhân Viên']||'').trim() === String(maNV).trim());
    if (!emp) return { success:false, error:'Không tìm thấy nhân viên: '+maNV };
    return { success:true, data:emp };
  } catch(e) { return { success:false, error:e.message }; }
}

// ============================================================
// PHÂN QUYỀN NGƯỜI DÙNG
// ============================================================
// Các mức quyền: VIEWER(1) < EMPLOYEE(2) < MANAGER(3) < ADMIN(4)
const PERM = { VIEWER:'viewer', EMPLOYEE:'employee', MANAGER:'manager', ADMIN:'admin' };
const PERM_RANK = { viewer:1, employee:2, manager:3, admin:4 };

function _ensurePermSheet() {
  const s = getSheet('PhanQuyen');
  if (s.getLastRow() > 0) return s;
  const h = ['_ID','EMAIL','HO_TEN','QUYEN','DON_VI_PHAN_CONG','ACTIVE','GHI_CHU','NGAY_CAP','NGUOI_CAP'];
  s.appendRow(h);
  s.getRange(1,1,1,h.length).setBackground('#1a3c5e').setFontColor('#fff').setFontWeight('bold');
  [80,200,140,80,200,60,200,110,180].forEach((w,i)=>s.setColumnWidth(i+1,w));
  // Thêm admin mặc định là người tạo script
  const creator = _getSessionEmail();
  if (creator) {
    const now = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    s.appendRow(['PQ_'+Date.now(),creator,'Admin',PERM.ADMIN,'*','TRUE','Tài khoản admin mặc định',now,creator]);
  }
  return s;
}

function getUsers(filter) {
  try {
    const s = _ensurePermSheet();
    if (s.getLastRow() <= 1) return { success:true, data:[] };
    const data = s.getDataRange().getValues();
    const h = data[0];
    let rows = data.slice(1).map((r,i) => {
      const o = { _rowIndex: i+2 };
      h.forEach((col,j) => o[col] = _readCellValue(r[j]));
      return o;
    }).filter(r => r._ID);
    if (filter && filter.active) rows = rows.filter(r => String(r.ACTIVE).toUpperCase()==='TRUE');
    return { success:true, data:rows };
  } catch(e) { return { success:false, error:e.message }; }
}

function saveUser(userData) {
  try {
    const s = _ensurePermSheet();
    const now = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    const caller = _getSessionEmail();
    // Kiểm tra quyền: chỉ admin mới được quản lý user
    const myPerm = _getMyPermission();
    if (myPerm.level < PERM_RANK.admin) {
      return { success:false, error:'Chỉ Admin mới có quyền quản lý người dùng' };
    }
    if (userData._rowIndex) {
      const h = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
      const row = h.map(col => {
        if(col==='_ID')      return userData._ID||'';
        if(col==='NGUOI_CAP')return caller;
        if(col==='NGAY_CAP') return now;
        return userData[col]!==undefined ? _normalizeValue(userData[col]) : '';
      });
      s.getRange(userData._rowIndex,1,1,row.length).setValues([row]);
      writeLog('SỬA QUYỀN', userData.EMAIL, `${userData.QUYEN} | ${userData.DON_VI_PHAN_CONG}`);
      return { success:true, message:'Đã cập nhật quyền' };
    }
    const id = 'PQ_'+Date.now();
    s.appendRow([id, userData.EMAIL||'', userData.HO_TEN||'', userData.QUYEN||PERM.VIEWER,
      userData.DON_VI_PHAN_CONG||'', userData.ACTIVE!==false?'TRUE':'FALSE',
      userData.GHI_CHU||'', now, caller]);
    writeLog('THÊM QUYỀN', userData.EMAIL, `${userData.QUYEN} | ${userData.DON_VI_PHAN_CONG}`);
    return { success:true, message:'Đã thêm người dùng' };
  } catch(e) { return { success:false, error:e.message }; }
}

function deleteUser(rowIndex) {
  try {
    const myPerm = _getMyPermission();
    if (myPerm.level < PERM_RANK.admin) return { success:false, error:'Chỉ Admin mới có quyền xóa' };
    const s = _ensurePermSheet();
    const email = _readCellValue(s.getRange(rowIndex,2).getValue());
    s.deleteRow(rowIndex);
    writeLog('XÓA QUYỀN', email, '');
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

function getMyPermission() {
  const p = _getMyPermission();
  return { success:true, data:p };
}

function _getMyPermission() {
  try {
    // ✅ FIX: CHỈ lấy email theo token của request hiện tại (_getSessionEmail →
    // CacheService theo từng token, nhiều slot). KHÔNG được đọc UserProperties
    // ở đây nữa: khi WebApp chạy "Execute as: Me", UserProperties.SESSION_TOKEN
    // là 1 Ô NHỚ DÙNG CHUNG cho MỌI người dùng (không phải riêng theo session).
    // Bug cũ: nếu ô nhớ dùng chung này còn sót giá trị (do bản cũ từng ghi vào
    // đó, hoặc do 1 user khác vừa chạm vào), MỌI người — kể cả admin — sẽ bị
    // tính quyền theo email bị kẹt trong đó thay vì email thật của họ. Đây
    // chính là nguyên nhân "đăng nhập admin nhưng hiện quyền nhân viên/của
    // người khác" sau khi đăng xuất - đăng nhập lại.
    const me = (_getSessionEmail()||'').toLowerCase();

    const s = _ensurePermSheet();

    // Sheet chỉ có header → owner = admin
    if (s.getLastRow() <= 1) {
      return { email:me, quyen:PERM.ADMIN, level:4, donVi:'*', source:'first-user' };
    }

    const data = s.getDataRange().getValues();
    const h = data[0];
    const emailCol  = h.indexOf('EMAIL');
    const quyenCol  = h.indexOf('QUYEN');
    const dvCol     = h.indexOf('DON_VI_PHAN_CONG');
    const activeCol = h.indexOf('ACTIVE');

    // ✅ FIX: Quét TẤT CẢ dòng khớp email (user có thể có nhiều dòng),
    // chỉ lấy dòng ACTIVE=TRUE, chọn quyền có level cao nhất.
    // Bug cũ: return dòng đầu tiên gặp + break khi gặp dòng inactive → sai quyền.
    let best = null;
    for (let i=1; i<data.length; i++) {
      const rowEmail = String(_readCellValue(data[i][emailCol])||'').trim().toLowerCase();
      if (rowEmail !== me) continue;
      const active = String(_readCellValue(data[i][activeCol])||'').toUpperCase();
      if (active !== 'TRUE') continue; // bỏ qua dòng inactive, KHÔNG break
      const quyen = String(_readCellValue(data[i][quyenCol])||PERM.VIEWER).toLowerCase();
      const level = PERM_RANK[quyen]||1;
      const donVi = String(_readCellValue(data[i][dvCol])||'');
      if (!best || level > best.level) {
        best = { email:me, quyen, level, donVi, source:'manual' };
      }
    }
    if (best) return best;

    // Không tìm thấy → không có quyền gì (nhưng đã login thành công)
    return { email:me, quyen:PERM.VIEWER, level:1, donVi:'', source:'none' };
  } catch(e) {
    Logger.log('_getMyPermission error: '+e.message);
    return { email:'', quyen:PERM.VIEWER, level:0, donVi:'', source:'error' };
  }
}

// ── FIX: Income by unit từ Mức Lương ─────────────────────────
function getIncomeByUnit() {
  try {
    const ctFields = _getContractFields(true);
    const luongField = ctFields.find(f=>f.key==='luong') || ctFields.find(f=>f.label.includes('Mức Lương'));
    const luongLabel = luongField ? luongField.label : 'Mức Lương';
    const dateFieldHL = ctFields.find(f=>f.key==='ngayHL')?.label||'Ngày Hiệu Lực';
    const dateFieldHH = ctFields.find(f=>f.key==='ngayHH')?.label||'Ngày Hết Hạn';
    const asOf = Date.now();

    const emps = getAllEmployees().data||[];
    const ctSheet = getSheet(SN.CONTRACTS);
    if (!ctSheet || ctSheet.getLastRow()<=1) return { success:true, data:{} };

    const cd = ctSheet.getDataRange().getValues();
    const ch = cd[0].map(String);
    const maNVCol = ch.indexOf('MaNV');
    const hlCol = ch.indexOf(dateFieldHL);
    const hhCol = ch.indexOf(dateFieldHH);
    const luongCol = ch.indexOf(luongLabel);
    if (luongCol<0) return { success:true, data:{} };

    // HĐ hiệu lực mới nhất mỗi NV
    const bestHD = {};
    cd.slice(1).forEach(row=>{
      const maNV=String(_readCellValue(row[maNVCol])||'').trim();
      if(!maNV) return;
      const hlTs = hlCol>=0?_parseDate(String(_readCellValue(row[hlCol])||'')):0;
      if(!hlTs||hlTs>asOf) return;
      const hhTs = hhCol>=0?_parseDate(String(_readCellValue(row[hhCol])||'')):0;
      if(hhTs&&hhTs<asOf) return;
      const prev=bestHD[maNV];
      if(!prev||hlTs>prev.hlTs) bestHD[maNV]={hlTs, luong:Number(String(_readCellValue(row[luongCol])||'0').replace(/[^\d.]/g,''))||0};
    });

    // Nhóm theo Đơn Vị Phòng
    const byUnit={}, totalAll={};
    let grandTotal=0;
    emps.forEach(e=>{
      const hd=bestHD[e['Mã Nhân Viên']];
      if(!hd||!hd.luong) return;
      const dv=e['Đơn Vị Phòng']||e['Đơn Vị']||'Khác';
      byUnit[dv]=(byUnit[dv]||0)+hd.luong;
      grandTotal+=hd.luong;
    });
    // Tính %
    const result={};
    Object.keys(byUnit).sort((a,b)=>byUnit[b]-byUnit[a]).forEach(dv=>{
      result[dv]={ total:byUnit[dv], pct:grandTotal?Math.round(byUnit[dv]/grandTotal*1000)/10:0 };
    });
    return { success:true, data:result, grandTotal };
  } catch(e) { return { success:false, error:e.message }; }
}

// ── FIX SỐ ĐIỆN THOẠI MẤT SỐ 0 ──────────────────────────────
// Chạy 1 lần trong GAS Editor để fix dữ liệu cũ
function fixPhoneNumbers() {
  try {
    const s = getSheet(SN.EMPLOYEES);
    const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    // Tìm các cột số điện thoại / CMND / MSBHXH / MST
    const PHONE_KEYS = ['soDT','soCMND','maSoThue','maSoBHXH'];
    const phoneCols = headers.reduce((acc,h,i)=>{
      // Tìm theo label chứa "điện thoại", "CMND", "BHXH", "thuế"
      const hl = String(h).toLowerCase();
      if(PHONE_KEYS.includes(h) || hl.includes('điện thoại') || hl.includes('cmnd') ||
         hl.includes('bhxh') || hl.includes('thuế') || hl.includes('số tài khoản')) {
        acc.push({col:i+1, label:h});
      }
      return acc;
    },[]);

    if(!phoneCols.length){ Logger.log('Không tìm thấy cột số điện thoại'); return; }
    Logger.log('Cột cần fix: ' + phoneCols.map(c=>c.label).join(', '));

    const lastRow = s.getLastRow();
    let fixed = 0;
    phoneCols.forEach(({col})=>{
      const range = s.getRange(2, col, lastRow-1, 1);
      const vals  = range.getValues();
      vals.forEach((row,i)=>{
        const v = row[0];
        if(typeof v === 'number' && v > 0) {
          const str = String(v);
          // Nếu là số 9-10 chữ số bắt đầu bằng 9 → có thể là SĐT mất số 0
          if(/^[0-9]{8,11}$/.test(str) && str.charAt(0) !== '0') {
            const fixed_val = "'" + '0' + str;
            s.getRange(2+i, col).setValue(fixed_val);
            fixed++;
            Logger.log(`Row ${2+i} Col ${col}: ${str} → 0${str}`);
          }
        }
      });
    });
    Logger.log(`Đã fix ${fixed} ô số điện thoại`);
    return { fixed };
  } catch(e) {
    Logger.log('fixPhoneNumbers error: ' + e.message);
  }
}

// ============================================================
// AUTHENTICATION (PASSWORD + SESSION)
// ============================================================
function _hashPassword(pw) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    pw,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('');
}

// ── SESSION: dùng ScriptProperties (nhiều slot, BỀN VỮNG) thay CacheService ──
// ✅ FIX: CacheService là "best-effort cache" — Google xác nhận KHÔNG đảm bảo
// giá trị còn tồn tại kể cả trước khi hết hạn (có thể bị dọn/rớt bất kỳ lúc nào).
// Dùng nó làm nơi lưu danh tính đăng nhập (session) là sai chỗ → gây đúng hiện
// tượng: vừa đăng nhập xong, request sau đó CacheService.get(token) trả về
// null → hệ thống không biết mình là ai → tụt về quyền viewer/mặc định.
// ScriptProperties KHÔNG bị rớt dữ liệu ngoài ý muốn (persist thật sự), chỉ
// cần tự quản lý hết hạn (TTL) và tự dọn token cũ để không vượt giới hạn
// 500 properties/script.
// Mỗi token vẫn là 1 key riêng → vẫn hỗ trợ nhiều user đăng nhập đồng thời.

const SESSION_PREFIX = 'SESSION_';
const SESSION_TTL    = 8 * 3600; // 8 giờ (giây)

function _getSessionToken() {
  // Legacy: đọc UserProperties nếu vẫn còn (migration)
  return PropertiesService.getUserProperties().getProperty('SESSION_TOKEN') || '';
}

// Dọn các token đã hết hạn (hoặc hỏng) khỏi ScriptProperties trước khi tạo token mới,
// để tránh tích luỹ vô hạn và chạm giới hạn 500 properties/script.
function _pruneExpiredSessions() {
  try {
    const props = PropertiesService.getScriptProperties();
    const all = props.getProperties();
    const now = Date.now();
    Object.keys(all).forEach(k => {
      if (!k.startsWith(SESSION_PREFIX)) return;
      try {
        const d = JSON.parse(all[k]);
        if (!d || !d.created || (now - d.created) > SESSION_TTL*1000) props.deleteProperty(k);
      } catch(e) { props.deleteProperty(k); }
    });
  } catch(e) { Logger.log('_pruneExpiredSessions error: '+e.message); }
}

function _setSessionToken(email) {
  _pruneExpiredSessions();
  const token = SESSION_PREFIX + Utilities.getUuid().replace(/-/g,'');
  const payload = JSON.stringify({ email, token, created: Date.now() });
  // Lưu vào ScriptProperties — mỗi token là 1 key riêng, hỗ trợ nhiều user đồng thời,
  // và KHÔNG bị rớt dữ liệu như CacheService.
  PropertiesService.getScriptProperties().setProperty(token, payload);
  return token;
}

function _clearSession(token) {
  if (token) {
    try { PropertiesService.getScriptProperties().deleteProperty(token); } catch(e) {}
  }
  // Xóa cả UserProperties cũ nếu có (migration)
  try { PropertiesService.getUserProperties().deleteProperty('SESSION_TOKEN'); } catch(e) {}
}

// Đọc email từ token do client gửi lên
function _getEmailFromToken(token) {
  if (!token) return '';
  try {
    // Hỗ trợ cả token cũ (UserProperties) và mới (ScriptProperties)
    if (!String(token).startsWith(SESSION_PREFIX)) {
      // Token cũ: đọc từ UserProperties
      const raw = PropertiesService.getUserProperties().getProperty('SESSION_TOKEN');
      if (!raw) return '';
      const d = JSON.parse(raw);
      return (d && d.email) ? d.email : '';
    }
    // Token mới: đọc từ ScriptProperties (bền vững, không bị rớt như CacheService)
    const raw = PropertiesService.getScriptProperties().getProperty(token);
    if (!raw) return '';
    const d = JSON.parse(raw);
    if (!d || !d.email) return '';
    // Kiểm tra hết hạn thủ công (ScriptProperties không tự có TTL)
    if (d.created && (Date.now() - d.created) > SESSION_TTL*1000) {
      try { PropertiesService.getScriptProperties().deleteProperty(token); } catch(e) {}
      return '';
    }
    return d.email;
  } catch(e) { return ''; }
}

function checkSession() {
  // Chính sách bảo mật: KHÔNG tự đăng nhập lại.
  // Mỗi lần mở hệ thống đều phải nhập email + mật khẩu để tránh rủi ro
  // khi có người khác sử dụng cùng máy tính.
  // Xóa session cũ nếu có để đảm bảo.
  try { _clearSession(); } catch(e) {}
  return { success:true, authenticated:false };
}

function login(email, password) {
  try {
    email = (email||'').trim().toLowerCase();
    if (!email || !password) return { success:false, error:'Vui lòng nhập email và mật khẩu' };

    const s = _ensurePermSheet();
    const data = s.getDataRange().getValues();
    const h = data[0];
    const emailCol  = h.indexOf('EMAIL');
    const passCol   = h.indexOf('PASSWORD_HASH');
    const activeCol = h.indexOf('ACTIVE');

    // Nếu sheet chỉ có header (chưa có user nào) → cho phép đăng nhập lần đầu
    // chỉ với email của người deploy (owner)
    if (data.length <= 1) {
      const owner = Session.getEffectiveUser().getEmail().toLowerCase();
      if (email === owner) {
        const token = _setSessionToken(email);
        writeLog('ĐĂNG NHẬP', email, 'Thành công (owner lần đầu)');
        return { success:true, token };
      }
      return { success:false, error:'Hệ thống chưa có tài khoản. Liên hệ Admin.' };
    }

    // Tìm email trong PhanQuyen — CHỈ những user được cấu hình mới được vào
    for (let i=1; i<data.length; i++) {
      const rowEmail = String(data[i][emailCol]||'').trim().toLowerCase();
      if (rowEmail !== email) continue;

      const active = String(data[i][activeCol]||'').toUpperCase();
      if (active !== 'TRUE') return { success:false, error:'Tài khoản đã bị khóa. Liên hệ Admin.' };

      const storedHash = String(data[i][passCol]||'');
      if (!storedHash) {
        // Chưa có password → cho phép đăng nhập luôn (không bắt đổi mật khẩu)
        const token = _setSessionToken(email);
        writeLog('ĐĂNG NHẬP', email, 'Thành công (chưa đặt mật khẩu)');
        return { success:true, token };
      }
      const inputHash = _hashPassword(password);
      if (inputHash !== storedHash) {
        return { success:false, error:'Mật khẩu không đúng' };
      }
      const token = _setSessionToken(email);
      writeLog('ĐĂNG NHẬP', email, 'Thành công');
      return { success:true, token };
    }

    // Không tìm thấy email trong hệ thống
    return { success:false, error:'Email không có quyền truy cập hệ thống. Liên hệ Admin.' };
  } catch(e) { return { success:false, error:e.message }; }
}

function logout(token) {
  try {
    const email = _getEmailFromToken(token) || _getSessionEmail();
    _clearSession(token);
    writeLog('ĐĂNG XUẤT', email, '');
    return { success:true };
  } catch(e) { return { success:false, error:e.message }; }
}

function changePassword(oldPw, newPw) {
  try {
    if (!newPw || newPw.length < 6) return { success:false, error:'Mật khẩu mới phải ít nhất 6 ký tự' };
    const me = _getSessionEmail().toLowerCase();
    const s = _ensurePermSheet();
    const data = s.getDataRange().getValues();
    const h = data[0];

    // Đảm bảo có cột PASSWORD_HASH
    let passCol = h.indexOf('PASSWORD_HASH');
    if (passCol < 0) {
      const newCol = s.getLastColumn() + 1;
      s.getRange(1, newCol).setValue('PASSWORD_HASH');
      passCol = newCol - 1;
    }

    const emailCol = h.indexOf('EMAIL');
    for (let i=1; i<data.length; i++) {
      const rowEmail = String(data[i][emailCol]||'').trim().toLowerCase();
      if (rowEmail !== me) continue;

      const stored = String(data[i][passCol]||'');
      // Nếu đã có password: kiểm tra password cũ
      if (stored && oldPw) {
        if (_hashPassword(oldPw) !== stored) return { success:false, error:'Mật khẩu cũ không đúng' };
      }
      s.getRange(i+1, passCol+1).setValue(_hashPassword(newPw));
      writeLog('ĐỔI PASSWORD', me, '');
      return { success:true, message:'Đổi mật khẩu thành công' };
    }
    return { success:false, error:'Không tìm thấy tài khoản' };
  } catch(e) { return { success:false, error:e.message }; }
}

// Admin đặt lại password cho user
function resetPassword(rowIndex, newPw) {
  try {
    const perm = _getMyPermission();
    if (perm.level < 4) return { success:false, error:'Chỉ Admin mới có quyền reset password' };
    if (!newPw || newPw.length < 6) return { success:false, error:'Mật khẩu phải ít nhất 6 ký tự' };
    const s = _ensurePermSheet();
    const h = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    let passCol = h.indexOf('PASSWORD_HASH');
    if (passCol < 0) {
      const newCol = s.getLastColumn() + 1;
      s.getRange(1, newCol).setValue('PASSWORD_HASH');
      passCol = newCol - 1;
    }
    const email = _readCellValue(s.getRange(rowIndex, h.indexOf('EMAIL')+1).getValue());
    s.getRange(rowIndex, passCol+1).setValue(_hashPassword(newPw));
    writeLog('RESET PASSWORD', email, 'Reset bởi admin');
    return { success:true, message:'Đã đặt lại mật khẩu cho ' + email };
  } catch(e) { return { success:false, error:e.message }; }
}