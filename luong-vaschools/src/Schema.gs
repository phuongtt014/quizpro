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
  { k: 'audit.view', l: 'Xem nhật ký hệ thống' }
];

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
  { k: 'he_ngay_chia', l: 'Số ngày chia thu nhập tháng ra thu nhập ngày (chế độ hè)', def: 24, unit: 'ngày' },
  { k: 'he_ty_le_khong_phan_cong', l: 'Tỷ lệ hưởng khi sẵn sàng điều động nhưng không phân công (hè)', def: 0.6, unit: 'tỷ lệ' }
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
    label: 'Kỳ quyết toán (học kỳ)', group: 'setup', key: ['ma'], lockKey: true,
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('ma', 'Mã kỳ', 'text', { req: true, pattern: '^\\d{4}-\\d{4}-HK[12]$', hint: 'dạng 2026-2027-HK1' }),
      col_('nam_hoc_ma', 'Năm học', 'ref', { ref: 'NAM_HOC.ma', req: true }),
      col_('hoc_ky', 'Học kỳ', 'enum', { values: ['HK1', 'HK2'], req: true }),
      col_('tu_ngay', 'Từ ngày', 'date', { req: true }),
      col_('den_ngay', 'Đến ngày', 'date', { req: true }),
      col_('so_tuan', 'Số tuần quy định', 'int', { req: true, min: 1, max: 30 }),
      col_('so_thang_chia', 'Số tháng chia hỗ trợ', 'num', { def: 5, min: 1, max: 12 }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Mở', 'Đã chốt'], def: 'Mở' })
    ],
    check: function (r) {
      if (r.ma !== r.nam_hoc_ma + '-' + r.hoc_ky) return 'Mã kỳ phải = Năm học + "-" + Học kỳ (vd ' + r.nam_hoc_ma + '-' + r.hoc_ky + ')';
      if (r.den_ngay <= r.tu_ngay) return 'Đến ngày phải sau Từ ngày';
      return null;
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
    ]
  };

  S.SETTINGS = {
    label: 'Cấu hình chung', group: 'setup', key: ['khoa'], lockKey: true,
    perm: { r: 'setup.view', w: 'setup.edit' },
    cols: [
      col_('khoa', 'Khóa', 'enum', { values: ['email_bat', 'app_url', 'ten_he_thong'], req: true }),
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
      col_('nhom_tham_nien', 'Nhóm thâm niên', 'enum', { values: ['TN2', 'TN3', 'TN4'] })
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
    label: 'Trần tăng thu nhập theo thâm niên', group: 'policy', ctx: 'de_an_ma', key: ['de_an_ma', 'nam', 'tn_tu'], perm: deanPerm,
    cols: [
      deanCtx(),
      col_('nam', 'Năm áp dụng', 'int', { req: true, min: 2000, max: 2100 }),
      col_('tn_tu', 'Thâm niên từ (năm)', 'int', { req: true, min: 0 }),
      col_('tn_den', 'Đến dưới (năm)', 'int', { min: 1, hint: 'để trống = không giới hạn' }),
      col_('ty_le', 'Tỷ lệ tăng tối đa', 'pct', { req: true, min: 0 })
    ],
    check: function (r) { return r.tn_den !== '' && r.tn_den <= r.tn_tu ? '"Đến dưới" phải lớn hơn "Thâm niên từ"' : null; }
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
      col_('truong_ma', 'Trường', 'ref', { ref: 'TRUONG.ma' }),
      col_('to_chuyen_mon', 'Tổ chuyên môn/Bộ phận', 'text'),
      col_('doi_tuong', 'Đối tượng tính lương', 'enum', {
        values: ['GV Tiểu học nhiều môn', 'GV còn lại', 'Quản lý', 'Nhân viên', 'HĐHT'], req: true
      }),
      col_('trang_thai', 'Trạng thái', 'enum', { values: ['Đang làm việc', 'Đã nghỉ việc'], def: 'Đang làm việc' }),
      col_('ngay_nghi_viec', 'Ngày nghỉ việc', 'date')
    ],
    computed: [{ k: 'ngach_hien_tai', l: 'Ngạch hiện tại' }, { k: 'tham_nien', l: 'Thâm niên (năm)' }],
    check: function (r) {
      if (r.truong_ma) {
        var tr = Db.find('TRUONG', function (x) { return x.ma === r.truong_ma; });
        if (tr && tr.chi_nhanh_ma !== r.chi_nhanh_ma) return 'Trường "' + r.truong_ma + '" thuộc chi nhánh "' + tr.chi_nhanh_ma + '", không phải "' + r.chi_nhanh_ma + '"';
      }
      if (r.ngay_vao_lam <= r.ngay_sinh) return 'Ngày vào làm phải sau ngày sinh';
      if (r.trang_thai === 'Đã nghỉ việc' && !r.ngay_nghi_viec) return 'Trạng thái "Đã nghỉ việc" cần có Ngày nghỉ việc';
      if (r.trang_thai === 'Đang làm việc' && r.ngay_nghi_viec) return 'Đang làm việc thì không có Ngày nghỉ việc';
      if (r.ngay_nghi_viec && r.ngay_nghi_viec < r.ngay_vao_lam) return 'Ngày nghỉ việc phải sau ngày vào làm';
      return null;
    }
  };

  S.QUA_TRINH_NGACH = {
    label: 'Quá trình ngạch bậc', group: 'staff', key: ['ma_nv', 'hieu_luc_tu'], scope: 'staff',
    temporal: { group: ['ma_nv'] }, perm: { r: 'staff.view', w: 'staff.edit', i: 'staff.import' },
    cols: [nvRef(), ngachRef(), temporalFrom(), temporalTo(),
      col_('so_quyet_dinh', 'Số quyết định', 'text'), col_('ly_do', 'Lý do', 'text')]
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
      temporalFrom(), temporalTo(), col_('ghi_chu', 'Ghi chú', 'text')]
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

  return S;
})();
