'use strict';
/**
 * Bản giả lập Apps Script (SpreadsheetApp, Properties, Lock, Mail...) để chạy mã .gs bằng Node.
 * Mỗi lần gọi createEnv() cho một "dự án" mới hoàn toàn độc lập.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'src');
const ORDER = ['Util', 'Csv', 'Strict', 'Schema', 'Db', 'Validate', 'Auth', 'Audit', 'Notify', 'Policy', 'Staff', 'Engine', 'Calc', 'Report', 'Workflow', 'Seed', 'Setup', 'Api'];

class Range {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) {
        const v = (this.sheet.data[this.r - 1 + i] || [])[this.c - 1 + j];
        row.push(v === undefined ? '' : v);
      }
      out.push(row);
    }
    return out;
  }
  setValues(vals) {
    if (vals.length !== this.nr || vals[0].length !== this.nc) throw new Error('setValues: kích thước không khớp');
    if (this.r - 1 + this.nr > this.sheet.maxRows) throw new Error('Tọa độ vượt kích thước sheet');
    for (let i = 0; i < this.nr; i++) {
      const row = (this.sheet.data[this.r - 1 + i] = this.sheet.data[this.r - 1 + i] || []);
      for (let j = 0; j < this.nc; j++) row[this.c - 1 + j] = vals[i][j];
    }
    return this;
  }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; this.maxRows = 1000; this.maxCols = 26; }
  getName() { return this.name; }
  getLastRow() {
    let last = 0;
    this.data.forEach((row, i) => { if (row && row.some(v => v !== '' && v !== undefined)) last = i + 1; });
    return last;
  }
  getLastColumn() {
    let last = 0;
    this.data.forEach(row => { (row || []).forEach((v, j) => { if (v !== '' && v !== undefined) last = Math.max(last, j + 1); }); });
    return last;
  }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertRowsAfter(after, n) { this.maxRows += n; }
  insertColumnsAfter(after, n) { this.maxCols += n; }
  getRange(r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); }
  getDataRange() { return new Range(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  deleteRow(n) { this.data.splice(n - 1, 1); }
  setFrozenRows() {}
}

class Spreadsheet {
  constructor(id) { this.id = id; this.sheets = [new Sheet('Sheet1')]; }
  getId() { return this.id; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  getSheets() { return this.sheets; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
  deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
}

function createEnv(opts = {}) {
  const books = {}, props = {}, mails = [];
  const env = { email: (opts.email || 'admin@vaschools.edu.vn').toLowerCase(), owner: 'admin@vaschools.edu.vn', mails, books, mailQuota: 100, failMail: false };
  let locked = false;

  const ctx = {
    console,
    SpreadsheetApp: {
      create(name) { const id = 'ss' + Object.keys(books).length; books[id] = new Spreadsheet(id); return books[id]; },
      openById(id) { if (!books[id]) throw new Error('Không mở được ' + id); return books[id]; }
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({
      waitLock() { if (locked) throw new Error('Khóa đang bị giữ'); locked = true; },
      releaseLock() { locked = false; } }) },
    Session: {
      getActiveUser: () => ({ getEmail: () => env.email }),
      getEffectiveUser: () => ({ getEmail: () => env.owner })
    },
    MailApp: {
      getRemainingDailyQuota: () => env.mailQuota,
      sendEmail(m) { if (env.failMail) throw new Error('SMTP lỗi'); mails.push(m); }
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate(d, tz, fmt) {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
        if (fmt === 'yyyy-MM-dd') return `${p.year}-${p.month}-${p.day}`;
        return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
      }
    },
    Logger: { log() {} },
    HtmlService: {}
  };
  vm.createContext(ctx);
  const code = ORDER.map(f => fs.readFileSync(path.join(SRC, f + '.gs'), 'utf8')).join('\n;\n');
  // `var`/function ở mức cao nhất của script được gắn vào ctx; module IIFE trả về qua biến toàn cục.
  vm.runInContext(code, ctx, { filename: 'bundle.gs' });
  env.ctx = ctx;
  env.run = (src) => vm.runInContext(src, ctx);
  env.install = () => {
    ctx.Db.createIfMissing();
    ctx.Db.ensureSheets();
    return ctx.Seed.run(env.email, 'Quản trị');
  };
  env.as = (email) => { env.email = email.toLowerCase(); ctx.Auth.reset(); };
  env.api = (name, payload) => ctx.apiCall(name, payload || {});
  env.sheet = (name) => books[Object.keys(books)[0]].getSheetByName(name);
  return env;
}

module.exports = { createEnv };
