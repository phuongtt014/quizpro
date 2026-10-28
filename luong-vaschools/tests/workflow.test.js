'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { world, line, approveAll, KY, tsv, j } = require('./world');

test('Danh mục ngạch hiển thị hệ số & thâm niên theo đề án đang hiệu lực', () => {
  const { e } = world();
  const r = e.api('list', { table: 'NGACH_DM' });
  const gv3 = r.data.rows.find(x => x.ma === 'GV3');
  assert.strictEqual(gv3.hs_chuc_danh, 1.2);
  assert.strictEqual(gv3.hs_tiet, 1.3);
  assert.strictEqual(gv3.nhom_tham_nien, 'TN2');
  assert.strictEqual(gv3.vuot_khung, 'Có');
  assert.strictEqual(gv3.de_an_ap_dung, 'HP.ĐA.01');
  const ht = r.data.rows.find(x => x.ma === 'HT');
  assert.strictEqual(ht.hs_kpi, 1.8);
  assert.strictEqual(ht.nhom_tham_nien, 'TN3');
});

test('Khai báo → gửi duyệt → 3 bậc duyệt → quyết toán → thu nhập mới → chốt', () => {
  const { e } = world();
  e.as('gv.hcm@vaschools.edu.vn');
  assert.ok(e.api('save', { table: 'KHAI_BAO', row: line() }).ok);
  assert.ok(e.api('save', { table: 'KHAI_BAO', row: line({ loai: 'Trách nhiệm', noi_dung: 'Giáo viên chủ nhiệm', so_luong: '4' }) }).ok);
  // ngoài phạm vi trường, ngoài thời gian kỳ, trạng thái do hệ thống quản lý
  assert.ok(!e.api('save', { table: 'KHAI_BAO', row: line({ ma_nv: 'NV002' }) }).ok);
  assert.match(e.api('save', { table: 'KHAI_BAO', row: line({ den_ngay: '31/01/2027', noi_dung: 'x' }) }).error, /nằm trong kỳ/);
  assert.ok(!e.api('save', { table: 'KHAI_BAO', row: line({ noi_dung: 'y', trang_thai: 'Đã duyệt' }) }).ok);

  const sub = e.api('khaibao.submit', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  assert.ok(sub.ok, JSON.stringify(sub));
  assert.strictEqual(sub.data.lines, 2);
  const lineId = e.api('list', { table: 'KHAI_BAO', filter: { ky_ma: KY } }).data.rows[0].id;
  assert.strictEqual(e.api('save', { table: 'KHAI_BAO', id: lineId, row: line() }).code, 'LOCKED');
  assert.strictEqual(e.api('remove', { table: 'KHAI_BAO', id: lineId }).code, 'LOCKED');

  // Hiệu trưởng trường khác không duyệt được; người tạo không tự duyệt được
  const id = e.api('phieu.list', { tab: 'cua_toi' }).data.rows[0].id;
  assert.strictEqual(e.api('phieu.act', { id, action: 'Duyệt' }).code, 'FORBIDDEN');
  e.as('ht.hn@vaschools.edu.vn');
  assert.strictEqual(e.api('phieu.list', { tab: 'cho_toi' }).data.rows.length, 0);
  assert.strictEqual(e.api('phieu.act', { id, action: 'Duyệt' }).code, 'FORBIDDEN');
  // Hiệu trưởng đúng trường thấy phiếu chờ mình, và nhận thông báo
  e.as('ht.hcm@vaschools.edu.vn');
  assert.strictEqual(e.api('phieu.list', { tab: 'cho_toi' }).data.rows.length, 1);
  assert.ok(e.api('notify.list').data.items.some(n => /Phiếu chờ xét duyệt/.test(n.title)));
  assert.ok(e.mails.some(m => m.to === 'ht.hcm@vaschools.edu.vn'));
  // Không duyệt nhảy bậc: nhân sự/TGĐ chưa tới lượt
  e.as('tgd@vaschools.edu.vn');
  assert.strictEqual(e.api('phieu.act', { id, action: 'Duyệt' }).code, 'FORBIDDEN');
  approveAll(e, id, ['ht.hcm', 'nhansu', 'tgd']);
  const detail = e.api('phieu.get', { id }).data;
  assert.strictEqual(detail.phieu.trang_thai, 'Đã duyệt');
  assert.strictEqual(detail.log.length, 4);
  assert.strictEqual(j(e.run('Db.all("KHAI_BAO").map(function(x){return x.trang_thai;})')).join(), 'Đã duyệt,Đã duyệt');

  // Chi nhánh Hà Nội mở sau khi đề án ban hành: chưa có LCB/LTB nên bị bỏ qua kèm cảnh báo rõ
  e.as('tro.ly@vaschools.edu.vn');
  let run = e.api('calc.run', { ky_ma: KY });
  assert.ok(run.ok, JSON.stringify(run));
  assert.strictEqual(run.data.incomes, 1);
  assert.match(run.data.warnings[0], /NV002.*LCB\/LTB.*HN/);
  // Được bổ sung LCB/LTB cho chi nhánh mới ngay trên đề án đã ban hành (chỉ thêm, không sửa/xóa)
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, row: { chi_nhanh_ma: 'HN', lcb: '6000000', ltb: '100000' } }).ok);
  const hcm = e.api('list', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' } });
  assert.strictEqual(hcm.data.appendOnly, true);
  assert.strictEqual(e.api('save', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, id: hcm.data.rows[0].id, row: { chi_nhanh_ma: 'HCM', lcb: '1', ltb: '1' } }).code, 'LOCKED');
  assert.strictEqual(e.api('importCommit', { table: 'DEAN_THAMSO', ctx: { de_an_ma: 'DA01-2026' }, mode: 'upsert', text: tsv(['Chi nhánh', 'Lương cơ bản (LCB)', 'Lương tiết cơ bản (LTB)'], ['HCM', '1', '1']) }).code, 'LOCKED');
  e.as('tro.ly@vaschools.edu.vn');
  run = e.api('calc.run', { ky_ma: KY });
  assert.ok(run.ok, JSON.stringify(run));
  assert.strictEqual(run.data.incomes, 2);
  assert.strictEqual(run.data.settled, 1);
  const qt = e.api('list', { table: 'QUYET_TOAN', filter: { ky_ma: KY } }).data.rows[0];
  assert.deepStrictEqual([qt.thuc_day, qt.trach_nhiem, qt.dinh_muc, qt.pt_trach_nhiem, qt.pt_giang_day, qt.tien_pt], [352, 64, 320, 64, 32, 9920000]);
  assert.strictEqual(qt.de_an_ma, 'DA01-2026');
  const tm = e.api('list', { table: 'THU_NHAP_MOI', filter: { ky_ma: KY } }).data.rows;
  const a = tm.find(x => x.ma_nv === 'NV001'), b = tm.find(x => x.ma_nv === 'NV002');
  assert.deepStrictEqual([a.pa_moi, a.max_income, a.chinh_thuc, a.tham_nien], [16240000, 16500000, 16240000, 7]);
  assert.strictEqual(b.pa_moi, 6600000 + 840000 + 8800000); // không có phụ trội
  assert.strictEqual(b.chinh_thuc, 16240000); // thấp hơn trần 16.500.000 nên giữ nguyên phương án mới

  // Tính lại khi còn tạm tính thì thay thế, không nhân đôi
  assert.ok(e.api('calc.run', { ky_ma: KY }).ok);
  assert.strictEqual(j(e.run('Db.all("THU_NHAP_MOI").length')), 2);

  // Gửi chốt → duyệt → Đã chốt; chạy lại không ghi đè
  const q = e.api('quyettoan.submit', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  assert.ok(q.ok, JSON.stringify(q));
  const pid = e.api('phieu.list', { tab: 'cua_toi' }).data.rows.find(x => x.loai === 'Quyết toán kỳ').id;
  assert.strictEqual(j(e.run('Db.all("THU_NHAP_MOI").filter(function(x){return x.trang_thai==="Chờ chốt";}).length')), 1);
  approveAll(e, pid, ['ht.hcm', 'nhansu', 'tgd']);
  e.as('tro.ly@vaschools.edu.vn');
  const again = e.api('calc.run', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  assert.strictEqual(again.data.skippedLocked, 1);
  assert.strictEqual(j(e.run('Db.find("THU_NHAP_MOI",function(x){return x.ma_nv==="NV001";}).trang_thai')), 'Đã chốt');
});

test('Trả lại: dòng khai báo mở lại để sửa; hủy phiếu; người ngoài phiếu không xem được', () => {
  const { e } = world();
  e.as('gv.hcm@vaschools.edu.vn');
  e.api('save', { table: 'KHAI_BAO', row: line() });
  e.api('khaibao.submit', { ky_ma: KY, truong_ma: 'HCM_THPT' });
  const id = e.api('phieu.list', { tab: 'cua_toi' }).data.rows[0].id;
  e.as('ht.hcm@vaschools.edu.vn');
  assert.strictEqual(e.api('phieu.act', { id, action: 'Trả lại' }).code, 'BAD_REQUEST'); // thiếu lý do
  assert.ok(e.api('phieu.act', { id, action: 'Trả lại', note: 'Sai số tiết' }).ok);
  e.as('gv.hcm@vaschools.edu.vn');
  const row = e.api('list', { table: 'KHAI_BAO' }).data.rows[0];
  assert.strictEqual(row.trang_thai, 'Nháp');
  assert.ok(e.api('save', { table: 'KHAI_BAO', id: row.id, row: line({ so_luong: '20' }) }).ok);
  assert.ok(e.api('khaibao.submit', { ky_ma: KY, truong_ma: 'HCM_THPT' }).ok);
  const ids = e.api('phieu.list', { tab: 'cua_toi' }).data.rows;
  const open = ids.find(x => x.trang_thai === 'Đang duyệt');
  assert.ok(e.api('phieu.cancel', { id: open.id }).ok);
  assert.strictEqual(e.api('list', { table: 'KHAI_BAO' }).data.rows[0].trang_thai, 'Nháp');
  e.as('ht.hn@vaschools.edu.vn');
  assert.strictEqual(e.api('phieu.get', { id: open.id }).code, 'NOT_FOUND');
});

test('Quy trình tùy biến theo trường; thiếu/đứt bước báo lỗi rõ; ủy quyền; admin duyệt thay', () => {
  const { e } = world();
  // Quy trình riêng cho HN_THPT: chỉ 2 bước (Hiệu trưởng -> Tổng giám đốc)
  assert.ok(e.api('importCommit', { table: 'WORKFLOW_STEP', mode: 'insert', text: tsv(
    ['Loại phiếu', 'Trường (trống = mặc định)', 'Bước số', 'Tên bước', 'Hành động', 'Vai trò xử lý', 'Phạm vi người duyệt'],
    ['Khai báo', 'HN_THPT', '1', 'HT xét duyệt', 'Xét duyệt', 'PRINCIPAL', 'Cùng trường'],
    ['Khai báo', 'HN_THPT', '2', 'TGĐ phê duyệt', 'Phê duyệt', 'CEO', 'Toàn hệ thống']) }).ok);
  assert.strictEqual(j(e.run('Workflow.steps("Khai báo","HN_THPT").length')), 2);
  assert.strictEqual(j(e.run('Workflow.steps("Khai báo","HCM_THPT").length')), 3);

  // Người đề xuất của HN: thêm vai trò
  e.as('admin@vaschools.edu.vn');
  e.api('importCommit', { table: 'USERS', text: tsv(['Email', 'Họ tên'], ['gv.hn@vaschools.edu.vn', 'GV HN']) });
  e.api('importCommit', { table: 'USER_ROLES', text: tsv(['Email', 'Vai trò', 'Phạm vi dữ liệu', 'Mã chi nhánh/trường'], ['gv.hn@vaschools.edu.vn', 'PROPOSER', 'Trường', 'HN_THPT']) });
  e.as('gv.hn@vaschools.edu.vn');
  assert.ok(e.api('save', { table: 'KHAI_BAO', row: line({ ma_nv: 'NV002' }) }).ok);
  assert.ok(e.api('khaibao.submit', { ky_ma: KY, truong_ma: 'HN_THPT' }).ok);
  const id = e.api('phieu.list', { tab: 'cua_toi' }).data.rows[0].id;
  assert.strictEqual(e.api('phieu.get', { id }).data.steps.length, 2);

  // Ủy quyền: Hiệu trưởng HN ủy quyền cho trợ lý; admin duyệt thay cần lý do
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('save', { table: 'UY_QUYEN', row: { tu_email: 'ht.hn@vaschools.edu.vn', den_email: 'tro.ly@vaschools.edu.vn', loai_phieu: '',
    hieu_luc_tu: '01/01/2020', hieu_luc_den: '31/12/2099', ly_do: 'Đi công tác' } }).ok);
  assert.strictEqual(e.api('phieu.act', { id, action: 'Duyệt' }).code, 'BAD_REQUEST');
  e.as('tro.ly@vaschools.edu.vn');
  assert.ok(e.api('phieu.act', { id, action: 'Duyệt' }).ok);
  assert.match(j(e.api('phieu.get', { id }).data.log).map(l => l.hanh_dong).join('|'), /ủy quyền bởi ht\.hn@/);
  e.as('admin@vaschools.edu.vn');
  assert.ok(e.api('phieu.act', { id, action: 'Duyệt', note: 'TGĐ đi vắng, CEO ủy thác bằng văn bản' }).ok);
  assert.strictEqual(e.api('phieu.get', { id }).data.phieu.trang_thai, 'Đã duyệt');
  assert.match(j(e.api('phieu.get', { id }).data.log).map(l => l.hanh_dong).join('|'), /duyệt thay/);

  // Cấu hình hỏng: bỏ bước 2 mặc định của "Khác" → báo lỗi rõ
  const step2 = j(e.run('Db.find("WORKFLOW_STEP",function(x){return x.loai_phieu==="Khác"&&x.thu_tu===2;}).id'));
  assert.ok(e.api('remove', { table: 'WORKFLOW_STEP', id: step2 }).ok);
  e.as('gv.hcm@vaschools.edu.vn');
  const bad = e.api('phieu.other', { tieu_de: 'Xin xe', noi_dung: 'Cần xe đi sự kiện', truong_ma: 'HCM_THPT' });
  assert.strictEqual(bad.code, 'BAD_WORKFLOW');
  assert.match(bad.error, /liên tục/);
});

test('Đề xuất ngạch: duyệt xong tự đóng ngạch cũ và mở ngạch mới', () => {
  const { e } = world();
  e.as('gv.hcm@vaschools.edu.vn');
  const bad = e.api('ngach.propose', { ma_nv: 'NV001', ngach_ma: 'GV9', hieu_luc_tu: '01/03/2027' });
  assert.strictEqual(bad.code, 'VALIDATION');
  assert.strictEqual(e.api('ngach.propose', { ma_nv: 'NV002', ngach_ma: 'GV3', hieu_luc_tu: '01/03/2027' }).code, 'FORBIDDEN');
  const r = e.api('ngach.propose', { ma_nv: 'NV001', ngach_ma: 'GV3', hieu_luc_tu: '01/03/2027', so_quyet_dinh: 'QĐ-77', ly_do: 'Đủ 7 năm' });
  assert.ok(r.ok, JSON.stringify(r));
  const id = e.api('phieu.list', { tab: 'cua_toi' }).data.rows[0].id;
  approveAll(e, id, ['ht.hcm', 'nhansu', 'tgd']);
  const rows = j(e.run('Db.filter("QUA_TRINH_NGACH",function(x){return x.ma_nv==="NV001";}).map(function(x){return x.ngach_ma+":"+x.hieu_luc_tu+">"+x.hieu_luc_den+":"+x.so_quyet_dinh;})'));
  assert.deepStrictEqual(rows, ['GV2:2019-09-01>2027-02-28:', 'GV3:2027-03-01>:QĐ-77']);
});

test('Nâng cấp hệ thống đã cài: thêm quyền/vai trò/quy trình mới, không ghi đè tùy chỉnh, chạy lại không nhân đôi', () => {
  const { e } = world();
  // Mô phỏng bản cũ: bỏ vai trò PROPOSER, các quyền mới, quy trình mặc định, cờ ngạch, và đánh dấu quyền đã nạp
  e.run(`Db.tx(function(){
    Db.removeMany("ROLES", Db.filter("ROLES", function(x){return x.ma==="PROPOSER";}).map(function(x){return x.id;}));
    var newP = ["declare.view","declare.edit","phieu.create","phieu.view","workflow.manage","calc.run","calc.view"];
    Db.removeMany("ROLE_PERMS", Db.filter("ROLE_PERMS", function(x){return newP.indexOf(x.quyen)>=0 || x.role_ma==="PROPOSER";}).map(function(x){return x.id;}));
    Db.removeMany("WORKFLOW_STEP", Db.all("WORKFLOW_STEP").map(function(x){return x.id;}));
    Db.removeMany("SETTINGS", Db.filter("SETTINGS", function(x){return x.khoa==="perms_da_nap";}).map(function(x){return x.id;}));
    Db.updateMany("DEAN_NGACH", Db.all("DEAN_NGACH").map(function(x){return {id:x.id, patch:{vuot_khung:"", ho_tro_hang_truong:""}};}), "t");
    // người dùng đã tùy chỉnh: HR_STAFF từng được bỏ quyền staff.import
    Db.removeMany("ROLE_PERMS", Db.filter("ROLE_PERMS", function(x){return x.role_ma==="HR_STAFF"&&x.quyen==="staff.import";}).map(function(x){return x.id;}));
  })`);
  const up = j(e.run('Seed.upgrade()'));
  assert.deepStrictEqual(up.vaiTroMoi, ['PROPOSER']);
  assert.ok(up.quyenMoi > 20);
  assert.strictEqual(up.quyTrinh, 12);
  assert.strictEqual(up.capNhatNgach, 31);
  const hasPerm = (role, perm) => j(e.run(`!!Db.find("ROLE_PERMS",function(x){return x.role_ma==="${role}"&&x.quyen==="${perm}";})`));
  assert.ok(hasPerm('HR_DIRECTOR', 'calc.run') && hasPerm('PROPOSER', 'staff.view') && hasPerm('PRINCIPAL', 'phieu.create'));
  assert.ok(!hasPerm('HR_STAFF', 'staff.import'), 'không khôi phục quyền cũ mà người dùng đã gỡ');
  assert.strictEqual(j(e.run('Db.find("DEAN_NGACH",function(x){return x.ngach_ma==="HT";}).ho_tro_hang_truong')), 'Hiệu trưởng');
  const again = j(e.run('Seed.upgrade()'));
  assert.deepStrictEqual([again.vaiTroMoi.length, again.quyenMoi, again.quyTrinh, again.capNhatNgach], [0, 0, 0, 0]);
});
