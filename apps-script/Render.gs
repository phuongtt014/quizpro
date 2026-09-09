/**
 * Render.gs
 * Hàm dựng HTML phía server cho kiến trúc "form HTML thuần + doPost()"
 * (không dùng google.script.run) - dùng khi mạng chặn kênh RPC AJAX
 * của Apps Script nhưng vẫn tải được trang/gửi được form bình thường.
 */

function escHtml_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function qs_(params) {
  var parts = [];
  Object.keys(params || {}).forEach(function (k) {
    if (params[k] === undefined || params[k] === null) return;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  });
  return parts.join('&');
}

function linkTo_(page, extra) {
  var p = Object.assign({ page: page }, extra || {});
  return getWebAppUrl_() + '?' + qs_(p);
}

function linksToHtml_(text) {
  var links = parseLinks_(text);
  if (!links.length) return '<span class="muted">(không có)</span>';
  return links.map(function (l) {
    return '<a href="' + escHtml_(l) + '" target="_blank" rel="noopener">' + escHtml_(l) + '</a>';
  }).join('<br>');
}

function pillHoSo_(status) {
  var map = { 'Mới': 'gray', 'Đã phân công': 'indigo', 'Đang xử lý': 'amber', 'Đã hoàn thành': 'teal', 'Từ chối': 'coral' };
  return '<span class="pill ' + (map[status] || 'gray') + '">' + escHtml_(status) + '</span>';
}
function pillCongViec_(status) {
  var map = { 'Cần làm': 'gray', 'Đang làm': 'indigo', 'Đã nộp': 'amber', 'TĐV xác nhận': 'teal', 'Tạm ngưng': 'coral', 'Hủy bỏ': 'coral' };
  return '<span class="pill ' + (map[status] || 'gray') + '">' + escHtml_(status) + '</span>';
}
function pillPhieu_(status) {
  var map = { 'Chờ duyệt': 'amber', 'Đã duyệt': 'teal', 'Từ chối': 'coral' };
  return '<span class="pill ' + (map[status] || 'gray') + '">' + escHtml_(status) + '</span>';
}

/** Ô input select đơn giản */
function selectHtml_(name, options, selectedValue, placeholder, extraAttr) {
  var out = '<select name="' + escHtml_(name) + '" ' + (extraAttr || '') + '>';
  if (placeholder) out += '<option value="">' + escHtml_(placeholder) + '</option>';
  options.forEach(function (o) {
    var sel = String(o.value) === String(selectedValue) ? ' selected' : '';
    out += '<option value="' + escHtml_(o.value) + '"' + sel + '>' + escHtml_(o.label) + '</option>';
  });
  out += '</select>';
  return out;
}

function hiddenInputs_(fields) {
  return Object.keys(fields || {}).map(function (k) {
    return '<input type="hidden" name="' + escHtml_(k) + '" value="' + escHtml_(fields[k]) + '">';
  }).join('');
}

/** Thanh điều hướng - chỉ hiện link mà user có quyền */
function renderNav_(user, currentPage) {
  var items = [
    { page: 'form', label: 'Gửi hồ sơ', show: true },
    { page: 'tiepnhan', label: 'Tiếp nhận', show: isTruongNhomTroLen_(user) },
    { page: 'tracuu', label: 'Tra cứu', show: true },
    { page: 'congviec', label: 'Công việc', show: user && user.trongHeThong && user.dangHoatDong },
    { page: 'diem', label: 'Điểm cộng/trừ', show: isTruongNhomTroLen_(user) },
    { page: 'baocao', label: 'Báo cáo', show: user && user.trongHeThong && user.dangHoatDong },
    { page: 'thietlap', label: 'Thiết lập', show: isAdmin_(user) }
  ];
  var tabs = items.filter(function (i) { return i.show; }).map(function (i) {
    var active = (currentPage === i.page) ? ' active' : '';
    return '<a class="tab-btn' + active + '" href="' + escHtml_(linkTo_(i.page)) + '">' + escHtml_(i.label) + '</a>';
  }).join('');

  var userBox = '';
  if (user && user.email) {
    var role = user.vaiTro ? (ROLE_LABELS[user.vaiTro] || user.vaiTro) : 'Chưa được cấp quyền nội bộ';
    userBox = '<b>' + escHtml_(user.hoTen || user.email) + '</b>' + escHtml_(role);
  } else {
    userBox = '<span class="muted">Không xác định được tài khoản</span>';
  }

  return '<div class="topbar">' +
    '<div class="topbar-brand">📋 Quản lý công việc nhóm</div>' +
    tabs +
    '<div class="userbox">' + userBox + '</div>' +
    '</div>';
}

function renderFlash_(flash) {
  if (!flash || !flash.msg) return '';
  var cls = flash.type === 'error' ? 'coral' : 'teal';
  return '<div class="card" style="border-left:4px solid var(--' + cls + ')">' + escHtml_(flash.msg) + '</div>';
}

/** Trang trung gian: xử lý xong 1 hành động POST -> điều hướng (GET) sang trang kết quả,
 * tránh việc F5 gửi lại form (resubmit) và tránh lộ dữ liệu nhạy cảm (mã xác nhận) lên URL. */
function renderRedirect_(url, flash) {
  var msg = flash ? escHtml_(flash.msg) : '';
  var html = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">' +
    '<meta http-equiv="refresh" content="0;url=' + escHtml_(url) + '">' +
    '<script>top.location.href=' + JSON.stringify(url) + ';</script>' +
    '</head><body style="font-family:sans-serif;padding:2rem">' +
    '<p>' + msg + '</p><p><a href="' + escHtml_(url) + '">Bấm vào đây nếu trang không tự chuyển...</a></p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
