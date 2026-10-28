/**
 * Khai báo toàn bộ bảng dữ liệu (mỗi bảng = 1 sheet cùng tên). Giao diện, kiểm tra nhập liệu,
 * phân quyền và nhập CSV đều sinh ra từ khai báo này: thêm cột/bảng chỉ cần sửa tại đây.
 *
 * Cột: k=khóa, l=nhãn, t=kiểu (text,longtext,email,int,num,money,pct,date,enum,ref),
 *      req=bắt buộc, def=mặc định, ref='BANG.cot', values=[...], ro=chỉ hệ thống được ghi,
 *      uniq=duy nhất trong bảng, pattern/hint, min/max.
 * Bảng: key=khóa tự nhiên, ctx=cột lấy từ ngữ cảnh (đề án), perm={r,w,i}, scope, temporal, lockKey.
 */
function col_(k, l, t, o) {
  var c = { k: k, l: l, t: t || 'text' };
  if (o) for (var p in o) c[p] = o[p];
  return c;
}

var YN = ['Có', 'Không'];

var PERMS = [
  { k: 'setup.view', l: 'Xem thiết lập (chi nhánh, trường, năm học...)' },
  { k: 'setup.edit', l: 'Sửa thiết lập' },
  { k: 'policy.view', l: 'Xem đề án / bảng hệ số' },
  { k: 'policy.edit', l: 'Soạn thảo đề án (bản nháp)' },
  { k: 'policy.publish', l: 'Ban hành đề án' },
  { k: 'staff.view', l: 'Xem hồ sơ nhân sự' },
  { k: 'staff.edit', l: 'Sửa hồ sơ, ngạch bậc, kiêm nhiệm' },
  { k: 'staff.import', l: 'Nhập hàng loạt nhân sự bằng CSV' },
  { k: 'salary.view', l: 'Xem thu nhập' },
  { k: 'salary.edit', l: 'Sửa/nhập thu nhập nền' },
  { k: 'user.manage', l: 'Quản lý người dùng & gán vai trò' },
  { k: 'role.manage', l: 'Quản lý vai trò & quyền' },
  { k: 'audit.view', l: 'Xem nhật ký hệ thống' },
  { k: 'declare.view', l: 'Xem khai báo giảng dạy/trách nhiệm' },
  { k: 'declare.edit', l: 'Nhập khai báo giảng dạy/trách nhiệm' },
  { k: 'phieu.create', l: 'Tạo và gửi phiếu đề xuất/duyệt' },
  { k: 'phieu.view', l: 'Xem mọi phiếu trong phạm vi' },
  { k: 'workflow.manage', l: 'Cấu hình quy trình duyệt & ủy quyền' },
  { k: 'calc.run', l: 'Chạy quyết toán phụ trội & thu nhập mới' },
  { k: 'calc.view', l: 'Xem kết quả quyết toán & thu nhập mới' }
];

var LOAI_PHIEU = ['Khai báo', 'Đề xuất ngạch', 'Quyết toán kỳ', 'Khác'];

/** Tham số số học của đề án (khóa cố định, giá trị theo từng phiên bản đề án). */
var PARAMS = [
  { k: 'tn_he_so_tn2', l: 'Hệ số thâm niên mỗi năm - nhóm TN2 (GV có tiết dạy)', def: 0.02, unit: 'hệ số/năm' },
  { k: 'tn_he_so_tn3', l: 'Hệ số thâm niên mỗi năm - nhóm TN3 (CBQL, HĐHT)', def: 0.03, unit: 'hệ số/năm' },
  { k: 'tn_he_so_tn4', l: 'Hệ số thâm niên mỗi năm - nhóm TN4 (nhân viên)', def: 0.04, unit: 'hệ số/năm' },
  { k: 'tn_toi_thieu', l: 'Số năm thâm niên tối thiểu để hưởng hỗ trợ thâm niên', def: 3, unit: 'năm' },
  { k: 'vuot_khung_he_so', l: 'Hệ số hỗ trợ vượt khung mỗi năm', def: 0.01, unit: 'hệ số/năm' },
  { k: 'vuot_khung_nam', l: 'Số năm giữ ngạch tối thiểu để hưởng vượt khung', def: 5, unit: 'năm' },
  { k: 'dinh_muc_tieu_hoc', l: 'Định mức GV Tiểu học nhiều môn', def: 24, unit: 'tiết/tuần' },
  { k: 'dinh_muc_khac', l: 'Định mức GV còn lại', def: 20, unit: 'tiết/tuần' },
  { k: 'kpi_tiet_th_so_tiet', l: 'KPI tiết dạy GV Tiểu học nhiều môn - số tiết', def: 96, unit: 'tiết' },
  { k: 'kpi_tiet_th_he_so', l: 'KPI tiết dạy GV Tiểu học nhiều môn - hệ số', def: 0.7, unit: 'hệ số' },
  { k: 'kpi_tiet_khac_so_tiet', l: 'KPI tiết dạy GV còn lại - số tiết', def: 80, unit: 'tiết' },
  { k: 'he_so_quy_doi_dac_thu', l: 'Quy đổi 1 tiết thực dạy môn đặc thù (bồi dưỡng, phụ đạo...)', def: 1.5, unit: 'tiết' },
  { k: 'he_so_tiet_trach_nhiem', l: 'Hệ số tiết trách nhiệm khi tính tiền', def: 1, unit: 'hệ số' },
  { k: 'pt_vao_thu_nhap', l: 'Cộng phụ trội bình quân/tháng vào thu nhập tháng (1 = có; 0 = không, chỉ đưa vào báo cáo chi phí)', def: 0, unit: '0/1' },
];

var SCHEMA = (function () {
  var S = {};
  var PERM_KEYS = PERMS.map(function (p) { return p.k; });
  var PARAM_KEYS = PARAMS.map(function (p) { return p.k; });
  var CODE = { pattern: '^[A-Z0-9_]{2,20}$', hint: 'IN HOA, số, gạch dưới; 2-20 ký tự' };
  var deanCtx = function () { return col_('de_an_ma', 'Đề án', 'ref', { ref: 'DEAN.ma', req: true }); };
  var deanPerm = { r: 'policy.view', w: 'policy.edit' };
  var temporalFrom = function () { return col_('hieu_luc_tu', 'Hiệu lực từ', 'date', { req: true }); };
  var temporalTo = function () { return col_('hieu_luc_den', 'Hiệu lực đến', 'date', { hint: 'để trống = còn hiệu lực' }); };

  /* ---------- THIẾT LẬP ---------- */
  S.CHI_NHANH = {
    label: 'Chi nhánh', group: 'setup', key: ['ma'], lockKey: true, scope: 'chi_nhanh',
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('ma', 'Mã chi nhánh', 'text', { req: true, pattern: CODE.pattern, hint: CODE.hint }),
      col_('ten', 'Tên chi nhánh', 'text', { req: true }),
      col_('tinh', 'Tỉnh/Thành phố', 'text', { req: true }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Hoạt động', 'Ngừng'], def: 'Hoạt động' })
    ]
  };

  S.TRUONG = {
    label: 'Trường', group: 'setup', key: ['ma'], lockKey: true, scope: 'truong',
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('ma', 'Mã trường', 'text', { req: true, pattern: CODE.pattern, hint: CODE.hint }),
      col_('ten', 'Tên trường', 'text', { req: true }),
      col_('chi_nhanh_ma', 'Chi nhánh', 'ref', { ref: 'CHI_NHANH.ma', req: true }),
      col_('cap_hoc', 'Cấp học', 'enum', { values: ['Tiểu học', 'THCS', 'THPT', 'Liên cấp'], req: true }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Hoạt động', 'Ngừng'], def: 'Hoạt động' })
    ]
  };

  S.NAM_HOC = {
    label: 'Năm học', group: 'setup', key: ['ma'], lockKey: true,
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('ma', 'Năm học', 'text', { req: true, pattern: '^\\d{4}-\\d{4}$', hint: 'dạng 2026-2027' }),
      col_('tu_ngay', 'Từ ngày', 'date', { req: true }),
      col_('den_ngay', 'Đến ngày', 'date', { req: true }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Đang mở', 'Đã khóa'], def: 'Đang mở' })
    ],
    check: function (r) {
      var y = r.ma.split('-');
      if (+y[1] !== +y[0] + 1) return 'Năm học phải là hai năm liên tiếp (vd 2026-2027)';
      if (r.den_ngay <= r.tu_ngay) return 'Đến ngày phải sau Từ ngày';
      return null;
    }
  };

  S.KY_LUONG = {
    label: 'Kỳ tính (học kỳ / đợt điều chỉnh thu nhập)', group: 'setup', key: ['ma'], lockKey: true,
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('ma', 'Mã kỳ', 'text', { req: true, pattern: '^\\d{4}-\\d{4}-(HK[12]|DC[1-9])$', hint: 'học kỳ: 2026-2027-HK1; đợt điều chỉnh: 2025-2026-DC1' }),
      col_('nam_hoc_ma', 'Năm học', 'ref', { ref: 'NAM_HOC.ma', req: true }),
      col_('hoc_ky', 'Học kỳ', 'enum', { values: ['HK1', 'HK2', 'DC1', 'DC2', 'DC3', 'DC4', 'DC5', 'DC6', 'DC7', 'DC8', 'DC9'], req: true }),
      col_('loai', 'Loại', 'enum', { values: ['Học kỳ', 'Điều chỉnh'], def: 'Học kỳ' }),
      col_('tu_ngay', 'Từ ngày', 'date', { req: true, hint: 'đợt điều chỉnh: ngày hiệu lực' }),
      col_('den_ngay', 'Đến ngày', 'date', { req: true, hint: 'đợt điều chỉnh: bằng ngày hiệu lực' }),
      col_('so_tuan', 'Số tuần quy định', 'int', { min: 0, max: 30, def: 0, hint: 'bắt buộc ≥ 1 với học kỳ' }),
      col_('so_thang_chia', 'Số tháng chia hỗ trợ', 'num', { def: 5, min: 1, max: 12 }),
      col_('ky_phu_troi', 'Kỳ lấy phụ trội', 'ref', { ref: 'KY_LUONG.ma' }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Mở', 'Đã chốt'], def: 'Mở' })
    ],
    check: function (r) {
      if (r.ma !== r.nam_hoc_ma + '-' + r.hoc_ky) return 'Mã kỳ phải = Năm học + "-" + Học kỳ/Đợt (vd ' + r.nam_hoc_ma + '-' + r.hoc_ky + ')';
      var kind = r.hoc_ky.indexOf('DC') === 0 ? 'Điều chỉnh' : 'Học kỳ';
      if (r.loai !== kind) return 'Mã ' + r.hoc_ky + ' thì Loại phải là "' + kind + '"';
      if (kind === 'Điều chỉnh') {
        if (r.den_ngay < r.tu_ngay) return 'Đến ngày phải ≥ Từ ngày';
        if (r.ky_phu_troi === r.ma) return 'Kỳ phụ trội không thể là chính đợt này';
        return null;
      }
      if (r.ky_phu_troi) return 'Chỉ đợt điều chỉnh mới chọn "Kỳ lấy phụ trội"';
      if (r.so_tuan < 1) return 'Học kỳ cần nhập Số tuần quy định (≥ 1)';
      return r.den_ngay <= r.tu_ngay ? 'Đến ngày phải sau Từ ngày' : null;
    }
  };

  S.TRUONG_HANG = {
    label: 'Hạng trường theo năm học', group: 'setup', key: ['truong_ma', 'nam_hoc_ma'], scope: 'truong_ma',
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('truong_ma', 'Trường', 'ref', { ref: 'TRUONG.ma', req: true }),
      col_('nam_hoc_ma', 'Năm học', 'ref', { ref: 'NAM_HOC.ma', req: true }),
      col_('hang', 'Hạng trường', 'int', { req: true, min: 1, max: 3 }),
      col_('so_lop', 'Số lớp', 'int', { req: true, min: 0 })
    ],
    check: function (r) {
      var exp = r.so_lop >= 30 ? 1 : (r.so_lop >= 15 ? 2 : 3);
      return r.hang !== exp ? 'Với ' + r.so_lop + ' lớp thì hạng trường phải là ' + exp + ' (theo đề án: <15 lớp hạng 3; 15-29 hạng 2; ≥30 hạng 1)' : null;
    }
  };

  S.NGACH_DM = {
    label: 'Danh mục ngạch', group: 'setup', key: ['ma'], lockKey: true,
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('ma', 'Mã ngạch', 'text', { req: true, pattern: CODE.pattern, hint: CODE.hint }),
      col_('ten', 'Tên ngạch', 'text', { req: true }),
      col_('nhom', 'Nhóm', 'enum', { values: ['Giáo viên', 'Quản lý', 'Nhân viên', 'HĐHT', 'Khác'], req: true }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Hoạt động', 'Ngừng'], def: 'Hoạt động' })
    ],
    // Hệ số lấy từ đề án đang hiệu lực (xem/sửa ở mục Đề án), chỉ để tra cứu tại đây.
    computed: [{ k: 'hs_chuc_danh', l: 'HS chức danh' }, { k: 'hs_kpi', l: 'HS KPI' }, { k: 'hs_tiet', l: 'HS tiết' },
      { k: 'nhom_tham_nien', l: 'Thâm niên' }, { k: 'vuot_khung', l: 'Vượt khung' }, { k: 'de_an_ap_dung', l: 'Theo đề án' }]
  };

  S.SETTINGS = {
    label: 'Cấu hình chung', group: 'setup', key: ['khoa'], lockKey: true,
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('khoa', 'Khóa', 'enum', { values: ['email_bat', 'app_url', 'ten_he_thong', 'perms_da_nap'], req: true }),
      col_('gia_tri', 'Giá trị', 'text')
    ]
  };

  /* ---------- ĐỀ ÁN (phiên bản hóa) ---------- */
  S.DEAN = {
    label: 'Đề án (phiên bản)', group: 'policy', key: ['ma'], lockKey: true,
    perm: deanPerm,
    cols: [
      col_('ma', 'Mã phiên bản', 'text', { req: true, pattern: '^[A-Z0-9._-]{2,30}$', hint: 'vd DA01-2026' }),
      col_('so_hieu', 'Số hiệu văn bản', 'text', { req: true }),
      col_('ten', 'Tên đề án', 'text', { req: true }),
      col_('hieu_luc_tu', 'Hiệu lực từ', 'date', { req: true }),
      col_('hieu_luc_den', 'Hiệu lực đến', 'date'),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Nháp', 'Ban hành', 'Ngừng'], def: 'Nháp', ro: true }),
      col_('ghi_chu', 'Ghi chú', 'longtext')
    ],
    check: function (r) {
      return r.hieu_luc_den && r.hieu_luc_den < r.hieu_luc_tu ? 'Hiệu lực đến phải ≥ Hiệu lực từ' : null;
    }
  };

  S.DEAN_THAMSO = {
    label: 'Lương cơ bản & lương tiết cơ bản theo chi nhánh', group: 'policy', ctx: 'de_an_ma', key: ['de_an_ma', 'chi_nhanh_ma'], perm: deanPerm,
    cols: [
      deanCtx(),
      col_('chi_nhanh_ma', 'Chi nhánh', 'ref', { ref: 'CHI_NHANH.ma', req: true }),
      col_('lcb', 'Lương cơ bản (LCB)', 'money', { req: true, min: 1 }),
      col_('ltb', 'Lương tiết cơ bản (LTB)', 'money', { req: true, min: 1 })
    ]
  };

  S.DEAN_NGACH = {
    label: 'Bảng hệ số ngạch - bậc', group: 'policy', ctx: 'de_an_ma', key: ['de_an_ma', 'ngach_ma'], perm: deanPerm,
    cols: [
      deanCtx(),
      col_('ngach_ma', 'Ngạch', 'ref', { ref: 'NGACH_DM.ma', req: true }),
      col_('hs_chuc_danh', 'HS Chức danh', 'num', { min: 0 }),
      col_('hs_kpi', 'HS KPI', 'num', { min: 0 }),
      col_('hs_tiet', 'HS Tiết', 'num', { min: 0 }),
      col_('nhom_tham_nien', 'Nhóm thâm niên', 'enum', { values: ['TN2', 'TN3', 'TN4'] }),
      col_('vuot_khung', 'Hỗ trợ vượt khung', 'enum', { values: YN, def: 'Không' }),
      col_('ho_tro_hang_truong', 'Hỗ trợ hạng trường', 'enum', { values: ['Hiệu trưởng', 'Phó hiệu trưởng'] })
    ]
  };

  S.DEAN_HANGTRUONG = {
    label: 'Hỗ trợ trách nhiệm theo hạng trường', group: 'policy', ctx: 'de_an_ma', key: ['de_an_ma', 'hang'], perm: deanPerm,
    cols: [
      deanCtx(),
      col_('hang', 'Hạng trường', 'int', { req: true, min: 1, max: 3 }),
      col_('hs_hieu_truong', 'Hệ số Hiệu trưởng', 'num', { req: true, min: 0 }),
      col_('hs_pho_hieu_truong', 'Hệ số Phó Hiệu trưởng', 'num', { req: true, min: 0 })
    ]
  };

  S.DEAN_QUYDOI = {
    label: 'Quy đổi trách nhiệm ra tiết dạy', group: 'policy', ctx: 'de_an_ma', key: ['de_an_ma', 'ma'], perm: deanPerm,
    cols: [
      deanCtx(),
      col_('ma', 'Mã', 'text', { req: true, pattern: '^QD\\d{2}$', hint: 'dạng QD01' }),
      col_('ten', 'Trách nhiệm', 'text', { req: true }),
      col_('so_tiet', 'Số tiết quy đổi', 'num', { req: true, min: 0 }),
      col_('don_vi', 'Đơn vị tính', 'enum', { values: ['tuần', 'buổi', 'tháng', 'ngày'], req: true }),
      col_('ghi_chu', 'Ghi chú', 'text')
    ]
  };

  S.DEAN_TRAN = {
    label: 'Trần tăng thu nhập (chung và riêng từng trường)', group: 'policy', ctx: 'de_an_ma', key: ['de_an_ma', 'truong_ma', 'nam', 'tn_tu'], perm: deanPerm,
    cols: [
      deanCtx(),
      col_('truong_ma', 'Trường', 'ref', { ref: 'TRUONG.ma', hint: 'để trống = áp dụng chung cho mọi trường chưa có trần riêng' }),
      col_('nam', 'Năm áp dụng', 'int', { req: true, min: 2000, max: 2100 }),
      col_('tn_tu', 'Thâm niên từ (năm)', 'int', { req: true, min: 0 }),
      col_('tn_den', 'Đến dưới (năm)', 'int', { min: 1, hint: 'để trống = không giới hạn' }),
      col_('ty_le', 'Tỷ lệ tăng tối đa', 'pct', { req: true, min: 0 })
    ],
    check: function (r) { return r.tn_den !== '' && r.tn_den <= r.tn_tu ? '"Đến dưới" phải lớn hơn "Thâm niên từ"' : null; },
    // Các khoảng thâm niên của cùng (trường, năm) không được chồng nhau (tính cả dòng đã có và dòng trong file).
    checkSet: function (rows, existing, updated, push) {
      var groups = {}, key = function (r) { return r.truong_ma + '|' + r.nam; };
      existing.forEach(function (r) { if (!updated[r.id]) (groups[key(r)] = groups[key(r)] || []).push({ r: r, own: false }); });
      rows.forEach(function (r) { (groups[key(r)] = groups[key(r)] || []).push({ r: r, own: true }); });
      var end = function (r) { return r.tn_den === '' || r.tn_den === null ? Infinity : r.tn_den; };
      var span = function (r) { return '[' + r.tn_tu + ', ' + (r.tn_den === '' ? '∞' : r.tn_den) + ')'; };
      Object.keys(groups).forEach(function (g) {
        var l = groups[g].sort(function (a, b) { return a.r.tn_tu - b.r.tn_tu; });
        for (var i = 0; i < l.length; i++) for (var j = i + 1; j < l.length; j++) {
          if (l[j].r.tn_tu >= end(l[i].r)) break;
          [[l[i], l[j]], [l[j], l[i]]].forEach(function (p) {
            if (p[0].own) push(p[0].r.__n, 'tn_tu', p[0].r.tn_tu, 'Khoảng thâm niên ' + span(p[0].r) + ' chồng với ' + (p[1].own ? 'dòng ' + p[1].r.__n + ' trong file' : 'dòng đã có') + ' ' + span(p[1].r) +
              (p[0].r.truong_ma ? ' (trường ' + p[0].r.truong_ma + ', năm ' + p[0].r.nam + ')' : ' (trần chung, năm ' + p[0].r.nam + ')'));
          });
        }
      });
    }
  };

  S.DEAN_PARAM = {
    label: 'Tham số tính toán khác', group: 'policy', ctx: 'de_an_ma', key: ['de_an_ma', 'khoa'], perm: deanPerm,
    cols: [
      deanCtx(),
      col_('khoa', 'Tham số', 'enum', { values: PARAM_KEYS, req: true }),
      col_('gia_tri', 'Giá trị', 'num', { req: true, min: 0 }),
      col_('don_vi', 'Đơn vị', 'text'),
      col_('mo_ta', 'Mô tả', 'text')
    ]
  };

  /* ---------- NHÂN SỰ ---------- */
  var nvRef = function () { return col_('ma_nv', 'Mã nhân sự', 'ref', { ref: 'NHAN_SU.ma_nv', req: true }); };
  var ngachRef = function () { return col_('ngach_ma', 'Ngạch', 'ref', { ref: 'NGACH_DM.ma', req: true }); };

  S.NHAN_SU = {
    label: 'Hồ sơ nhân sự', group: 'staff', key: ['ma_nv'], lockKey: true, scope: 'nhan_su',
    perm: { r: 'staff.view', w: 'staff.edit', i: 'staff.import' },
    cols: [
      col_('ma_nv', 'Mã nhân sự', 'text', { req: true, pattern: '^[A-Za-z0-9._-]{2,20}$', hint: '2-20 ký tự chữ/số/._-' }),
      col_('ho_ten', 'Họ và tên', 'text', { req: true }),
      col_('ngay_sinh', 'Ngày sinh', 'date', { req: true }),
      col_('gioi_tinh', 'Giới tính', 'enum', { values: ['Nam', 'Nữ', 'Khác'], req: true }),
      col_('email', 'Email', 'email', { uniq: true }),
      col_('dien_thoai', 'Điện thoại', 'text', { pattern: '^[0-9+]{8,15}$', hint: '8-15 chữ số, không dấu cách' }),
      col_('ngay_vao_lam', 'Ngày vào làm', 'date', { req: true }),
      col_('chi_nhanh_ma', 'Chi nhánh', 'ref', { ref: 'CHI_NHANH.ma', req: true }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Đang làm việc', 'Đã nghỉ việc'], def: 'Đang làm việc' }),
      col_('ngay_nghi_viec', 'Ngày nghỉ việc', 'date')
    ],
    computed: [{ k: 'ngach_hien_tai', l: 'Ngạch hiện tại' }],
    check: function (r) {
      if (r.ngay_vao_lam <= r.ngay_sinh) return 'Ngày vào làm phải sau ngày sinh';
      if (r.trang_thai === 'Đã nghỉ việc' && !r.ngay_nghi_viec) return 'Trạng thái "Đã nghỉ việc" cần có Ngày nghỉ việc';
      if (r.trang_thai === 'Đang làm việc' && r.ngay_nghi_viec) return 'Đang làm việc thì không có Ngày nghỉ việc';
      if (r.ngay_nghi_viec && r.ngay_nghi_viec < r.ngay_vao_lam) return 'Ngày nghỉ việc phải sau ngày vào làm';
      return null;
    }
  };

  S.QUA_TRINH_NGACH = {
    label: 'Quá trình ngạch bậc', group: 'staff', key: ['ma_nv', 'hieu_luc_tu'], scope: 'qtn',
    temporal: { group: ['ma_nv'] }, perm: { r: 'staff.view', w: 'staff.edit', i: 'staff.import' },
    cols: [nvRef(), ngachRef(),
      col_('truong_ma', 'Trường', 'ref', { ref: 'TRUONG.ma', hint: 'trường làm việc trong giai đoạn này; để trống nếu thuộc khối văn phòng/HĐHT' }),
      col_('doi_tuong', 'Đối tượng tính lương', 'enum', { values: ['GV Tiểu học nhiều môn', 'GV còn lại', 'Quản lý', 'Nhân viên', 'HĐHT'], req: true }),
      temporalFrom(), temporalTo(), col_('so_quyet_dinh', 'Số quyết định', 'text'), col_('ly_do', 'Lý do', 'text')],
    // Thâm niên tính từ ngày vào làm đến NGÀY HIỆU LỰC BẮT ĐẦU của từng dòng nên nằm ở đây, không ở hồ sơ.
    computed: [{ k: 'ho_ten', l: 'Họ tên', after: 'ma_nv' }, { k: 'tham_nien', l: 'Thâm niên tại ngày hiệu lực (năm)', after: 'hieu_luc_tu' }],
    check: function (r) {
      var s = Db.find('NHAN_SU', function (x) { return x.ma_nv === r.ma_nv; });
      if (!s) return null;
      if (r.hieu_luc_tu < s.ngay_vao_lam) return 'Hiệu lực từ (' + Util.displayDate(r.hieu_luc_tu) + ') không thể trước ngày vào làm (' + Util.displayDate(s.ngay_vao_lam) + ')';
      if (r.truong_ma) {
        var tr = Db.find('TRUONG', function (x) { return x.ma === r.truong_ma; });
        if (tr && tr.chi_nhanh_ma !== s.chi_nhanh_ma) return 'Trường "' + r.truong_ma + '" thuộc chi nhánh "' + tr.chi_nhanh_ma + '", nhân sự thuộc chi nhánh "' + s.chi_nhanh_ma + '"';
      }
      return null;
    }
  };

  S.QUA_TRINH_KIEMNHIEM = {
    label: 'Quá trình kiêm nhiệm', group: 'staff', key: ['ma_nv', 'ngach_ma', 'hieu_luc_tu'], scope: 'staff',
    temporal: { group: ['ma_nv', 'ngach_ma'] }, perm: { r: 'staff.view', w: 'staff.edit', i: 'staff.import' },
    cols: [nvRef(), col_('ngach_ma', 'Ngạch kiêm nhiệm', 'ref', { ref: 'NGACH_DM.ma', req: true }),
      col_('ti_le', 'Tỉ lệ phụ cấp kiêm nhiệm', 'pct', { req: true, min: 0, max: 1 }),
      temporalFrom(), temporalTo(), col_('so_quyet_dinh', 'Số quyết định', 'text')]
  };

  S.THU_NHAP_NEN = {
    label: 'Thu nhập hiện tại (mốc bảo vệ lương)', group: 'staff', key: ['ma_nv', 'hieu_luc_tu'], scope: 'staff',
    temporal: { group: ['ma_nv'] }, perm: { r: 'salary.view', w: 'salary.edit', i: 'salary.edit' },
    cols: [nvRef(), col_('thu_nhap', 'Thu nhập/tháng', 'money', { req: true, min: 1 }),
      col_('ho_tro_gvcn', 'Hỗ trợ GVCN', 'money', { def: 0, min: 0 }), col_('ho_tro_khac', 'Hỗ trợ khác', 'money', { def: 0, min: 0 }),
      temporalFrom(), temporalTo(), col_('ghi_chu', 'Ghi chú', 'text')],
    // Mốc so sánh trần/bảo vệ lương = Thu nhập/tháng + Hỗ trợ GVCN + Hỗ trợ khác.
    computed: [{ k: 'ho_ten', l: 'Họ tên', after: 'ma_nv' }, { k: 'tong_thu_nhap', l: 'Tổng thu nhập hiện tại', t: 'money', after: 'ho_tro_khac' }]
  };

  /* ---------- HỆ THỐNG ---------- */
  S.USERS = {
    label: 'Người dùng', group: 'admin', key: ['email'], lockKey: true,
    perm: { r: 'user.manage', w: 'user.manage' },
    cols: [
      col_('email', 'Email', 'email', { req: true }),
      col_('ho_ten', 'Họ tên', 'text', { req: true }),
      col_('ma_nv', 'Mã nhân sự', 'ref', { ref: 'NHAN_SU.ma_nv' }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Hoạt động', 'Khóa'], def: 'Hoạt động' })
    ]
  };

  S.ROLES = {
    label: 'Vai trò', group: 'admin', key: ['ma'], lockKey: true,
    perm: { r: 'role.manage', w: 'role.manage' },
    cols: [
      col_('ma', 'Mã vai trò', 'text', { req: true, pattern: CODE.pattern, hint: CODE.hint }),
      col_('ten', 'Tên vai trò', 'text', { req: true }),
      col_('mo_ta', 'Mô tả', 'text'),
      col_('he_thong', 'Vai trò hệ thống', 'enum', { values: YN, def: 'Không', ro: true })
    ]
  };

  S.ROLE_PERMS = {
    label: 'Quyền của vai trò', group: 'admin', key: ['role_ma', 'quyen'], hidden: true,
    perm: { r: 'role.manage', w: 'role.manage' },
    cols: [col_('role_ma', 'Vai trò', 'ref', { ref: 'ROLES.ma', req: true }),
      col_('quyen', 'Quyền', 'enum', { values: PERM_KEYS, req: true })]
  };

  S.USER_ROLES = {
    label: 'Gán vai trò cho người dùng', group: 'admin', key: ['email', 'role_ma', 'pham_vi', 'pham_vi_ma'],
    perm: { r: 'user.manage', w: 'user.manage' },
    cols: [
      col_('email', 'Email', 'ref', { ref: 'USERS.email', req: true }),
      col_('role_ma', 'Vai trò', 'ref', { ref: 'ROLES.ma', req: true }),
      col_('pham_vi', 'Phạm vi dữ liệu', 'enum', { values: ['Toàn hệ thống', 'Chi nhánh', 'Trường', 'Cá nhân'], def: 'Toàn hệ thống' }),
      col_('pham_vi_ma', 'Mã chi nhánh/trường', 'text', { hint: 'chỉ nhập khi phạm vi là Chi nhánh hoặc Trường' }),
      col_('hieu_luc_tu', 'Hiệu lực từ', 'date'),
      col_('hieu_luc_den', 'Hiệu lực đến', 'date')
    ],
    check: function (r) {
      var tbl = { 'Chi nhánh': 'CHI_NHANH', 'Trường': 'TRUONG' }[r.pham_vi];
      if (tbl) {
        if (!r.pham_vi_ma) return 'Phạm vi "' + r.pham_vi + '" cần nhập mã';
        if (!Db.find(tbl, function (x) { return x.ma === r.pham_vi_ma; })) return 'Mã "' + r.pham_vi_ma + '" không có trong danh mục ' + tbl;
      } else if (r.pham_vi_ma) return 'Phạm vi "' + r.pham_vi + '" không có mã đi kèm';
      if (r.hieu_luc_tu && r.hieu_luc_den && r.hieu_luc_den < r.hieu_luc_tu) return 'Hiệu lực đến phải ≥ Hiệu lực từ';
      return null;
    }
  };

  S.AUDIT_LOG = {
    label: 'Nhật ký hệ thống', group: 'admin', key: [], readonly: true, desc: true,
    perm: { r: 'audit.view', w: 'audit.view' },
    cols: [col_('ts', 'Thời điểm', 'text'), col_('email', 'Người thực hiện', 'text'), col_('hanh_dong', 'Hành động', 'text'),
      col_('bang', 'Bảng', 'text'), col_('row_id', 'Mã bản ghi', 'text'), col_('chi_tiet', 'Chi tiết', 'longtext')]
  };

  S.NOTIFY = {
    label: 'Thông báo', group: 'admin', key: [], internal: true,
    perm: { r: 'audit.view', w: 'audit.view' },
    cols: [col_('email', 'Người nhận', 'text'), col_('tieu_de', 'Tiêu đề', 'text'), col_('noi_dung', 'Nội dung', 'longtext'),
      col_('link', 'Liên kết', 'text'), col_('loai', 'Loại', 'text'), col_('da_doc', 'Đã đọc', 'enum', { values: YN, def: 'Không' })]
  };

  /* ---------- KHAI BÁO, QUYẾT TOÁN, THU NHẬP MỚI ---------- */
  S.KHAI_BAO = {
    label: 'Khai báo giảng dạy & trách nhiệm', group: 'declare', scope: 'staff',
    key: ['ky_ma', 'ma_nv', 'loai', 'noi_dung', 'tu_ngay'], perm: { r: 'declare.view', w: 'declare.edit', i: 'declare.edit' },
    cols: [
      col_('ky_ma', 'Kỳ', 'ref', { ref: 'KY_LUONG.ma', req: true }),
      col_('ma_nv', 'Mã nhân sự', 'ref', { ref: 'NHAN_SU.ma_nv', req: true }),
      col_('loai', 'Loại', 'enum', { values: ['Thực dạy', 'Trách nhiệm', 'Định mức'], req: true }),
      col_('noi_dung', 'Nội dung (môn/lớp/chức trách)', 'text', { req: true }),
      col_('so_luong', 'Số lượng', 'num', { req: true, min: 0 }),
      col_('don_vi', 'Đơn vị', 'enum', { values: ['Tiết/Tuần', 'Tiết/Tháng', 'Tiết/Ngày'], req: true }),
      col_('dac_thu', 'Môn đặc thù (1 tiết = 1,5)', 'enum', { values: YN, def: 'Không' }),
      col_('tu_ngay', 'Từ ngày', 'date', { req: true }),
      col_('den_ngay', 'Đến ngày', 'date', { req: true }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Nháp', 'Chờ duyệt', 'Đã duyệt'], def: 'Nháp', ro: true }),
      col_('phieu_ma', 'Phiếu', 'text', { ro: true })
    ],
    guard: function (r) { return r.trang_thai !== 'Nháp' ? 'Dòng khai báo đang ' + r.trang_thai.toLowerCase() + ' nên không sửa/xóa được. Nếu phiếu bị trả lại, dòng sẽ mở lại.' : null; },
    check: function (r) {
      if (r.den_ngay < r.tu_ngay) return 'Đến ngày phải ≥ Từ ngày';
      if (r.dac_thu === 'Có' && r.loai !== 'Thực dạy') return 'Chỉ môn Thực dạy mới đánh dấu đặc thù';
      var ky = Db.find('KY_LUONG', function (k) { return k.ma === r.ky_ma; });
      if (ky && (r.tu_ngay < ky.tu_ngay || r.den_ngay > ky.den_ngay)) {
        return 'Thời gian khai báo phải nằm trong kỳ ' + ky.ma + ' (' + Util.displayDate(ky.tu_ngay) + ' – ' + Util.displayDate(ky.den_ngay) + ')';
      }
      return null;
    }
  };

  /** Ảnh chụp thông tin nhân sự tại thời điểm tính (giữ lịch sử dù sau này chuyển trường/đổi ngạch). */
  var resultCols = function () {
    return [col_('ky_ma', 'Kỳ', 'ref', { ref: 'KY_LUONG.ma', req: true }), col_('ma_nv', 'Mã nhân sự', 'ref', { ref: 'NHAN_SU.ma_nv', req: true }),
      col_('ho_ten', 'Họ và tên'), col_('chi_nhanh_ma', 'Chi nhánh'), col_('truong_ma', 'Trường'), col_('doi_tuong', 'Đối tượng'),
      col_('de_an_ma', 'Đề án')];
  };
  var tail = function () {
    return [col_('nguon', 'Nguồn dữ liệu'), col_('ghi_chu', 'Ghi chú', 'text'),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Tạm tính', 'Chờ chốt', 'Đã chốt'], def: 'Tạm tính', ro: true }),
      col_('phieu_ma', 'Phiếu', 'text', { ro: true })];
  };

  S.QUYET_TOAN = {
    label: 'Phụ trội từng người', group: 'calc', scope: 'staff', readonly: true, key: ['ky_ma', 'ma_nv'],
    perm: { r: 'calc.view', w: 'calc.run' },
    cols: resultCols().concat([
      col_('thuc_day', 'Thực dạy (tiết)', 'num'), col_('trach_nhiem', 'Trách nhiệm (tiết)', 'num'), col_('dinh_muc', 'Định mức (tiết)', 'num'),
      col_('tong_pt', 'Tổng phụ trội', 'num'), col_('pt_trach_nhiem', 'PT trách nhiệm', 'num'), col_('pt_giang_day', 'PT giảng dạy', 'num'),
      col_('hs_tiet', 'HS tiết', 'num'), col_('ltb', 'LTB', 'money'), col_('tien_pt', 'Tiền phụ trội', 'money')
    ]).concat(tail())
  };

  S.THU_NHAP_MOI = {
    label: 'Thu nhập từng người', group: 'calc', scope: 'staff', readonly: true, key: ['ky_ma', 'ma_nv'],
    perm: { r: 'calc.view', w: 'calc.run' },
    cols: resultCols().concat([
      col_('ngay_vao_lam', 'Ngày vào làm', 'date'), col_('ngach_ma', 'Ngạch'), col_('ngach_ten', 'Tên ngạch'), col_('tham_nien', 'Thâm niên (năm)', 'int'),
      col_('hs_cd', 'HS chức danh', 'num'), col_('hs_tn', 'HS thâm niên', 'num'), col_('hs_vk', 'HS vượt khung', 'num'),
      col_('hs_bgh', 'HS hạng trường', 'num'), col_('hs_kn', 'HS kiêm nhiệm', 'num'), col_('hs_kpi', 'HS KPI', 'num'),
      col_('luong_chuc_danh', 'Lương chức danh', 'money'), col_('ho_tro', 'Các khoản hỗ trợ', 'money'),
      col_('ho_tro_pt', 'Phụ trội bình quân/tháng', 'money'), col_('luong_kpi', 'Lương KPI', 'money'),
      col_('pa_moi', 'Phương án mới', 'money'), col_('thu_nhap_hien_tai', 'Thu nhập hiện tại (tổng)', 'money'), col_('hien_tai_gvcn', 'Trong đó hỗ trợ GVCN', 'money'), col_('hien_tai_khac', 'Trong đó hỗ trợ khác', 'money'), col_('ty_le_tran', 'Trần tăng', 'pct'),
      col_('max_income', 'Mức tối đa', 'money'), col_('chinh_thuc', 'Mức chính thức', 'money'), col_('chenh_lech', 'Chênh lệch so với hiện tại', 'money'),
      col_('luong_nen', 'Lương làm mốc cho đợt sau', 'money'), col_('chi_phi_thang', 'Chi phí/tháng (lương + phụ trội BQ)', 'money'),
      col_('tien_pt', 'Tiền phụ trội cả kỳ', 'money')
    ]).concat(tail())
  };


  /* ---------- QUY TRÌNH DUYỆT ---------- */
  S.WORKFLOW_STEP = {
    label: 'Quy trình duyệt', group: 'admin', key: ['loai_phieu', 'truong_ma', 'thu_tu'],
    perm: { r: 'workflow.manage', w: 'workflow.manage' },
    cols: [
      col_('loai_phieu', 'Loại phiếu', 'enum', { values: LOAI_PHIEU, req: true }),
      col_('truong_ma', 'Trường (trống = mặc định)', 'ref', { ref: 'TRUONG.ma' }),
      col_('thu_tu', 'Bước số', 'int', { req: true, min: 1, max: 20 }),
      col_('ten_buoc', 'Tên bước', 'text', { req: true }),
      col_('hanh_dong', 'Hành động', 'enum', { values: ['Đề xuất', 'Xét duyệt', 'Phê duyệt'], req: true }),
      col_('vai_tro', 'Vai trò xử lý', 'ref', { ref: 'ROLES.ma', req: true }),
      col_('pham_vi', 'Phạm vi người duyệt', 'enum', { values: ['Cùng trường', 'Cùng chi nhánh', 'Toàn hệ thống'], def: 'Cùng trường' }),
      col_('han_ngay', 'Hạn xử lý (ngày)', 'int', { min: 0 })
    ]
  };

  S.UY_QUYEN = {
    label: 'Ủy quyền duyệt', group: 'admin', key: ['tu_email', 'den_email', 'loai_phieu', 'hieu_luc_tu'],
    perm: { r: 'workflow.manage', w: 'workflow.manage' },
    cols: [
      col_('tu_email', 'Người ủy quyền', 'ref', { ref: 'USERS.email', req: true }),
      col_('den_email', 'Người được ủy quyền', 'ref', { ref: 'USERS.email', req: true }),
      col_('loai_phieu', 'Loại phiếu (trống = tất cả)', 'enum', { values: LOAI_PHIEU }),
      col_('hieu_luc_tu', 'Từ ngày', 'date', { req: true }),
      col_('hieu_luc_den', 'Đến ngày', 'date', { req: true }),
      col_('ly_do', 'Lý do', 'text')
    ],
    check: function (r) {
      if (r.tu_email === r.den_email) return 'Không thể tự ủy quyền cho chính mình';
      return r.hieu_luc_den < r.hieu_luc_tu ? 'Đến ngày phải ≥ Từ ngày' : null;
    }
  };

  S.PHIEU = {
    label: 'Phiếu', group: 'workflow', key: [], internal: true, perm: { r: 'phieu.view', w: 'phieu.create' },
    cols: [
      col_('ma_phieu', 'Mã phiếu'), col_('loai_phieu', 'Loại', 'enum', { values: LOAI_PHIEU }), col_('tieu_de', 'Tiêu đề'),
      col_('chi_nhanh_ma', 'Chi nhánh'), col_('truong_ma', 'Trường'), col_('ky_ma', 'Kỳ'), col_('nguoi_tao', 'Người tạo'),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Đang duyệt', 'Đã duyệt', 'Trả lại', 'Đã hủy'] }),
      col_('buoc_hien_tai', 'Bước hiện tại', 'int'), col_('so_buoc', 'Số bước', 'int'),
      col_('quy_trinh', 'Quy trình', 'longtext'), col_('noi_dung', 'Nội dung', 'longtext')
    ]
  };

  S.PHIEU_LOG = {
    label: 'Lịch sử phiếu', group: 'workflow', key: [], internal: true, perm: { r: 'phieu.view', w: 'phieu.create' },
    cols: [col_('ma_phieu', 'Mã phiếu'), col_('buoc', 'Bước', 'int'), col_('hanh_dong', 'Hành động'), col_('email', 'Người thực hiện'),
      col_('ghi_chu', 'Ghi chú', 'longtext'), col_('ts', 'Thời điểm')]
  };

  return S;
})();

/**
 * Giá trị ví dụ cho dòng mẫu nhập CSV (Validate.template). Cột bắt buộc không khai ở đây sẽ được sinh theo kiểu dữ liệu
 * (danh mục/tham chiếu lấy mã thật đang có); cột không bắt buộc để trống trừ khi khai ở đây.
 */
(function () {
  var EX = {
    'CHI_NHANH.ma': 'HN', 'CHI_NHANH.ten': 'Chi nhánh Hà Nội', 'CHI_NHANH.tinh': 'Hà Nội',
    'TRUONG.ma': 'HN_THCS', 'TRUONG.ten': 'THCS Hà Nội',
    'NAM_HOC.ma': '2026-2027', 'NAM_HOC.tu_ngay': '01/09/2026', 'NAM_HOC.den_ngay': '31/05/2027',
    'KY_LUONG.ma': '2026-2027-HK1', 'KY_LUONG.tu_ngay': '01/09/2026', 'KY_LUONG.den_ngay': '15/01/2027', 'KY_LUONG.so_tuan': '18',
    'TRUONG_HANG.hang': '2', 'TRUONG_HANG.so_lop': '20',
    'NGACH_DM.ma': 'GV4', 'NGACH_DM.ten': 'Giáo viên 4',
    'SETTINGS.gia_tri': 'Có',
    'DEAN.ma': 'DA02-2027', 'DEAN.so_hieu': 'HP.ĐA.02', 'DEAN.ten': 'Đề án lương khối phổ thông 2027', 'DEAN.hieu_luc_tu': '01/09/2027',
    'DEAN_THAMSO.lcb': '6000000', 'DEAN_THAMSO.ltb': '100000',
    'DEAN_NGACH.hs_chuc_danh': '1,2', 'DEAN_NGACH.hs_tiet': '1,3', 'DEAN_NGACH.nhom_tham_nien': 'TN2',
    'DEAN_HANGTRUONG.hang': '1', 'DEAN_HANGTRUONG.hs_hieu_truong': '0,6', 'DEAN_HANGTRUONG.hs_pho_hieu_truong': '0,6',
    'DEAN_QUYDOI.ma': 'QD11', 'DEAN_QUYDOI.ten': 'Giáo viên kiêm nhiệm công việc mới', 'DEAN_QUYDOI.so_tiet': '2',
    'DEAN_TRAN.nam': '2027', 'DEAN_TRAN.tn_tu': '0', 'DEAN_TRAN.tn_den': '5', 'DEAN_TRAN.ty_le': '5%',
    'DEAN_PARAM.gia_tri': '0,02',
    'NHAN_SU.ma_nv': 'NV001', 'NHAN_SU.ho_ten': 'Nguyễn Thị A', 'NHAN_SU.ngay_sinh': '15/05/1990', 'NHAN_SU.email': 'nguyenthia@vaschools.edu.vn',
    'NHAN_SU.dien_thoai': '0901234567', 'NHAN_SU.ngay_vao_lam': '01/09/2019',
    'QUA_TRINH_NGACH.doi_tuong': 'GV còn lại', 'QUA_TRINH_NGACH.hieu_luc_tu': '01/09/2019', 'QUA_TRINH_NGACH.so_quyet_dinh': 'QĐ-01/2019',
    'QUA_TRINH_KIEMNHIEM.ti_le': '50%', 'QUA_TRINH_KIEMNHIEM.hieu_luc_tu': '01/09/2026',
    'THU_NHAP_NEN.thu_nhap': '15000000', 'THU_NHAP_NEN.ho_tro_gvcn': '500000', 'THU_NHAP_NEN.ho_tro_khac': '0', 'THU_NHAP_NEN.hieu_luc_tu': '01/01/2026',
    'USERS.email': 'nguyenvana@vaschools.edu.vn', 'USERS.ho_ten': 'Nguyễn Văn A',
    'ROLES.ma': 'ROLE_MOI', 'ROLES.ten': 'Vai trò mới',
    'USER_ROLES.pham_vi': 'Toàn hệ thống',
    'WORKFLOW_STEP.thu_tu': '1', 'WORKFLOW_STEP.ten_buoc': 'Hiệu trưởng xét duyệt', 'WORKFLOW_STEP.hanh_dong': 'Xét duyệt', 'WORKFLOW_STEP.vai_tro': 'PRINCIPAL',
    'UY_QUYEN.hieu_luc_tu': '01/01/2026', 'UY_QUYEN.hieu_luc_den': '31/12/2026',
    'KHAI_BAO.noi_dung': 'Toán 10A1', 'KHAI_BAO.so_luong': '22', 'KHAI_BAO.tu_ngay': '07/09/2026', 'KHAI_BAO.den_ngay': '27/12/2026'
  };
  Object.keys(EX).forEach(function (k) {
    var p = k.split('.');
    SCHEMA[p[0]].cols.forEach(function (c) { if (c.k === p[1]) c.ex = EX[k]; });
  });
})();
