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
