/**
 * Utils.gs
 * Hàm tiện ích chung: sinh mã, định dạng ngày, validate...
 */

function pad2_(n) {
  return n < 10 ? '0' + n : String(n);
}

function todayYYYYMMDD_() {
  var d = new Date();
  return '' + d.getFullYear() + pad2_(d.getMonth() + 1) + pad2_(d.getDate());
}

/** Sinh mã hồ sơ dạng HS-YYYYMMDD-#### (số thứ tự trong ngày) */
function generateMaHoSo_() {
  var ymd = todayYYYYMMDD_();
  var prefix = 'HS-' + ymd + '-';
  var all = readAll_(SHEET_NAMES.HO_SO);
  var maxSeq = 0;
  all.forEach(function (r) {
    var ma = String(r.MaHoSo || '');
    if (ma.indexOf(prefix) === 0) {
      var seq = parseInt(ma.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  var next = maxSeq + 1;
  var seqStr = next < 10 ? '000' + next : next < 100 ? '00' + next : next < 1000 ? '0' + next : String(next);
  return prefix + seqStr;
}

/** Sinh mã xác nhận ngẫu nhiên 6 ký tự (chữ hoa + số, bỏ ký tự dễ nhầm) */
function generateMaXacNhan_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < 6; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function generateMaCongViec_() {
  var prefix = 'CV-' + todayYYYYMMDD_() + '-';
  var all = readAll_(SHEET_NAMES.CONG_VIEC);
  var maxSeq = 0;
  all.forEach(function (r) {
    var ma = String(r.MaCongViec || '');
    if (ma.indexOf(prefix) === 0) {
      var seq = parseInt(ma.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  var next = maxSeq + 1;
  var seqStr = next < 10 ? '000' + next : next < 100 ? '00' + next : next < 1000 ? '0' + next : String(next);
  return prefix + seqStr;
}

function generateMaPhieuDiem_() {
  var prefix = 'PD-' + todayYYYYMMDD_() + '-';
  var all = readAll_(SHEET_NAMES.PHIEU_DIEM);
  var maxSeq = 0;
  all.forEach(function (r) {
    var ma = String(r.MaPhieu || '');
    if (ma.indexOf(prefix) === 0) {
      var seq = parseInt(ma.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  var next = maxSeq + 1;
  var seqStr = next < 10 ? '00' + next : next < 100 ? '0' + next : String(next);
  return prefix + seqStr;
}

function nowStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

/** Tách chuỗi nhiều link (ngăn cách bởi xuống dòng hoặc dấu phẩy) thành mảng, loại bỏ rỗng */
function parseLinks_(text) {
  if (!text) return [];
  return String(text)
    .split(/[\n,;]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

function joinLinks_(arr) {
  return (arr || []).filter(function (s) { return s && String(s).trim(); }).join('\n');
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function throwIf_(cond, msg) {
  if (cond) throw new Error(msg);
}
