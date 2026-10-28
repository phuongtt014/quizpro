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
      var dc = r.hoc_ky.indexOf('DC') === 0;
      if (dc && r.loai !== 'Điều chỉnh') return 'Mã đợt DC… thì Loại phải là "Điều chỉnh"';
      if (!dc && r.loai !== 'Học kỳ') return 'Học kỳ HK1/HK2 thì Loại phải là "Học kỳ"';
      if (dc) {
        if (r.den_ngay < r.tu_ngay) return 'Đến ngày phải ≥ Từ ngày';
        if (r.ky_phu_troi === r.ma) return 'Kỳ phụ trội không thể là chính đợt này';
        return null;
      }
      if (r.ky_phu_troi) return 'Chỉ đợt điều chỉnh mới chọn "Lấy phụ trội từ kỳ"';
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
      col_('ho_tro_pt', 'Trong đó hỗ trợ từ phụ trội/tháng', 'money'), col_('luong_kpi', 'Lương KPI', 'money'),
      col_('pa_moi', 'Phương án mới', 'money'), col_('thu_nhap_hien_tai', 'Thu nhập hiện tại', 'money'), col_('ty_le_tran', 'Trần tăng', 'pct'),
      col_('max_income', 'Mức tối đa', 'money'), col_('chinh_thuc', 'Mức chính thức', 'money'), col_('chenh_lech', 'Chênh lệch so với hiện tại', 'money'),
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

  /** Gắn hệ số/thâm niên của đề án đang hiệu lực vào danh mục ngạch (chỉ để tra cứu). */
  decorateNgach: function (rows) {
    var d = Policy.effective(Util.todayIso()), b = d ? Policy.bundle(d.ma) : null;
    return rows.map(function (r) {
      var o = {}, g = b ? b.ngach[r.ma] : null;
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      o.hs_chuc_danh = g ? g.hs_chuc_danh : '';
      o.hs_kpi = g ? g.hs_kpi : '';
      o.hs_tiet = g ? g.hs_tiet : '';
      o.nhom_tham_nien = g ? g.nhom_tham_nien : '';
      o.vuot_khung = g ? g.vuot_khung : '';
      o.de_an_ap_dung = d ? (g ? d.so_hieu : d.so_hieu + ' (chưa có hệ số)') : 'Chưa có đề án hiệu lực';
      return o;
    });
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


// ===== Engine.gs =====
/**
 * Bộ tính toán thuần (không đọc dữ liệu): tính phụ trội/quyết toán và thu nhập mới
 * theo PRD & Đề án HP.ĐA.01. Mọi hằng số đến từ gói tham số của phiên bản đề án (param, tran...).
 */
var Engine = (function () {
  function round(n, d) { var f = Math.pow(10, d || 0); return Math.round(n * f) / f; }
  function num(v) { return v === '' || v === null || v === undefined ? 0 : Number(v); }

  /** Số ngày giữa hai ngày ISO, tính cả hai đầu. */
  function daysInclusive(tu, den) {
    var a = tu.split('-'), b = den.split('-');
    return Math.round((Date.UTC(+b[0], +b[1] - 1, +b[2]) - Date.UTC(+a[0], +a[1] - 1, +a[2])) / 86400000) + 1;
  }

  /** Quy đổi một dòng khai báo ra tổng số tiết tuyệt đối (PRD 2.1; môn đặc thù nhân hệ số quy đổi). */
  function tietOf(d, param) {
    var days = daysInclusive(d.tu_ngay, d.den_ngay), so = num(d.so_luong), t;
    if (d.don_vi === 'Tiết/Tuần') t = so * (days / 7);
    else if (d.don_vi === 'Tiết/Tháng') t = so * (days / 30);
    else t = so * days;
    if (d.loai === 'Thực dạy' && d.dac_thu === 'Có') t *= num(param.he_so_quy_doi_dac_thu) || 1;
    return t;
  }

  /** Phân bổ phụ trội: ưu tiên lấp đầy giỏ trách nhiệm (đề án mục VI.1.b). */
  function allocate(thucDay, trachNhiem, dinhMuc) {
    var tong = thucDay + trachNhiem - dinhMuc;
    if (tong <= 0) return { tong: 0, ptTN: 0, ptGD: 0 };
    if (tong <= trachNhiem) return { tong: tong, ptTN: tong, ptGD: 0 };
    return { tong: tong, ptTN: trachNhiem, ptGD: tong - trachNhiem };
  }

  /**
   * input: { decls (đã duyệt, trong kỳ), doiTuong, soTuan, param, ltb, hsTiet (null nếu ngạch không có) }
   */
  function settle(input) {
    var p = input.param, th = 0, tn = 0, dm = 0, notes = [];
    input.decls.forEach(function (d) {
      var t = tietOf(d, p);
      if (d.loai === 'Thực dạy') th += t; else if (d.loai === 'Trách nhiệm') tn += t; else dm += t;
    });
    if (dm === 0) {
      if (input.doiTuong === 'GV Tiểu học nhiều môn') dm = input.soTuan * num(p.dinh_muc_tieu_hoc);
      else if (input.doiTuong === 'GV còn lại') dm = input.soTuan * num(p.dinh_muc_khac);
    }
    var hs = input.hsTiet;
    if (hs === null || hs === undefined || hs === '' || hs === 0) { hs = 1; notes.push('Ngạch không có HS tiết, tạm dùng 1,0'); }
    var a = allocate(th, tn, dm);
    var hsTN = num(p.he_so_tiet_trach_nhiem) || 1;
    var tien = a.ptTN * hsTN * input.ltb + a.ptGD * hs * input.ltb;
    return {
      thuc_day: round(th, 4), trach_nhiem: round(tn, 4), dinh_muc: round(dm, 4), tong_pt: round(a.tong, 4),
      pt_trach_nhiem: round(a.ptTN, 4), pt_giang_day: round(a.ptGD, 4), hs_tiet: hs, ltb: input.ltb,
      tien_pt: Math.round(tien), ghi_chu: notes.join('; ')
    };
  }

  /** Tỷ lệ trần theo năm áp dụng và thâm niên; null nếu đề án không có dòng phù hợp. */
  function capRate(tran, nam, tenure) {
    var years = tran.map(function (r) { return r.nam; }).filter(function (y) { return y <= nam; });
    if (!years.length) return null;
    var y = Math.max.apply(null, years), rate = null;
    tran.forEach(function (r) {
      if (r.nam === y && tenure >= r.tn_tu && (r.tn_den === '' || r.tn_den === null || tenure < r.tn_den)) rate = r.ty_le;
    });
    return rate;
  }

  /**
   * input: { doiTuong, ngach (dòng DEAN_NGACH), tenure, holdYears, kiemNhiem: [{ hs_kpi, ti_le }],
   *   hangTruong (dòng DEAN_HANGTRUONG | null), lcb, ltb, param, tran, namXet, thuNhapHienTai (số | null),
   *   tienPt, soThang }
   */
  function income(input) {
    var p = input.param, g = input.ngach, notes = [];
    var hsCD = num(g.hs_chuc_danh), hsKPI = num(g.hs_kpi), hsTiet = num(g.hs_tiet);

    var rate = g.nhom_tham_nien ? num(p['tn_he_so_' + g.nhom_tham_nien.toLowerCase()]) : 0;
    var hsTN = input.tenure >= num(p.tn_toi_thieu) ? input.tenure * rate : 0;

    var hsVK = g.vuot_khung === 'Có' && input.holdYears >= num(p.vuot_khung_nam) ? num(p.vuot_khung_he_so) * input.holdYears : 0;

    var hsBGH = 0;
    if (g.ho_tro_hang_truong) {
      if (!input.hangTruong) notes.push('Chưa khai báo hạng trường nên chưa tính hỗ trợ hạng trường');
      else hsBGH = num(g.ho_tro_hang_truong === 'Hiệu trưởng' ? input.hangTruong.hs_hieu_truong : input.hangTruong.hs_pho_hieu_truong);
    }
    var hsKN = input.kiemNhiem.reduce(function (s, k) { return s + num(k.hs_kpi) * num(k.ti_le); }, 0);

    var luongCD = input.lcb * hsCD;
    var troCap = input.lcb * (hsTN + hsBGH + hsKN + hsVK);
    var hoTroDK = input.soThang > 0 ? input.tienPt / input.soThang : 0;

    var kpiTiet = 0;
    if (input.doiTuong === 'GV Tiểu học nhiều môn') kpiTiet = input.ltb * hsTiet * num(p.kpi_tiet_th_so_tiet) * num(p.kpi_tiet_th_he_so);
    else if (input.doiTuong === 'GV còn lại') kpiTiet = input.ltb * hsTiet * num(p.kpi_tiet_khac_so_tiet);
    var luongKPI = kpiTiet > 0 ? kpiTiet : input.lcb * hsKPI;

    var pa = luongCD + troCap + hoTroDK + luongKPI;

    var cur = input.thuNhapHienTai, tran = null, max = null, official = pa;
    if (cur === null || cur === undefined) {
      notes.push('Chưa có thu nhập hiện tại: không áp trần/bảo vệ lương');
    } else {
      tran = capRate(input.tran, input.namXet, input.tenure);
      if (tran === null) notes.push('Đề án chưa có trần cho năm ' + input.namXet + ': không áp trần');
      else { max = cur * (1 + tran); if (pa > max) { official = max; notes.push('Bị khống chế bởi trần ' + round(tran * 100, 2) + '%'); } }
      if (official < cur) { official = cur; notes.push('Hỗ trợ giữ mức thu nhập'); }
    }
    return {
      hs_cd: hsCD, hs_tn: round(hsTN, 4), hs_vk: round(hsVK, 4), hs_bgh: hsBGH, hs_kn: round(hsKN, 4), hs_kpi: hsKPI,
      luong_chuc_danh: Math.round(luongCD), ho_tro: Math.round(troCap + hoTroDK), ho_tro_pt: Math.round(hoTroDK), luong_kpi: Math.round(luongKPI),
      pa_moi: Math.round(pa), thu_nhap_hien_tai: cur === null || cur === undefined ? '' : cur,
      ty_le_tran: tran === null ? '' : tran, max_income: max === null ? '' : Math.round(max),
      chinh_thuc: Math.round(official),
      chenh_lech: cur === null || cur === undefined ? '' : Math.round(official) - cur, tien_pt: Math.round(input.tienPt || 0),
      ghi_chu: notes.join('; ')
    };
  }

  return { daysInclusive: daysInclusive, tietOf: tietOf, allocate: allocate, settle: settle, income: income, capRate: capRate };
})();


// ===== Calc.gs =====
/**
 * Điều phối tính quyết toán phụ trội và thu nhập mới cho một kỳ: đọc dữ liệu, gọi Engine, ghi kết quả
 * (kèm phiên bản đề án đã dùng). Kết quả "Chờ chốt/Đã chốt" không bị ghi đè.
 * Quy ước: dùng phiên bản đề án hiệu lực vào NGÀY CUỐI KỲ; ngạch, kiêm nhiệm, thâm niên tính tại ngày cuối kỳ;
 * thu nhập hiện tại lấy tại ngày đầu kỳ.
 */
var Calc = (function () {
  function groupBy(rows, key) {
    var m = {};
    rows.forEach(function (r) { (m[r[key]] = m[r[key]] || []).push(r); });
    return m;
  }

  function activeAt(r, d) { return r.hieu_luc_tu <= d && (!r.hieu_luc_den || r.hieu_luc_den >= d); }

  /** Số năm tròn giữ liên tục một ngạch, tính đến ngày d (nối các bản ghi liền kề cùng ngạch). */
  function holdYears(hist, d) {
    var cur = hist.filter(function (r) { return activeAt(r, d); })[0];
    if (!cur) return 0;
    var start = cur.hieu_luc_tu, moved = true;
    while (moved) {
      moved = false;
      for (var i = 0; i < hist.length; i++) {
        if (hist[i].ngach_ma === cur.ngach_ma && hist[i].hieu_luc_den && Util.addDays(hist[i].hieu_luc_den, 1) === start) {
          start = hist[i].hieu_luc_tu; moved = true;
        }
      }
    }
    return Util.fullYears(start, d);
  }

  /**
   * Tính cho một kỳ. Hai loại kỳ:
   *  - 'Học kỳ': tính phụ trội từ khai báo, và thu nhập mới (gồm hỗ trợ dự kiến = phụ trội / số tháng).
   *  - 'Điều chỉnh': đợt tính thu nhập mới tại một ngày hiệu lực (đổi đề án/ngạch bậc), không cần khai báo;
   *    hỗ trợ dự kiến lấy từ phụ trội của kỳ chọn ở cột "Lấy phụ trội từ kỳ" (nếu có).
   * gom: 'da_duyet' (mặc định, dùng để chốt) hoặc 'tat_ca' (tính thử cả dòng Nháp/Chờ duyệt, không chốt được).
   */
  function run(user, kyMa, truongMa, gom) {
    gom = gom === 'tat_ca' ? 'tat_ca' : 'da_duyet';
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === kyMa; });
    if (!ky) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ ' + kyMa);
    if (ky.trang_thai !== 'Mở') throw new AppError('LOCKED', 'Kỳ ' + kyMa + ' đã chốt');
    var isAdj = ky.loai === 'Điều chỉnh';
    var dean = Policy.effective(ky.den_ngay);
    if (!dean) throw new AppError('NO_POLICY', 'Không có đề án đang hiệu lực vào ngày ' + Util.displayDate(ky.den_ngay));
    var b = Policy.bundle(dean.ma), warnings = [], namXet = +ky.den_ngay.slice(0, 4);

    var hang = {};
    Db.all('TRUONG_HANG').forEach(function (h) { if (h.nam_hoc_ma === ky.nam_hoc_ma) hang[h.truong_ma] = h; });
    var declsBy = isAdj ? {} : groupBy(Db.filter('KHAI_BAO', function (d) {
      return d.ky_ma === kyMa && (gom === 'tat_ca' || d.trang_thai === 'Đã duyệt');
    }), 'ma_nv');
    var ngachBy = groupBy(Db.all('QUA_TRINH_NGACH'), 'ma_nv');
    var knBy = groupBy(Db.all('QUA_TRINH_KIEMNHIEM'), 'ma_nv');
    var tnBy = groupBy(Db.all('THU_NHAP_NEN'), 'ma_nv');
    var ngachName = {};
    Db.all('NGACH_DM').forEach(function (n) { ngachName[n.ma] = n.ten; });

    // Đợt điều chỉnh: lấy tiền phụ trội của kỳ học kỳ được chọn (nếu có) để tính "hỗ trợ dự kiến"
    var ptBy = {}, ptSoThang = ky.so_thang_chia;
    if (isAdj) {
      if (ky.ky_phu_troi) {
        var kyPT = Db.find('KY_LUONG', function (k) { return k.ma === ky.ky_phu_troi; });
        if (kyPT) ptSoThang = kyPT.so_thang_chia;
        Db.filter('QUYET_TOAN', function (r) { return r.ky_ma === ky.ky_phu_troi; }).forEach(function (r) { ptBy[r.ma_nv] = r.tien_pt; });
      } else warnings.push('Đợt điều chỉnh chưa chọn "Lấy phụ trội từ kỳ": hỗ trợ dự kiến từ phụ trội tạm tính = 0');
    }

    var locked = {};
    Db.all('QUYET_TOAN').concat(Db.all('THU_NHAP_MOI')).forEach(function (r) {
      if (r.ky_ma === kyMa && r.trang_thai !== 'Tạm tính') locked[r.ma_nv] = true;
    });

    var staff = Db.filter('NHAN_SU', function (s) {
      if (truongMa && s.truong_ma !== truongMa) return false;
      if (s.ngay_vao_lam > ky.den_ngay) return false;
      if (s.ngay_nghi_viec && s.ngay_nghi_viec < ky.tu_ngay) return false;
      return Auth.canRow(user, 'calc.run', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv });
    });
    if (!staff.length) throw new AppError('EMPTY', 'Không có nhân sự nào trong phạm vi để tính');

    var qt = [], tm = [], skippedLocked = 0, unapproved = 0;
    staff.forEach(function (s) {
      if (locked[s.ma_nv]) { skippedLocked++; return; }
      var tag = s.ma_nv + ' (' + s.ho_ten + ')';
      var hist = ngachBy[s.ma_nv] || [];
      var cur = hist.filter(function (r) { return activeAt(r, ky.den_ngay); })[0];
      if (!cur) { warnings.push(tag + ': chưa có ngạch hiệu lực tại ' + Util.displayDate(ky.den_ngay)); return; }
      var g = b.ngach[cur.ngach_ma];
      if (!g) { warnings.push(tag + ': ngạch ' + cur.ngach_ma + ' chưa có hệ số trong đề án ' + dean.ma); return; }
      var lw = b.luong[s.chi_nhanh_ma];
      if (!lw) { warnings.push(tag + ': đề án ' + dean.ma + ' chưa có LCB/LTB cho chi nhánh ' + s.chi_nhanh_ma); return; }
      var who = { ho_ten: s.ho_ten, chi_nhanh_ma: s.chi_nhanh_ma, truong_ma: s.truong_ma, doi_tuong: s.doi_tuong };

      var decls = declsBy[s.ma_nv] || [], settle = { tien_pt: 0 }, nguon = 'Đã duyệt';
      if (decls.length) {
        if (decls.some(function (d) { return d.trang_thai !== 'Đã duyệt'; })) { nguon = 'Gồm dòng chưa duyệt'; unapproved++; }
        settle = Engine.settle({ decls: decls, doiTuong: s.doi_tuong, soTuan: ky.so_tuan, param: b.param, ltb: lw.ltb, hsTiet: g.hs_tiet === '' ? null : g.hs_tiet });
        var row = { ky_ma: kyMa, ma_nv: s.ma_nv, de_an_ma: dean.ma, nguon: nguon, trang_thai: 'Tạm tính', phieu_ma: '' };
        Object.keys(who).forEach(function (k) { row[k] = who[k]; });
        Object.keys(settle).forEach(function (k) { row[k] = settle[k]; });
        qt.push(row);
      }

      var kn = (knBy[s.ma_nv] || []).filter(function (r) { return activeAt(r, ky.den_ngay); }).map(function (r) {
        var kg = b.ngach[r.ngach_ma];
        if (!kg) warnings.push(tag + ': ngạch kiêm nhiệm ' + r.ngach_ma + ' chưa có hệ số trong đề án');
        return { hs_kpi: kg ? kg.hs_kpi : 0, ti_le: r.ti_le };
      });
      var curInc = (tnBy[s.ma_nv] || []).filter(function (r) { return activeAt(r, ky.tu_ngay); })[0];
      var tienPt = isAdj ? (ptBy[s.ma_nv] || 0) : settle.tien_pt;
      var inc = Engine.income({
        doiTuong: s.doi_tuong, ngach: g, tenure: Util.fullYears(s.ngay_vao_lam, ky.den_ngay),
        holdYears: holdYears(hist.filter(function (r) { return r.ngach_ma === cur.ngach_ma; }), ky.den_ngay),
        kiemNhiem: kn, hangTruong: s.truong_ma ? b.hangTruong[(hang[s.truong_ma] || {}).hang] || null : null,
        lcb: lw.lcb, ltb: lw.ltb, param: b.param, tran: b.tran, namXet: namXet,
        thuNhapHienTai: curInc ? curInc.thu_nhap : null, tienPt: tienPt, soThang: isAdj ? ptSoThang : ky.so_thang_chia
      });
      var irow = { ky_ma: kyMa, ma_nv: s.ma_nv, de_an_ma: dean.ma, ngay_vao_lam: s.ngay_vao_lam, ngach_ma: cur.ngach_ma,
        ngach_ten: ngachName[cur.ngach_ma] || cur.ngach_ma, tham_nien: Util.fullYears(s.ngay_vao_lam, ky.den_ngay),
        nguon: nguon, trang_thai: 'Tạm tính', phieu_ma: '' };
      Object.keys(who).forEach(function (k) { irow[k] = who[k]; });
      Object.keys(inc).forEach(function (k) { irow[k] = inc[k]; });
      if (!s.truong_ma && g.ho_tro_hang_truong) irow.ghi_chu = (irow.ghi_chu ? irow.ghi_chu + '; ' : '') + 'Nhân sự chưa gắn trường';
      tm.push(irow);
    });

    var inScope = {};
    staff.forEach(function (s) { inScope[s.ma_nv] = true; });
    ['QUYET_TOAN', 'THU_NHAP_MOI'].forEach(function (t) {
      Db.removeMany(t, Db.filter(t, function (r) { return r.ky_ma === kyMa && r.trang_thai === 'Tạm tính' && inScope[r.ma_nv]; }).map(function (r) { return r.id; }));
    });
    Db.insertMany('QUYET_TOAN', qt, user.email);
    Db.insertMany('THU_NHAP_MOI', tm, user.email);
    Audit.log(user, 'CHAY_QUYET_TOAN', 'QUYET_TOAN', kyMa, { truong: truongMa || '', de_an: dean.ma, gom: gom, loai: ky.loai || 'Học kỳ',
      quyet_toan: qt.length, thu_nhap_moi: tm.length, bo_qua_da_chot: skippedLocked, canh_bao: warnings.length });
    return { de_an: dean.ma, loai: ky.loai || 'Học kỳ', settled: qt.length, incomes: tm.length, skippedLocked: skippedLocked,
      unapproved: unapproved, warnings: warnings };
  }

  return { run: run, holdYears: holdYears };
})();


// ===== Report.gs =====
/**
 * Báo cáo trên kết quả đã tính: bảng tổng hợp thu nhập toàn công ty (theo chi nhánh/trường/đối tượng/ngạch),
 * xuất bảng để dán vào Excel, và chi tiết phụ trội từng người. Luôn lọc theo phạm vi dữ liệu của người xem.
 */
var Report = (function () {
  function scopedRows(user, table, kyMa) {
    var sf = Auth.scopeFn(table), global = Auth.hasGlobal(user, 'calc.view');
    return Db.filter(table, function (r) {
      return r.ky_ma === kyMa && (global || !sf || Auth.canRow(user, 'calc.view', sf(r)));
    });
  }

  function nameMap(table) {
    var m = {};
    Db.all(table).forEach(function (r) { m[r.ma] = r.ten; });
    return m;
  }

  function isNum(v) { return typeof v === 'number'; }

  var GROUPS = {
    tat_ca: function () { return { key: 'ALL', label: 'Toàn công ty' }; },
    chi_nhanh: function (r, n) { return { key: r.chi_nhanh_ma, label: n.cn[r.chi_nhanh_ma] || r.chi_nhanh_ma }; },
    truong: function (r, n) { return { key: r.truong_ma || '~', label: r.truong_ma ? (n.tr[r.truong_ma] || r.truong_ma) : '(chưa gắn trường)' }; },
    chi_nhanh_truong: function (r, n) {
      return { key: r.chi_nhanh_ma + '/' + (r.truong_ma || '~'),
        label: (n.cn[r.chi_nhanh_ma] || r.chi_nhanh_ma) + ' › ' + (r.truong_ma ? (n.tr[r.truong_ma] || r.truong_ma) : '(chưa gắn trường)') };
    },
    doi_tuong: function (r) { return { key: r.doi_tuong, label: r.doi_tuong }; },
    ngach: function (r) { return { key: r.ngach_ma, label: r.ngach_ten || r.ngach_ma }; }
  };

  function blank() {
    return { so_nv: 0, hien_tai: 0, so_co_hien_tai: 0, chinh_thuc: 0, chinh_thuc_ss: 0, pa_moi: 0, tien_pt: 0, giu_luong: 0, bi_tran: 0, chua_chot: 0 };
  }

  function add(a, r) {
    a.so_nv++;
    a.chinh_thuc += r.chinh_thuc || 0;
    a.pa_moi += r.pa_moi || 0;
    a.tien_pt += r.tien_pt || 0;
    if (isNum(r.thu_nhap_hien_tai)) { a.hien_tai += r.thu_nhap_hien_tai; a.so_co_hien_tai++; a.chinh_thuc_ss += r.chinh_thuc || 0; }
    if (/giữ mức thu nhập/.test(r.ghi_chu)) a.giu_luong++;
    if (/trần/.test(r.ghi_chu)) a.bi_tran++;
    if (r.trang_thai !== 'Đã chốt') a.chua_chot++;
  }

  function finish(label, key, a) {
    var tang = a.chinh_thuc_ss - a.hien_tai;
    return { key: key, label: label, so_nv: a.so_nv, hien_tai: a.hien_tai, so_co_hien_tai: a.so_co_hien_tai, pa_moi: a.pa_moi, chinh_thuc: a.chinh_thuc,
      tang: tang, pct_tang: a.hien_tai > 0 ? Math.round(tang / a.hien_tai * 10000) / 100 : null, tien_pt: a.tien_pt,
      quy_nam: a.chinh_thuc * 12, giu_luong: a.giu_luong, bi_tran: a.bi_tran, chua_chot: a.chua_chot };
  }

  /** Bảng tổng hợp theo nhóm + dòng tổng toàn bộ phạm vi người xem. */
  function summary(user, kyMa, group) {
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === kyMa; });
    if (!ky) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ ' + kyMa);
    var keyFn = GROUPS[group || 'chi_nhanh'];
    if (!keyFn) throw new AppError('BAD_REQUEST', 'Nhóm tổng hợp không hợp lệ');
    var n = { cn: nameMap('CHI_NHANH'), tr: nameMap('TRUONG') }, rows = scopedRows(user, 'THU_NHAP_MOI', kyMa);
    var map = {}, order = [], all = blank();
    rows.forEach(function (r) {
      var g = keyFn(r, n);
      if (!map[g.key]) { map[g.key] = { label: g.label, a: blank() }; order.push(g.key); }
      add(map[g.key].a, r); add(all, r);
    });
    order.sort();
    var have = {};
    rows.forEach(function (r) { have[r.ma_nv] = true; });
    var global = Auth.hasGlobal(user, 'calc.view');
    var missing = Db.filter('NHAN_SU', function (s) {
      if (have[s.ma_nv] || s.ngay_vao_lam > ky.den_ngay || (s.ngay_nghi_viec && s.ngay_nghi_viec < ky.tu_ngay)) return false;
      return global || Auth.canRow(user, 'calc.view', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv });
    }).length;
    return { ky: { ma: ky.ma, loai: ky.loai || 'Học kỳ', den_ngay: ky.den_ngay, trang_thai: ky.trang_thai },
      de_an: rows.length ? rows[0].de_an_ma : '', group: group || 'chi_nhanh',
      groups: order.map(function (k) { return finish(map[k].label, k, map[k].a); }), total: finish('TỔNG CỘNG', 'ALL', all), chua_tinh: missing };
  }

  function cell(v) { return v === undefined || v === null ? '' : String(v).replace(/[\t\r\n]+/g, ' '); }
  function pct(v) { return v === '' || v === undefined ? '' : (Math.round(v * 10000) / 100) + '%'; }

  /** Văn bản TSV để dán thẳng vào Excel/Google Sheets. */
  function exportTable(user, kyMa, which) {
    var head, map, rows;
    if (which === 'phu_troi') {
      head = ['Mã NV', 'Họ tên', 'Chi nhánh', 'Trường', 'Đối tượng', 'Thực dạy (tiết)', 'Trách nhiệm (tiết)', 'Định mức (tiết)', 'Tổng phụ trội', 'PT trách nhiệm',
        'PT giảng dạy', 'HS tiết', 'LTB', 'Tiền phụ trội', 'Trạng thái', 'Nguồn', 'Ghi chú'];
      map = function (r) {
        return [r.ma_nv, r.ho_ten, r.chi_nhanh_ma, r.truong_ma, r.doi_tuong, r.thuc_day, r.trach_nhiem, r.dinh_muc, r.tong_pt, r.pt_trach_nhiem, r.pt_giang_day,
          r.hs_tiet, r.ltb, r.tien_pt, r.trang_thai, r.nguon, r.ghi_chu];
      };
      rows = scopedRows(user, 'QUYET_TOAN', kyMa);
    } else {
      head = ['Mã NV', 'Họ tên', 'Chi nhánh', 'Trường', 'Đối tượng', 'Ngày vào làm', 'Ngạch', 'Thâm niên (năm)', 'HS chức danh', 'HS thâm niên', 'HS vượt khung',
        'HS hạng trường', 'HS kiêm nhiệm', 'HS KPI', 'Lương chức danh', 'Các khoản hỗ trợ', 'Trong đó hỗ trợ từ phụ trội/tháng', 'Lương KPI', 'Phương án mới',
        'Thu nhập hiện tại', 'Trần tăng', 'Mức tối đa', 'Mức chính thức', 'Chênh lệch', 'Tiền phụ trội cả kỳ', 'Trạng thái', 'Nguồn', 'Ghi chú'];
      map = function (r) {
        return [r.ma_nv, r.ho_ten, r.chi_nhanh_ma, r.truong_ma, r.doi_tuong, Util.displayDate(r.ngay_vao_lam), r.ngach_ten, r.tham_nien, r.hs_cd, r.hs_tn, r.hs_vk,
          r.hs_bgh, r.hs_kn, r.hs_kpi, r.luong_chuc_danh, r.ho_tro, r.ho_tro_pt, r.luong_kpi, r.pa_moi, r.thu_nhap_hien_tai, pct(r.ty_le_tran), r.max_income,
          r.chinh_thuc, r.chenh_lech, r.tien_pt, r.trang_thai, r.nguon, r.ghi_chu];
      };
      rows = scopedRows(user, 'THU_NHAP_MOI', kyMa);
    }
    rows.sort(function (a, b) { return (a.chi_nhanh_ma + a.truong_ma + a.ma_nv) < (b.chi_nhanh_ma + b.truong_ma + b.ma_nv) ? -1 : 1; });
    var lines = [head.join('\t')].concat(rows.map(function (r) { return map(r).map(cell).join('\t'); }));
    return { text: lines.join('\n'), rows: rows.length };
  }

  /** Chi tiết từng dòng khai báo đã quy đổi ra tiết cho một nhân sự trong kỳ, kèm kết quả phụ trội. */
  function ptDetail(user, kyMa, maNv) {
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === kyMa; });
    var s = Db.find('NHAN_SU', function (x) { return x.ma_nv === maNv; });
    if (!ky || !s) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ hoặc nhân sự');
    if (!Auth.canRow(user, 'calc.view', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv })) throw new AppError('FORBIDDEN', 'Nhân sự nằm ngoài phạm vi của bạn');
    var dean = Policy.effective(ky.den_ngay), param = dean ? Policy.bundle(dean.ma).param : {};
    var lines = Db.filter('KHAI_BAO', function (d) { return d.ky_ma === kyMa && d.ma_nv === maNv; }).map(function (d) {
      return { loai: d.loai, noi_dung: d.noi_dung, so_luong: d.so_luong, don_vi: d.don_vi, dac_thu: d.dac_thu, tu: d.tu_ngay, den: d.den_ngay,
        ngay: Engine.daysInclusive(d.tu_ngay, d.den_ngay), tiet: Math.round(Engine.tietOf(d, param) * 100) / 100, trang_thai: d.trang_thai, phieu: d.phieu_ma };
    });
    var qt = Db.find('QUYET_TOAN', function (r) { return r.ky_ma === kyMa && r.ma_nv === maNv; });
    return { ho_ten: s.ho_ten, doi_tuong: s.doi_tuong, so_tuan: ky.so_tuan, lines: lines, ketqua: qt || null };
  }

  return { summary: summary, exportTable: exportTable, ptDetail: ptDetail };
})();


// ===== Workflow.gs =====
/**
 * Quy trình đề xuất - xét duyệt - phê duyệt nhiều bậc, cấu hình bằng dữ liệu (bảng WORKFLOW_STEP).
 * - Mỗi loại phiếu có quy trình mặc định (trường để trống) và có thể ghi đè riêng cho từng trường.
 * - Khi gửi phiếu, quy trình được chụp lại (snapshot): sửa cấu hình sau đó không làm đổi phiếu đang chạy.
 * - Người duyệt = có vai trò của bước với đúng phạm vi (cùng trường/chi nhánh/toàn hệ thống), hoặc được ủy quyền.
 * - Không ai được duyệt phiếu do chính mình tạo. ADMIN có thể "duyệt thay" (bắt buộc ghi chú, có nhật ký).
 */
var Workflow = (function () {
  var APPLY = {};

  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function parse(s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } }

  /** Quy trình áp dụng cho loại phiếu + trường: ưu tiên cấu hình riêng của trường, sau đó mặc định. */
  function steps(loai, truong) {
    var all = Db.filter('WORKFLOW_STEP', function (s) { return s.loai_phieu === loai; });
    var pick = truong ? all.filter(function (s) { return s.truong_ma === truong; }) : [];
    if (!pick.length) pick = all.filter(function (s) { return s.truong_ma === ''; });
    if (!pick.length) throw new AppError('NO_WORKFLOW', 'Chưa cấu hình quy trình duyệt cho loại phiếu "' + loai + '". Vào Hệ thống → Quy trình duyệt.');
    pick.sort(function (a, b) { return a.thu_tu - b.thu_tu; });
    pick.forEach(function (s, i) {
      if (s.thu_tu !== i + 1) throw new AppError('BAD_WORKFLOW', 'Quy trình "' + loai + '"' + (pick[0].truong_ma ? ' của trường ' + pick[0].truong_ma : ' mặc định') + ' phải đánh số bước liên tục 1, 2, 3…');
    });
    return pick.map(function (s) {
      return { thu_tu: s.thu_tu, ten_buoc: s.ten_buoc, hanh_dong: s.hanh_dong, vai_tro: s.vai_tro, pham_vi: s.pham_vi, han_ngay: s.han_ngay };
    });
  }

  function grantMatches(g, step, phieu) {
    if (g.role !== step.vai_tro && g.role_ma !== step.vai_tro) return false;
    var sc = g.scope || g.pham_vi, code = g.code !== undefined ? g.code : g.pham_vi_ma;
    if (step.pham_vi === 'Toàn hệ thống') return sc === 'Toàn hệ thống';
    if (step.pham_vi === 'Cùng chi nhánh') return sc === 'Toàn hệ thống' || (sc === 'Chi nhánh' && code === phieu.chi_nhanh_ma);
    return sc === 'Toàn hệ thống' || (sc === 'Trường' && code === phieu.truong_ma);
  }

  function activeGrant(g, today) { return (!g.hieu_luc_tu || g.hieu_luc_tu <= today) && (!g.hieu_luc_den || g.hieu_luc_den >= today); }

  /** Email những người có thể xử lý bước này (trực tiếp hoặc được ủy quyền). */
  function approvers(step, phieu) {
    var today = Util.todayIso(), direct = [];
    var activeUsers = {};
    Db.all('USERS').forEach(function (u) { if (u.trang_thai === 'Hoạt động') activeUsers[u.email] = true; });
    Db.all('USER_ROLES').forEach(function (g) {
      if (activeUsers[g.email] && activeGrant(g, today) && g.role_ma === step.vai_tro && grantMatches({ role_ma: g.role_ma, pham_vi: g.pham_vi, pham_vi_ma: g.pham_vi_ma }, step, phieu)) direct.push(g.email);
    });
    direct = Util.uniq(direct);
    var delegated = [];
    Db.all('UY_QUYEN').forEach(function (d) {
      if (d.hieu_luc_tu <= today && d.hieu_luc_den >= today && (!d.loai_phieu || d.loai_phieu === phieu.loai_phieu) &&
        direct.indexOf(d.tu_email) >= 0 && activeUsers[d.den_email]) delegated.push({ email: d.den_email, from: d.tu_email });
    });
    return { direct: direct.filter(function (e) { return e !== phieu.nguoi_tao; }),
      delegated: delegated.filter(function (d) { return d.email !== phieu.nguoi_tao; }) };
  }

  /** Quyền xử lý của user với bước hiện tại: { ok, mode: 'truc_tiep'|'uy_quyen'|'admin', from } */
  function authority(user, phieu) {
    if (phieu.trang_thai !== 'Đang duyệt' || user.email === phieu.nguoi_tao) return { ok: false };
    var step = parse(phieu.quy_trinh, [])[phieu.buoc_hien_tai - 1];
    if (!step) return { ok: false };
    var a = approvers(step, phieu);
    if (a.direct.indexOf(user.email) >= 0) return { ok: true, mode: 'truc_tiep', step: step };
    var d = a.delegated.filter(function (x) { return x.email === user.email; })[0];
    if (d) return { ok: true, mode: 'uy_quyen', from: d.from, step: step };
    if (user.isAdmin) return { ok: true, mode: 'admin', step: step };
    return { ok: false };
  }

  function log(phieu, buoc, action, email, note) {
    Db.insertMany('PHIEU_LOG', [{ ma_phieu: phieu.ma_phieu, buoc: buoc, hanh_dong: action, email: email, ghi_chu: note || '', ts: Util.nowIso() }], email);
  }

  function notifyStep(phieu, stepNo) {
    var step = parse(phieu.quy_trinh, [])[stepNo - 1];
    var a = approvers(step, phieu);
    var to = a.direct.concat(a.delegated.map(function (d) { return d.email; }));
    Notify.queue({ to: to, title: 'Phiếu chờ ' + step.hanh_dong.toLowerCase() + ': ' + phieu.tieu_de,
      body: phieu.ma_phieu + ' · ' + step.ten_buoc + '. Vui lòng xử lý trong mục Phiếu duyệt.', link: 'phieu', type: 'Phiếu duyệt' });
    return to.length;
  }

  /** Tạo & gửi phiếu. o = { loai, tieu_de, truong_ma, chi_nhanh_ma, ky_ma, payload }. Gọi trong Db.tx(). */
  function create(user, o) {
    var chain = steps(o.loai, o.truong_ma || '');
    chain.forEach(function (s) {
      if (s.pham_vi === 'Cùng trường' && !o.truong_ma) throw new AppError('BAD_REQUEST', 'Bước "' + s.ten_buoc + '" cần phiếu gắn với một trường');
    });
    var n = Db.all('PHIEU').length + 1;
    var row = { ma_phieu: 'PH-' + Util.todayIso().slice(0, 4) + '-' + pad(n, 4), loai_phieu: o.loai, tieu_de: o.tieu_de,
      chi_nhanh_ma: o.chi_nhanh_ma || '', truong_ma: o.truong_ma || '', ky_ma: o.ky_ma || '', nguoi_tao: user.email,
      trang_thai: 'Đang duyệt', buoc_hien_tai: 1, so_buoc: chain.length, quy_trinh: JSON.stringify(chain), noi_dung: JSON.stringify(o.payload || {}) };
    var ins = Db.insertMany('PHIEU', [row], user.email)[0];
    log(ins, 0, 'Gửi', user.email, '');
    var cnt = notifyStep(ins, 1);
    Audit.log(user, 'TAO_PHIEU', 'PHIEU', ins.ma_phieu, { loai: o.loai, so_buoc: chain.length, nguoi_duyet_buoc_1: cnt });
    return ins;
  }

  function setStatus(phieu, status, extra) {
    var patch = { trang_thai: status };
    Object.keys(extra || {}).forEach(function (k) { patch[k] = extra[k]; });
    Db.updateMany('PHIEU', [{ id: phieu.id, patch: patch }], 'system');
  }

  APPLY['Khai báo'] = {
    approve: function (p) { setLines('KHAI_BAO', p.ma_phieu, 'Chờ duyệt', 'Đã duyệt'); },
    revert: function (p) { setLines('KHAI_BAO', p.ma_phieu, 'Chờ duyệt', 'Nháp', true); }
  };
  APPLY['Quyết toán kỳ'] = {
    approve: function (p) { setLines('QUYET_TOAN', p.ma_phieu, 'Chờ chốt', 'Đã chốt'); setLines('THU_NHAP_MOI', p.ma_phieu, 'Chờ chốt', 'Đã chốt'); },
    revert: function (p) { setLines('QUYET_TOAN', p.ma_phieu, 'Chờ chốt', 'Tạm tính', true); setLines('THU_NHAP_MOI', p.ma_phieu, 'Chờ chốt', 'Tạm tính', true); }
  };
  APPLY['Đề xuất ngạch'] = {
    approve: function (p) {
      var d = parse(p.noi_dung, {}), vals = d.row;
      var res = Validate.rows('QUA_TRINH_NGACH', [{ n: 1, vals: vals }], {}, { mode: 'insert', autoClose: true });
      if (!res.ok) throw new AppError('VALIDATION', 'Không áp dụng được đề xuất ngạch: ' + res.errors[0].msg, res.errors);
      Db.updateMany('QUA_TRINH_NGACH', res.closes.map(function (c) { return { id: c.id, patch: { hieu_luc_den: c.den } }; }), 'system');
      var row = {};
      SCHEMA.QUA_TRINH_NGACH.cols.forEach(function (c) { row[c.k] = res.rows[0][c.k]; });
      Db.insertMany('QUA_TRINH_NGACH', [row], p.nguoi_tao);
    },
    revert: function () {}
  };
  APPLY['Khác'] = { approve: function () {}, revert: function () {} };

  /** Đổi trạng thái các dòng gắn với phiếu; clearLink=true thì gỡ liên kết phiếu (khi trả lại/hủy). */
  function setLines(table, maPhieu, from, to, clearLink) {
    var ups = Db.filter(table, function (r) { return r.phieu_ma === maPhieu && r.trang_thai === from; }).map(function (r) {
      return { id: r.id, patch: clearLink ? { trang_thai: to, phieu_ma: '' } : { trang_thai: to } };
    });
    Db.updateMany(table, ups, 'system');
  }

  /** action: 'Duyệt' | 'Trả lại'. Gọi trong Db.tx(). */
  function act(user, id, action, note) {
    var p = Db.get('PHIEU', id);
    if (!p) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu');
    var au = authority(user, p);
    if (!au.ok) throw new AppError('FORBIDDEN', p.trang_thai !== 'Đang duyệt' ? 'Phiếu không còn ở trạng thái chờ duyệt' : (user.email === p.nguoi_tao ? 'Không được duyệt phiếu do chính mình tạo' : 'Bạn không phải người xử lý bước hiện tại'));
    if ((au.mode === 'admin' || action === 'Trả lại') && !note) throw new AppError('BAD_REQUEST', au.mode === 'admin' && action === 'Duyệt' ? 'Duyệt thay cần ghi rõ lý do' : 'Trả lại cần ghi rõ lý do');
    var label = action + (au.mode === 'uy_quyen' ? ' (ủy quyền bởi ' + au.from + ')' : (au.mode === 'admin' ? ' (duyệt thay)' : ''));

    if (action === 'Trả lại') {
      APPLY[p.loai_phieu].revert(p);
      log(p, p.buoc_hien_tai, label, user.email, note);
      setStatus(p, 'Trả lại');
      Notify.queue({ to: [p.nguoi_tao], title: 'Phiếu bị trả lại: ' + p.tieu_de, body: p.ma_phieu + ': ' + note, link: 'phieu', type: 'Phiếu duyệt' });
    } else if (action === 'Duyệt') {
      if (p.buoc_hien_tai >= p.so_buoc) {
        APPLY[p.loai_phieu].approve(p); // lỗi ở đây thì phiếu giữ nguyên ở bước cuối
        log(p, p.buoc_hien_tai, label, user.email, note);
        setStatus(p, 'Đã duyệt');
        Notify.queue({ to: [p.nguoi_tao], title: 'Phiếu đã được duyệt: ' + p.tieu_de, body: p.ma_phieu, link: 'phieu', type: 'Phiếu duyệt' });
      } else {
        log(p, p.buoc_hien_tai, label, user.email, note);
        setStatus(p, 'Đang duyệt', { buoc_hien_tai: p.buoc_hien_tai + 1 });
        var next = Db.get('PHIEU', id);
        notifyStep(next, next.buoc_hien_tai);
      }
    } else throw new AppError('BAD_REQUEST', 'Hành động không hợp lệ');
    Audit.log(user, 'XU_LY_PHIEU', 'PHIEU', p.ma_phieu, { hanh_dong: label, buoc: p.buoc_hien_tai });
    return Db.get('PHIEU', id);
  }

  function cancel(user, id) {
    var p = Db.get('PHIEU', id);
    if (!p) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu');
    if (p.nguoi_tao !== user.email && !user.isAdmin) throw new AppError('FORBIDDEN', 'Chỉ người tạo mới hủy được phiếu');
    if (p.trang_thai !== 'Đang duyệt') throw new AppError('STATE', 'Chỉ hủy được phiếu đang chờ duyệt');
    APPLY[p.loai_phieu].revert(p);
    log(p, p.buoc_hien_tai, 'Hủy', user.email, '');
    setStatus(p, 'Đã hủy');
    Audit.log(user, 'HUY_PHIEU', 'PHIEU', p.ma_phieu, {});
  }

  return { steps: steps, create: create, act: act, cancel: cancel, authority: authority, approvers: approvers, parse: parse };
})();


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
        if (add.length || n.quyTrinh || ups.length || newRoles.length) Audit.log(null, 'NANG_CAP', '', '', n);
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

/** Chạy lại sau khi cập nhật mã nguồn có thêm bảng/cột/quyền mới (thêm sheet/cột, nâng cấp dữ liệu mặc định; không xóa dữ liệu). */
function setupEnsureSheets() {
  setupAssertOwner_();
  Logger.log('Sheet: ' + JSON.stringify(Db.ensureSheets()));
  Logger.log('Nâng cấp: ' + JSON.stringify(Seed.upgrade()));
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

  /**
   * Bản Nháp sửa tự do. Bản đã Ban hành khóa hoàn toàn, TRỪ việc thêm mới LCB/LTB cho chi nhánh chưa có
   * (chi nhánh mở sau khi ban hành): chỉ thêm, không sửa/xóa nên không làm đổi kết quả cũ.
   */
  function dean(ma) {
    var d = ma && Db.find('DEAN', function (x) { return x.ma === ma; });
    if (!d) throw new AppError('NOT_FOUND', 'Không tìm thấy đề án');
    return d;
  }
  function assertDeanWritable(table, ma, appendOnly) {
    var d = dean(ma);
    if (d.trang_thai === 'Nháp') return;
    if (appendOnly && table === 'DEAN_THAMSO' && d.trang_thai === 'Ban hành') return;
    throw new AppError('LOCKED', 'Đề án đã ban hành nên không thể sửa. Hãy nhân bản thành phiên bản mới rồi chỉnh sửa.' +
      (table === 'DEAN_THAMSO' ? ' (Riêng LCB/LTB của chi nhánh mới thì được thêm mới.)' : ''));
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

  function labelOf(r) {
    if (r.hoc_ky) return (r.loai || 'Học kỳ') + ' · ' + Util.displayDate(r.tu_ngay) + (r.den_ngay !== r.tu_ngay ? ' – ' + Util.displayDate(r.den_ngay) : '');
    return r.ten || r.ho_ten || r.ma || '';
  }

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
    if (T.ctx) assertDeanWritable(p.table, ctx[T.ctx], !p.id);
    return ctx;
  }

  function validationError(res, headline) {
    return new AppError('VALIDATION', headline || (res.errors[0].msg + (res.errors.length > 1 ? ' (và ' + (res.errors.length - 1) + ' lỗi khác)' : '')), res.errors);
  }

  function stepOf(p) { return Workflow.parse(p.quy_trinh, [])[p.buoc_hien_tai - 1] || null; }

  function phieuRow(p, user) {
    var st = stepOf(p), au = user ? Workflow.authority(user, p) : { ok: false };
    return { id: p.id, ma: p.ma_phieu, loai: p.loai_phieu, tieu_de: p.tieu_de, truong: p.truong_ma, ky: p.ky_ma, nguoi_tao: p.nguoi_tao,
      trang_thai: p.trang_thai, buoc: p.buoc_hien_tai, so_buoc: p.so_buoc, buoc_ten: p.trang_thai === 'Đang duyệt' && st ? st.ten_buoc : '',
      at: p.created_at, can_act: !!au.ok };
  }

  function canSee(user, p) {
    if (user.isAdmin || p.nguoi_tao === user.email) return true;
    if (Auth.canRow(user, 'phieu.view', { cn: p.chi_nhanh_ma, tr: p.truong_ma })) return true;
    return Workflow.parse(p.quy_trinh, []).some(function (st) {
      var a = Workflow.approvers(st, p);
      return a.direct.indexOf(user.email) >= 0 || a.delegated.some(function (d) { return d.email === user.email; });
    });
  }

  function staffName() {
    var m = {};
    Db.all('NHAN_SU').forEach(function (s) { m[s.ma_nv] = s.ho_ten; });
    return m;
  }

  function phieuItems(p) {
    var names = staffName(), rows = [], head = [];
    if (p.loai_phieu === 'Khai báo') {
      head = ['Mã NV', 'Họ tên', 'Loại', 'Nội dung', 'Số lượng', 'Thời gian'];
      rows = Db.filter('KHAI_BAO', function (r) { return r.phieu_ma === p.ma_phieu; }).map(function (r) {
        return [r.ma_nv, names[r.ma_nv] || '', r.loai, r.noi_dung, r.so_luong + ' ' + r.don_vi + (r.dac_thu === 'Có' ? ' (đặc thù)' : ''), Util.displayDate(r.tu_ngay) + ' – ' + Util.displayDate(r.den_ngay)];
      });
    } else if (p.loai_phieu === 'Quyết toán kỳ') {
      head = ['Mã NV', 'Họ tên', 'Thu nhập hiện tại', 'Mức chính thức', 'Ghi chú'];
      var money = function (v) { return v === '' ? '' : Number(v).toLocaleString('vi-VN'); };
      rows = Db.filter('THU_NHAP_MOI', function (r) { return r.phieu_ma === p.ma_phieu; }).map(function (r) {
        return [r.ma_nv, names[r.ma_nv] || '', money(r.thu_nhap_hien_tai), money(r.chinh_thuc), r.ghi_chu];
      });
    } else if (p.loai_phieu === 'Đề xuất ngạch') {
      var d = Workflow.parse(p.noi_dung, {}).row || {};
      head = ['Mã NV', 'Họ tên', 'Ngạch đề xuất', 'Hiệu lực từ', 'Số quyết định', 'Lý do'];
      rows = [[d.ma_nv, names[d.ma_nv] || '', d.ngach_ma, d.hieu_luc_tu, d.so_quyet_dinh || '', d.ly_do || '']];
    } else {
      head = ['Nội dung'];
      rows = [[Workflow.parse(p.noi_dung, {}).noi_dung || '']];
    }
    return { head: head, rows: rows.slice(0, 500), total: rows.length };
  }

  function pendingFor(user) {
    return Db.filter('PHIEU', function (p) { return p.trang_thai === 'Đang duyệt'; })
      .filter(function (p) { var a = Workflow.authority(user, p); return a.ok && a.mode !== 'admin'; });
  }

  function findKy(ma, needOpen) {
    var ky = Db.find('KY_LUONG', function (k) { return k.ma === ma; });
    if (!ky) throw new AppError('NOT_FOUND', 'Không tìm thấy kỳ ' + ma);
    if (needOpen && ky.trang_thai !== 'Mở') throw new AppError('LOCKED', 'Kỳ ' + ma + ' đã chốt');
    return ky;
  }
  function findTruong(ma) {
    var t = Db.find('TRUONG', function (x) { return x.ma === ma; });
    if (!t) throw new AppError('NOT_FOUND', 'Chọn trường hợp lệ');
    return t;
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
        pending: pendingFor(user).length,
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
      if (p.table === 'NGACH_DM') rows = Policy.decorateNgach(rows);
      var locked = false, appendOnly = false;
      if (T.ctx) {
        var d = Db.find('DEAN', function (x) { return x.ma === ctx[T.ctx]; });
        locked = !d || d.trang_thai !== 'Nháp';
        appendOnly = locked && !!d && p.table === 'DEAN_THAMSO' && d.trang_thai === 'Ban hành';
      }
      return { rows: rows.map(function (r) { return pickClient(T, r); }), total: total, page: page, pageSize: PAGE, locked: locked, appendOnly: appendOnly };
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
        if (old && T.guard) { var gm = T.guard(old); if (gm) throw new AppError('LOCKED', gm); }
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
        if (T.ctx) assertDeanWritable(p.table, ctx[T.ctx], false);
        var row = Db.get(p.table, p.id);
        if (!row || (T.ctx && row[T.ctx] !== ctx[T.ctx])) throw new AppError('NOT_FOUND', 'Không tìm thấy bản ghi');
        var sf = Auth.scopeFn(p.table);
        if (sf && !Auth.canRow(user, T.perm.w, sf(row))) throw new AppError('FORBIDDEN', 'Bản ghi nằm ngoài phạm vi dữ liệu của bạn');
        if (T.guard) { var gm = T.guard(row); if (gm) throw new AppError('LOCKED', gm); }

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
        truncated: !!res.truncated, locked: T.ctx ? (function () {
          var d = Db.find('DEAN', function (x) { return x.ma === p.ctx[T.ctx]; });
          if (!d) return true;
          return d.trang_thai !== 'Nháp' && !(p.table === 'DEAN_THAMSO' && d.trang_thai === 'Ban hành' && (p.mode || 'insert') === 'insert');
        })() : false };
    },

    importCommit: function (p, user) {
      var T = table(p.table);
      Auth.require(user, T.perm.i || T.perm.w);
      var res, ins = 0, upd = 0;
      Db.tx(function () {
        if (T.ctx) assertDeanWritable(p.table, (p.ctx || {})[T.ctx], (p.mode || 'insert') === 'insert');
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
    },

    'khaibao.submit': function (p, user) {
      Auth.require(user, 'phieu.create');
      var out;
      Db.tx(function () {
        var ky = findKy(p.ky_ma, true), tr = findTruong(p.truong_ma), staff = {};
        Db.all('NHAN_SU').forEach(function (s) { if (s.truong_ma === tr.ma) staff[s.ma_nv] = s; });
        var lines = Db.filter('KHAI_BAO', function (r) {
          var s = staff[r.ma_nv];
          return r.ky_ma === ky.ma && r.trang_thai === 'Nháp' && s && Auth.canRow(user, 'declare.edit', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv });
        });
        if (!lines.length) throw new AppError('EMPTY', 'Không có dòng khai báo nào ở trạng thái Nháp của trường này trong kỳ ' + ky.ma);
        var ph = Workflow.create(user, { loai: 'Khai báo', tieu_de: 'Khai báo giảng dạy ' + ky.ma + ' · ' + tr.ten + ' (' + lines.length + ' dòng)',
          truong_ma: tr.ma, chi_nhanh_ma: tr.chi_nhanh_ma, ky_ma: ky.ma, payload: { lines: lines.length } });
        Db.updateMany('KHAI_BAO', lines.map(function (l) { return { id: l.id, patch: { trang_thai: 'Chờ duyệt', phieu_ma: ph.ma_phieu } }; }), user.email);
        out = { ma_phieu: ph.ma_phieu, lines: lines.length };
      });
      return out;
    },

    'ngach.propose': function (p, user) {
      Auth.require(user, 'phieu.create');
      var out;
      Db.tx(function () {
        var s = Db.find('NHAN_SU', function (x) { return x.ma_nv === p.ma_nv; });
        if (!s) throw new AppError('NOT_FOUND', 'Không tìm thấy nhân sự ' + p.ma_nv);
        if (!Auth.canRow(user, 'staff.view', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv })) throw new AppError('FORBIDDEN', 'Nhân sự nằm ngoài phạm vi của bạn');
        var vals = { ma_nv: p.ma_nv, ngach_ma: p.ngach_ma || '', hieu_luc_tu: p.hieu_luc_tu || '', hieu_luc_den: '', so_quyet_dinh: p.so_quyet_dinh || '', ly_do: p.ly_do || '' };
        var res = Validate.rows('QUA_TRINH_NGACH', [{ n: 1, vals: vals }], {}, { mode: 'insert', autoClose: true });
        if (!res.ok) throw validationError(res);
        var ng = Db.find('NGACH_DM', function (n) { return n.ma === vals.ngach_ma; });
        var ph = Workflow.create(user, { loai: 'Đề xuất ngạch', tieu_de: 'Đề xuất ngạch ' + ng.ten + ' cho ' + s.ho_ten + ' (' + s.ma_nv + ')',
          truong_ma: s.truong_ma, chi_nhanh_ma: s.chi_nhanh_ma, payload: { row: vals } });
        out = { ma_phieu: ph.ma_phieu };
      });
      return out;
    },

    'phieu.other': function (p, user) {
      Auth.require(user, 'phieu.create');
      if (!p.tieu_de || !p.noi_dung) throw new AppError('BAD_REQUEST', 'Nhập tiêu đề và nội dung');
      var out;
      Db.tx(function () {
        var tr = p.truong_ma ? findTruong(p.truong_ma) : null;
        var ph = Workflow.create(user, { loai: 'Khác', tieu_de: p.tieu_de, truong_ma: tr ? tr.ma : '', chi_nhanh_ma: tr ? tr.chi_nhanh_ma : '', payload: { noi_dung: p.noi_dung } });
        out = { ma_phieu: ph.ma_phieu };
      });
      return out;
    },

    'calc.run': function (p, user) {
      Auth.require(user, 'calc.run');
      var out;
      Db.tx(function () { out = Calc.run(user, p.ky_ma, p.truong_ma || '', p.gom); });
      return out;
    },

    tonghop: function (p, user) {
      Auth.require(user, 'calc.view');
      return Report.summary(user, p.ky_ma, p.group);
    },

    'tonghop.export': function (p, user) {
      Auth.require(user, 'calc.view');
      return Report.exportTable(user, p.ky_ma, p.bang);
    },

    'phutroi.chitiet': function (p, user) {
      Auth.require(user, 'calc.view');
      return Report.ptDetail(user, p.ky_ma, p.ma_nv);
    },

    'quyettoan.submit': function (p, user) {
      Auth.require(user, 'phieu.create');
      var out;
      Db.tx(function () {
        var ky = findKy(p.ky_ma, true), tr = findTruong(p.truong_ma), staff = {};
        Db.all('NHAN_SU').forEach(function (s) { if (s.truong_ma === tr.ma) staff[s.ma_nv] = s; });
        var mine = function (r) {
          var s = staff[r.ma_nv];
          return r.ky_ma === ky.ma && r.trang_thai === 'Tạm tính' && s && Auth.canRow(user, 'calc.run', { cn: s.chi_nhanh_ma, tr: s.truong_ma, nv: s.ma_nv });
        };
        var inc = Db.filter('THU_NHAP_MOI', mine), qt = Db.filter('QUYET_TOAN', mine);
        if (!inc.length) throw new AppError('EMPTY', 'Chưa có kết quả tạm tính của trường này. Hãy bấm "Tính toán" trước.');
        if (inc.concat(qt).some(function (r) { return r.nguon === 'Gồm dòng chưa duyệt'; })) {
          throw new AppError('UNAPPROVED', 'Kết quả đang gồm dòng khai báo CHƯA duyệt (chế độ tính thử). Hãy duyệt hết khai báo rồi bấm "Tính toán" với chế độ "Chỉ dòng đã duyệt" trước khi gửi chốt.');
        }
        var ph = Workflow.create(user, { loai: 'Quyết toán kỳ', tieu_de: 'Quyết toán & thu nhập mới ' + ky.ma + ' · ' + tr.ten + ' (' + inc.length + ' nhân sự)',
          truong_ma: tr.ma, chi_nhanh_ma: tr.chi_nhanh_ma, ky_ma: ky.ma, payload: { nhan_su: inc.length } });
        var patch = function (r) { return { id: r.id, patch: { trang_thai: 'Chờ chốt', phieu_ma: ph.ma_phieu } }; };
        Db.updateMany('THU_NHAP_MOI', inc.map(patch), user.email);
        Db.updateMany('QUYET_TOAN', qt.map(patch), user.email);
        out = { ma_phieu: ph.ma_phieu, nhan_su: inc.length };
      });
      return out;
    },

    'phieu.list': function (p, user) {
      var rows = Db.all('PHIEU'), tab = p.tab || 'cho_toi';
      if (tab === 'cho_toi') rows = pendingFor(user);
      else if (tab === 'cua_toi') rows = rows.filter(function (x) { return x.nguoi_tao === user.email; });
      else {
        Auth.require(user, 'phieu.view');
        rows = rows.filter(function (x) { return Auth.canRow(user, 'phieu.view', { cn: x.chi_nhanh_ma, tr: x.truong_ma }); });
      }
      rows = rows.slice().reverse().slice(0, 300);
      return { rows: rows.map(function (x) { return phieuRow(x, user); }) };
    },

    'phieu.get': function (p, user) {
      var ph = Db.get('PHIEU', p.id);
      if (!ph || !canSee(user, ph)) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu hoặc bạn không có quyền xem');
      var au = Workflow.authority(user, ph), chain = Workflow.parse(ph.quy_trinh, []);
      var logs = Db.filter('PHIEU_LOG', function (l) { return l.ma_phieu === ph.ma_phieu; })
        .map(function (l) { return { buoc: l.buoc, hanh_dong: l.hanh_dong, email: l.email, ghi_chu: l.ghi_chu, ts: l.ts }; });
      return { phieu: phieuRow(ph, user), steps: chain, log: logs, items: phieuItems(ph),
        can_act: !!au.ok, act_mode: au.ok ? au.mode : '', can_cancel: ph.trang_thai === 'Đang duyệt' && (ph.nguoi_tao === user.email || user.isAdmin) };
    },

    'phieu.act': function (p, user) {
      var out;
      Db.tx(function () { out = phieuRow(Workflow.act(user, p.id, p.action, p.note || ''), user); });
      return out;
    },

    'phieu.cancel': function (p, user) {
      Db.tx(function () { Workflow.cancel(user, p.id); });
      return {};
    }
  };

  return { handlers: handlers, table: table };
})();
