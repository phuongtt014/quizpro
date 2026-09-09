/**
 * Code.gs
 * Điểm vào Web App - kiến trúc form HTML thuần + doGet()/doPost(), KHÔNG dùng
 * google.script.run (một số mạng nội bộ/trường học chặn kênh RPC này khiến
 * trang treo vô thời hạn dù nội dung tĩnh vẫn tải được bình thường).
 * Mỗi thao tác là 1 <form method="POST"> gửi thẳng lên doPost(), xử lý xong
 * sẽ điều hướng (redirect kiểu GET) sang trang kết quả.
 */

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  return handleRequest_(e, {});
}

function doPost(e) {
  var flash = null;
  var forcePage = (e.parameter.returnPage) || 'form';
  var extraParams = {};

  try {
    var result = xuLyAction_(e);
    if (result && result.directHtml) {
      // Một số action (Tra cứu) cần render trực tiếp, không redirect, để
      // tránh đưa Mã xác nhận lên URL lịch sử trình duyệt.
      return renderShell_(getCurrentUser_(), forcePage, result.directHtml, null);
    }
    flash = (result && result.flash) || null;
    extraParams = (result && result.redirectParams) || {};
  } catch (err) {
    flash = { type: 'error', msg: err.message };
    extraParams = {};
    // Nếu action gắn với 1 công việc cụ thể, giữ lại id để quay về đúng trang chi tiết
    if (e.parameter.id) extraParams.id = e.parameter.id;
  }

  var redirectUrl = linkTo_(forcePage, extraParams);
  return renderRedirect_(redirectUrl, flash);
}

function handleRequest_(e, opts) {
  opts = opts || {};
  khoiTaoDuLieuMau();
  var user = getCurrentUser_();
  var params = (e && e.parameter) || {};
  var page = params.page || 'form';

  // Toggle trạng thái Thiết lập đi qua GET link (không phá huỷ dữ liệu, chỉ Admin thấy link)
  if (page === 'thietlap' && params.view === 'toggle') {
    try {
      xuLyToggleThietLap_(user, params);
    } catch (err) {
      return renderShell_(user, 'thietlap', '<div class="card"><p style="color:#D85A30">' + escHtml_(err.message) + '</p></div>', null);
    }
    var target = linkTo_('thietlap');
    return renderRedirect_(target, { type: 'ok', msg: 'Đã cập nhật.' });
  }

  var content;
  try {
    content = buildPageContent_(page, user, params);
  } catch (err) {
    content = '<div class="card"><p style="color:#D85A30"><b>Lỗi:</b> ' + escHtml_(err.message) + '</p></div>';
  }
  return renderShell_(user, page, content, null);
}

function buildPageContent_(page, user, params) {
  switch (page) {
    case 'form': return pageForm_(user, params);
    case 'tiepnhan': return pageTiepNhan_(user, params);
    case 'tracuu': return pageTraCuu_(user, params, null);
    case 'congviec': return pageCongViec_(user, params);
    case 'diem': return pageDiem_(user, params);
    case 'baocao': return pageBaoCao_(user, params);
    case 'thietlap': return pageThietLap_(user, params);
    default: return pageForm_(user, params);
  }
}

function renderShell_(user, page, content, flash) {
  var tpl = HtmlService.createTemplateFromFile('Layout');
  tpl.navHtml = renderNav_(user, page);
  tpl.flashHtml = renderFlash_(flash);
  tpl.content = content;
  return tpl.evaluate()
    .setTitle('Quản lý công việc nhóm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Bảng định tuyến các action POST -> hàm xử lý tương ứng (trong các file PageXxx.gs) */
function xuLyAction_(e) {
  var action = e.parameter.action;
  switch (action) {
    case 'submitHoSo': return doPostSubmitHoSo_(e);
    case 'traCuuHoSo': return doPostTraCuuHoSo_(e);
    case 'guiTinTraCuu': return doPostGuiTinTraCuu_(e);
    case 'assignHoSo': return doPostAssignHoSo_(e);
    case 'rejectHoSo': return doPostRejectHoSo_(e);
    case 'capNhatTrangThaiCongViec': return doPostCapNhatTrangThaiCongViec_(e);
    case 'suaThoiGianHoanThanh': return doPostSuaThoiGianHoanThanh_(e);
    case 'danhGiaTDV': return doPostDanhGiaTDV_(e);
    case 'guiChatCongViec': return doPostGuiChatCongViec_(e);
    case 'taoPhieuDiem': return doPostTaoPhieuDiem_(e);
    case 'duyetPhieuDiem': return doPostDuyetPhieuDiem_(e);
    case 'tuChoiPhieuDiem': return doPostTuChoiPhieuDiem_(e);
    case 'upsertDonVi': return doPostUpsertDonVi_(e);
    case 'upsertPhanMuc': return doPostUpsertPhanMuc_(e);
    case 'upsertMaDiem': return doPostUpsertMaDiem_(e);
    case 'upsertNhanSu': return doPostUpsertNhanSu_(e);
    default: throw new Error('Hành động không hợp lệ: ' + action);
  }
}
