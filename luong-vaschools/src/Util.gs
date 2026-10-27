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
