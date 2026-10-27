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
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.exposeFunction('nodeApi', (name, payload) => JSON.parse(JSON.stringify(env.api(name, payload))));
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
  await page.click('nav a[data-p=staff]');
  await page.waitForSelector('table');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok('Điện thoại: không tràn ngang cả trang', !overflow);
  await page.screenshot({ path: path.join(out, '5-mobile.png') });

  console.log(steps.join('\n'));
  console.log(errors.length ? 'LỖI TRÌNH DUYỆT:\n' + errors.join('\n') : 'Không có lỗi console/JS.');
  if (errors.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
