'use strict';
// Gộp src/ thành 4 tệp trong dist/ để dán thẳng vào Apps Script: Code.gs, Index.html, Denied.html, appsscript.json
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'src'), DIST = path.join(__dirname, 'dist');
const ORDER = ['Util', 'Csv', 'Strict', 'Schema', 'Db', 'Validate', 'Auth', 'Audit', 'Notify', 'Policy', 'Staff', 'Engine', 'Calc', 'Workflow', 'Seed', 'Setup', 'Api'];
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'Code.gs'), ORDER.map((n) => `// ===== ${n}.gs =====\n` + read(n + '.gs')).join('\n\n'));
const index = read('Index.html').replace("<?!= include('Style') ?>", () => read('Style.html')).replace("<?!= include('App') ?>", () => read('App.html'));
if (/<\?(?!=\s*email)/.test(index.replace(/<title>[\s\S]*?<\/title>/, ''))) throw new Error('Index.html còn chứa ký tự "<?" sẽ bị Apps Script hiểu nhầm');
fs.writeFileSync(path.join(DIST, 'Index.html'), index);
fs.copyFileSync(path.join(SRC, 'Denied.html'), path.join(DIST, 'Denied.html'));
fs.copyFileSync(path.join(SRC, 'appsscript.json'), path.join(DIST, 'appsscript.json'));
console.log('Đã tạo dist/: Code.gs, Index.html, Denied.html, appsscript.json');
