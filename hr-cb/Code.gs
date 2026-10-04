/**
 * HỆ THỐNG QUẢN LÝ & DỰ BÁO PHÚC LỢI, CHI PHÍ NHÂN SỰ (HR C&B SYSTEM)
 * Full Edition: Tích hợp Bảng tính Chi tiết theo từng Nhân sự
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Hệ Thống Quản Lý Ngân Sách Phúc Lợi & Chi Phí Nhân Sự')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 1. Khởi tạo CSDL Mẫu
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Sheet 1: DB_NhanSu (13 Cột - Sử dụng cột Luong)
  let shNV = ss.getSheetByName("DB_NhanSu") || ss.insertSheet("DB_NhanSu");
  if (shNV.getLastRow() === 0) {
    shNV.appendRow(["Ma_NV", "Ho_Ten", "Phong_Ban", "Vi_Tri", "Cap_Bac", "Khu_Vuc", "Gioi_Tinh", "Doi_Tuong", "Ngay_Vao_Lam", "Luong", "Luong_Dong_BHXH", "DCH", "Trang_Thai", "PL_Loai_Tru"]);
    shNV.appendRow(["NV001", "Nguyễn Văn A", "Khối Công nghệ", "Lập trình viên Senior", "Quản lý cấp trung", "Hồ Chí Minh", "Nam", "Cơ hữu", "15/01/2022", 25000000, 10000000, 0, "Đang làm việc", ""]);
    shNV.appendRow(["NV002", "Trần Thị B", "Khối Nhân sự", "C&B Specialist", "Nhân viên", "Hà Nội", "Nữ", "Cơ hữu", "10/05/2021", 18000000, 8500000, 0, "Đang làm việc", ""]);
    shNV.appendRow(["NV003", "Lê Văn C", "Khối Kinh doanh", "Chuyên viên Sales", "Nhân viên", "Đà Nẵng", "Nam", "Dịch vụ", "01/08/2023", 12000000, 6000000, 0, "Đang làm việc", ""]);
    shNV.appendRow(["NV004", "Phạm Thị D", "Khối Công nghệ", "Giám đốc Công nghệ", "Quản lý cấp cao", "Hồ Chí Minh", "Nữ", "Cơ hữu", "20/02/2021", 45000000, 15000000, 0, "Đang làm việc", ""]);
    formatHeader(shNV, 14);
  }

  // Sheet 2: DM_PhucLoi (11 Cột - Căn cứ Luong)
  let shPL = ss.getSheetByName("DM_PhucLoi") || ss.insertSheet("DM_PhucLoi");
  if (shPL.getLastRow() === 0) {
    shPL.appendRow(["Ma_PhucLoi", "Ten_PhucLoi", "Loai_Tinh_Toan", "Gia_Tri_Mac_Dinh", "Can_Cu_Luong", "Chu_Ky", "Doi_Tuong", "Gioi_Tinh", "Cap_Bac", "Phong_Ban", "Tham_Nien_Toi_Thieu_Thang", "Ngay_Chi_Tra", "Thang_Chi_Tra", "Ty_Le_Tang"]);
    shPL.appendRow(["PL01", "Chi phí BHXH, BHYT, BHTN (DN đóng 21.5%)", "Phần trăm lương", 21.5, "Luong_Dong_BHXH", "Tháng", "Cơ hữu", "All", "All", "All", 0, 5, "", ""]);
    shPL.appendRow(["PL02", "Phụ cấp Ăn trưa Cố định", "Số tiền cố định", 1000000, "Không", "Tháng", "All", "All", "All", "All", 0, 5, "", 0]);
    shPL.appendRow(["PL03", "Thưởng Tết Nguyên Đán (Tháng 13)", "Phần trăm lương", 100, "Luong", "Năm", "Cơ hữu", "All", "All", "All", 12, 25, 1, ""]);
    shPL.appendRow(["PL04", "Quà tặng 8/3 & 20/10", "Số tiền cố định", 500000, "Không", "Quý", "All", "Nữ", "All", "All", 0, 5, 3, ""]);
    shPL.appendRow(["PL05", "Bảo hiểm sức khỏe PVI (Quản lý)", "Số tiền cố định", 4500000, "Không", "Năm", "Cơ hữu", "All", "Quản lý cấp trung", "All", 6, 15, 1, ""]);
    shPL.appendRow(["PL06", "Chi phí Đồng phục Hàng năm", "Số tiền cố định", 2000000, "Không", "Năm", "All", "All", "Nhân viên", "All", 0, 15, 1, ""]);
    formatHeader(shPL, 14);
  }

  // Sheet 2b: DM_PhucLoi_Bac (Bậc thưởng theo thâm niên / đối tượng / cấp bậc)
  let shBac = getOrCreateTierSheet();
  if (shBac.getLastRow() === 1) {
    shBac.appendRow(["PL03", "Dưới 3 năm", 12, 36, "All", "All", 100]);
    shBac.appendRow(["PL03", "Từ 3 đến dưới 5 năm", 36, 60, "All", "All", 120]);
    shBac.appendRow(["PL03", "Từ 5 năm trở lên", 60, "", "All", "All", 150]);
  }

  // Sheet 3: KeHoach_TuyenDung (10 Cột)
  let shTD = ss.getSheetByName("KeHoach_TuyenDung") || ss.insertSheet("KeHoach_TuyenDung");
  if (shTD.getLastRow() === 0) {
    shTD.appendRow(["Phong_Ban", "Vi_Tri", "Cap_Bac", "Khu_Vuc", "Gioi_Tinh_Du_Kien", "Doi_Tuong_Du_Kien", "So_Luong_Tuyen_Moi", "Luong_Dukien", "Luong_BHXH_Dukien", "Thang_Du_Kien_Vao"]);
    shTD.appendRow(["Khối Công nghệ", "Lập trình viên Senior", "Quản lý cấp trung", "Hồ Chí Minh", "Nam", "Cơ hữu", 3, 22000000, 9000000, 3]);
    shTD.appendRow(["Khối Kinh doanh", "Chuyên viên Sales", "Nhân viên", "Đà Nẵng", "All", "Dịch vụ", 5, 12000000, 6000000, 2]);
    formatHeader(shTD, 10);
  }

  return "Khởi tạo CSDL mẫu thành công!";
}

const TIER_HEADERS = ["Ma_PhucLoi", "Ten_Bac", "Tham_Nien_Tu_Thang", "Tham_Nien_Den_Thang", "Doi_Tuong", "Cap_Bac", "Gia_Tri"];

function getOrCreateTierSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("DM_PhucLoi_Bac");
  if (!sh) sh = ss.insertSheet("DM_PhucLoi_Bac");
  if (sh.getLastRow() === 0) {
    sh.appendRow(TIER_HEADERS);
    formatHeader(sh, TIER_HEADERS.length);
  }
  return sh;
}

// Đọc DM_PhucLoi: 2 cột ngày/tháng chi trả (cột 12, 13) luôn đọc theo VỊ TRÍ, giống cách ghi,
// nên không phụ thuộc việc tên tiêu đề cột có bị sửa/gõ lệch hay không.
function loadBenefits(ss) {
  const sh = ss.getSheetByName("DM_PhucLoi");
  const list = getSheetDataAsJson(sh);
  if (!sh || list.length === 0) return list;
  const raw = sh.getDataRange().getValues();
  raw.shift();
  list.forEach((b, i) => {
    const r = raw[i] || [];
    b.Ngay_Chi_Tra = cellToInt(r[11]);
    b.Thang_Chi_Tra = cellToInt(r[12]);
    b.Ty_Le_Tang = cellToNum(r[13]); // "" = dùng tỷ lệ chung; 0 = không tăng
  });
  return list;
}

// Đọc DB_NhanSu; cột 14 (PL_Loai_Tru) đọc theo vị trí
function loadEmployees(ss) {
  const sh = ss.getSheetByName("DB_NhanSu");
  const list = getSheetDataAsJson(sh);
  if (!sh || list.length === 0) return list;
  const raw = sh.getDataRange().getValues();
  raw.shift();
  list.forEach((e, i) => {
    const r = raw[i] || [];
    e.PL_Loai_Tru = String(r[13] == null ? "" : r[13]).trim();
  });
  return list;
}

// Số thực từ ô (chấp nhận dấu phẩy thập phân). Ô trống/không phải số => ""
function cellToNum(v) {
  if (typeof v === "number") return v;
  const t = String(v == null ? "" : v).trim().replace(",", ".");
  if (t === "" || isNaN(parseFloat(t))) return "";
  return parseFloat(t);
}

function benefitRate(b, globalRate) {
  return (b.Ty_Le_Tang === "" || b.Ty_Le_Tang == null) ? (parseFloat(globalRate) || 0) : (parseFloat(b.Ty_Le_Tang) || 0);
}

// Số nguyên từ ô: số, chữ có chứa số ("Tháng 10"), hoặc ô bị định dạng Ngày (lấy lại số gốc). Không có => ""
function cellToInt(v) {
  if (v instanceof Date) {
    const d = new Date(v.getFullYear(), v.getMonth(), v.getDate());
    return Math.round((d - new Date(1899, 11, 30)) / 86400000);
  }
  if (typeof v === "number") return Math.round(v);
  const m = String(v == null ? "" : v).match(/\d+/);
  return m ? parseInt(m[0], 10) : "";
}

// Sheet DM_PhucLoi cũ (11 cột): tự bổ sung 2 cột Ngay_Chi_Tra, Thang_Chi_Tra
function ensureBenefitColumns(sh) {
  const heads = ["Ngay_Chi_Tra", "Thang_Chi_Tra", "Ty_Le_Tang"]; // cột 12, 13, 14
  const need = 11 + heads.length;
  if (sh.getMaxColumns() < need) sh.insertColumnsAfter(sh.getMaxColumns(), need - sh.getMaxColumns());
  const cur = sh.getRange(1, 12, 1, heads.length).getValues()[0].map(v => String(v).trim());
  if (heads.some((h, i) => cur[i] !== h)) {
    sh.getRange(1, 12, 1, heads.length).setValues([heads]);
    formatHeader(sh, need);
  }
}

// Sheet DB_NhanSu cũ (13 cột): tự bổ sung cột 14 PL_Loai_Tru (danh sách mã phúc lợi không được hưởng, cách nhau dấu phẩy)
function ensureEmployeeColumns(sh) {
  const need = 14;
  if (sh.getMaxColumns() < need) sh.insertColumnsAfter(sh.getMaxColumns(), need - sh.getMaxColumns());
  if (String(sh.getRange(1, need).getValue()).trim() !== "PL_Loai_Tru") {
    sh.getRange(1, need).setValue("PL_Loai_Tru");
    formatHeader(sh, need);
  }
}

function formatHeader(sheet, numCols) {
  sheet.getRange(1, 1, 1, numCols)
       .setBackground("#1e293b")
       .setFontColor("#f8fafc")
       .setFontWeight("bold");
}

// 2. Lấy dữ liệu ban đầu
function getInitialData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    employees: loadEmployees(ss),
    benefits: loadBenefits(ss),
    benefitTiers: getSheetDataAsJson(ss.getSheetByName("DM_PhucLoi_Bac")),
    newHirePlan: getSheetDataAsJson(ss.getSheetByName("KeHoach_TuyenDung"))
  };
}

// 3b. LƯU CÁC BẬC THƯỞNG CỦA 1 PHÚC LỢI (thay thế toàn bộ bậc cũ của mã đó)
function saveBenefitTiers(maPL, tiers) {
  maPL = String(maPL).trim();
  tiers = tiers || [];
  tiers.forEach((t, i) => {
    const from = parseInt(t.Tham_Nien_Tu_Thang) || 0;
    const to = (t.Tham_Nien_Den_Thang === "" || t.Tham_Nien_Den_Thang == null) ? null : parseInt(t.Tham_Nien_Den_Thang);
    if (to !== null && to <= from) {
      throw new Error("Bậc " + (i + 1) + ": 'Đến tháng' phải lớn hơn 'Từ tháng'.");
    }
    if (isNaN(parseFloat(t.Gia_Tri))) {
      throw new Error("Bậc " + (i + 1) + ": thiếu giá trị thưởng.");
    }
  });

  const sh = getOrCreateTierSheet();
  const data = sh.getDataRange().getValues();
  const keep = data.slice(1).filter(r => String(r[0]).trim() !== maPL);
  const added = tiers.map(t => [
    maPL,
    t.Ten_Bac || "",
    parseInt(t.Tham_Nien_Tu_Thang) || 0,
    (t.Tham_Nien_Den_Thang === "" || t.Tham_Nien_Den_Thang == null) ? "" : parseInt(t.Tham_Nien_Den_Thang),
    t.Doi_Tuong || "All",
    t.Cap_Bac || "All",
    parseFloat(t.Gia_Tri) || 0
  ]);
  const rows = keep.concat(added);

  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, TIER_HEADERS.length).clearContent();
  }
  if (rows.length > 0) {
    sh.getRange(2, 1, rows.length, TIER_HEADERS.length).setValues(rows);
  }
  return "Đã lưu " + added.length + " bậc thưởng!";
}

// 3. THÊM / SỬA PHÚC LỢI
function saveBenefit(b, oldCode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let shPL = ss.getSheetByName("DM_PhucLoi");
  if (!shPL) { setupDatabase(); shPL = ss.getSheetByName("DM_PhucLoi"); }

  ensureBenefitColumns(shPL);

  const newCode = String(b.Ma_PhucLoi).trim();
  oldCode = String(oldCode || "").trim();
  const lookupCode = oldCode || newCode;

  let data = shPL.getDataRange().getValues();
  let foundRowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    const code = String(data[i][0]).trim();
    if (code === lookupCode && foundRowIndex < 0) foundRowIndex = i + 1;
    // Đổi mã: không được trùng với mã của chính sách khác
    if (oldCode && newCode !== oldCode && code === newCode) {
      throw new Error("Mã " + newCode + " đã tồn tại, vui lòng chọn mã khác.");
    }
  }

  // Đổi mã: cập nhật theo cả các bậc thưởng đang gắn với mã cũ
  if (oldCode && newCode !== oldCode && foundRowIndex > 0) {
    const shBac = ss.getSheetByName("DM_PhucLoi_Bac");
    if (shBac && shBac.getLastRow() > 1) {
      const rng = shBac.getRange(2, 1, shBac.getLastRow() - 1, 1);
      rng.setValues(rng.getValues().map(r => [String(r[0]).trim() === oldCode ? newCode : r[0]]));
    }
    // Danh sách phúc lợi loại trừ của nhân sự cũng phải đổi theo mã mới
    const shNV = ss.getSheetByName("DB_NhanSu");
    if (shNV && shNV.getMaxColumns() >= 14 && shNV.getLastRow() > 1) {
      const rngNV = shNV.getRange(2, 14, shNV.getLastRow() - 1, 1);
      rngNV.setValues(rngNV.getValues().map(r => [String(r[0]).split(",").map(x => x.trim()).filter(x => x).map(x => x === oldCode ? newCode : x).join(", ")]));
    }
  }

  let newRow = [
    b.Ma_PhucLoi,
    b.Ten_PhucLoi,
    b.Loai_Tinh_Toan,
    parseFloat(b.Gia_Tri_Mac_Dinh) || 0,
    b.Can_Cu_Luong,
    b.Chu_Ky,
    b.Doi_Tuong || "All",
    b.Gioi_Tinh || "All",
    b.Cap_Bac || "All",
    b.Phong_Ban || "All",
    parseInt(b.Tham_Nien_Toi_Thieu_Thang) || 0,
    Math.min(Math.max(parseInt(b.Ngay_Chi_Tra) || 1, 1), 31),
    (parseInt(b.Thang_Chi_Tra) >= 1 && parseInt(b.Thang_Chi_Tra) <= 12) ? parseInt(b.Thang_Chi_Tra) : "",
    cellToNum(b.Ty_Le_Tang)
  ];

  if (foundRowIndex > 0) {
    shPL.getRange(foundRowIndex, 1, 1, 14).setValues([newRow]);
  } else {
    shPL.appendRow(newRow);
  }
  return "Đã lưu chính sách phúc lợi!";
}

// 3c. XÓA PHÚC LỢI (kèm các bậc thưởng của nó)
function deleteBenefit(maPL) {
  maPL = String(maPL).trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shPL = ss.getSheetByName("DM_PhucLoi");
  if (!shPL) throw new Error("Không tìm thấy sheet DM_PhucLoi.");

  const data = shPL.getDataRange().getValues();
  let found = false;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === maPL) {
      shPL.deleteRow(i + 1);
      found = true;
    }
  }
  if (!found) throw new Error("Không tìm thấy phúc lợi " + maPL);

  const shBac = ss.getSheetByName("DM_PhucLoi_Bac");
  if (shBac) {
    const t = shBac.getDataRange().getValues();
    for (let i = t.length - 1; i >= 1; i--) {
      if (String(t[i][0]).trim() === maPL) shBac.deleteRow(i + 1);
    }
  }
  return "Đã xóa chính sách " + maPL + "!";
}

// 4. THÊM / SỬA HỒ SƠ NHÂN VIÊN
function saveEmployee(emp) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("DB_NhanSu");
  if (!sh) { setupDatabase(); sh = ss.getSheetByName("DB_NhanSu"); }

  ensureEmployeeColumns(sh);

  let data = sh.getDataRange().getValues();
  let foundRowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(emp.Ma_NV).trim()) {
      foundRowIndex = i + 1;
      break;
    }
  }

  let newRow = [
    emp.Ma_NV,
    emp.Ho_Ten,
    emp.Phong_Ban,
    emp.Vi_Tri,
    emp.Cap_Bac,
    emp.Khu_Vuc,
    emp.Gioi_Tinh,
    emp.Doi_Tuong || "Cơ hữu",
    emp.Ngay_Vao_Lam,
    parseFloat(emp.Luong || emp.Luong_Co_Ban) || 0,
    parseFloat(emp.Luong_Dong_BHXH) || 0,
    parseFloat(emp.DCH) || 0,
    emp.Trang_Thai || "Đang làm việc",
    String(emp.PL_Loai_Tru || "").split(",").map(x => x.trim()).filter(x => x).join(", ")
  ];

  if (foundRowIndex > 0) {
    sh.getRange(foundRowIndex, 1, 1, 14).setValues([newRow]);
  } else {
    sh.appendRow(newRow);
  }
  return "Đã lưu thông tin nhân sự!";
}

function parseDateVN(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    let parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }
  return new Date(dateStr);
}

// 5. TÍNH TOÁN DỰ BÁO NGÂN SÁCH & BẢNG KÊ CHI TIẾT TỪNG NHÂN SỰ
function calculateBudget(targetYear, inflationRate, filters) {
  targetYear = parseInt(targetYear) || (new Date().getFullYear() + 1);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  filters = filters || {};
  const allEmployees = loadEmployees(ss);
  const benefits = loadBenefits(ss);
  const allPlans = getSheetDataAsJson(ss.getSheetByName("KeHoach_TuyenDung"));

  // Bộ lọc (mỗi nhóm chọn nhiều giá trị; để trống = không lọc). Dòng kế hoạch tuyển mới có
  // Giới tính / Đối tượng = "All" thì khớp với mọi lựa chọn.
  const employees = allEmployees.filter(e => matchFilters(filters, {
    doiTuong: e.Doi_Tuong || "Cơ hữu", gioiTinh: e.Gioi_Tinh, phongBan: e.Phong_Ban, viTri: e.Vi_Tri
  }));
  const newHirePlan = allPlans.filter(p => matchFilters(filters, {
    doiTuong: p.Doi_Tuong_Du_Kien || "Cơ hữu", gioiTinh: p.Gioi_Tinh_Du_Kien || "All", phongBan: p.Phong_Ban, viTri: p.Vi_Tri
  }, true));

  // Gắn các bậc thưởng vào từng phúc lợi (nếu có)
  const tiers = getSheetDataAsJson(ss.getSheetByName("DM_PhucLoi_Bac"));
  benefits.forEach(b => {
    b.tiers = tiers.filter(t => String(t.Ma_PhucLoi).trim() === String(b.Ma_PhucLoi).trim());
  });

  let totalExistingBudget = 0;
  let totalNewHireBudget = 0;
  let totalNewHireCount = 0;

  let categoryBreakdown = {};
  let categoryMap = {};
  let deptBreakdown = {};
  let employeeDetails = [];
  let cashEvents = {};
  let payrollMap = {}; // quỹ lương & số nhân sự theo phòng ban

  // A. Tính cho từng Nhân sự hiện tại
  employees.forEach(emp => {
    if (emp.Trang_Thai === "Đang làm việc") {
      let empBenefitTotal = 0;
      let joinDate = parseDateVN(emp.Ngay_Vao_Lam);
      let benefitMap = {};

      collectPayments(benefits, emp, joinDate, targetYear).forEach(p => {
        let rate = benefitRate(p.benefit, inflationRate);
        let amt = p.amount * (1 + rate / 100);
        empBenefitTotal += amt;
        categoryBreakdown[p.benefit.Ten_PhucLoi] = (categoryBreakdown[p.benefit.Ten_PhucLoi] || 0) + amt;
        addCategory(categoryMap, p.benefit, amt);
        addCashEvent(cashEvents, "Nhân sự hiện tại", p.benefit, p.date, amt);

        if (!benefitMap[p.benefit.Ma_PhucLoi]) {
          benefitMap[p.benefit.Ma_PhucLoi] = {
            code: p.benefit.Ma_PhucLoi,
            name: p.benefit.Ten_PhucLoi,
            cycle: p.benefit.Chu_Ky,
            rate: rate,
            total: 0
          };
        }
        benefitMap[p.benefit.Ma_PhucLoi].total += amt;
      });

      let monthlySalary = parseFloat(emp.Luong !== undefined ? emp.Luong : emp.Luong_Co_Ban) || 0;
      let annualSalary = monthlySalary * 12;
      let totalAnnualCost = annualSalary + empBenefitTotal;

      employeeDetails.push({
        Ma_NV: emp.Ma_NV,
        Ho_Ten: emp.Ho_Ten,
        Phong_Ban: emp.Phong_Ban,
        Vi_Tri: emp.Vi_Tri,
        Cap_Bac: emp.Cap_Bac,
        Gioi_Tinh: emp.Gioi_Tinh,
        Doi_Tuong: emp.Doi_Tuong || "Cơ hữu",
        Ngay_Vao_Lam: emp.Ngay_Vao_Lam,
        Luong_Thang: monthlySalary,
        Luong_Nam: annualSalary,
        Tong_PhucLoi_Thuong: empBenefitTotal,
        Tong_ChiPhi_Nam: totalAnnualCost,
        PL_Loai_Tru: emp.PL_Loai_Tru || "",
        ChiTiet_KhoanChi: Object.values(benefitMap)
      });

      let pr = getPayrollRow(payrollMap, emp.Phong_Ban);
      pr.existingSalary += annualSalary;
      pr.headcount += 1;

      totalExistingBudget += empBenefitTotal;
      deptBreakdown[emp.Phong_Ban] = (deptBreakdown[emp.Phong_Ban] || 0) + empBenefitTotal;
    }
  });

  // B. Tính cho Tuyển mới
  newHirePlan.forEach(plan => {
    let count = parseInt(plan.So_Luong_Tuyen_Moi) || 0;
    let startMonth = parseInt(plan.Thang_Du_Kien_Vao) || 1;
    totalNewHireCount += count;
    let planCost = 0;

    // Quỹ lương tuyển mới: lương dự kiến x số tháng làm việc trong năm (từ tháng vào làm) x số người
    let prNew = getPayrollRow(payrollMap, plan.Phong_Ban);
    prNew.newHireCount += count;
    prNew.newHireSalary += (parseFloat(plan.Luong_Dukien || plan.Luong_Co_Ban_Dukien) || 0) * (13 - Math.min(Math.max(startMonth, 1), 12)) * count;

    for (let i = 0; i < count; i++) {
      let mockEmp = {
        Phong_Ban: plan.Phong_Ban,
        Vi_Tri: plan.Vi_Tri,
        Cap_Bac: plan.Cap_Bac,
        Khu_Vuc: plan.Khu_Vuc,
        Gioi_Tinh: plan.Gioi_Tinh_Du_Kien || "All",
        Doi_Tuong: plan.Doi_Tuong_Du_Kien || "Cơ hữu",
        Luong: parseFloat(plan.Luong_Dukien || plan.Luong_Co_Ban_Dukien) || 0,
        Luong_Dong_BHXH: parseFloat(plan.Luong_BHXH_Dukien) || 0
      };

      // Giả định nhân sự mới vào làm ngày 1 của tháng dự kiến
      const hireDate = new Date(targetYear, Math.min(Math.max(startMonth, 1), 12) - 1, 1);
      collectPayments(benefits, mockEmp, hireDate, targetYear).forEach(p => {
        let amt = p.amount * (1 + benefitRate(p.benefit, inflationRate) / 100);
        planCost += amt;
        categoryBreakdown[p.benefit.Ten_PhucLoi] = (categoryBreakdown[p.benefit.Ten_PhucLoi] || 0) + amt;
        addCategory(categoryMap, p.benefit, amt);
        addCashEvent(cashEvents, "Tuyển mới", p.benefit, p.date, amt);
      });
    }

    totalNewHireBudget += planCost;
    deptBreakdown[plan.Phong_Ban] = (deptBreakdown[plan.Phong_Ban] || 0) + planCost;
  });

  return {
    summary: {
      targetYear: targetYear,
      inflationRate: parseFloat(inflationRate) || 0,
      totalBudget: totalExistingBudget + totalNewHireBudget,
      existingBudget: totalExistingBudget,
      newHireBudget: totalNewHireBudget,
      totalEmployees: employees.filter(e => e.Trang_Thai === "Đang làm việc").length,
      totalNewHires: totalNewHireCount,
      activeEmployees: employees.filter(e => e.Trang_Thai === "Đang làm việc").length,
      avgBenefitPerExisting: (employees.filter(e => e.Trang_Thai === "Đang làm việc").length > 0)
        ? (totalExistingBudget / employees.filter(e => e.Trang_Thai === "Đang làm việc").length) : 0,
      avgCostPerNewHire: totalNewHireCount > 0 ? (totalNewHireBudget / totalNewHireCount) : 0
    },
    categoryBreakdown: categoryBreakdown,
    deptBreakdown: deptBreakdown,
    // Danh sách đã sắp xếp: phúc lợi theo mã (PL01, PL02, ... PL10), phòng ban theo bảng chữ cái
    categoryList: Object.values(categoryMap).sort((a, b) => String(a.code).localeCompare(String(b.code), "en", { numeric: true })),
    deptList: Object.keys(deptBreakdown).sort((a, b) => String(a).localeCompare(String(b), "vi")).map(k => ({ name: k, amount: deptBreakdown[k] })),
    deptPayroll: Object.keys(payrollMap).sort((a, b) => String(a).localeCompare(String(b), "vi")).map(k => Object.assign({ name: k }, payrollMap[k])),
    employeeDetails: employeeDetails,
    cashflow: Object.values(cashEvents).sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : String(a.code).localeCompare(String(b.code))))
  };
}

function getPayrollRow(map, dept) {
  const key = dept || "(Chưa có phòng ban)";
  if (!map[key]) map[key] = { existingSalary: 0, headcount: 0, newHireSalary: 0, newHireCount: 0 };
  return map[key];
}

function addCategory(map, b, amt) {
  const key = String(b.Ma_PhucLoi).trim();
  if (!map[key]) map[key] = { code: key, name: b.Ten_PhucLoi, amount: 0 };
  map[key].amount += amt;
}

// vals: {doiTuong, gioiTinh, phongBan, viTri}. allowAll: giá trị "All" (kế hoạch tuyển mới) khớp mọi lựa chọn
function matchFilters(f, vals, allowAll) {
  return ["doiTuong", "gioiTinh", "phongBan", "viTri"].every(k => {
    const sel = f[k];
    if (!sel || sel.length === 0) return true;
    if (allowAll && vals[k] === "All") return true;
    return sel.map(String).indexOf(String(vals[k])) >= 0;
  });
}

// 6. Kiểm tra điều kiện Phúc lợi
function checkEligibility(emp, seniorityMonths, b) {
  if (b.Doi_Tuong && b.Doi_Tuong !== "All" && b.Doi_Tuong !== emp.Doi_Tuong) return false;
  if (b.Gioi_Tinh && b.Gioi_Tinh !== "All" && b.Gioi_Tinh !== emp.Gioi_Tinh) return false;
  if (b.Cap_Bac && b.Cap_Bac !== "All" && b.Cap_Bac !== emp.Cap_Bac) return false;
  if (b.Phong_Ban && b.Phong_Ban !== "All" && b.Phong_Ban !== emp.Phong_Ban) return false;
  if (seniorityMonths < (parseInt(b.Tham_Nien_Toi_Thieu_Thang) || 0)) return false;
  return true;
}

/**
 * Chọn bậc thưởng phù hợp theo thâm niên + đối tượng + cấp bậc.
 * Khoảng thâm niên tính [Từ, Đến) – Đến để trống = không giới hạn.
 * Nhiều bậc cùng khớp: ưu tiên bậc cụ thể hơn (có Đối tượng/Cấp bậc), rồi bậc có "Từ tháng" cao hơn.
 * Trả về null nếu không có bậc nào khớp.
 */
function findTier(tiers, emp, seniorityMonths) {
  let best = null, bestScore = -1;
  tiers.forEach(t => {
    if (t.Doi_Tuong && t.Doi_Tuong !== "All" && t.Doi_Tuong !== emp.Doi_Tuong) return;
    if (t.Cap_Bac && t.Cap_Bac !== "All" && t.Cap_Bac !== emp.Cap_Bac) return;
    const from = parseInt(t.Tham_Nien_Tu_Thang) || 0;
    const hasTo = !(t.Tham_Nien_Den_Thang === "" || t.Tham_Nien_Den_Thang == null);
    if (seniorityMonths < from) return;
    if (hasTo && seniorityMonths >= parseInt(t.Tham_Nien_Den_Thang)) return;
    const specificity = (t.Doi_Tuong && t.Doi_Tuong !== "All" ? 1 : 0) + (t.Cap_Bac && t.Cap_Bac !== "All" ? 1 : 0);
    const score = specificity * 100000 + from;
    if (score > bestScore) { best = t; bestScore = score; }
  });
  return best;
}

// ---- Ngày chi trả & thâm niên chính xác theo ngày ----

function isLastDayOfMonth(d) {
  return d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// Số tháng tròn thâm niên tại ngày payDate (chưa đủ ngày trong tháng thì chưa tính tháng đó)
function seniorityAt(joinDate, payDate) {
  let m = (payDate.getFullYear() - joinDate.getFullYear()) * 12 + (payDate.getMonth() - joinDate.getMonth());
  if (payDate.getDate() < joinDate.getDate() && !isLastDayOfMonth(payDate)) m--;
  return m;
}

function addMonthsClamped(d, n) {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), dim));
}

function dateInMonth(year, monthIdx, day) {
  const dim = new Date(year, monthIdx + 1, 0).getDate();
  return new Date(year, monthIdx, Math.min(day, dim));
}

/**
 * Các ngày chi trả của 1 phúc lợi trong năm:
 *  - Tháng: mỗi tháng vào Ngay_Chi_Tra
 *  - Quý: mỗi 3 tháng, bắt đầu từ Thang_Chi_Tra (mặc định tháng 3 => 3/6/9/12)
 *  - Năm: 1 lần vào Thang_Chi_Tra (mặc định tháng 12) + Ngay_Chi_Tra
 *  - 1 lần: đúng ngày kỷ niệm thâm niên (ngày vào + số tháng thâm niên tối thiểu)
 * Ngay_Chi_Tra để trống = ngày 1. Ngày > số ngày của tháng thì lấy ngày cuối tháng.
 */
function getPaymentDates(b, joinDate, year) {
  const day = Math.min(Math.max(parseInt(b.Ngay_Chi_Tra) || 1, 1), 31);
  const tm = parseInt(b.Thang_Chi_Tra);
  const dates = [];
  if (b.Chu_Ky === "Tháng") {
    for (let m = 0; m < 12; m++) dates.push(dateInMonth(year, m, day));
  } else if (b.Chu_Ky === "Quý") {
    const start = (((tm >= 1 && tm <= 12) ? tm : 3) - 1) % 3;
    for (let k = 0; k < 4; k++) dates.push(dateInMonth(year, start + 3 * k, day));
  } else if (b.Chu_Ky === "Năm") {
    dates.push(dateInMonth(year, ((tm >= 1 && tm <= 12) ? tm : 12) - 1, day));
  } else if (b.Chu_Ky === "1 lần") {
    const d = addMonthsClamped(joinDate, parseInt(b.Tham_Nien_Toi_Thieu_Thang) || 0);
    if (d.getFullYear() === year) dates.push(d);
  }
  return dates;
}

// Toàn bộ khoản chi (chưa nhân lạm phát) của 1 nhân sự trong năm: [{benefit, date, amount}]
function collectPayments(benefits, emp, joinDate, year) {
  const join = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
  const out = [];
  const excluded = String(emp.PL_Loai_Tru || "").split(",").map(x => x.trim()).filter(x => x);
  benefits.forEach(b => {
    if (excluded.indexOf(String(b.Ma_PhucLoi).trim()) >= 0) return; // trường hợp đặc biệt: không được hưởng
    getPaymentDates(b, join, year).forEach(date => {
      if (date < join) return; // chưa vào làm tại ngày chi trả
      const sen = seniorityAt(join, date);
      if (!checkEligibility(emp, sen, b)) return;
      const amount = calculateBenefitAmount(b, emp, sen);
      if (amount > 0) out.push({ benefit: b, date: date, amount: amount });
    });
  });
  return out;
}

function fmtISO(d) {
  const p = n => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function addCashEvent(events, source, b, date, amt) {
  const iso = fmtISO(date);
  const key = iso + "|" + b.Ma_PhucLoi + "|" + source;
  if (!events[key]) {
    events[key] = { date: iso, code: b.Ma_PhucLoi, name: b.Ten_PhucLoi, cycle: b.Chu_Ky, source: source, count: 0, amount: 0 };
  }
  events[key].count += 1;
  events[key].amount += amt;
}

// Số tiền 1 lần chi (chưa nhân lạm phát) theo thâm niên tại ngày chi trả
function calculateBenefitAmount(benefit, emp, seniorityMonths) {
  let rate = parseFloat(benefit.Gia_Tri_Mac_Dinh) || 0;
  if (benefit.tiers && benefit.tiers.length > 0) {
    const tier = findTier(benefit.tiers, emp, seniorityMonths);
    if (!tier) return 0; // Có cấu hình bậc nhưng nhân sự không thuộc bậc nào => không được hưởng
    rate = parseFloat(tier.Gia_Tri) || 0;
  }
  let isPercentage = benefit.Loai_Tinh_Toan === "Phần trăm lương";

  let baseAmount = rate;
  if (isPercentage) {
    let salaryBase = (benefit.Can_Cu_Luong === "Luong_Dong_BHXH") 
      ? (emp.Luong_Dong_BHXH || 0) 
      : (emp.Luong !== undefined ? emp.Luong : emp.Luong_Co_Ban || 0);
    baseAmount = salaryBase * (rate / 100);
  }

  return baseAmount;
}

// 7. Lưu Kế hoạch Tuyển dụng
function saveNewHirePlan(planArray) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("KeHoach_TuyenDung");
  if (!sh) { setupDatabase(); sh = ss.getSheetByName("KeHoach_TuyenDung"); }

  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 10).clearContent();
  }

  if (planArray && planArray.length > 0) {
    let rows = planArray.map(p => [
      p.Phong_Ban,
      p.Vi_Tri,
      p.Cap_Bac,
      p.Khu_Vuc,
      p.Gioi_Tinh_Du_Kien,
      p.Doi_Tuong_Du_Kien,
      p.So_Luong_Tuyen_Moi,
      p.Luong_Dukien,
      p.Luong_BHXH_Dukien,
      p.Thang_Du_Kien_Vao
    ]);
    sh.getRange(2, 1, rows.length, 10).setValues(rows);
  }
  return "Đã cập nhật Kế hoạch Tuyển dụng thành công!";
}

function getSheetDataAsJson(sheet) {
  if (!sheet) return [];
  let data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  let headers = data.shift().map(h => String(h).trim());
  const timeZone = Session.getScriptTimeZone() || "GMT+7";

  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, timeZone, "dd/MM/yyyy");
      }
      obj[h] = val;
    });
    return obj;
  });
}