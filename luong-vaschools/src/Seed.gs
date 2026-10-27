/**
 * Dữ liệu khởi tạo theo Đề án lương khối Phổ thông HP.ĐA.01 (hiệu lực 01/03/2026).
 * Chỉ nạp vào bảng còn trống. Giá trị lấy nguyên văn từ văn bản đề án.
 */
var Seed = (function () {
  var DE_AN = 'DA01-2026';

  var NGACH = [
    // mã, tên, nhóm, HS chức danh, HS KPI, HS tiết, nhóm thâm niên
    ['GV1', 'Giáo viên 1', 'Giáo viên', 1, '', 1, 'TN2'],
    ['GV2', 'Giáo viên 2', 'Giáo viên', 1.1, '', 1.1, 'TN2'],
    ['GV3', 'Giáo viên 3', 'Giáo viên', 1.2, '', 1.3, 'TN2'],
    ['PHT', 'Phó hiệu trưởng', 'Quản lý', 2.3, 1.5, 1.4, 'TN3'],
    ['HT', 'Hiệu trưởng', 'Quản lý', 2.7, 1.8, '', 'TN3'],
    ['GIAOVU', 'Giáo vụ', 'Nhân viên', 1.5, 0.9, '', 'TN4'],
    ['GIAMTHI', 'Giám thị', 'Nhân viên', 1.4, 0.8, '', 'TN4'],
    ['VANTHU', 'Văn thư', 'Nhân viên', 1.2, 0.8, '', 'TN4'],
    ['THIETBI', 'Thiết bị', 'Nhân viên', 1.2, 0.8, '', 'TN4'],
    ['YTE', 'Y tế', 'Nhân viên', 1.2, 0.8, '', 'TN4'],
    ['THUVIEN', 'Thư viện', 'Nhân viên', 1.2, 0.8, '', 'TN4'],
    ['NHANVIEN', 'Nhân viên', 'Nhân viên', 1.2, 0.8, '', 'TN4'],
    ['TROLY', 'Trợ lý', 'Nhân viên', 1.8, 1.2, '', 'TN4'],
    ['BAOMAU', 'Bảo mẫu', 'Nhân viên', 0.8, 0.5, '', 'TN4'],
    ['BAOVE', 'Bảo vệ', 'Nhân viên', 0.8, 0.5, '', 'TN4'],
    ['NAUBEP', 'Nấu bếp', 'Nhân viên', 1, 0.6, '', 'TN4'],
    ['PHUBEP', 'Phụ bếp', 'Nhân viên', 0.8, 0.5, '', 'TN4'],
    ['PHUCVU', 'Phục vụ', 'Nhân viên', 0.7, 0.4, '', 'TN4'],
    ['TUVAN', 'Tư vấn', 'Nhân viên', 1.2, 0.8, '', 'TN4'],
    ['TV_HDHT', 'Thành viên HĐHT', 'HĐHT', 1.5, 1, '', 'TN3'],
    ['PHAPCHE_HDHT', 'Pháp chế HĐHT', 'HĐHT', 1.5, 1, '', 'TN3'],
    ['IT_HDHT', 'Nhân viên IT (HĐHT)', 'HĐHT', 1.5, 1, '', 'TN3'],
    ['TROLY_HDHT', 'Trợ lý HĐHT', 'HĐHT', 1.5, 1, '', 'TN3'],
    ['TRUONGNHOM_HDHT', 'Trưởng nhóm HĐHT', 'HĐHT', 3, 2, '', 'TN3'],
    ['PHONHOM_HDHT', 'Phó nhóm HĐHT', 'HĐHT', 2.4, 1.6, '', 'TN3'],
    ['CHUYENVIEN_HDHT', 'Chuyên viên HĐHT', 'HĐHT', 1.8, 1.2, '', 'TN3'],
    ['TV_QLCC', 'Thành viên HĐHT - QLCC (Hiệu trưởng - Phó Hiệu trưởng các trường)', 'HĐHT', '', 1.3, '', 'TN3'],
    ['CVP_HDHT', 'Chánh văn phòng (HĐHT)', 'HĐHT', 1.8, 1.2, '', 'TN3'],
    ['PCT_HDHT_PT', 'Phó chủ tịch HĐHT PT', 'HĐHT', 3.6, 2.4, '', 'TN3'],
    ['CT_HDHT_PT', 'Chủ tịch HĐHT PT', 'HĐHT', 4.5, 3, '', 'TN3'],
    ['KHAC', 'Khác (theo vị trí, do giám đốc chi nhánh vận dụng)', 'Khác', '', '', '', '']
  ];

  var QUY_DOI = [
    ['QD01', 'Tổ trưởng chuyên môn', 6, 'tuần', ''],
    ['QD02', 'Tổ phó chuyên môn/Nhóm trưởng chuyên môn', 4, 'tuần', ''],
    ['QD03', 'Tổ trưởng nghiệp vụ (nhân viên)', 1.5, 'tuần', ''],
    ['QD04', 'Tổ phó nghiệp vụ (nhân viên)', 0.75, 'tuần', ''],
    ['QD05', 'Giáo viên chủ nhiệm', 4, 'tuần', 'THCS-THPT'],
    ['QD06', 'Giáo viên phụ trách Thiết bị; Phòng Thí nghiệm; Phòng bộ môn', 2, 'tuần', ''],
    ['QD07', 'Giáo viên kiêm nhiệm tổ chức hoạt động, sự kiện cho học sinh (Trợ lý thanh niên/Tổng phụ trách Đội)', 3, 'tuần', ''],
    ['QD08', 'Giáo viên kiêm nhiệm các vấn đề về CNTT', 2, 'tuần', ''],
    ['QD09', 'Giáo viên/nhân viên quản lý giờ nghỉ bán trú', 0.2, 'buổi', 'THCS-THPT'],
    ['QD10', 'Giáo viên kiêm nhiệm công tác giám thị', 8, 'tuần', '']
  ];

  var ROLES = [
    ['ADMIN', 'Quản trị hệ thống', 'Toàn quyền, không thể bị gỡ quyền'],
    ['HR_DIRECTOR', 'Giám đốc Nhân sự', 'Quản lý thiết lập, đề án, nhân sự, thu nhập'],
    ['CEO', 'Tổng Giám đốc', 'Phê duyệt cao nhất: xem toàn bộ, ban hành đề án'],
    ['HDHT_CHAIR', 'Chủ tịch HĐHT khối Phổ thông', 'Soạn thảo đề án, xem nhân sự và thu nhập'],
    ['HR_STAFF', 'Chuyên viên Nhân sự', 'Nhập và cập nhật hồ sơ nhân sự'],
    ['PRINCIPAL', 'Hiệu trưởng', 'Xem/sửa nhân sự thuộc trường mình (gán phạm vi Trường)'],
    ['EMPLOYEE', 'Nhân sự', 'Chỉ xem hồ sơ và thu nhập của chính mình (gán phạm vi Cá nhân)']
  ];

  var ROLE_PERMS = {
    HR_DIRECTOR: ['setup.view', 'setup.edit', 'policy.view', 'policy.edit', 'staff.view', 'staff.edit', 'staff.import', 'salary.view', 'salary.edit', 'audit.view'],
    CEO: ['setup.view', 'policy.view', 'policy.publish', 'staff.view', 'salary.view', 'audit.view'],
    HDHT_CHAIR: ['setup.view', 'policy.view', 'policy.edit', 'staff.view', 'salary.view'],
    HR_STAFF: ['setup.view', 'policy.view', 'staff.view', 'staff.edit', 'staff.import'],
    PRINCIPAL: ['setup.view', 'policy.view', 'staff.view', 'staff.edit', 'salary.view'],
    EMPLOYEE: ['staff.view', 'salary.view']
  };

  function seedTable(table, rows, actor) {
    if (Db.all(table).length) return 0;
    Db.insertMany(table, rows, actor || 'system');
    return rows.length;
  }

  return {
    DE_AN: DE_AN,

    run: function (adminEmail, adminName) {
      var n = {};
      Db.tx(function () {
        n.settings = seedTable('SETTINGS', [
          { khoa: 'email_bat', gia_tri: 'Có' }, { khoa: 'app_url', gia_tri: '' }, { khoa: 'ten_he_thong', gia_tri: 'Hệ thống Lương VASchools' }]);
        n.roles = seedTable('ROLES', ROLES.map(function (r) { return { ma: r[0], ten: r[1], mo_ta: r[2], he_thong: 'Có' }; }));
        var rp = [];
        Object.keys(ROLE_PERMS).forEach(function (r) { ROLE_PERMS[r].forEach(function (p) { rp.push({ role_ma: r, quyen: p }); }); });
        n.rolePerms = seedTable('ROLE_PERMS', rp);
        n.chiNhanh = seedTable('CHI_NHANH', [{ ma: 'HCM', ten: 'TP. Hồ Chí Minh', tinh: 'TP. Hồ Chí Minh', trang_thai: 'Hoạt động' }]);
        n.ngach = seedTable('NGACH_DM', NGACH.map(function (g) { return { ma: g[0], ten: g[1], nhom: g[2], trang_thai: 'Hoạt động' }; }));

        if (!Db.all('DEAN').length) {
          Db.insertMany('DEAN', [{
            ma: DE_AN, so_hieu: 'HP.ĐA.01', ten: 'Đề án lương - Khối phổ thông từ 01/03/2026',
            hieu_luc_tu: '2026-03-01', hieu_luc_den: '', trang_thai: 'Ban hành', ghi_chu: 'Ngày ban hành 23/02/2026, lần ban hành 01'
          }], 'system');
          var d = function (o) { o.de_an_ma = DE_AN; return o; };
          Db.insertMany('DEAN_THAMSO', [d({ chi_nhanh_ma: 'HCM', lcb: 6000000, ltb: 100000 })], 'system');
          Db.insertMany('DEAN_NGACH', NGACH.map(function (g) {
            return d({ ngach_ma: g[0], hs_chuc_danh: g[3], hs_kpi: g[4], hs_tiet: g[5], nhom_tham_nien: g[6] });
          }), 'system');
          Db.insertMany('DEAN_HANGTRUONG', [
            d({ hang: 3, hs_hieu_truong: 0, hs_pho_hieu_truong: 0 }),
            d({ hang: 2, hs_hieu_truong: 0.3, hs_pho_hieu_truong: 0.3 }),
            d({ hang: 1, hs_hieu_truong: 0.6, hs_pho_hieu_truong: 0.6 })], 'system');
          Db.insertMany('DEAN_QUYDOI', QUY_DOI.map(function (q) {
            return d({ ma: q[0], ten: q[1], so_tiet: q[2], don_vi: q[3], ghi_chu: q[4] });
          }), 'system');
          Db.insertMany('DEAN_TRAN', [
            d({ nam: 2026, tn_tu: 0, tn_den: 5, ty_le: 0.05 }),
            d({ nam: 2026, tn_tu: 5, tn_den: 10, ty_le: 0.10 }),
            d({ nam: 2026, tn_tu: 10, tn_den: '', ty_le: 0.15 })], 'system');
          Db.insertMany('DEAN_PARAM', PARAMS.map(function (p) {
            return d({ khoa: p.k, gia_tri: p.def, don_vi: p.unit, mo_ta: p.l });
          }), 'system');
          n.dean = DE_AN;
        }

        if (adminEmail) {
          var mail = adminEmail.toLowerCase();
          if (!Db.find('USERS', function (u) { return u.email === mail; })) {
            Db.insertMany('USERS', [{ email: mail, ho_ten: adminName || mail, ma_nv: '', trang_thai: 'Hoạt động' }], 'system');
          }
          if (!Db.find('USER_ROLES', function (g) { return g.email === mail && g.role_ma === 'ADMIN'; })) {
            Db.insertMany('USER_ROLES', [{ email: mail, role_ma: 'ADMIN', pham_vi: 'Toàn hệ thống', pham_vi_ma: '', hieu_luc_tu: '', hieu_luc_den: '' }], 'system');
          }
          n.admin = mail;
        }
        Audit.log(null, 'KHOI_TAO', '', '', n);
      });
      return n;
    }
  };
})();
