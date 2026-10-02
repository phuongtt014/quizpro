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
    shNV.appendRow(["Ma_NV", "Ho_Ten", "Phong_Ban", "Vi_Tri", "Cap_Bac", "Khu_Vuc", "Gioi_Tinh", "Doi_Tuong", "Ngay_Vao_Lam", "Luong", "Luong_Dong_BHXH", "DCH", "Trang_Thai"]);
    shNV.appendRow(["NV001", "Nguyễn Văn A", "Khối Công nghệ", "Lập trình viên Senior", "Quản lý cấp trung", "Hồ Chí Minh", "Nam", "Cơ hữu", "15/01/2022", 25000000, 10000000, 0, "Đang làm việc"]);
    shNV.appendRow(["NV002", "Trần Thị B", "Khối Nhân sự", "C&B Specialist", "Nhân viên", "Hà Nội", "Nữ", "Cơ hữu", "10/05/2021", 18000000, 8500000, 0, "Đang làm việc"]);
    shNV.appendRow(["NV003", "Lê Văn C", "Khối Kinh doanh", "Chuyên viên Sales", "Nhân viên", "Đà Nẵng", "Nam", "Dịch vụ", "01/08/2023", 12000000, 6000000, 0, "Đang làm việc"]);
    shNV.appendRow(["NV004", "Phạm Thị D", "Khối Công nghệ", "Giám đốc Công nghệ", "Quản lý cấp cao", "Hồ Chí Minh", "Nữ", "Cơ hữu", "20/02/2021", 45000000, 15000000, 0, "Đang làm việc"]);
    formatHeader(shNV, 13);
  }

  // Sheet 2: DM_PhucLoi (11 Cột - Căn cứ Luong)
  let shPL = ss.getSheetByName("DM_PhucLoi") || ss.insertSheet("DM_PhucLoi");
  if (shPL.getLastRow() === 0) {
    shPL.appendRow(["Ma_PhucLoi", "Ten_PhucLoi", "Loai_Tinh_Toan", "Gia_Tri_Mac_Dinh", "Can_Cu_Luong", "Chu_Ky", "Doi_Tuong", "Gioi_Tinh", "Cap_Bac", "Phong_Ban", "Tham_Nien_Toi_Thieu_Thang"]);
    shPL.appendRow(["PL01", "Chi phí BHXH, BHYT, BHTN (DN đóng 21.5%)", "Phần trăm lương", 21.5, "Luong_Dong_BHXH", "Tháng", "Cơ hữu", "All", "All", "All", 0]);
    shPL.appendRow(["PL02", "Phụ cấp Ăn trưa Cố định", "Số tiền cố định", 1000000, "Không", "Tháng", "All", "All", "All", "All", 0]);
    shPL.appendRow(["PL03", "Thưởng Tết Nguyên Đán (Tháng 13)", "Phần trăm lương", 100, "Luong", "Năm", "Cơ hữu", "All", "All", "All", 12]);
    shPL.appendRow(["PL04", "Quà tặng 8/3 & 20/10", "Số tiền cố định", 500000, "Không", "Quý", "All", "Nữ", "All", "All", 0]);
    shPL.appendRow(["PL05", "Bảo hiểm sức khỏe PVI (Quản lý)", "Số tiền cố định", 4500000, "Không", "Năm", "Cơ hữu", "All", "Quản lý cấp trung", "All", 6]);
    shPL.appendRow(["PL06", "Chi phí Đồng phục Hàng năm", "Số tiền cố định", 2000000, "Không", "Năm", "All", "All", "Nhân viên", "All", 0]);
    formatHeader(shPL, 11);
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
    employees: getSheetDataAsJson(ss.getSheetByName("DB_NhanSu")),
    benefits: getSheetDataAsJson(ss.getSheetByName("DM_PhucLoi")),
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

  const newCode = String(b.Ma_PhucLoi).trim();
  oldCode = String(oldCode || "").trim();
  const lookupCode = oldCode || newCode;

  let data = shPL.getDataRange().getValues();
  let foundRowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    const code = String(data[i][0]).trim();
    if (code === lookupCode) foundRowIndex = i + 1;
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
    parseInt(b.Tham_Nien_Toi_Thieu_Thang) || 0
  ];

  if (foundRowIndex > 0) {
    shPL.getRange(foundRowIndex, 1, 1, 11).setValues([newRow]);
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
    emp.Trang_Thai || "Đang làm việc"
  ];

  if (foundRowIndex > 0) {
    sh.getRange(foundRowIndex, 1, 1, 13).setValues([newRow]);
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
function calculateBudget(targetYear, inflationRate) {
  targetYear = parseInt(targetYear) || (new Date().getFullYear() + 1);
  const inflationFactor = 1 + ((parseFloat(inflationRate) || 0) / 100);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const employees = getSheetDataAsJson(ss.getSheetByName("DB_NhanSu"));
  const benefits = getSheetDataAsJson(ss.getSheetByName("DM_PhucLoi"));
  const newHirePlan = getSheetDataAsJson(ss.getSheetByName("KeHoach_TuyenDung"));

  // Gắn các bậc thưởng vào từng phúc lợi (nếu có)
  const tiers = getSheetDataAsJson(ss.getSheetByName("DM_PhucLoi_Bac"));
  benefits.forEach(b => {
    b.tiers = tiers.filter(t => String(t.Ma_PhucLoi).trim() === String(b.Ma_PhucLoi).trim());
  });

  let totalExistingBudget = 0;
  let totalNewHireBudget = 0;
  let totalNewHireCount = 0;

  let categoryBreakdown = {};
  let deptBreakdown = {};
  let employeeDetails = [];

  // A. Tính cho từng Nhân sự hiện tại
  employees.forEach(emp => {
    if (emp.Trang_Thai === "Đang làm việc") {
      let empBenefitTotal = 0;
      let joinDate = parseDateVN(emp.Ngay_Vao_Lam);
      let benefitMap = {};

      for (let m = 1; m <= 12; m++) {
        let curDate = new Date(targetYear, m - 1, 15);
        let seniorityMonths = (curDate.getFullYear() - joinDate.getFullYear()) * 12 + (curDate.getMonth() - joinDate.getMonth());
        if (seniorityMonths < 0) continue;

        benefits.forEach(b => {
          if (checkEligibility(emp, seniorityMonths, b)) {
            let amt = calculateBenefitAmount(b, emp, m, seniorityMonths) * inflationFactor;
            empBenefitTotal += amt;
            categoryBreakdown[b.Ten_PhucLoi] = (categoryBreakdown[b.Ten_PhucLoi] || 0) + amt;

            if (!benefitMap[b.Ma_PhucLoi]) {
              benefitMap[b.Ma_PhucLoi] = {
                code: b.Ma_PhucLoi,
                name: b.Ten_PhucLoi,
                cycle: b.Chu_Ky,
                total: 0
              };
            }
            benefitMap[b.Ma_PhucLoi].total += amt;
          }
        });
      }

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
        ChiTiet_KhoanChi: Object.values(benefitMap)
      });

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

      for (let m = startMonth; m <= 12; m++) {
        let seniorityMonths = m - startMonth;

        benefits.forEach(b => {
          if (checkEligibility(mockEmp, seniorityMonths, b)) {
            let amt = calculateBenefitAmount(b, mockEmp, m, seniorityMonths) * inflationFactor;
            planCost += amt;
            categoryBreakdown[b.Ten_PhucLoi] = (categoryBreakdown[b.Ten_PhucLoi] || 0) + amt;
          }
        });
      }
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
      totalEmployees: employees.length,
      totalNewHires: totalNewHireCount,
      avgCostPerNewHire: totalNewHireCount > 0 ? (totalNewHireBudget / totalNewHireCount) : 0
    },
    categoryBreakdown: categoryBreakdown,
    deptBreakdown: deptBreakdown,
    employeeDetails: employeeDetails
  };
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

function calculateBenefitAmount(benefit, emp, month, seniorityMonths) {
  let rate = parseFloat(benefit.Gia_Tri_Mac_Dinh) || 0;
  if (benefit.tiers && benefit.tiers.length > 0) {
    const tier = findTier(benefit.tiers, emp, seniorityMonths);
    if (!tier) return 0; // Có cấu hình bậc nhưng nhân sự không thuộc bậc nào => không được hưởng
    rate = parseFloat(tier.Gia_Tri) || 0;
  }
  let cycle = benefit.Chu_Ky;
  let isPercentage = benefit.Loai_Tinh_Toan === "Phần trăm lương";

  let baseAmount = rate;
  if (isPercentage) {
    let salaryBase = (benefit.Can_Cu_Luong === "Luong_Dong_BHXH") 
      ? (emp.Luong_Dong_BHXH || 0) 
      : (emp.Luong !== undefined ? emp.Luong : emp.Luong_Co_Ban || 0);
    baseAmount = salaryBase * (rate / 100);
  }

  if (cycle === "Tháng") return baseAmount;
  if (cycle === "Quý" && [3, 6, 9, 12].includes(month)) return baseAmount;
  if (cycle === "Năm" && month === 12) return baseAmount;
  if (cycle === "1 lần" && seniorityMonths === (parseInt(benefit.Tham_Nien_Toi_Thieu_Thang) || 0)) return baseAmount;

  return 0;
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
  let headers = data.shift();
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