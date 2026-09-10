/**
 * Code.gs — Điểm vào của Web App.
 */

// Tăng số này mỗi khi đổi code, để có thể nhìn thẳng trên giao diện (góc trên sidebar) xác nhận
// trình duyệt đang thực sự chạy đúng bản mới nhất — tránh nhầm do quên "Deploy > New version"
// hoặc do trình duyệt cache lại trang cũ.
var APP_BUILD = '2026-09-10.5';

function doGet() {
  _resetRequestCache_();
  ensureAllSheets_();
  var tpl = HtmlService.createTemplateFromFile('Index');
  tpl.APP_BUILD = APP_BUILD;
  return tpl.evaluate()
    .setTitle('Quản lý công việc nhóm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Cho phép Index.html include các partial HTML/CSS/JS khác. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
