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
    ['EMPLOYEE', 'Nhân sự', 'Chỉ xem hồ sơ và thu nhập của chính mình (gán phạm vi Cá nhân)'],
    ['PROPOSER', 'Giáo vụ / Người đề xuất', 'Nhập khai báo, tạo và gửi phiếu đề xuất cho trường mình (gán phạm vi Trường)']
  ];

  /** Các quyền đã tồn tại ở bản đầu tiên: dùng để biết quyền nào là "mới" khi nâng cấp hệ thống đã cài. */
  var ORIGINAL_PERMS = ['setup.view', 'setup.edit', 'policy.view', 'policy.edit', 'policy.publish', 'staff.view', 'staff.edit',
    'staff.import', 'salary.view', 'salary.edit', 'user.manage', 'role.manage', 'audit.view'];

  var ROLE_PERMS = {
    HR_DIRECTOR: ['setup.view', 'setup.edit', 'policy.view', 'policy.edit', 'staff.view', 'staff.edit', 'staff.import', 'salary.view', 'salary.edit', 'audit.view',
      'declare.view', 'declare.edit', 'phieu.create', 'phieu.view', 'workflow.manage', 'calc.run', 'calc.view'],
    CEO: ['setup.view', 'policy.view', 'policy.publish', 'staff.view', 'salary.view', 'audit.view', 'declare.view', 'phieu.view', 'calc.view'],
    HDHT_CHAIR: ['setup.view', 'policy.view', 'policy.edit', 'staff.view', 'salary.view', 'declare.view', 'phieu.view', 'calc.view'],
    HR_STAFF: ['setup.view', 'policy.view', 'staff.view', 'staff.edit', 'staff.import', 'declare.view', 'declare.edit', 'phieu.create', 'phieu.view', 'calc.run', 'calc.view'],
    PRINCIPAL: ['setup.view', 'policy.view', 'staff.view', 'staff.edit', 'salary.view', 'declare.view', 'declare.edit', 'phieu.create', 'phieu.view', 'calc.view'],
    PROPOSER: ['setup.view', 'policy.view', 'staff.view', 'declare.view', 'declare.edit', 'phieu.create', 'phieu.view', 'calc.view'],
    EMPLOYEE: ['staff.view', 'salary.view', 'declare.view', 'calc.view']
  };

  var VUOT_KHUNG = { GV3: 1, PHT: 1, HT: 1 };
  var HANG_TRUONG = { HT: 'Hiệu trưởng', PHT: 'Phó hiệu trưởng' };

  /** Quy trình mặc định (câu mẫu: Giáo vụ đề xuất -> Hiệu trưởng -> Nhân sự -> Tổng giám đốc). Sửa được trong Hệ thống → Quy trình duyệt. */
  function defaultSteps() {
    var rows = [];
    LOAI_PHIEU.forEach(function (l) {
      [[1, 'Hiệu trưởng xét duyệt', 'Xét duyệt', 'PRINCIPAL', 'Cùng trường'],
        [2, 'Nhân sự xét duyệt', 'Xét duyệt', 'HR_DIRECTOR', 'Toàn hệ thống'],
        [3, 'Tổng Giám đốc phê duyệt', 'Phê duyệt', 'CEO', 'Toàn hệ thống']].forEach(function (x) {
        rows.push({ loai_phieu: l, truong_ma: '', thu_tu: x[0], ten_buoc: x[1], hanh_dong: x[2], vai_tro: x[3], pham_vi: x[4], han_ngay: '' });
      });
    });
    return rows;
  }

  function setSetting(k, v) {
    var cur = Db.find('SETTINGS', function (x) { return x.khoa === k; });
    if (cur) Db.updateMany('SETTINGS', [{ id: cur.id, patch: { gia_tri: v } }], 'system');
    else Db.insertMany('SETTINGS', [{ khoa: k, gia_tri: v }], 'system');
  }

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
            return d({ ngach_ma: g[0], hs_chuc_danh: g[3], hs_kpi: g[4], hs_tiet: g[5], nhom_tham_nien: g[6],
              vuot_khung: VUOT_KHUNG[g[0]] ? 'Có' : 'Không', ho_tro_hang_truong: HANG_TRUONG[g[0]] || '' });
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
        if (!Db.find('SETTINGS', function (x) { return x.khoa === 'perms_da_nap'; })) setSetting('perms_da_nap', PERMS.map(function (x) { return x.k; }).join(','));
        Audit.log(null, 'KHOI_TAO', '', '', n);
      });
      n.nang_cap = Seed.upgrade();
      return n;
    },

    /**
     * Nâng cấp hệ thống đã cài khi mã nguồn có thêm quyền/vai trò/quy trình mặc định. Không xóa, không ghi đè
     * tùy chỉnh của bạn: chỉ thêm quyền MỚI cho vai trò mặc định, thêm vai trò mặc định còn thiếu, nạp quy trình
     * mặc định nếu bảng đang trống, và đặt cờ vượt khung/hạng trường cho đề án 2026.
     */
    upgrade: function () {
      var n = {};
      Db.tx(function () {
        var roleHave = {};
        Db.all('ROLES').forEach(function (r) { roleHave[r.ma] = true; });
        var newRoles = ROLES.filter(function (r) { return !roleHave[r[0]]; });
        if (newRoles.length) Db.insertMany('ROLES', newRoles.map(function (r) { return { ma: r[0], ten: r[1], mo_ta: r[2], he_thong: 'Có' }; }), 'system');
        n.vaiTroMoi = newRoles.map(function (r) { return r[0]; });

        var st = Db.find('SETTINGS', function (x) { return x.khoa === 'perms_da_nap'; });
        var known = st && st.gia_tri ? st.gia_tri.split(',') : ORIGINAL_PERMS;
        var have = {};
        Db.all('ROLE_PERMS').forEach(function (rp) { have[rp.role_ma + '|' + rp.quyen] = true; });
        var brandNew = {};
        n.vaiTroMoi.forEach(function (r) { brandNew[r] = true; });
        var add = [];
        Object.keys(ROLE_PERMS).forEach(function (role) {
          ROLE_PERMS[role].forEach(function (perm) {
            if ((brandNew[role] || known.indexOf(perm) < 0) && !have[role + '|' + perm]) add.push({ role_ma: role, quyen: perm });
          });
        });
        Db.insertMany('ROLE_PERMS', add, 'system');
        n.quyenMoi = add.length;
        setSetting('perms_da_nap', PERMS.map(function (x) { return x.k; }).join(','));

        n.quyTrinh = Db.all('WORKFLOW_STEP').length ? 0 : seedTable('WORKFLOW_STEP', defaultSteps());

        var ups = Db.filter('DEAN_NGACH', function (r) { return r.de_an_ma === DE_AN && r.vuot_khung === '' ; }).map(function (r) {
          return { id: r.id, patch: { vuot_khung: VUOT_KHUNG[r.ngach_ma] ? 'Có' : 'Không', ho_tro_hang_truong: r.ho_tro_hang_truong || HANG_TRUONG[r.ngach_ma] || '' } };
        });
        Db.updateMany('DEAN_NGACH', ups, 'system');
        n.capNhatNgach = ups.length;
        // Tham số mới của PARAMS được bổ sung (giá trị mặc định) vào MỌI phiên bản đề án hiện có, kể cả bản đã ban hành (chỉ thêm dòng thiếu).
        var addParam = [];
        Db.all('DEAN').forEach(function (d) {
          var have = {};
          Db.filter('DEAN_PARAM', function (x) { return x.de_an_ma === d.ma; }).forEach(function (x) { have[x.khoa] = true; });
          PARAMS.forEach(function (pp) {
            if (!have[pp.k]) addParam.push({ de_an_ma: d.ma, khoa: pp.k, gia_tri: pp.def, don_vi: pp.unit, mo_ta: pp.l });
          });
        });
        Db.insertMany('DEAN_PARAM', addParam, 'system');
        n.thamSoMoi = addParam.length;
        if (add.length || n.quyTrinh || ups.length || newRoles.length || addParam.length) Audit.log(null, 'NANG_CAP', '', '', n);
      });
      return n;
    }
  };
})();
