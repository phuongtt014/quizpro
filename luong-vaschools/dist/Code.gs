// ===== Util.gs =====
/** Tiện ích dùng chung. Mọi ngày được lưu dạng chuỗi ISO yyyy-MM-dd. */

function AppError(code, message, details) {
  this.name = 'AppError';
  this.code = code;
  this.message = message;
  this.details = details || null;
}
AppError.prototype = Object.create(Error.prototype);

var Util = {
  TZ: 'Asia/Ho_Chi_Minh',
  MAX_DATE: '9999-12-31',

  uuid: function () { return Utilities.getUuid(); },
  nowIso: function () { return Utilities.formatDate(new Date(), Util.TZ, "yyyy-MM-dd'T'HH:mm:ss"); },
  todayIso: function () { return Utilities.formatDate(new Date(), Util.TZ, 'yyyy-MM-dd'); },
  pad2: function (n) { return (n < 10 ? '0' : '') + n; },

  /** Nhận dd/MM/yyyy (hoặc d/M/yyyy) và yyyy-MM-dd; trả ISO hoặc null nếu không phải ngày thật. */
  parseDate: function (s) {
    var y, m, d, x;
    if ((x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) { y = +x[1]; m = +x[2]; d = +x[3]; }
    else if ((x = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { d = +x[1]; m = +x[2]; y = +x[3]; }
    else return null;
    var t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
    return y + '-' + Util.pad2(m) + '-' + Util.pad2(d);
  },

  addDays: function (iso, n) {
    var p = iso.split('-');
    var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 86400000);
    return t.getUTCFullYear() + '-' + Util.pad2(t.getUTCMonth() + 1) + '-' + Util.pad2(t.getUTCDate());
  },

  /** Số năm tròn giữa hai ngày (bỏ phần lẻ), đúng quy định thâm niên của đề án. */
  fullYears: function (fromIso, toIso) {
    var a = fromIso.split('-').map(Number), b = toIso.split('-').map(Number);
    var y = b[0] - a[0];
    if (b[1] < a[1] || (b[1] === a[1] && b[2] < a[2])) y--;
    return Math.max(y, 0);
  },

  displayDate: function (iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  },

  escapeHtml: function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },

  uniq: function (arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) { if (!seen[x]) { seen[x] = true; out.push(x); } });
    return out;
  }
};

/** Cấu hình hệ thống (bảng SETTINGS). */
var Settings = {
  get: function (k, def) {
    var r = Db.find('SETTINGS', function (x) { return x.khoa === k; });
    return r && r.gia_tri !== '' ? r.gia_tri : def;
  }
};


// ===== Csv.gs =====
/**
 * Đọc văn bản dán từ Excel/Google Sheets (TSV) hoặc CSV. KHÔNG trim ô nào:
 * việc phát hiện khoảng trắng thừa là nhiệm vụ của Strict.checkCell.
 * Trả về { delim, rows: [{ n: số thứ tự bản ghi (1 = tiêu đề), cells: [...] }] }.
 */
var Csv = {
  parse: function (text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM đầu file là do mã hóa, không phải lỗi dữ liệu
    var firstLine = text.split(/\r?\n/)[0];
    var count = function (ch) { return firstLine.split(ch).length - 1; };
    var delim = count('\t') > 0 ? '\t' : (count(';') > count(',') ? ';' : ',');

    var rows = [], cells = [], cur = '', inQ = false, i = 0, n = 1, quoted = false;
    function endCell() { cells.push(cur); cur = ''; quoted = false; }
    function endRow() { endCell(); rows.push({ n: n++, cells: cells }); cells = []; }

    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        cur += c; i++; continue;
      }
      if (c === '"' && cur === '' && !quoted) { inQ = true; quoted = true; i++; continue; }
      if (c === delim) { endCell(); i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { endRow(); i++; continue; }
      cur += c; i++;
    }
    if (cur !== '' || cells.length > 0 || quoted) endRow();

    return { delim: delim, rows: rows };
  }
};


// ===== Strict.gs =====
/**
 * Kiểm tra dữ liệu NGHIÊM NGẶT: không tự sửa (trim) mà báo lỗi để người dùng sửa tại nguồn.
 * Mục tiêu: không để các giá trị "nhìn giống nhau" (thừa khoảng trắng, NBSP, dấu Unicode khác dạng...)
 * lọt vào hệ thống rồi làm sai khớp danh mục.
 */
var Strict = {
  RE_INVIS: /[\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u2064\u3000\uFEFF]/g,

  hex: function (c) { return 'U+' + ('0000' + c.charCodeAt(0).toString(16).toUpperCase()).slice(-4); },

  /** Hiển thị giá trị với ký tự ẩn lộ ra: khoảng trắng thường -> ·, ký tự lạ -> [U+xxxx]. */
  show: function (s) {
    return String(s)
      .replace(Strict.RE_INVIS, function (c) { return '[' + Strict.hex(c) + ']'; })
      .replace(/ /g, '·').replace(/\t/g, '[TAB]').replace(/\r/g, '[CR]').replace(/\n/g, '[↵]');
  },

  norm: function (s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  /** Gợi ý giá trị hợp lệ "giống nhất" (bỏ dấu, hoa/thường, khoảng trắng). */
  suggest: function (v, options) {
    var n = Strict.norm(v);
    if (!n) return null;
    for (var i = 0; i < options.length; i++) if (Strict.norm(options[i]) === n) return options[i];
    return null;
  },

  /** Trả về thông báo lỗi hoặc null nếu ô sạch. */
  checkCell: function (raw, multiline) {
    if (raw === '') return null;
    var inv = raw.match(Strict.RE_INVIS);
    if (inv) return 'Chứa ký tự ẩn/khoảng trắng đặc biệt: ' + Util.uniq(inv.map(Strict.hex)).join(', ');
    var ctl = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/ : /[\u0000-\u001F\u007F]/;
    if (ctl.test(raw)) return 'Chứa ký tự điều khiển/xuống dòng/tab không hợp lệ';
    if (raw !== raw.normalize('NFC')) return 'Chữ tiếng Việt không ở dạng Unicode chuẩn (NFC), hãy gõ lại ô này';
    if (/^\s|\s$/.test(raw)) return 'Có khoảng trắng thừa ở đầu hoặc cuối';
    if (/ {2,}/.test(raw)) return 'Có từ 2 khoảng trắng liên tiếp';
    return null;
  },

  _range: function (col, n) {
    if (col.min !== undefined && n < col.min) return 'Giá trị phải ≥ ' + col.min;
    if (col.max !== undefined && n > col.max) return 'Giá trị phải ≤ ' + col.max;
    return null;
  },

  /**
   * Chuyển ô thô -> giá trị chuẩn. Trả { v } hoặc { e }.
   * env.refSet(spec) trả về map giá trị hợp lệ của khóa ngoại 'BANG.cot'.
   */
  parseValue: function (col, raw, env) {
    if (raw === '' || raw === undefined || raw === null) {
      if (col.req) return { e: 'Bắt buộc nhập' };
      return { v: col.def !== undefined ? col.def : '' };
    }
    var m, n, e;
    switch (col.t) {
      case 'text':
      case 'longtext':
        if (col.pattern && !new RegExp(col.pattern).test(raw)) return { e: 'Sai định dạng' + (col.hint ? ' (' + col.hint + ')' : '') };
        if (col.maxLen && raw.length > col.maxLen) return { e: 'Dài quá ' + col.maxLen + ' ký tự' };
        return { v: raw };
      case 'email':
        if (/[A-Z]/.test(raw)) return { e: 'Email phải viết thường' };
        if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(raw)) return { e: 'Email không hợp lệ' };
        return { v: raw };
      case 'int':
        if (!/^-?\d+$/.test(raw)) return { e: 'Phải là số nguyên' };
        n = parseInt(raw, 10);
        e = Strict._range(col, n);
        return e ? { e: e } : { v: n };
      case 'num':
        if (!/^-?\d+([.,]\d+)?$/.test(raw)) return { e: 'Phải là số (vd 1,1 hoặc 1.1), không dùng dấu phân cách hàng nghìn' };
        n = parseFloat(raw.replace(',', '.'));
        e = Strict._range(col, n);
        return e ? { e: e } : { v: n };
      case 'money':
        if (/^\d+$/.test(raw)) n = parseInt(raw, 10);
        else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) n = parseInt(raw.replace(/[.,]/g, ''), 10);
        else return { e: 'Số tiền không hợp lệ (vd 6000000 hoặc 6.000.000)' };
        e = Strict._range(col, n);
        return e ? { e: e } : { v: n };
      case 'pct':
        if ((m = /^(\d+(?:[.,]\d+)?)%$/.exec(raw))) n = parseFloat(m[1].replace(',', '.')) / 100;
        else if (/^\d+([.,]\d+)?$/.test(raw)) {
          n = parseFloat(raw.replace(',', '.'));
          if (n > 1) return { e: 'Nhập dạng 5% hoặc 0,05' };
        } else return { e: 'Nhập dạng 5% hoặc 0,05' };
        n = Math.round(n * 1e6) / 1e6;
        e = Strict._range(col, n);
        return e ? { e: e } : { v: n };
      case 'date':
        var d = Util.parseDate(raw);
        return d ? { v: d } : { e: 'Ngày không hợp lệ (dùng dd/MM/yyyy)' };
      case 'enum':
        if (col.values.indexOf(raw) >= 0) return { v: raw };
        var s1 = Strict.suggest(raw, col.values);
        return { e: 'Giá trị không thuộc danh sách' + (s1 ? '. Ý bạn là "' + s1 + '"?' : ' (' + col.values.join(' | ') + ')') };
      case 'ref':
        var set = env.refSet(col.ref);
        if (set[raw]) return { v: raw };
        var s2 = Strict.suggest(raw, Object.keys(set));
        return { e: 'Không có trong danh mục ' + col.ref + (s2 ? '. Ý bạn là "' + s2 + '"?' : '') };
    }
    return { e: 'Kiểu dữ liệu không hỗ trợ' };
  }
};


// ===== Schema.gs =====
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


// ===== Db.gs =====
/**
 * Lớp truy cập dữ liệu (Google Sheets). Toàn bộ nghiệp vụ chỉ đi qua đây,
 * nên sau này có thể thay bằng CSDL khác mà không đổi nghiệp vụ.
 * Ghi dữ liệu phải nằm trong Db.tx() (khóa script + đọc mới).
 */
var Db = (function () {
  var memo = {}, heads = {}, ssRef = null, depth = 0;
  var SYS_TAIL = ['created_at', 'created_by', 'updated_at', 'updated_by'];
  var NUMERIC = { int: 1, num: 1, money: 1, pct: 1 };

  function ss() {
    if (!ssRef) {
      var id = PropertiesService.getScriptProperties().getProperty('DB_ID');
      if (!id) throw new AppError('NO_DB', 'Hệ thống chưa được cài đặt (chạy setupInstall trong trình soạn thảo Apps Script).');
      ssRef = SpreadsheetApp.openById(id);
    }
    return ssRef;
  }

  function sheet(t) {
    var s = ss().getSheetByName(t);
    if (!s) throw new AppError('NO_SHEET', 'Thiếu sheet "' + t + '". Chạy setupEnsureSheets.');
    return s;
  }

  function wantedHeader(t) {
    return ['id'].concat(SCHEMA[t].cols.map(function (c) { return c.k; })).concat(SYS_TAIL);
  }

  function colDef(t, k) {
    var cols = SCHEMA[t].cols;
    for (var i = 0; i < cols.length; i++) if (cols[i].k === k) return cols[i];
    return null;
  }

  function coerce(def, v) {
    if (v instanceof Date) return Utilities.formatDate(v, Util.TZ, 'yyyy-MM-dd');
    if (v === null || v === undefined || v === '') return '';
    if (def && NUMERIC[def.t]) return Number(v);
    return String(v);
  }

  function header(t) {
    if (!heads[t]) heads[t] = sheet(t).getRange(1, 1, 1, sheet(t).getLastColumn()).getValues()[0];
    return heads[t];
  }

  function invalidate(t) { delete memo[t]; }

  function readAll(t) {
    if (memo[t]) return memo[t];
    var vals = sheet(t).getDataRange().getValues();
    var head = vals[0], defs = head.map(function (h) { return colDef(t, h); });
    var rows = [];
    for (var i = 1; i < vals.length; i++) {
      var o = {}, empty = true;
      for (var j = 0; j < head.length; j++) {
        var v = coerce(defs[j], vals[i][j]);
        if (v !== '') empty = false;
        o[head[j]] = v;
      }
      if (empty) continue;
      o.__row = i + 1;
      rows.push(o);
    }
    memo[t] = rows;
    return rows;
  }

  return {
    SYS_TAIL: SYS_TAIL,

    /** Chạy fn trong khóa ghi. Đọc lại dữ liệu mới nhất khi vào. */
    tx: function (fn) {
      if (depth > 0) return fn();
      var lock = LockService.getScriptLock();
      lock.waitLock(30000);
      depth++;
      try { memo = {}; heads = {}; return fn(); }
      finally { depth--; lock.releaseLock(); }
    },

    all: function (t) { return readAll(t); },
    find: function (t, pred) { var r = readAll(t); for (var i = 0; i < r.length; i++) if (pred(r[i])) return r[i]; return null; },
    filter: function (t, pred) { return readAll(t).filter(pred); },
    get: function (t, id) { return Db.find(t, function (r) { return r.id === id; }); },

    insertMany: function (t, rows, actor) {
      if (!rows.length) return [];
      var head = header(t), s = sheet(t), now = Util.nowIso(), out = [], mat = [];
      rows.forEach(function (r) {
        var o = {};
        Object.keys(r).forEach(function (k) { if (k.indexOf('__') !== 0) o[k] = r[k]; });
        o.id = o.id || Util.uuid();
        o.created_at = now; o.created_by = actor || ''; o.updated_at = now; o.updated_by = actor || '';
        out.push(o);
        mat.push(head.map(function (h) { var v = o[h]; return v === undefined || v === null ? '' : v; }));
      });
      var start = s.getLastRow() + 1, need = start + mat.length - 1;
      if (s.getMaxRows() < need) s.insertRowsAfter(s.getMaxRows(), need - s.getMaxRows());
      s.getRange(start, 1, mat.length, head.length).setValues(mat);
      invalidate(t);
      return out;
    },

    /** updates: [{ id, patch }]. Ghi lại toàn bộ vùng dữ liệu bằng một lần setValues. */
    updateMany: function (t, updates, actor) {
      if (!updates.length) return;
      var s = sheet(t), vals = s.getDataRange().getValues(), head = vals[0];
      var idc = head.indexOf('id'), idx = {}, now = Util.nowIso();
      for (var i = 1; i < vals.length; i++) idx[vals[i][idc]] = i;
      updates.forEach(function (u) {
        var i2 = idx[u.id];
        if (i2 === undefined) throw new AppError('NOT_FOUND', 'Không tìm thấy bản ghi ' + u.id + ' trong ' + t);
        Object.keys(u.patch).forEach(function (k) {
          var j = head.indexOf(k);
          if (j < 0 || k === 'id' || k.indexOf('__') === 0) return;
          vals[i2][j] = u.patch[k] === undefined || u.patch[k] === null ? '' : u.patch[k];
        });
        vals[i2][head.indexOf('updated_at')] = now;
        vals[i2][head.indexOf('updated_by')] = actor || '';
      });
      s.getRange(1, 1, vals.length, head.length).setValues(vals);
      invalidate(t);
    },

    removeMany: function (t, ids) {
      var set = {};
      ids.forEach(function (i) { set[i] = true; });
      var rows = readAll(t).filter(function (r) { return set[r.id]; })
        .map(function (r) { return r.__row; }).sort(function (a, b) { return b - a; });
      var s = sheet(t);
      rows.forEach(function (n) { s.deleteRow(n); });
      invalidate(t);
    },

    /** Tạo spreadsheet CSDL (nếu chưa có) và đảm bảo đủ sheet/cột/định dạng. */
    createIfMissing: function () {
      var props = PropertiesService.getScriptProperties();
      if (!props.getProperty('DB_ID')) {
        var created = SpreadsheetApp.create('LUONG-VASCHOOLS-DB');
        props.setProperty('DB_ID', created.getId());
        ssRef = null;
      }
      return props.getProperty('DB_ID');
    },

    ensureSheets: function () {
      var book = ss(), report = [];
      Object.keys(SCHEMA).forEach(function (t) {
        var s = book.getSheetByName(t), want = wantedHeader(t);
        if (!s) { s = book.insertSheet(t); report.push('tạo sheet ' + t); }
        if (s.getLastRow() === 0) {
          if (s.getMaxColumns() < want.length) s.insertColumnsAfter(s.getMaxColumns(), want.length - s.getMaxColumns());
          s.getRange(1, 1, 1, want.length).setValues([want]);
        } else {
          var cur = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
          var add = want.filter(function (h) { return cur.indexOf(h) < 0; });
          if (add.length) {
            if (s.getMaxColumns() < cur.length + add.length) s.insertColumnsAfter(s.getMaxColumns(), cur.length + add.length - s.getMaxColumns());
            s.getRange(1, cur.length + 1, 1, add.length).setValues([add]);
            report.push(t + ': thêm cột ' + add.join(','));
          }
        }
        var head = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
        head.forEach(function (h, j) {
          var def = colDef(t, h), fmt = '@';
          if (def && NUMERIC[def.t]) fmt = def.t === 'money' ? '#,##0' : 'General';
          s.getRange(1, j + 1, s.getMaxRows(), 1).setNumberFormat(fmt);
        });
        s.getRange(1, 1, 1, head.length).setFontWeight('bold');
        s.setFrozenRows(1);
      });
      var def = book.getSheetByName('Sheet1') || book.getSheetByName('Trang tính1');
      if (def && book.getSheets().length > 1) book.deleteSheet(def);
      heads = {}; memo = {};
      return report;
    },

    reset: function () { memo = {}; heads = {}; ssRef = null; depth = 0; }
  };
})();


// ===== Validate.gs =====
/**
 * Kiểm tra dữ liệu theo SCHEMA. Dùng chung cho form nhập tay và nhập CSV.
 * Nguyên tắc: có bất kỳ lỗi nào thì KHÔNG ghi gì cả (all-or-nothing).
 */
var Validate = (function () {
  var MAX_ERRORS = 500, MAX_ROWS = 5000;

  function makeEnv() {
    var cache = {};
    return {
      refSet: function (spec) {
        if (cache[spec]) return cache[spec];
        var p = spec.split('.'), set = Object.create(null);
        Db.all(p[0]).forEach(function (r) { if (r[p[1]] !== '') set[String(r[p[1]])] = true; });
        cache[spec] = set;
        return set;
      }
    };
  }

  function keyOf(T, r) { return T.key.map(function (k) { return String(r[k]); }).join('\u0001'); }
  function keyText(T, r) { return T.key.filter(function (k) { return k !== T.ctx; }).map(function (k) { return r[k]; }).join(' / '); }
  function tFrom(r) { return r.hieu_luc_tu; }
  function tTo(r) { return r.hieu_luc_den || Util.MAX_DATE; }
  function span(r) { return Util.displayDate(r.hieu_luc_tu) + ' – ' + (r.hieu_luc_den ? Util.displayDate(r.hieu_luc_den) : 'nay'); }

  function checkOverlap(T, parsed, existing, updatedIds, push) {
    var groups = {};
    function gk(r) { return T.temporal.group.map(function (k) { return r[k]; }).join('\u0001'); }
    existing.forEach(function (r) {
      if (updatedIds[r.id]) return;
      (groups[gk(r)] = groups[gk(r)] || []).push({ r: r, own: false });
    });
    parsed.forEach(function (r) { (groups[gk(r)] = groups[gk(r)] || []).push({ r: r, own: true }); });
    Object.keys(groups).forEach(function (g) {
      var list = groups[g].sort(function (a, b) { return a.r.hieu_luc_tu < b.r.hieu_luc_tu ? -1 : 1; });
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          if (tFrom(list[j].r) > tTo(list[i].r)) break;
          [list[i], list[j]].forEach(function (x, idx) {
            if (x.own) {
              var other = idx === 0 ? list[j] : list[i];
              push(x.r.__n, 'hieu_luc_tu', Util.displayDate(x.r.hieu_luc_tu),
                'Khoảng hiệu lực (' + span(x.r) + ') trùng với ' + (other.own ? 'dòng ' + other.r.__n + ' trong file' : 'bản ghi đang có') + ' (' + span(other.r) + ')');
            }
          });
        }
      }
    });
  }

  /**
   * raws: [{ n, vals: { khóa_cột: chuỗi thô } }]
   * opts: { mode: 'insert'|'upsert', selfId, user }
   * -> { ok, errors: [{ n, field, label, value, msg }], rows: [giá trị chuẩn + __n, __update] }
   */
  function rows(table, raws, ctx, opts) {
    opts = opts || {};
    var T = SCHEMA[table], env = makeEnv(), errors = [], out = [], truncated = false;
    function push(n, field, value, msg) {
      if (errors.length >= MAX_ERRORS) { truncated = true; return; }
      var c = field ? SCHEMA[table].cols.filter(function (x) { return x.k === field; })[0] : null;
      errors.push({ n: n, field: field || '', label: c ? c.l : '', value: value === undefined ? '' : value, msg: msg });
    }

    if (T.ctx && !(ctx && ctx[T.ctx])) {
      push(0, T.ctx, '', 'Thiếu ngữ cảnh đề án'); return { ok: false, errors: errors, rows: [] };
    }
    var existing = Db.all(table).filter(function (r) { return !T.ctx || r[T.ctx] === ctx[T.ctx]; });
    var existKey = {};
    existing.forEach(function (r) { if (T.key.length) existKey[keyOf(T, r)] = r; });

    raws.forEach(function (raw) {
      var parsed = { __n: raw.n }, bad = false;
      T.cols.forEach(function (c) {
        if (c.k === T.ctx) { parsed[c.k] = ctx[c.k]; return; }
        var v = raw.vals[c.k] === undefined ? '' : raw.vals[c.k];
        if (v !== '') {
          var ce = Strict.checkCell(v, c.t === 'longtext');
          if (ce) { push(raw.n, c.k, Strict.show(v), ce); bad = true; return; }
          if (c.ro && !opts.system) { push(raw.n, c.k, Strict.show(v), 'Cột này do hệ thống quản lý, không nhập trực tiếp'); bad = true; return; }
        }
        var r = Strict.parseValue(c, v, env);
        if (r.e) { push(raw.n, c.k, Strict.show(v), r.e); bad = true; } else parsed[c.k] = r.v;
      });
      if (!bad && T.temporal && parsed.hieu_luc_den && parsed.hieu_luc_den < parsed.hieu_luc_tu) {
        push(raw.n, 'hieu_luc_den', Util.displayDate(parsed.hieu_luc_den), 'Hiệu lực đến phải ≥ Hiệu lực từ'); bad = true;
      }
      if (!bad && T.check) {
        var ce2 = T.check(parsed);
        if (ce2) { push(raw.n, '', '', ce2); bad = true; }
      }
      if (!bad && opts.user && T.scope) {
        var sf = Auth.scopeFn(table);
        if (sf && !Auth.canRow(opts.user, T.perm.w, sf(parsed))) {
          push(raw.n, '', '', 'Ngoài phạm vi dữ liệu bạn được phép ghi'); bad = true;
        }
      }
      if (!bad) out.push(parsed);
    });

    var seen = {}, updatedIds = {}, uniqSeen = {};
    out.forEach(function (r) {
      if (!T.key.length) return;
      var k = keyOf(T, r);
      if (seen[k]) { push(r.__n, '', keyText(T, r), 'Trùng khóa với dòng ' + seen[k] + ' trong file'); r.__bad = true; return; }
      seen[k] = r.__n;
      var ex = existKey[k];
      if (opts.selfId) {
        if (ex && ex.id !== opts.selfId) { push(r.__n, '', keyText(T, r), 'Đã tồn tại bản ghi khác có cùng khóa'); r.__bad = true; }
        else r.__update = opts.selfId;
      } else if (ex) {
        if (opts.mode === 'upsert') r.__update = ex.id;
        else { push(r.__n, '', keyText(T, r), 'Đã tồn tại trong hệ thống (khóa: ' + keyText(T, r) + '). Chọn chế độ "Thêm hoặc cập nhật" nếu muốn ghi đè'); r.__bad = true; }
      }
      if (r.__update) updatedIds[r.__update] = true;
    });

    T.cols.filter(function (c) { return c.uniq; }).forEach(function (c) {
      out.forEach(function (r) {
        var v = r[c.k];
        if (v === '' || r.__bad) return;
        var key = c.k + '\u0001' + v;
        if (uniqSeen[key]) { push(r.__n, c.k, v, 'Trùng giá trị với dòng ' + uniqSeen[key] + ' trong file'); r.__bad = true; return; }
        uniqSeen[key] = r.__n;
        var dup = existing.filter(function (e) { return e[c.k] === v && e.id !== r.__update && e.id !== opts.selfId; })[0];
        if (dup) { push(r.__n, c.k, v, 'Đã được dùng bởi bản ghi khác'); r.__bad = true; }
      });
    });

    var closes = [];
    if (T.temporal) {
      var good = out.filter(function (r) { return !r.__bad; }), against = existing;
      if (opts.autoClose) {
        // Bản ghi đang mở sẽ được kết thúc ngay trước ngày bắt đầu của bản ghi mới (chỉ áp dụng khi lưu từ form).
        against = existing.map(function (r) {
          if (r.hieu_luc_den) return r;
          var starts = good.filter(function (p) {
            return p.hieu_luc_tu > r.hieu_luc_tu && T.temporal.group.every(function (k) { return p[k] === r[k]; });
          }).map(function (p) { return p.hieu_luc_tu; }).sort();
          if (!starts.length) return r;
          var end = Util.addDays(starts[0], -1);
          closes.push({ id: r.id, den: end });
          var c = {};
          Object.keys(r).forEach(function (k) { c[k] = r[k]; });
          c.hieu_luc_den = end;
          return c;
        });
      }
      checkOverlap(T, good, against, updatedIds, function (n, f, v, m) { push(n, f, v, m); });
    }

    return { ok: errors.length === 0, errors: errors, truncated: truncated, rows: out, closes: closes };
  }

  /** Chuẩn bị mô tả cột cho giao diện: tên, kiểu, bắt buộc, giá trị hợp lệ. */
  function spec(table) {
    var T = SCHEMA[table];
    var typeName = { text: 'Văn bản', longtext: 'Văn bản dài', email: 'Email (chữ thường)', int: 'Số nguyên', num: 'Số (vd 1,1)',
      money: 'Số tiền (vd 6000000)', pct: 'Tỷ lệ (vd 5%)', date: 'Ngày dd/MM/yyyy', enum: 'Chọn từ danh sách', ref: 'Phải có trong danh mục' };
    return T.cols.filter(function (c) { return c.k !== T.ctx && !c.ro; }).map(function (c) {
      return { k: c.k, label: c.l, type: typeName[c.t], req: !!c.req && c.def === undefined,
        values: c.t === 'enum' ? c.values : (c.t === 'ref' ? 'Mã trong ' + c.ref : (c.hint || '')) };
    });
  }

  function importText(table, text, ctx, opts) {
    var T = SCHEMA[table], errors = [];
    if (!text || text.trim() === '') return { ok: false, errors: [{ n: 0, field: '', label: '', value: '', msg: 'Chưa có dữ liệu để kiểm tra' }], rows: [] };
    var parsed = Csv.parse(text);
    if (parsed.rows.length < 2) return { ok: false, errors: [{ n: 1, field: '', label: '', value: '', msg: 'Cần có dòng tiêu đề và ít nhất 1 dòng dữ liệu' }], rows: [] };

    var cols = T.cols.filter(function (c) { return c.k !== T.ctx && !c.ro; });
    var byName = {};
    cols.forEach(function (c) { byName[c.l] = c; byName[c.k] = c; });
    var names = Object.keys(byName);
    var map = [], used = {};
    parsed.rows[0].cells.forEach(function (h, j) {
      var ce = Strict.checkCell(h);
      if (ce) { errors.push({ n: 1, field: '', label: 'Cột ' + (j + 1), value: Strict.show(h), msg: 'Tiêu đề: ' + ce }); map.push(null); return; }
      var c = byName[h];
      if (!c) {
        var sg = Strict.suggest(h, names);
        errors.push({ n: 1, field: '', label: 'Cột ' + (j + 1), value: Strict.show(h), msg: 'Tiêu đề không có trong mẫu' + (sg ? '. Ý bạn là "' + sg + '"?' : '') });
        map.push(null); return;
      }
      if (used[c.k]) { errors.push({ n: 1, field: c.k, label: c.l, value: h, msg: 'Cột bị lặp trong file' }); map.push(null); return; }
      used[c.k] = true; map.push(c.k);
    });
    cols.forEach(function (c) {
      if (c.req && c.def === undefined && !used[c.k]) errors.push({ n: 1, field: c.k, label: c.l, value: '', msg: 'Thiếu cột bắt buộc "' + c.l + '"' });
    });
    if (errors.length) return { ok: false, errors: errors, rows: [] };

    var raws = [];
    for (var i = 1; i < parsed.rows.length; i++) {
      var pr = parsed.rows[i];
      if (pr.cells.length === 1 && pr.cells[0] === '') continue;
      if (pr.cells.length !== map.length) {
        errors.push({ n: pr.n, field: '', label: '', value: '', msg: 'Số cột không khớp tiêu đề (có ' + pr.cells.length + ', cần ' + map.length + ')' });
        continue;
      }
      var vals = {};
      map.forEach(function (k, j) { vals[k] = pr.cells[j]; });
      raws.push({ n: pr.n, vals: vals });
    }
    if (raws.length > MAX_ROWS) return { ok: false, errors: [{ n: 0, field: '', label: '', value: '', msg: 'Tối đa ' + MAX_ROWS + ' dòng mỗi lần nhập' }], rows: [] };
    var res = rows(table, raws, ctx, opts);
    res.errors = errors.concat(res.errors);
    res.ok = res.errors.length === 0;
    res.total = raws.length;
    res.inserts = res.rows.filter(function (r) { return !r.__update; }).length;
    res.updates = res.rows.length - res.inserts;
    return res;
  }

  return { rows: rows, importText: importText, spec: spec };
})();


// ===== Auth.gs =====
/**
 * Xác thực & phân quyền. Quyền = (chức năng) x (phạm vi dữ liệu):
 * phạm vi: Toàn hệ thống | Chi nhánh | Trường | Cá nhân.
 * Vai trò ADMIN (toàn hệ thống) luôn có mọi quyền để không bao giờ bị khóa ngoài.
 */
var Auth = (function () {
  var cached = null;

  function email() {
    var e = '';
    try { e = Session.getActiveUser().getEmail(); } catch (x) { e = ''; }
    // Không dùng getEffectiveUser: với "chạy bằng tài khoản người triển khai" nó trả về chủ hệ thống.
    return String(e || '').toLowerCase();
  }

  function activeGrant(g, today) {
    return (!g.hieu_luc_tu || g.hieu_luc_tu <= today) && (!g.hieu_luc_den || g.hieu_luc_den >= today);
  }

  function load(mail) {
    if (!mail) return null;
    var u = Db.find('USERS', function (x) { return x.email === mail; });
    if (!u || u.trang_thai !== 'Hoạt động') return null;
    var today = Util.todayIso(), grants = [], isAdmin = false;
    var rolePerms = {};
    Db.all('ROLE_PERMS').forEach(function (rp) { (rolePerms[rp.role_ma] = rolePerms[rp.role_ma] || []).push(rp.quyen); });
    Db.filter('USER_ROLES', function (g) { return g.email === mail && activeGrant(g, today); }).forEach(function (g) {
      if (g.role_ma === 'ADMIN' && g.pham_vi === 'Toàn hệ thống') isAdmin = true;
      (rolePerms[g.role_ma] || []).forEach(function (p) { grants.push({ perm: p, scope: g.pham_vi, code: g.pham_vi_ma, role: g.role_ma }); });
    });
    if (isAdmin) PERMS.forEach(function (p) { grants.push({ perm: p.k, scope: 'Toàn hệ thống', code: '', role: 'ADMIN' }); });
    var perms = Util.uniq(grants.map(function (g) { return g.perm; })).sort();
    return { email: mail, name: u.ho_ten, ma_nv: u.ma_nv, grants: grants, perms: perms, isAdmin: isAdmin };
  }

  return {
    email: email,
    current: function () { if (!cached) cached = load(email()); return cached; },
    reset: function () { cached = null; },
    loadFor: load,

    can: function (user, perm) { return !!user && user.perms.indexOf(perm) >= 0; },

    require: function (user, perm) {
      if (!Auth.can(user, perm)) throw new AppError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này (' + perm + ')');
    },

    hasGlobal: function (user, perm) {
      return user.grants.some(function (g) { return g.perm === perm && g.scope === 'Toàn hệ thống'; });
    },

    /** sc = { cn, tr, nv } của dòng dữ liệu. */
    canRow: function (user, perm, sc) {
      if (!sc) return Auth.can(user, perm);
      return user.grants.some(function (g) {
        if (g.perm !== perm) return false;
        if (g.scope === 'Toàn hệ thống') return true;
        if (g.scope === 'Chi nhánh') return !!sc.cn && sc.cn === g.code;
        if (g.scope === 'Trường') return !!sc.tr && sc.tr === g.code;
        if (g.scope === 'Cá nhân') return !!sc.nv && sc.nv === user.ma_nv;
        return false;
      });
    },

    /** Hàm suy ra phạm vi dữ liệu của một dòng thuộc bảng t (null nếu bảng không giới hạn phạm vi). */
    scopeFn: function (t) {
      var sc = SCHEMA[t].scope, map;
      if (!sc) return null;
      if (sc === 'chi_nhanh') return function (r) { return { cn: r.ma }; };
      if (sc === 'truong') return function (r) { return { cn: r.chi_nhanh_ma, tr: r.ma }; };
      if (sc === 'nhan_su') return function (r) { return { cn: r.chi_nhanh_ma, tr: r.truong_ma, nv: r.ma_nv }; };
      if (sc === 'truong_ma') {
        map = {};
        Db.all('TRUONG').forEach(function (x) { map[x.ma] = x; });
        return function (r) { return { tr: r.truong_ma, cn: map[r.truong_ma] ? map[r.truong_ma].chi_nhanh_ma : '' }; };
      }
      if (sc === 'staff') {
        map = {};
        Db.all('NHAN_SU').forEach(function (x) { map[x.ma_nv] = x; });
        return function (r) {
          var s = map[r.ma_nv];
          return s ? { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv } : {};
        };
      }
      return null;
    },

    /** Email những người đang có quyền perm (dùng để gửi thông báo). */
    usersWith: function (perm) {
      var today = Util.todayIso(), out = [];
      var roles = {};
      Db.all('ROLE_PERMS').forEach(function (rp) { if (rp.quyen === perm) roles[rp.role_ma] = true; });
      Db.all('USER_ROLES').forEach(function (g) {
        if ((roles[g.role_ma] || g.role_ma === 'ADMIN') && activeGrant(g, today)) out.push(g.email);
      });
      var active = {};
      Db.all('USERS').forEach(function (u) { if (u.trang_thai === 'Hoạt động') active[u.email] = true; });
      return Util.uniq(out).filter(function (e) { return active[e]; });
    }
  };
})();


// ===== Audit.gs =====
/** Nhật ký hệ thống: chỉ thêm, không sửa/xóa. Gọi trong Db.tx(). */
var Audit = {
  log: function (user, action, table, rowId, detail) {
    var text = typeof detail === 'string' ? detail : JSON.stringify(detail || {});
    if (text.length > 40000) text = text.slice(0, 40000) + '…[cắt bớt]';
    Db.insertMany('AUDIT_LOG', [{
      ts: Util.nowIso(), email: user ? user.email : 'system', hanh_dong: action,
      bang: table || '', row_id: rowId || '', chi_tiet: text
    }], user ? user.email : 'system');
  }
};


// ===== Notify.gs =====
/**
 * Thông báo: luôn ghi thông báo trong ứng dụng (bảng NOTIFY) và gửi email nếu bật cấu hình email_bat.
 * Email chỉ gửi sau khi giao dịch ghi xong (flush) để không giữ khóa lâu.
 */
var Notify = {
  _mail: [],

  /** Gọi trong Db.tx(). o = { to: [email], title, body, link (vd 'dean'), type }. */
  queue: function (o) {
    var to = Util.uniq((o.to || []).map(function (e) { return String(e).toLowerCase(); }));
    if (!to.length) return;
    Db.insertMany('NOTIFY', to.map(function (e) {
      return { email: e, tieu_de: o.title, noi_dung: o.body || '', link: o.link || '', loai: o.type || 'Thông báo', da_doc: 'Không' };
    }), 'system');
    if (Settings.get('email_bat', 'Có') === 'Có') {
      to.forEach(function (e) { Notify._mail.push({ to: e, title: o.title, body: o.body || '', link: o.link || '' }); });
    }
  },

  /** Gửi các email đang chờ. Lỗi/hạn mức hết được ghi nhật ký, không làm hỏng thao tác chính. */
  flush: function () {
    var jobs = Notify._mail;
    Notify._mail = [];
    if (!jobs.length) return { sent: 0, failed: 0 };
    var quota = 0, sent = 0, errs = [];
    try { quota = MailApp.getRemainingDailyQuota(); } catch (e) { errs.push('Không đọc được hạn mức email: ' + e.message); }
    var base = Db.all('SETTINGS').length ? Settings.get('app_url', '') : '';
    jobs.forEach(function (j, i) {
      if (i >= quota) { errs.push('Hết hạn mức email, bỏ qua ' + j.to); return; }
      try {
        var link = base ? base + '#' + j.link : '';
        var html = '<div style="font-family:Arial,sans-serif;font-size:14px"><p><b>' + Util.escapeHtml(j.title) + '</b></p>' +
          (j.body ? '<p>' + Util.escapeHtml(j.body).replace(/\n/g, '<br>') + '</p>' : '') +
          (link ? '<p><a href="' + Util.escapeHtml(link) + '">Mở hệ thống</a></p>' : '') +
          '<p style="color:#888;font-size:12px">Email tự động từ Hệ thống Lương VASchools.</p></div>';
        MailApp.sendEmail({ to: j.to, subject: '[Hệ thống Lương VAS] ' + j.title, htmlBody: html, name: 'Hệ thống Lương VASchools' });
        sent++;
      } catch (e) { errs.push(j.to + ': ' + e.message); }
    });
    if (errs.length) Db.tx(function () { Audit.log(null, 'EMAIL_LOI', 'NOTIFY', '', errs); });
    return { sent: sent, failed: errs.length };
  },

  discard: function () { Notify._mail = []; },

  list: function (mail, limit) {
    var rows = Db.filter('NOTIFY', function (r) { return r.email === mail; });
    rows.sort(function (a, b) { return a.created_at < b.created_at ? 1 : (a.created_at > b.created_at ? -1 : b.__row - a.__row); });
    return rows.slice(0, limit || 30).map(function (r) {
      return { id: r.id, title: r.tieu_de, body: r.noi_dung, link: r.link, type: r.loai, read: r.da_doc === 'Có', at: r.created_at };
    });
  },

  unread: function (mail) {
    return Db.filter('NOTIFY', function (r) { return r.email === mail && r.da_doc !== 'Có'; }).length;
  },

  markRead: function (mail, ids) {
    Db.tx(function () {
      var set = {};
      (ids || []).forEach(function (i) { set[i] = true; });
      var ups = Db.filter('NOTIFY', function (r) { return r.email === mail && r.da_doc !== 'Có' && (!ids || set[r.id]); })
        .map(function (r) { return { id: r.id, patch: { da_doc: 'Có' } }; });
      Db.updateMany('NOTIFY', ups, mail);
    });
  }
};


// ===== Policy.gs =====
/**
 * Đề án có phiên bản. Mỗi phiên bản là một gói tham số đầy đủ (LCB/LTB, ngạch, hỗ trợ,
 * quy đổi, trần, tham số). Bản đã "Ban hành" không sửa được: muốn đổi phải nhân bản thành
 * phiên bản mới -> lịch sử cũ giữ nguyên, các kỳ lương cũ vẫn tham chiếu đúng phiên bản của nó.
 */
var Policy = {
  childTables: function () {
    return Object.keys(SCHEMA).filter(function (t) { return SCHEMA[t].ctx === 'de_an_ma'; });
  },

  /** Phiên bản đề án đang hiệu lực tại một ngày (null nếu không có). */
  effective: function (dateIso) {
    var list = Db.filter('DEAN', function (d) {
      return d.trang_thai === 'Ban hành' && d.hieu_luc_tu <= dateIso && (!d.hieu_luc_den || d.hieu_luc_den >= dateIso);
    });
    list.sort(function (a, b) { return a.hieu_luc_tu < b.hieu_luc_tu ? 1 : -1; });
    return list[0] || null;
  },

  /** Gói tham số của một phiên bản, dạng dễ tra cứu cho bộ tính lương (GĐ4). */
  bundle: function (ma) {
    var of = function (t) { return Db.filter(t, function (r) { return r.de_an_ma === ma; }); };
    var b = { dean: Db.find('DEAN', function (d) { return d.ma === ma; }), luong: {}, ngach: {}, hangTruong: {}, quyDoi: {}, tran: [], param: {} };
    of('DEAN_THAMSO').forEach(function (r) { b.luong[r.chi_nhanh_ma] = { lcb: r.lcb, ltb: r.ltb }; });
    of('DEAN_NGACH').forEach(function (r) { b.ngach[r.ngach_ma] = r; });
    of('DEAN_HANGTRUONG').forEach(function (r) { b.hangTruong[r.hang] = r; });
    of('DEAN_QUYDOI').forEach(function (r) { b.quyDoi[r.ma] = r; });
    b.tran = of('DEAN_TRAN');
    of('DEAN_PARAM').forEach(function (r) { b.param[r.khoa] = r.gia_tri; });
    return b;
  },

  /** Danh sách vấn đề cần xử lý trước khi ban hành (rỗng = sẵn sàng). */
  checkReady: function (ma) {
    var issues = [], d = Db.find('DEAN', function (x) { return x.ma === ma; });
    if (!d) return ['Không tìm thấy đề án'];
    var b = Policy.bundle(ma);
    Db.all('CHI_NHANH').filter(function (c) { return c.trang_thai === 'Hoạt động'; }).forEach(function (c) {
      if (!b.luong[c.ma]) issues.push('Chưa có LCB/LTB cho chi nhánh ' + c.ma);
    });
    if (!Object.keys(b.ngach).length) issues.push('Chưa có bảng hệ số ngạch - bậc');
    [1, 2, 3].forEach(function (h) { if (!b.hangTruong[h]) issues.push('Thiếu hệ số hỗ trợ cho trường hạng ' + h); });
    if (!Object.keys(b.quyDoi).length) issues.push('Chưa có bảng quy đổi trách nhiệm');
    if (!b.tran.length) issues.push('Chưa có bảng trần tăng thu nhập');
    PARAMS.forEach(function (p) { if (b.param[p.k] === undefined) issues.push('Thiếu tham số "' + p.k + '" (' + p.l + ')'); });
    Db.all('NGACH_DM').filter(function (n) { return n.trang_thai === 'Hoạt động'; }).forEach(function (n) {
      if (!b.ngach[n.ma]) issues.push('Ngạch ' + n.ma + ' đang hoạt động nhưng chưa có hệ số trong đề án này');
    });
    return issues;
  },

  /** Nhân bản một phiên bản (kèm toàn bộ bảng con) thành bản Nháp mới. Gọi trong Db.tx(). */
  clone: function (user, srcMa, o) {
    var src = Db.find('DEAN', function (d) { return d.ma === srcMa; });
    if (!src) throw new AppError('NOT_FOUND', 'Không tìm thấy đề án nguồn');
    var v = Validate.rows('DEAN', [{ n: 1, vals: {
      ma: o.ma || '', so_hieu: o.so_hieu || '', ten: o.ten || '', hieu_luc_tu: o.hieu_luc_tu || '', hieu_luc_den: '', ghi_chu: 'Nhân bản từ ' + srcMa
    } }], {}, { mode: 'insert' });
    if (!v.ok) throw new AppError('VALIDATION', v.errors[0].msg, v.errors);
    Db.insertMany('DEAN', [v.rows[0]], user.email);
    var n = 0;
    Policy.childTables().forEach(function (t) {
      var rows = Db.filter(t, function (r) { return r.de_an_ma === srcMa; }).map(function (r) {
        var c = {};
        SCHEMA[t].cols.forEach(function (col) { c[col.k] = r[col.k]; });
        c.de_an_ma = o.ma;
        return c;
      });
      Db.insertMany(t, rows, user.email);
      n += rows.length;
    });
    Audit.log(user, 'NHAN_BAN_DE_AN', 'DEAN', o.ma, { tu: srcMa, so_dong: n });
    return { ma: o.ma, copied: n };
  },

  /** Ban hành bản Nháp: kiểm tra đủ dữ liệu, tự đóng hiệu lực phiên bản trước. Gọi trong Db.tx(). */
  publish: function (user, ma) {
    var d = Db.find('DEAN', function (x) { return x.ma === ma; });
    if (!d) throw new AppError('NOT_FOUND', 'Không tìm thấy đề án');
    if (d.trang_thai !== 'Nháp') throw new AppError('STATE', 'Chỉ ban hành được bản Nháp');
    var issues = Policy.checkReady(ma);
    if (issues.length) throw new AppError('NOT_READY', 'Đề án chưa đủ điều kiện ban hành (' + issues.length + ' vấn đề)', issues);

    var closes = [];
    Db.filter('DEAN', function (p) { return p.trang_thai === 'Ban hành' && p.ma !== ma; }).forEach(function (p) {
      var pEnd = p.hieu_luc_den || Util.MAX_DATE;
      if (pEnd < d.hieu_luc_tu) return;
      if (p.hieu_luc_tu >= d.hieu_luc_tu) {
        throw new AppError('OVERLAP', 'Phiên bản ' + p.ma + ' có hiệu lực từ ' + Util.displayDate(p.hieu_luc_tu) + ', không sớm hơn phiên bản này (' + Util.displayDate(d.hieu_luc_tu) + ')');
      }
      closes.push({ id: p.id, patch: { hieu_luc_den: Util.addDays(d.hieu_luc_tu, -1) } });
    });
    Db.updateMany('DEAN', closes, user.email);
    Db.updateMany('DEAN', [{ id: d.id, patch: { trang_thai: 'Ban hành' } }], user.email);
    Audit.log(user, 'BAN_HANH_DE_AN', 'DEAN', ma, { dong_phien_ban_truoc: closes.length });
    Notify.queue({
      to: Auth.usersWith('policy.view'), title: 'Đề án ' + d.so_hieu + ' đã được ban hành',
      body: 'Phiên bản ' + ma + ' có hiệu lực từ ' + Util.displayDate(d.hieu_luc_tu) + '.', link: 'dean', type: 'Đề án'
    });
    return { ma: ma };
  }
};


// ===== Staff.gs =====
/** Nghiệp vụ nhân sự: ngạch hiện tại, thâm niên (số năm tròn). */
var Staff = {
  /** Bản ghi quá trình có hiệu lực tại ngày date (null nếu không). */
  at: function (table, maNv, date, extra) {
    return Db.find(table, function (r) {
      return r.ma_nv === maNv && r.hieu_luc_tu <= date && (!r.hieu_luc_den || r.hieu_luc_den >= date) && (!extra || extra(r));
    });
  },

  tenure: function (ngayVaoLam, date) { return Util.fullYears(ngayVaoLam, date); },

  /** Thêm cột tính toán cho danh sách NHAN_SU (ngạch hiện tại, thâm niên). */
  decorate: function (rows) {
    var today = Util.todayIso(), names = {}, cur = {};
    Db.all('NGACH_DM').forEach(function (n) { names[n.ma] = n.ten; });
    Db.all('QUA_TRINH_NGACH').forEach(function (q) {
      if (q.hieu_luc_tu <= today && (!q.hieu_luc_den || q.hieu_luc_den >= today)) cur[q.ma_nv] = q.ngach_ma;
    });
    return rows.map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      o.ngach_hien_tai = cur[r.ma_nv] ? names[cur[r.ma_nv]] || cur[r.ma_nv] : '';
      var end = r.ngay_nghi_viec && r.ngay_nghi_viec < today ? r.ngay_nghi_viec : today;
      o.tham_nien = r.ngay_vao_lam ? Staff.tenure(r.ngay_vao_lam, end) : '';
      return o;
    });
  }
};


// ===== Seed.gs =====
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


// ===== Setup.gs =====
/**
 * Cài đặt ban đầu. Chạy từ trình soạn thảo Apps Script bởi chủ dự án:
 *   1) setupInstall()  -> tạo Google Sheet CSDL, các sheet, dữ liệu mẫu theo đề án, tài khoản quản trị là bạn.
 *   2) Deploy > New deployment > Web app (Execute as: Me, Who has access: trong tên miền).
 * Các hàm toàn cục bên dưới cố ý kiểm tra "chính chủ" vì hàm toàn cục có thể bị gọi từ trình duyệt.
 */
function setupAssertOwner_() {
  var active = '', owner = '';
  try { active = Session.getActiveUser().getEmail(); owner = Session.getEffectiveUser().getEmail(); } catch (e) { /* bỏ qua */ }
  if (!active || active !== owner) throw new Error('Chỉ chủ dự án mới được chạy hàm cài đặt.');
}

function setupInstall() {
  setupAssertOwner_();
  var id = Db.createIfMissing();
  var report = Db.ensureSheets();
  var mail = Session.getActiveUser().getEmail();
  var seeded = Seed.run(mail, mail);
  Logger.log('CSDL: https://docs.google.com/spreadsheets/d/' + id);
  Logger.log('Sheet: ' + JSON.stringify(report));
  Logger.log('Khởi tạo: ' + JSON.stringify(seeded));
  return id;
}

/** Chạy lại sau khi cập nhật mã nguồn có thêm bảng/cột mới (không xóa dữ liệu). */
function setupEnsureSheets() {
  setupAssertOwner_();
  Logger.log(JSON.stringify(Db.ensureSheets()));
}

/** Cấp quyền quản trị cho một tài khoản khác (chạy trong trình soạn thảo, sửa email rồi bấm Run). */
function setupAddAdmin() {
  setupAssertOwner_();
  var email = 'ten@vaschools.edu.vn';
  Seed.run(email, email);
  Logger.log('Đã thêm quản trị: ' + email);
}


// ===== Api.gs =====
/**
 * Điểm vào của Web App. Chỉ các hàm toàn cục dưới đây được trình duyệt gọi.
 * Mọi thao tác đi qua apiCall -> kiểm tra đăng nhập -> kiểm tra quyền/phạm vi -> nghiệp vụ.
 */
function doGet() {
  var user = Auth.current();
  var t = HtmlService.createTemplateFromFile(user ? 'Index' : 'Denied');
  t.email = Auth.email();
  return t.evaluate().setTitle('Hệ thống Lương VASchools')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function apiCall(name, payload) {
  try {
    var h = Api.handlers[name];
    if (!h) throw new AppError('NOT_FOUND', 'API không tồn tại: ' + name);
    var user = Auth.current();
    if (!user) throw new AppError('FORBIDDEN', 'Tài khoản chưa được cấp quyền sử dụng hệ thống');
    var data = h(payload || {}, user);
    Notify.flush();
    return { ok: true, data: data };
  } catch (e) {
    Notify.discard();
    if (e instanceof AppError) return { ok: false, code: e.code, error: e.message, details: e.details };
    console.error(e && e.stack ? e.stack : e);
    return { ok: false, code: 'ERROR', error: 'Lỗi hệ thống: ' + (e && e.message ? e.message : e) };
  }
}

var Api = (function () {
  var PAGE = 300;

  function table(name) {
    var T = SCHEMA[name];
    if (!T || T.internal) throw new AppError('NOT_FOUND', 'Bảng không tồn tại: ' + name);
    return T;
  }

  function assertDraft(ma) {
    var d = ma && Db.find('DEAN', function (x) { return x.ma === ma; });
    if (!d) throw new AppError('NOT_FOUND', 'Không tìm thấy đề án');
    if (d.trang_thai !== 'Nháp') throw new AppError('LOCKED', 'Đề án đã ban hành nên không thể sửa. Hãy nhân bản thành phiên bản mới rồi chỉnh sửa.');
  }

  function stripRow(T, r, forUpdate) {
    var o = {};
    T.cols.forEach(function (c) {
      if (forUpdate && c.ro) return;
      o[c.k] = r[c.k];
    });
    return o;
  }

  function pickClient(T, r) {
    var o = { id: r.id, updated_at: r.updated_at };
    T.cols.forEach(function (c) { o[c.k] = r[c.k]; });
    (T.computed || []).forEach(function (c) { o[c.k] = r[c.k]; });
    return o;
  }

  /** Mọi bảng khác đang tham chiếu tới bản ghi này? (chặn xóa làm mồ côi dữ liệu) */
  function referencedBy(t, row) {
    var hits = [];
    Object.keys(SCHEMA).forEach(function (ot) {
      SCHEMA[ot].cols.forEach(function (c) {
        if (!c.ref) return;
        var p = c.ref.split('.');
        if (p[0] !== t) return;
        if (ot === t) return;
        if (Db.all(ot).some(function (x) { return x[c.k] === row[p[1]]; })) hits.push(SCHEMA[ot].label);
      });
    });
    return Util.uniq(hits);
  }

  function labelOf(r) { return r.ten || r.ho_ten || r.ma || ''; }

  function clientSchema(user) {
    var tables = {}, refs = {};
    Object.keys(SCHEMA).forEach(function (t) {
      var T = SCHEMA[t];
      if (T.internal) return;
      if (!Auth.can(user, T.perm.r)) return;
      tables[t] = {
        label: T.label, group: T.group, cols: T.cols, key: T.key, ctx: T.ctx || null, hidden: !!T.hidden,
        readonly: !!T.readonly, temporal: !!T.temporal, computed: T.computed || [],
        canWrite: !T.readonly && Auth.can(user, T.perm.w),
        canImport: !T.readonly && !T.noImport && Auth.can(user, T.perm.i || T.perm.w),
        spec: T.readonly ? [] : Validate.spec(t)
      };
      T.cols.forEach(function (c) {
        if (c.t !== 'ref' || refs[c.ref] !== undefined) return;
        var p = c.ref.split('.'), rows = Db.all(p[0]), RT = SCHEMA[p[0]];
        if (rows.length > 300 || !Auth.can(user, RT.perm.r)) { refs[c.ref] = null; return; }
        var sf = Auth.scopeFn(p[0]);
        if (sf && !Auth.hasGlobal(user, RT.perm.r)) rows = rows.filter(function (r) { return Auth.canRow(user, RT.perm.r, sf(r)); });
        refs[c.ref] = rows.map(function (r) { return { v: String(r[p[1]]), l: labelOf(r) }; });
      });
    });
    return { tables: tables, refs: refs, perms: PERMS, params: PARAMS };
  }

  function resolveWriteCtx(T, p) {
    var ctx = p.ctx || {};
    if (T.ctx) assertDraft(ctx[T.ctx]);
    return ctx;
  }

  function validationError(res, headline) {
    return new AppError('VALIDATION', headline || (res.errors[0].msg + (res.errors.length > 1 ? ' (và ' + (res.errors.length - 1) + ' lỗi khác)' : '')), res.errors);
  }

  var handlers = {
    me: function (p, user) {
      return { email: user.email, name: user.name, ma_nv: user.ma_nv, perms: user.perms, isAdmin: user.isAdmin,
        unread: Notify.unread(user.email) };
    },

    schema: function (p, user) { return clientSchema(user); },

    dashboard: function (p, user) {
      var cnt = function (t, pred) { return Db.all(t).filter(pred || function () { return true; }).length; };
      var dean = Policy.effective(Util.todayIso());
      var checklist = [
        { ok: cnt('CHI_NHANH') > 0, text: 'Khai báo chi nhánh', route: 'setup/CHI_NHANH' },
        { ok: cnt('TRUONG') > 0, text: 'Khai báo trường', route: 'setup/TRUONG' },
        { ok: cnt('NAM_HOC') > 0, text: 'Khai báo năm học và kỳ quyết toán', route: 'setup/NAM_HOC' },
        { ok: !!dean, text: 'Có đề án đang hiệu lực', route: 'dean' },
        { ok: cnt('NHAN_SU') > 0, text: 'Nhập hồ sơ nhân sự', route: 'staff/NHAN_SU' },
        { ok: cnt('USERS') > 1, text: 'Tạo tài khoản và gán vai trò cho người dùng', route: 'admin/USERS' }
      ];
      var staffVisible = Auth.can(user, 'staff.view');
      return {
        checklist: checklist,
        dean: dean ? { ma: dean.ma, so_hieu: dean.so_hieu, tu: dean.hieu_luc_tu } : null,
        counts: {
          chi_nhanh: cnt('CHI_NHANH', function (r) { return r.trang_thai === 'Hoạt động'; }),
          truong: cnt('TRUONG', function (r) { return r.trang_thai === 'Hoạt động'; }),
          nhan_su: staffVisible ? cnt('NHAN_SU', function (r) { return r.trang_thai === 'Đang làm việc'; }) : null
        }
      };
    },

    list: function (p, user) {
      var T = table(p.table);
      Auth.require(user, T.perm.r);
      var ctx = p.ctx || {}, rows = Db.all(p.table);
      if (T.ctx) {
        if (!ctx[T.ctx]) throw new AppError('BAD_REQUEST', 'Thiếu ngữ cảnh đề án');
        rows = rows.filter(function (r) { return r[T.ctx] === ctx[T.ctx]; });
      }
      if (p.filter) {
        Object.keys(p.filter).forEach(function (k) {
          if (!T.cols.some(function (c) { return c.k === k; })) return;
          rows = rows.filter(function (r) { return String(r[k]) === String(p.filter[k]); });
        });
      }
      var sf = Auth.scopeFn(p.table);
      if (sf && !Auth.hasGlobal(user, T.perm.r)) rows = rows.filter(function (r) { return Auth.canRow(user, T.perm.r, sf(r)); });
      if (p.q) {
        var q = Strict.norm(p.q);
        rows = rows.filter(function (r) {
          return T.cols.some(function (c) { return r[c.k] !== '' && Strict.norm(r[c.k]).indexOf(q) >= 0; });
        });
      }
      if (T.desc) rows = rows.slice().reverse();
      var total = rows.length, page = Math.max(0, p.page || 0);
      rows = rows.slice(page * PAGE, page * PAGE + PAGE);
      if (p.table === 'NHAN_SU') rows = Staff.decorate(rows);
      var locked = false;
      if (T.ctx) { var d = Db.find('DEAN', function (x) { return x.ma === ctx[T.ctx]; }); locked = !d || d.trang_thai !== 'Nháp'; }
      return { rows: rows.map(function (r) { return pickClient(T, r); }), total: total, page: page, pageSize: PAGE, locked: locked };
    },

    save: function (p, user) {
      var T = table(p.table);
      if (T.readonly) throw new AppError('FORBIDDEN', 'Bảng chỉ đọc');
      Auth.require(user, T.perm.w);
      var out;
      Db.tx(function () {
        var ctx = resolveWriteCtx(T, p), old = null;
        if (p.id) {
          old = Db.get(p.table, p.id);
          if (!old || (T.ctx && old[T.ctx] !== ctx[T.ctx])) throw new AppError('NOT_FOUND', 'Không tìm thấy bản ghi');
          var sf = Auth.scopeFn(p.table);
          if (sf && !Auth.canRow(user, T.perm.w, sf(old))) throw new AppError('FORBIDDEN', 'Bản ghi nằm ngoài phạm vi dữ liệu của bạn');
        }
        var res = Validate.rows(p.table, [{ n: 1, vals: p.row || {} }], ctx,
          { mode: 'insert', selfId: p.id, user: user, autoClose: !!p.autoClose && !p.id });
        if (!res.ok) throw validationError(res);
        var row = res.rows[0];
        if (old) {
          if (T.lockKey) T.key.forEach(function (k) {
            if (String(old[k]) !== String(row[k])) throw new AppError('LOCKED_KEY', 'Không đổi được "' + k + '" của bản ghi đã tạo (đang được các bảng khác tham chiếu). Hãy tạo bản ghi mới.');
          });
          if (p.table === 'DEAN' && old.trang_thai !== 'Nháp' && (old.hieu_luc_tu !== row.hieu_luc_tu || old.hieu_luc_den !== row.hieu_luc_den)) {
            throw new AppError('LOCKED', 'Đề án đã ban hành: không đổi được thời gian hiệu lực.');
          }
          Db.updateMany(p.table, [{ id: old.id, patch: stripRow(T, row, true) }], user.email);
          Audit.log(user, 'SUA', p.table, old.id, { truoc: stripRow(T, old), sau: stripRow(T, row) });
          out = { id: old.id };
        } else {
          if (res.closes.length) {
            Db.updateMany(p.table, res.closes.map(function (c) { return { id: c.id, patch: { hieu_luc_den: c.den } }; }), user.email);
          }
          var ins = Db.insertMany(p.table, [stripRow(T, row)], user.email)[0];
          Audit.log(user, 'THEM', p.table, ins.id, { ban_ghi: stripRow(T, row), da_dong: res.closes });
          out = { id: ins.id };
        }
      });
      return out;
    },

    remove: function (p, user) {
      var T = table(p.table);
      if (T.readonly) throw new AppError('FORBIDDEN', 'Bảng chỉ đọc');
      Auth.require(user, T.perm.w);
      Db.tx(function () {
        var ctx = p.ctx || {};
        if (T.ctx) assertDraft(ctx[T.ctx]);
        var row = Db.get(p.table, p.id);
        if (!row || (T.ctx && row[T.ctx] !== ctx[T.ctx])) throw new AppError('NOT_FOUND', 'Không tìm thấy bản ghi');
        var sf = Auth.scopeFn(p.table);
        if (sf && !Auth.canRow(user, T.perm.w, sf(row))) throw new AppError('FORBIDDEN', 'Bản ghi nằm ngoài phạm vi dữ liệu của bạn');

        if (p.table === 'DEAN') {
          if (row.trang_thai !== 'Nháp') throw new AppError('LOCKED', 'Chỉ xóa được đề án ở trạng thái Nháp');
          Policy.childTables().forEach(function (t) {
            Db.removeMany(t, Db.filter(t, function (r) { return r.de_an_ma === row.ma; }).map(function (r) { return r.id; }));
          });
        } else {
          var refs = referencedBy(p.table, row);
          if (refs.length) throw new AppError('IN_USE', 'Không xóa được vì đang được dùng ở: ' + refs.join(', ') + '. Hãy chuyển trạng thái sang Ngừng/Đã nghỉ việc thay vì xóa.');
        }
        if (p.table === 'USER_ROLES' && row.role_ma === 'ADMIN' && row.pham_vi === 'Toàn hệ thống') {
          var admins = Db.filter('USER_ROLES', function (g) { return g.role_ma === 'ADMIN' && g.pham_vi === 'Toàn hệ thống'; });
          if (admins.length <= 1) throw new AppError('LAST_ADMIN', 'Không thể gỡ quản trị viên cuối cùng');
        }
        Db.removeMany(p.table, [row.id]);
        Audit.log(user, 'XOA', p.table, row.id, stripRow(T, row));
      });
      return {};
    },

    importCheck: function (p, user) {
      var T = table(p.table);
      Auth.require(user, T.perm.i || T.perm.w);
      if (T.ctx && !(p.ctx && p.ctx[T.ctx])) throw new AppError('BAD_REQUEST', 'Thiếu ngữ cảnh đề án');
      var res = Validate.importText(p.table, p.text, p.ctx || {}, { mode: p.mode || 'insert', user: user });
      return { ok: res.ok, errors: res.errors.slice(0, 500), total: res.total || 0, inserts: res.inserts || 0, updates: res.updates || 0,
        truncated: !!res.truncated, locked: T.ctx ? (function () { var d = Db.find('DEAN', function (x) { return x.ma === p.ctx[T.ctx]; }); return !d || d.trang_thai !== 'Nháp'; })() : false };
    },

    importCommit: function (p, user) {
      var T = table(p.table);
      Auth.require(user, T.perm.i || T.perm.w);
      var res, ins = 0, upd = 0;
      Db.tx(function () {
        if (T.ctx) assertDraft((p.ctx || {})[T.ctx]);
        res = Validate.importText(p.table, p.text, p.ctx || {}, { mode: p.mode || 'insert', user: user });
        if (!res.ok) return;
        var inserts = [], updates = [];
        res.rows.forEach(function (r) {
          if (r.__update) updates.push({ id: r.__update, patch: stripRow(T, r, true) });
          else inserts.push(stripRow(T, r));
        });
        Db.insertMany(p.table, inserts, user.email);
        Db.updateMany(p.table, updates, user.email);
        ins = inserts.length; upd = updates.length;
        Audit.log(user, 'NHAP_CSV', p.table, '', { ctx: p.ctx || {}, them: ins, capnhat: upd });
      });
      if (!res.ok) throw new AppError('VALIDATION', 'Dữ liệu không hợp lệ - không có dòng nào được nhập.', res.errors.slice(0, 500));
      return { inserted: ins, updated: upd };
    },

    'dean.check': function (p, user) {
      Auth.require(user, 'policy.view');
      return { issues: Policy.checkReady(p.ma) };
    },

    'dean.clone': function (p, user) {
      Auth.require(user, 'policy.edit');
      var out;
      Db.tx(function () { out = Policy.clone(user, p.src, p); });
      return out;
    },

    'dean.publish': function (p, user) {
      Auth.require(user, 'policy.publish');
      var out;
      Db.tx(function () { out = Policy.publish(user, p.ma); });
      return out;
    },

    'roles.matrix': function (p, user) {
      Auth.require(user, 'role.manage');
      var grid = {};
      Db.all('ROLE_PERMS').forEach(function (rp) { (grid[rp.role_ma] = grid[rp.role_ma] || {})[rp.quyen] = true; });
      return { roles: Db.all('ROLES').map(function (r) { return { ma: r.ma, ten: r.ten }; }), perms: PERMS, grid: grid };
    },

    'roles.save': function (p, user) {
      Auth.require(user, 'role.manage');
      if (p.role === 'ADMIN') throw new AppError('LOCKED', 'Vai trò ADMIN luôn có toàn quyền, không chỉnh được');
      var valid = PERMS.map(function (x) { return x.k; });
      (p.perms || []).forEach(function (k) { if (valid.indexOf(k) < 0) throw new AppError('BAD_REQUEST', 'Quyền không hợp lệ: ' + k); });
      Db.tx(function () {
        if (!Db.find('ROLES', function (r) { return r.ma === p.role; })) throw new AppError('NOT_FOUND', 'Không có vai trò ' + p.role);
        var before = Db.filter('ROLE_PERMS', function (x) { return x.role_ma === p.role; });
        Db.removeMany('ROLE_PERMS', before.map(function (x) { return x.id; }));
        Db.insertMany('ROLE_PERMS', Util.uniq(p.perms || []).map(function (k) { return { role_ma: p.role, quyen: k }; }), user.email);
        Audit.log(user, 'SUA_QUYEN_VAI_TRO', 'ROLE_PERMS', p.role, { truoc: before.map(function (x) { return x.quyen; }), sau: p.perms || [] });
      });
      return {};
    },

    'notify.list': function (p, user) {
      return { items: Notify.list(user.email, 30), unread: Notify.unread(user.email) };
    },

    'notify.read': function (p, user) {
      Notify.markRead(user.email, p.ids || null);
      return { unread: Notify.unread(user.email) };
    }
  };

  return { handlers: handlers, table: table };
})();
