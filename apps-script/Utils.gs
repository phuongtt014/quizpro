/**
 * Utils.gs — Hàm tiện ích dùng chung toàn hệ thống.
 */

function nowStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

function pad_(num, len) {
  var s = String(num);
  while (s.length < len) s = '0' + s;
  return s;
}

/** Sinh mã dạng PREFIX-00001 dựa trên bộ đếm trong sheet Counters. */
function genCode_(prefix, len) {
  var seq = getNextSeq_(prefix);
  return prefix + '-' + pad_(seq, len || 5);
}

/** Sinh mã xác nhận 6 chữ số ngẫu nhiên. */
function genConfirmCode_() {
  return pad_(Math.floor(Math.random() * 1000000), 6);
}

/** Băm mật khẩu bằng SHA-256 kèm salt riêng cho từng user. */
function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + ':' + salt, Utilities.Charset.UTF_8);
  return raw.map(function (b) {
    var v = b < 0 ? b + 256 : b;
    return v.toString(16).padStart(2, '0');
  }).join('');
}

function genSalt_() {
  return Utilities.getUuid();
}

/** Trích tất cả link http(s) trong 1 đoạn text. */
function extractLinks_(text) {
  if (!text) return [];
  var matches = String(text).match(/https?:\/\/[^\s,;]+/g);
  return matches || [];
}

/** Gộp danh sách link cũ + mới, loại trùng, trả về chuỗi nối bằng \n. */
function mergeLinks_(existingText, newLinks) {
  var existing = String(existingText || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  var all = existing.concat(newLinks || []);
  var seen = {};
  var out = [];
  all.forEach(function (l) {
    if (!seen[l]) { seen[l] = true; out.push(l); }
  });
  return out.join('\n');
}

/** So sánh ngày trễ hạn: trả về true nếu ngày hoàn thành (hoặc hiện tại) > thời hạn. */
function isLate_(deadline, completedAt) {
  if (!deadline) return false;
  var dl = new Date(deadline);
  var ref = completedAt ? new Date(completedAt) : new Date();
  return ref.getTime() > dl.getTime();
}

/** Trả về key kỳ báo cáo: 'YYYY-MM' cho tháng, 'YYYY-Q#' cho quý. */
function periodKey_(date, loai) {
  var d = new Date(date);
  var y = d.getFullYear();
  if (loai === 'quy') {
    var q = Math.floor(d.getMonth() / 3) + 1;
    return y + '-Q' + q;
  }
  return y + '-' + pad_(d.getMonth() + 1, 2);
}

function jsonOk_(data) {
  return Object.assign({ ok: true }, data || {});
}

function jsonErr_(message) {
  return { ok: false, message: message };
}

/** Bọc 1 hàm server để luôn trả lỗi dạng {ok:false,message} thay vì ném exception thẳng ra client. */
function safeCall_(fn) {
  try {
    return fn();
  } catch (e) {
    return jsonErr_(e && e.message ? e.message : String(e));
  }
}
