'use strict';
// Chạy thử giao diện thật trên Chromium (Playwright), nối với logic máy chủ giả lập.
// Dùng: node tests/ui-smoke.js [thư-mục-ảnh]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createEnv } = require('./harness');

const SRC = path.join(__dirname, '..', 'src');
const out = process.argv[2] || '/tmp';
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const html = read('Index.html').replace("<?!= include('Style') ?>", read('Style.html')).replace("<?!= include('App') ?>", read('App.html'));

(async () => {
  const env = createEnv(); env.install();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = global.__errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  env.latency = 0;
  await page.exposeFunction('nodeApi', async (name, payload) => { if (env.latency) await new Promise((r) => setTimeout(r, env.latency)); return JSON.parse(JSON.stringify(env.api(name, payload))); });
  const shim = `<script>(function(){
    function mk(ok, fail){ return new Proxy({}, { get: function(_, k){
      if (k === 'withSuccessHandler') return function(f){ return mk(f, fail); };
      if (k === 'withFailureHandler') return function(f){ return mk(ok, f); };
      return function(name, payload){ window.nodeApi(name, payload).then(ok, fail); };
    } }); }
    window.google = { script: { run: mk(function(){}, function(){}) } };
  })();</script>`;
  const page_html = html.replace('<div id="app">', shim + '<div id="app">');
  await page.setContent(page_html, { waitUntil: 'load' });
  await page.waitForSelector('nav a', { timeout: 5000 }).catch(async (e) => { console.log('BODY:', (await page.textContent('body')).slice(0, 400)); console.log(errors.join('\n')); throw e; });
  const steps = [];
  const ok = (name, cond) => { steps.push((cond ? 'OK   ' : 'FAIL ') + name); if (!cond) process.exitCode = 1; };

  ok('Tổng quan hiển thị đề án hiệu lực', (await page.textContent('main')).includes('HP.ĐA.01'));
  await page.screenshot({ path: path.join(out, '1-tongquan.png') });

  await page.click('nav a[data-p=setup]');
  await page.waitForSelector('table');
  ok('Thiết lập: có chi nhánh HCM', (await page.textContent('main')).includes('TP. Hồ Chí Minh'));

  // Nhập CSV có lỗi (khoảng trắng thừa) -> báo lỗi, không nhập
  await page.click('button:has-text("Nhập CSV")');
  await page.fill('textarea.paste', 'Mã chi nhánh\tTên chi nhánh\tTỉnh/Thành phố\nHN\tHà Nội\tHà Nội\nDN \tĐà Nẵng\tĐà Nẵng');
  await page.click('button:has-text("Kiểm tra dữ liệu")');
  await page.waitForSelector('.alert.bad');
  ok('Import lỗi hiển thị khoảng trắng thừa', (await page.textContent('.modal')).includes('DN·'));
  ok('Nút Nhập bị khóa khi có lỗi', await page.isDisabled('button:has-text("Nhập vào hệ thống")'));
  await page.screenshot({ path: path.join(out, '2-import-loi.png') });

  await page.fill('textarea.paste', 'Mã chi nhánh\tTên chi nhánh\tTỉnh/Thành phố\nHN\tHà Nội\tHà Nội\nDN\tĐà Nẵng\tĐà Nẵng');
  ok('Sửa nội dung thì phải kiểm tra lại', await page.isDisabled('button:has-text("Nhập vào hệ thống")'));
  await page.click('button:has-text("Kiểm tra dữ liệu")');
  await page.waitForSelector('.alert.ok');
  await page.click('button:has-text("Nhập vào hệ thống")');
  await page.waitForFunction(() => document.body.textContent.includes('Đà Nẵng'));
  ok('Import sạch thành công', true);

  // Form thêm: trường
  await page.click('.tabs button:has-text("Trường")');
  await page.click('button:has-text("+ Thêm")');
  await page.fill('.form input >> nth=0', 'HN_THCS');
  await page.fill('.form input >> nth=1', 'THCS Hà Nội');
  await page.selectOption('.form select >> nth=0', 'HN');
  await page.selectOption('.form select >> nth=1', 'THCS');
  await page.click('.modal >> text=Lưu');
  await page.waitForFunction(() => document.body.textContent.includes('THCS Hà Nội'));
  ok('Form thêm trường', true);

  await page.click('nav a[data-p=dean]');
  await page.waitForSelector('text=DA01-2026');
  ok('Danh sách đề án', true);
  await page.click('button:has-text("Mở")');
  await page.waitForSelector('.tabs button:has-text("Ngạch - bậc")');
  await page.click('.tabs button:has-text("Ngạch - bậc")');
  await page.waitForSelector('text=Giáo viên 3');
  ok('Chi tiết đề án hiển thị hệ số, bản đã ban hành bị khóa', (await page.textContent('main')).includes('Đã ban hành - chỉ xem'));
  await page.screenshot({ path: path.join(out, '3-dean.png') });

  await page.click('nav a[data-p=admin]');
  await page.click('.tabs button:has-text("Ma trận quyền")');
  await page.waitForSelector('table.matrix');
  ok('Ma trận quyền', true);
  await page.screenshot({ path: path.join(out, '4-matrix.png') });

  await page.setViewportSize({ width: 390, height: 800 });
  await page.evaluate(() => { location.hash = '#staff'; });
  await page.waitForSelector('table');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok('Điện thoại: không tràn ngang cả trang', !overflow);
  await page.screenshot({ path: path.join(out, '5-mobile.png') });


  // ---------- Phần 2: khai báo, quyết toán, phiếu duyệt, quy trình ----------
  const tsv = (...rows) => rows.map(r => r.join('\t')).join('\n');
  const must = (r) => { if (!r.ok) throw new Error(JSON.stringify(r)); return r; };
  await page.setViewportSize({ width: 1280, height: 800 });
  must(env.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2026-2027', '01/09/2026', '31/05/2027']) }));
  must(env.api('importCommit', { table: 'KY_LUONG', text: tsv(['Mã kỳ', 'Năm học', 'Học kỳ', 'Từ ngày', 'Đến ngày', 'Số tuần quy định'], ['2026-2027-HK1', '2026-2027', 'HK1', '01/09/2026', '15/01/2027', '16']) }));
  must(env.api('importCommit', { table: 'TRUONG', text: tsv(['Mã trường', 'Tên trường', 'Chi nhánh', 'Cấp học'], ['HCM_THPT', 'THPT HCM', 'HCM', 'THPT']) }));
  must(env.api('importCommit', { table: 'NHAN_SU', text: tsv(['Mã nhân sự', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Email', 'Ngày vào làm', 'Chi nhánh'],
    ['NV001', 'Nguyễn Thị A', '15/05/1990', 'Nữ', 'a@vaschools.edu.vn', '01/09/2019', 'HCM']) }));
  must(env.api('importCommit', { table: 'QUA_TRINH_NGACH', text: tsv(['Mã nhân sự', 'Ngạch', 'Trường', 'Đối tượng tính lương', 'Hiệu lực từ'], ['NV001', 'GV2', 'HCM_THPT', 'GV còn lại', '01/09/2019']) }));
  must(env.api('importCommit', { table: 'USERS', text: tsv(['Email', 'Họ tên'], ['gv@vaschools.edu.vn', 'Giáo vụ'], ['ht@vaschools.edu.vn', 'Hiệu trưởng']) }));
  must(env.api('importCommit', { table: 'USER_ROLES', text: tsv(['Email', 'Vai trò', 'Phạm vi dữ liệu', 'Mã chi nhánh/trường'],
    ['gv@vaschools.edu.vn', 'PROPOSER', 'Trường', 'HCM_THPT'], ['ht@vaschools.edu.vn', 'PRINCIPAL', 'Trường', 'HCM_THPT']) }));

  const reload = async (hash) => { await page.setContent(page_html, { waitUntil: 'load' }); await page.waitForSelector('nav a'); await page.evaluate((h) => { location.hash = h; }, hash); };

  await reload('#setup/NGACH_DM');
  await page.waitForSelector('text=GV3');
  const ngachText = await page.textContent('main');
  ok('Danh mục ngạch hiển thị hệ số & thâm niên', ngachText.includes('HS chức danh') && ngachText.includes('1,3') && ngachText.includes('TN2') && ngachText.includes('HP.ĐA.01'));
  await page.screenshot({ path: path.join(out, '6-danhmuc-ngach.png') });

  // Giáo vụ nhập khai báo bằng form, gửi duyệt
  env.as('gv@vaschools.edu.vn');
  await reload('#declare');
  await page.waitForSelector('button:has-text("+ Thêm")');
  await page.click('button:has-text("+ Thêm")');
  const sels = page.locator('.form select');
  await page.fill('.form input >> nth=0', 'NV001');
  await sels.nth(0).selectOption('2026-2027-HK1').catch(() => {});
  await page.waitForSelector('.modal');
  const vals = { ma_nv: 'NV001', loai: 'Thực dạy', noi_dung: 'Toán 10', so_luong: '22', don_vi: 'Tiết/Tuần', tu_ngay: '07/09/2026', den_ngay: '27/12/2026' };
  const labels = { ma_nv: 'Mã nhân sự', loai: 'Loại', noi_dung: 'Nội dung (môn/lớp/chức trách)', so_luong: 'Số lượng', don_vi: 'Đơn vị', tu_ngay: 'Từ ngày', den_ngay: 'Đến ngày' };
  for (const k of Object.keys(vals)) {
    const field = page.locator('.form > div', { has: page.locator(`label:text-is("${labels[k]}")`) });
    const tag = await field.locator('input,select').first().evaluate((n) => n.tagName);
    if (tag === 'SELECT') await field.locator('select').selectOption(vals[k]); else await field.locator('input').fill(vals[k]);
  }
  await page.click('.modal >> text=Lưu');
  await page.waitForSelector('td:has-text("Toán 10")');
  ok('Giáo vụ nhập khai báo bằng form', true);
  await page.screenshot({ path: path.join(out, '7-khaibao.png') });
  await page.selectOption('.bar select >> nth=1', 'HCM_THPT');
  await page.click('button:has-text("Gửi duyệt các dòng Nháp")');
  await page.waitForSelector('text=Phiếu duyệt');
  await page.waitForSelector('td:has-text("Đang duyệt")');
  ok('Gửi duyệt tạo phiếu, chuyển sang Phiếu duyệt', true);

  // Hiệu trưởng thấy phiếu chờ mình và duyệt trên giao diện
  env.as('ht@vaschools.edu.vn');
  await reload('#phieu');
  await page.waitForSelector('button.btn:text-is("Xử lý")');
  ok('Hiệu trưởng thấy phiếu chờ xử lý', true);
  await page.click('button.btn:text-is("Xử lý")');
  await page.waitForSelector('.modal h3:has-text("Quy trình")');
  ok('Chi tiết phiếu có quy trình & nội dung', (await page.textContent('.modal')).includes('Toán 10') && (await page.textContent('.modal')).includes('Tổng Giám đốc phê duyệt'));
  await page.screenshot({ path: path.join(out, '8-phieu.png') });
  await page.click('.modal >> button:has-text("Trả lại")');
  await page.waitForSelector('.modal .alert.bad');
  ok('Trả lại không có lý do bị chặn', (await page.textContent('.modal .alert.bad')).includes('lý do'));
  await page.fill('.modal textarea', 'Kiểm tra lại số tiết');
  await page.click('.modal >> button:has-text("Trả lại")');
  await page.waitForFunction(() => document.body.textContent.includes('Không có phiếu nào đang chờ'));
  ok('Hiệu trưởng trả lại phiếu thành công', true);

  // Quản trị: trang quyết toán và tab quy trình
  env.as('admin@vaschools.edu.vn');
  await reload('#calc');
  await page.waitForSelector('button:has-text("Tính toán")');
  await page.click('button:has-text("Tính toán")');
  await page.waitForSelector('.modal .alert.ok');
  ok('Tính toán chạy được trên giao diện', (await page.textContent('.modal')).includes('DA01-2026'));
  await page.click('.modal >> text=Đóng');
  await page.waitForSelector('td:has-text("TỔNG CỘNG")');
  ok('Bảng tổng hợp toàn công ty có dòng tổng', (await page.textContent('main')).includes('Quỹ lương năm'));
  await page.screenshot({ path: path.join(out, '9-tonghop.png') });
  await page.click('button:has-text("Sao chép bảng thu nhập")');
  await page.waitForSelector('.modal textarea');
  ok('Xuất bảng thu nhập để dán vào Excel', (await page.inputValue('.modal textarea')).startsWith('Mã NV\tHọ tên'));
  await page.click('.modal >> text=Đóng');
  await page.selectOption('.bar select >> nth=0', 'tat_ca').catch(() => {});
  await page.click('.tabs button:has-text("Thu nhập từng người")');
  await page.waitForSelector('td:has-text("NV001")');
  await page.screenshot({ path: path.join(out, '9b-thunhaptungnguoi.png') });
  await page.click('.tabs button:has-text("Phụ trội từng người")');
  await page.waitForSelector('text=Chưa có dữ liệu');
  ok('Tab phụ trội từng người hiển thị', true);
  await reload('#admin/WORKFLOW_STEP');
  await page.waitForSelector('td:has-text("Hiệu trưởng xét duyệt")');
  ok('Hệ thống → Quy trình duyệt hiển thị quy trình mặc định', true);
  await page.screenshot({ path: path.join(out, '10-quytrinh.png') });

  // ---------- Phần 3: mô phỏng, trần theo trường ----------
  must(env.api('importCommit', { table: 'NAM_HOC', text: tsv(['Năm học', 'Từ ngày', 'Đến ngày'], ['2025-2026', '01/09/2025', '31/05/2026']) }));
  must(env.api('save', { table: 'KY_LUONG', row: { ma: '2025-2026-DC1', nam_hoc_ma: '2025-2026', hoc_ky: 'DC1', loai: 'Điều chỉnh', tu_ngay: '01/03/2026', den_ngay: '01/03/2026' } }));
  await reload('#calc');
  await page.waitForSelector('button:has-text("Tính toán")');
  await page.locator('.bar select').first().selectOption('2025-2026-DC1');
  await page.click('.tabs button:has-text("Mô phỏng")');
  await page.waitForSelector('button:has-text("Chạy mô phỏng")');
  await page.locator('.form input').first().fill('10');
  await page.click('button:has-text("Chạy mô phỏng")');
  await page.waitForSelector('td:has-text("TỔNG CỘNG")');
  ok('Mô phỏng chạy và so sánh với hiện hành', (await page.textContent('main')).includes('Dữ liệu thật KHÔNG bị thay đổi'));
  await page.screenshot({ path: path.join(out, '11-mophong.png') });
  await reload('#dean/DA01-2026');
  await page.waitForSelector('.tabs button:has-text("Trần tăng thu nhập")');
  await page.click('.tabs button:has-text("Trần tăng thu nhập")');
  await page.waitForSelector('button:has-text("Sao chép trần sang năm mới")');
  ok('Bảng trần có nút sao chép sang năm mới và thêm trần riêng cho trường (đề án đã ban hành)', (await page.textContent('main')).includes('chỉ được thêm'));
  await page.click('button:has-text("+ Thêm")');
  await page.waitForSelector('.modal label:text-is("Trường")');
  ok('Form trần có chọn Trường (trống = chung)', true);
  await page.screenshot({ path: path.join(out, '12-tran-truong.png') });
  await page.click('.modal >> text=Hủy');

  // ---------- Phần 4: khung giao diện, thanh bên thu gọn ----------
  await page.setViewportSize({ width: 1440, height: 860 });
  env.as('admin@vaschools.edu.vn');
  must(env.api('calc.run', { ky_ma: '2025-2026-DC1' }));
  await reload('#dash');
  await page.waitForSelector('.kpi');
  await page.waitForSelector('.hbar');
  ok('Tổng quan có thẻ chỉ số và biểu đồ quỹ lương', (await page.locator('.kpi').count()) >= 5 && (await page.locator('svg circle').count()) >= 2);
  await page.screenshot({ path: path.join(out, '13-tongquan.png') });
  const wExpanded = await page.locator('aside.side').evaluate((n) => n.getBoundingClientRect().width);
  await page.click('.collapse-btn');
  await page.waitForTimeout(300);
  const wCollapsed = await page.locator('aside.side').evaluate((n) => n.getBoundingClientRect().width);
  ok('Thu gọn thanh bên làm hẹp menu và mở rộng vùng nội dung', wExpanded > 200 && wCollapsed < 90 && (await page.evaluate(() => document.body.classList.contains('side-collapsed'))));
  await page.screenshot({ path: path.join(out, '14-thugon.png') });
  await page.click('header.topbar .icon-btn >> nth=0');
  await page.waitForTimeout(300);
  ok('Nút ☰ trên thanh tiêu đề mở lại menu', (await page.locator('aside.side').evaluate((n) => n.getBoundingClientRect().width)) > 200);
  await page.click('nav a[data-p=calc]');
  await page.waitForSelector('.tabs');
  ok('Tiêu đề trang cập nhật theo menu', (await page.textContent('.ptitle h1')) === 'Thu nhập & phụ trội');
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(250);
  ok('Điện thoại: menu ẩn mặc định, mở bằng nút ☰', (await page.locator('aside.side').evaluate((n) => n.getBoundingClientRect().right)) <= 1);
  await page.click('header.topbar .icon-btn >> nth=0');
  await page.waitForTimeout(300);
  ok('Điện thoại: menu trượt ra', (await page.locator('aside.side').evaluate((n) => n.getBoundingClientRect().left)) >= 0);
  await page.screenshot({ path: path.join(out, '15-dienthoai-menu.png') });

  // ---------- Phần 5: tốc độ cảm nhận khi mỗi lần gọi máy chủ mất ~1 giây (như Apps Script thật) ----------
  env.latency = 1000;
  await page.setViewportSize({ width: 1440, height: 860 });
  let t0 = Date.now();
  await reload('#setup');
  await page.waitForSelector('td:has-text("TP. Hồ Chí Minh")');
  const tFirst = Date.now() - t0;
  await page.waitForTimeout(2500);                                  // thời gian tải trước chạy ngầm
  t0 = Date.now();
  await page.click('.tabs button:has-text("Trường")');
  await page.waitForSelector('td:has-text("THPT HCM")');
  const tPrefetched = Date.now() - t0;
  await page.click('.tabs button:has-text("Chi nhánh")');
  await page.waitForSelector('td:has-text("TP. Hồ Chí Minh")');
  t0 = Date.now();
  await page.click('.tabs button:has-text("Trường")');
  await page.waitForSelector('td:has-text("THPT HCM")');
  const tRevisit = Date.now() - t0;
  // mở thẳng đường dẫn #setup (như nhấn vào liên kết đã lưu)
  await page.goto('about:blank#setup');
  t0 = Date.now();
  await page.setContent(page_html, { waitUntil: 'load' });
  await page.waitForSelector('td:has-text("TP. Hồ Chí Minh")');
  const tDeep = Date.now() - t0;
  console.log('ĐO mở thẳng #setup: ' + tDeep + 'ms (≈ 1 vòng chờ 1000ms + dựng giao diện)');
  console.log('ĐO (độ trễ giả lập 1000ms/lần gọi): mở trang lần đầu ' + tFirst + 'ms · chuyển tab đã tải trước ' + tPrefetched + 'ms · xem lại tab ' + tRevisit + 'ms');
  ok('Chuyển tab đã được tải trước hiện dữ liệu gần như tức thì (<400ms dù mỗi lần gọi mất 1s)', tPrefetched < 400 && tRevisit < 400);
  await page.click('.tabs button:has-text("Trường")');
  await page.waitForSelector('td:has-text("THPT HCM")');
  // sau khi ghi, dữ liệu mới phải hiện ngay (không bị đệm cũ che)
  await page.click('button:has-text("+ Thêm")');
  await page.fill('.form input >> nth=0', 'DN_TH');
  await page.fill('.form input >> nth=1', 'Tiểu học Đà Nẵng');
  await page.selectOption('.form select >> nth=0', 'HCM');
  await page.selectOption('.form select >> nth=1', 'Tiểu học');
  await page.click('.modal >> text=Lưu');
  await page.waitForSelector('td:has-text("Tiểu học Đà Nẵng")', { timeout: 8000 });
  ok('Sau khi thêm, bảng hiện ngay dòng mới (đệm trình duyệt đã được làm mới)', true);
  env.latency = 0;
  await page.click('button[aria-label="Làm mới dữ liệu"]');
  await page.waitForSelector('.toast:not([hidden])');
  ok('Nút Làm mới dữ liệu hoạt động', (await page.textContent('#toast')).includes('Đã làm mới'));



  // ---------- Phần 6: tab nhân sự theo mô hình mới và mẫu nhập CSV ----------
  env.latency = 0;
  await page.setViewportSize({ width: 1440, height: 860 });
  await reload('#staff/NHAN_SU');
  await page.waitForSelector('td:has-text("Nguyễn Thị A")');
  const heads = (await page.locator('main table thead th').allTextContents()).join('|');
  ok('Hồ sơ nhân sự không còn Trường/Đối tượng/Tổ chuyên môn/Thâm niên', !/Trường|Đối tượng|Tổ chuyên môn|Thâm niên/.test(heads) && heads.includes('Ngạch hiện tại'));
  await page.screenshot({ path: path.join(out, '16-hosonhansu.png') });
  await page.click('.tabs button:has-text("Quá trình ngạch bậc")');
  await page.waitForSelector('td:has-text("GV2")');
  const h2 = (await page.locator('main table thead th').allTextContents()).join('|');
  ok('Quá trình ngạch bậc có Trường, Đối tượng, Thâm niên tại ngày hiệu lực', h2.includes('Trường') && h2.includes('Đối tượng tính lương') && h2.includes('Thâm niên tại ngày hiệu lực'));
  await page.screenshot({ path: path.join(out, '17-quatrinhngach.png') });
  await page.click('.tabs button:has-text("Thu nhập hiện tại")');
  await page.waitForSelector('main table');
  const h3 = (await page.locator('main table thead th').allTextContents()).join('|');
  ok('Thu nhập hiện tại có Hỗ trợ GVCN, Hỗ trợ khác, Tổng', h3.includes('Hỗ trợ GVCN') && h3.includes('Hỗ trợ khác') && h3.includes('Tổng thu nhập hiện tại'));
  await page.click('button:has-text("Nhập CSV")');
  await page.waitForSelector('button:has-text("Chèn mẫu + dòng ví dụ")');
  ok('Hộp nhập CSV có nút mẫu (tiêu đề, dòng ví dụ, tải file)', (await page.locator('.modal button:has-text("Tải file mẫu")').count()) === 1 && (await page.locator('.modal button:has-text("Chèn tiêu đề mẫu")').count()) === 1);
  await page.click('button:has-text("Chèn mẫu + dòng ví dụ")');
  await page.waitForFunction(() => document.querySelector('.modal textarea.paste').value.includes('Hỗ trợ GVCN'));
  await page.click('.modal button:has-text("Kiểm tra dữ liệu")');
  await page.waitForSelector('.modal .alert');
  ok('Dòng ví dụ chèn từ mẫu là hợp lệ khi kiểm tra', (await page.textContent('.modal .alert')).includes('Hợp lệ'));
  await page.screenshot({ path: path.join(out, '18-mau-csv.png') });
  await page.click('.modal >> text=Đóng');
  ok('Có nút Tải mẫu CSV trên thanh công cụ', (await page.locator('button:has-text("Tải mẫu CSV")').count()) === 1);
  await page.click('button:has-text("Xuất dữ liệu")');
  await page.waitForSelector('.modal textarea.paste');
  ok('Xuất dữ liệu cho tiêu đề đúng mẫu nhập', (await page.inputValue('.modal textarea.paste')).startsWith('Mã nhân sự\t'));
  await page.click('.modal >> text=Đóng');

  // Danh mục dài (>8): ô chọn có tìm theo tên, không phân biệt dấu
  must(env.api('importCommit', { table: 'NHAN_SU', text: tsv(['Mã nhân sự', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Email', 'Ngày vào làm', 'Chi nhánh'],
    ...Array.from({ length: 10 }, (_, i) => ['TS' + String(i).padStart(2, '0'), i === 7 ? 'Lê Thị Hương' : 'Người số ' + i, '01/01/1990', 'Nữ', 'ts' + i + '@vaschools.edu.vn', '01/09/2020', 'HCM'])) }));
  await reload('#declare');
  await page.waitForSelector('.bar select');
  await page.selectOption('.bar select >> nth=0', '2026-2027-HK1');
  await page.waitForSelector('button:has-text("+ Thêm")');
  await page.click('button:has-text("+ Thêm")');
  const cbField = page.locator('.form > div', { has: page.locator('label:text-is("Mã nhân sự")') });
  await cbField.locator('input').fill('huong');
  await page.waitForSelector('.combo-it');
  ok('Ô chọn nhân sự tìm theo tên không dấu', (await page.locator('.combo-it').count()) === 1 && (await page.textContent('.combo-it')).includes('TS07'));
  await page.keyboard.press('Enter');
  ok('Chọn xong ô hiển thị mã – tên', (await cbField.locator('input').inputValue()).startsWith('TS07'));
  await page.click('.modal >> text=Hủy');
  // Ô chọn mã quy đổi trách nhiệm tự điền nội dung, số tiết, đơn vị
  await page.click('button:has-text("+ Thêm")');
  await page.waitForFunction(() => [...document.querySelectorAll('.form select option')].some(o => o.value === 'QD05'));
  const qdField = page.locator('.form > div', { has: page.locator('label:text-is("Mã quy đổi trách nhiệm")') });
  await qdField.locator('select').selectOption('QD05');
  const fv = async (l) => page.locator('.form > div', { has: page.locator(`label:text-is("${l}")`) }).locator('input,select').first().inputValue();
  ok('Chọn QD05 tự điền Trách nhiệm, 4 tiết/tuần', (await fv('Loại')) === 'Trách nhiệm' && (await fv('Số lượng')) === '4' && (await fv('Đơn vị')) === 'Tiết/Tuần' && (await fv('Nội dung (môn/lớp/chức trách)')).includes('chủ nhiệm'));
  await page.click('.modal >> text=Hủy');

  console.log(steps.join('\n'));
  console.log(errors.length ? 'LỖI TRÌNH DUYỆT:\n' + errors.join('\n') : 'Không có lỗi console/JS.');
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error(e.message.split('\n')[0]); console.error('Lỗi trình duyệt:', global.__errors); process.exit(1); });
