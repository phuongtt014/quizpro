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
