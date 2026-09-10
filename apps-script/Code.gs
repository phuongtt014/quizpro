/**
 * Code.gs — Điểm vào của Web App.
 */

function doGet() {
  _resetRequestCache_();
  ensureAllSheets_();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Quản lý công việc nhóm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Cho phép Index.html include các partial HTML/CSS/JS khác. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
