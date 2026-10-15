/**
 * HR Recruit – Backend Google Apps Script
 * Dùng Google Sheet làm cơ sở dữ liệu, Google Drive lưu tệp đính kèm.
 *
 * Cách dùng: mở Google Sheet → Tiện ích mở rộng → Apps Script → dán file này vào Code.gs,
 * tạo thêm file HTML tên "Index" và dán nội dung Index.html. Xem HUONG-DAN.md.
 */

const SHEETS = { cfg: 'ThietLap', reqs: 'DeXuat', cands: 'UngVien', lib: 'ThuVien' };
const FOLDER_NAME = 'HR Recruit – Tệp đính kèm';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Mở ứng dụng. */
function doGet(e) {
  if (e && e.parameter && e.parameter.t) return senderPage_(String(e.parameter.t));
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('HR Recruit – Quản lý tuyển dụng')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Chạy 1 lần trong trình soạn thảo để cấp quyền (Sheet + Drive). */
function setup() {
  SpreadsheetApp.getActiveSpreadsheet();
  folder_();
  PropertiesService.getScriptProperties().setProperty('OWNER_EMAIL', String(Session.getEffectiveUser().getEmail() || '').toLowerCase());
  Logger.log('OK – đã cấp quyền, tạo thư mục Drive và ghi nhận chủ dự án.');
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Chặn việc gọi hàm dữ liệu từ bản triển khai "người gửi" (chạy dưới tư cách người dùng).
 * Bản chính (Execute as Me): người dùng ≠ chủ dự án. Bản người gửi: người dùng = chính họ.
 */
function guardMain_() {
  const eff = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  const act = who_();
  const props = PropertiesService.getScriptProperties();
  if (eff && act && eff !== act) { // bản chính: tài khoản thực thi là chủ dự án
    if (props.getProperty('OWNER_EMAIL') !== eff) props.setProperty('OWNER_EMAIL', eff);
    return;
  }
  const owner = props.getProperty('OWNER_EMAIL');
  if (!owner) throw new Error('Chủ dự án hãy chạy hàm setup() một lần để hoàn tất cấu hình bảo mật.');
  if (act !== owner) throw new Error('Địa chỉ này chỉ dùng để gửi email. Hãy mở ứng dụng bằng đường dẫn chính.');
}

function who_() {
  return String(Session.getActiveUser().getEmail() || '').toLowerCase();
}

function readCol_(col) {
  const sh = ss_().getSheetByName(SHEETS[col]);
  if (!sh || sh.getLastRow() < 2) return [];
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const dc = head.indexOf('data');
  if (dc < 0) return [];
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, dc + 1).getValues();
  const order = [], byId = {};
  vals.forEach(function (r) {
    const id = String(r[0]);
    if (!(id in byId)) order.push(id);
    byId[id] = r[dc]; // nếu trùng mã: lấy dòng CUỐI (dòng mà thao tác ghi hướng tới)
  });
  const out = [];
  order.forEach(function (id) {
    try { if (byId[id]) out.push(JSON.parse(byId[id])); } catch (e) { /* bỏ qua dòng lỗi */ }
  });
  return out;
}

/** Trả toàn bộ dữ liệu cho giao diện. */
function api_load() {
  guardMain_();
  const cfgArr = readCol_('cfg');
  return {
    email: who_(),
    sheetUrl: ss_().getUrl(),
    cfg: cfgArr.length ? cfgArr[0] : null,
    reqs: readCol_('reqs'),
    cands: readCol_('cands'),
    lib: readCol_('lib')
  };
}

/** Kiểm tra quyền ghi: phải là người dùng đã đăng ký; chỉ admin được sửa Thiết lập. */
function assertCanWrite_(ops) {
  const cfgArr = readCol_('cfg');
  if (!cfgArr.length) return; // lần đầu: người mở đầu tiên khởi tạo hệ thống
  const cfg = cfgArr[0];
  const email = who_();
  const user = (cfg.users || []).filter(function (u) {
    return String(u.email || '').toLowerCase() === email && email;
  })[0];
  if (!user) throw new Error('Tài khoản ' + (email || '(không xác định)') + ' chưa được cấp quyền.');
  const isAdmin = user.roleId === 'admin';
  ops.forEach(function (op) {
    if (op.col === 'cfg' && !isAdmin) throw new Error('Chỉ quản trị viên được sửa Thiết lập.');
    if (!SHEETS[op.col]) throw new Error('Bảng dữ liệu không hợp lệ: ' + op.col);
  });
}

function getSheet_(col, head) {
  let sh = ss_().getSheetByName(SHEETS[col]);
  if (!sh) sh = ss_().insertSheet(SHEETS[col]);
  if (sh.getLastRow() === 0) {
    const h = head.concat(['data']);
    sh.getRange(1, 1, 1, h.length).setValues([h])
      .setFontWeight('bold').setBackground('#5b47d6').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Ghi thay đổi: ops = [{col, type:'put'|'del', id, head, row, data}] */
function api_sync(ops) {
  guardMain_();
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    assertCanWrite_(ops);
    const byCol = {};
    ops.forEach(function (op) { (byCol[op.col] = byCol[op.col] || []).push(op); });

    Object.keys(byCol).forEach(function (col) {
      const list = byCol[col];
      const firstPut = list.filter(function (o) { return o.type === 'put'; })[0];
      let sh = ss_().getSheetByName(SHEETS[col]);
      if (!firstPut && (!sh || sh.getLastRow() === 0)) return;
      if (!sh || sh.getLastRow() === 0) sh = getSheet_(col, firstPut.head);

      const width = sh.getLastColumn();
      const head = sh.getRange(1, 1, 1, width).getValues()[0];
      const dc = head.indexOf('data');
      const last = sh.getLastRow();
      const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
      const pos = {}, rowsById = {};
      ids.forEach(function (id, i) {
        pos[id] = i + 2; // dòng cuối cùng của mỗi mã
        (rowsById[id] = rowsById[id] || []).push(i + 2);
      });
      const toDelete = [];
      Object.keys(rowsById).forEach(function (id) { // dọn các dòng trùng mã (giữ dòng cuối)
        rowsById[id].slice(0, -1).forEach(function (r) { toDelete.push(r); });
      });

      const appends = [];
      list.forEach(function (op) {
        if (op.type !== 'put') return;
        const rowVals = op.row.map(function (v) { return v === null || v === undefined ? '' : String(v); });
        while (rowVals.length < dc) rowVals.push('');
        rowVals[dc] = op.data;
        if (pos[op.id]) {
          const rg = sh.getRange(pos[op.id], 1, 1, rowVals.length);
          rg.setNumberFormat('@').setValues([rowVals]);
        } else {
          appends.push(rowVals);
          pos[op.id] = -1; // tránh thêm trùng trong cùng lô
        }
      });
      if (appends.length) {
        const start = sh.getLastRow() + 1;
        const w = Math.max.apply(null, appends.map(function (r) { return r.length; }));
        appends.forEach(function (r) { while (r.length < w) r.push(''); });
        sh.getRange(start, 1, appends.length, w).setNumberFormat('@').setValues(appends);
      }

      list.filter(function (o) { return o.type === 'del'; }).forEach(function (o) {
        (rowsById[o.id] || []).forEach(function (r) { toDelete.push(r); });
      });
      const dels = toDelete.filter(function (r, i) { return r > 1 && toDelete.indexOf(r) === i; })
        .sort(function (a, b) { return b - a; });
      dels.forEach(function (r) { sh.deleteRow(r); });
    });
    SpreadsheetApp.flush();
    return { ok: true, ops: ops.length };
  } finally {
    lock.releaseLock();
  }
}

function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { throw new Error('Không mở được thư mục tệp đính kèm (' + id + '). Kiểm tra quyền Drive của chủ dự án, không tự tạo thư mục mới để tránh mất liên kết.'); } }
  const f = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

/** Tải tệp lên Drive. Trả về metadata để lưu cùng hồ sơ. */
function api_upload(name, mime, b64) {
  guardMain_();
  assertCanWrite_([]);
  const bytes = Utilities.base64Decode(b64);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('Tệp vượt quá 10MB.');
  const blob = Utilities.newBlob(bytes, mime || 'application/octet-stream', name);
  const f = folder_().createFile(blob);
  try { f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* tài khoản cá nhân: bỏ qua */ }
  return { id: f.getId(), name: f.getName(), size: f.getSize(), type: mime, at: Date.now(), url: f.getUrl() };
}

function api_deleteFile(id) {
  guardMain_();
  assertCanWrite_([]);
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* đã xoá */ }
  return true;
}

/** Chẩn đoán: số dòng, mã trùng, kích thước dữ liệu lớn nhất của từng sheet. */
function api_diag() {
  guardMain_();
  const out = { email: who_(), sheets: {} };
  Object.keys(SHEETS).forEach(function (col) {
    const sh = ss_().getSheetByName(SHEETS[col]);
    if (!sh) { out.sheets[col] = { name: SHEETS[col], exists: false }; return; }
    const last = sh.getLastRow();
    const info = { name: SHEETS[col], exists: true, rows: Math.max(0, last - 1), dup: [], maxLen: 0 };
    if (last > 1) {
      const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      const dc = head.indexOf('data');
      info.hasData = dc >= 0;
      if (dc >= 0) {
        const vals = sh.getRange(2, 1, last - 1, dc + 1).getValues();
        const seen = {};
        vals.forEach(function (r) {
          const id = String(r[0]);
          if (seen[id] && info.dup.indexOf(id) < 0) info.dup.push(id);
          seen[id] = true;
          info.maxLen = Math.max(info.maxLen, String(r[dc] || '').length);
        });
      }
    }
    out.sheets[col] = info;
  });
  return out;
}

/* ===================== Gửi email cho ứng viên (Gmail alias) ===================== */

/** Chạy 1 lần trong trình soạn thảo để cấp quyền Gmail cho ứng dụng. */
function authorizeMail() {
  const aliases = GmailApp.getAliases();
  Logger.log('Đã cấp quyền Gmail. Alias hiện có: ' + aliases.join(', '));
}

/** Trả về {cfg, user} nếu người dùng hiện tại đã đăng ký và có quyền cap (quản trị luôn có). */
function userCan_(cap) {
  const cfgArr = readCol_('cfg');
  if (!cfgArr.length) return null;
  const cfg = cfgArr[0];
  const email = who_();
  const user = (cfg.users || []).filter(function (u) {
    return String(u.email || '').toLowerCase() === email && email;
  })[0];
  if (!user) return null;
  const role = (cfg.roles || []).filter(function (r) { return r.id === user.roleId; })[0];
  const ok = role && (role.id === 'admin' || (role.caps || []).indexOf(cap) >= 0);
  return ok ? { cfg: cfg, user: user } : null;
}

function splitEmails_(s) {
  return String(s || '').split(/[,;\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
}
function escHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function logMail_(row) {
  let sh = ss_().getSheetByName('NhatKyEmail');
  if (!sh) {
    sh = ss_().insertSheet('NhatKyEmail');
    sh.getRange(1, 1, 1, 8).setValues([['Thời gian', 'Người thao tác', 'Người nhận', 'CC', 'Tiêu đề', 'Gửi từ', 'Ứng viên', 'Kết quả']])
      .setFontWeight('bold').setBackground('#5b47d6').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  sh.appendRow(row);
}

/** Cho quản trị xem alias "Gửi thư với tư cách" đã cấu hình trong Gmail của chủ dự án. */
function api_mailInfo() {
  guardMain_();
  if (!userCan_('cfg.edit')) throw new Error('Chỉ quản trị mới xem được cấu hình email.');
  let aliases;
  try { aliases = GmailApp.getAliases(); }
  catch (e) { throw new Error('Chưa cấp quyền Gmail: hãy chạy hàm authorizeMail trong Apps Script. (' + e.message + ')'); }
  return { owner: Session.getEffectiveUser().getEmail(), aliases: aliases, quota: MailApp.getRemainingDailyQuota() };
}

/** Kiểm tra & chuẩn hoá một thư. Dùng chung cho chế độ "chủ dự án" và "người bấm gửi". */
function validateMail_(p, m) {
  const re = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
  const subject = String((p && p.subject) || '').trim().slice(0, 200);
  const to = String((p && p.to) || '').trim();
  if (!m.enabled) throw new Error('Gửi email trực tiếp chưa được bật (Thiết lập → Email gửi ứng viên).');
  if (!re.test(to)) throw new Error('Email người nhận không hợp lệ.');
  const ccAll = splitEmails_(((p && p.cc) || '') + ',' + (m.cc || ''));
  ccAll.forEach(function (x) { if (!re.test(x)) throw new Error('Email CC không hợp lệ: ' + x); });
  if (ccAll.length > 6) throw new Error('Tối đa 6 địa chỉ CC.');
  const bccAll = splitEmails_(m.bcc || '');
  bccAll.forEach(function (x) { if (!re.test(x)) throw new Error('Email BCC trong Thiết lập không hợp lệ: ' + x); });
  const body = String((p && p.body) || '');
  if (!subject) throw new Error('Thiếu tiêu đề.');
  if (!body.trim()) throw new Error('Thiếu nội dung.');
  if (body.length > 20000) throw new Error('Nội dung quá dài.');
  if (/\{\{\w+\}\}/.test(subject + body)) throw new Error('Thư còn trường chưa điền dạng {{...}}.');
  const ids = ((p && p.attachIds) || []).slice(0, 5);
  if (ids.length) {
    const folderId = folder_().getId();
    let total = 0;
    ids.forEach(function (id) {
      const f = DriveApp.getFileById(id);
      let inside = false;
      const it = f.getParents();
      while (it.hasNext()) { if (it.next().getId() === folderId) { inside = true; break; } }
      if (!inside) throw new Error('Tệp đính kèm không thuộc thư mục của ứng dụng.');
      total += f.getSize();
      if (total > 20 * 1024 * 1024) throw new Error('Tổng dung lượng đính kèm vượt 20MB.');
    });
  }
  return { to: to, subject: subject, ccAll: ccAll, bccAll: bccAll, full: body + (m.signature ? '\n\n' + m.signature : ''), ids: ids };
}

/*MR-BEGIN*/
/* ---- Bộ dựng thư HTML (dùng chung: giao diện xem trước và Code.gs). Cú pháp: # Tiêu đề · ## Mục · | bảng | · - gạch đầu dòng (thụt 2 dấu cách = cấp con) · > ô lưu ý · ~ căn phải · --- đường kẻ · **đậm** · *nghiêng* · <br> xuống dòng */
function mrEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function mrInline(s, col) {
  var t = mrEsc(s);
  t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  t = t.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<i>$2</i>');
  t = t.replace(/&lt;br&gt;/g, '<br>');
  t = t.replace(/(https?:\/\/(?:(?!&quot;)[^\s<])+)/g, '<a href="$1" style="color:' + col + '">$1</a>');
  return t;
}
function mrParse(text) {
  var lines = String(text || '').replace(/\r/g, '').split('\n'), out = [], i = 0, para = null;
  function flush() { if (para) { out.push({ t: 'p', v: para.join('<br>') }); para = null; } }
  while (i < lines.length) {
    var ln = lines[i], tr = ln.replace(/\s+$/, '');
    if (!tr.trim()) { flush(); i++; continue; }
    var m;
    if ((m = /^#\s+(.*)$/.exec(tr))) { flush(); out.push({ t: 'h1', v: m[1] }); i++; continue; }
    if ((m = /^##\s+(.*)$/.exec(tr))) { flush(); out.push({ t: 'h2', v: m[1] }); i++; continue; }
    if (/^-{3,}$/.test(tr.trim())) { flush(); out.push({ t: 'hr' }); i++; continue; }
    if (/^\|/.test(tr.trim())) {
      flush(); var rows = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        var cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
        if (!cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) rows.push(cells);
        i++;
      }
      out.push({ t: 'tbl', v: rows }); continue;
    }
    if (/^>\s?/.test(tr)) {
      flush(); var ps = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { var q = lines[i].replace(/^>\s?/, '').trim(); if (q) ps.push(q); i++; }
      out.push({ t: 'note', v: ps }); continue;
    }
    if (/^~\s?/.test(tr)) {
      flush(); var rs = [];
      while (i < lines.length && /^~\s?/.test(lines[i])) { rs.push(lines[i].replace(/^~\s?/, '').trim()); i++; }
      out.push({ t: 'right', v: rs }); continue;
    }
    if (/^\s*[-•]\s+/.test(tr)) {
      flush(); var items = [];
      while (i < lines.length && /^\s*[-•]\s+/.test(lines[i])) {
        var mm = /^(\s*)[-•]\s+(.*)$/.exec(lines[i]);
        items.push({ lv: mm[1].length >= 2 ? 1 : 0, v: mm[2] }); i++;
      }
      out.push({ t: 'ul', v: items }); continue;
    }
    (para = para || []).push(tr.trim()); i++;
  }
  flush();
  return out;
}
/** brand: {color, lines:[...], logo:boolean}. */
function mrRender(text, brand) {
  brand = brand || {};
  var col = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#8a1538';
  var line = '#ead9de', tint = '#fdf6f7', I = function (s) { return mrInline(s, col); };
  var h = '';
  var bl = (brand.lines || []).filter(function (x) { return String(x).trim(); });
  if (bl.length || brand.logo) {
    h += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px"><tr><td valign="top" style="font-family:Georgia,\'Times New Roman\',serif;font-size:13px;line-height:1.55;font-weight:bold;color:' + col + '">' +
      bl.map(function (x) { return /^website/i.test(String(x).trim()) ? '<span style="color:#666">' + mrEsc(x) + '</span>' : mrEsc(x); }).join('<br>') + '</td>' +
      (brand.logo ? '<td width="110" align="right" valign="top"><img src="cid:vaslogo" width="90" alt="logo" style="display:block;border:0;max-width:90px;height:auto"></td>' : '') + '</tr></table>';
  }
  mrParse(text).forEach(function (b) {
    if (b.t === 'h1') h += '<h1 style="text-align:center;font-size:23px;line-height:1.3;color:' + col + ';margin:26px 0 20px;font-weight:bold">' + I(b.v) + '</h1>';
    else if (b.t === 'h2') h += '<h2 style="font-size:15px;line-height:1.4;color:' + col + ';margin:22px 0 10px;font-weight:bold">' + I(b.v) + '</h2>';
    else if (b.t === 'hr') h += '<hr style="border:0;border-top:1px solid ' + line + ';margin:18px 0">';
    else if (b.t === 'p') h += '<p style="margin:0 0 13px">' + I(b.v) + '</p>';
    else if (b.t === 'right') h += '<div style="text-align:right;margin:6px 0 0">' + b.v.map(function (x) { return '<div style="margin:0 0 3px">' + I(x) + '</div>'; }).join('') + '</div>';
    else if (b.t === 'note') {
      h += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0"><tr><td style="background:' + tint + ';border:1px solid ' + line + ';padding:12px 18px;line-height:1.65;font-size:15px">' +
        b.v.map(function (x, k) { var head = k === 0 && /^\*\*[^*]+\*\*$/.test(x); return '<p style="margin:' + (k ? '8px' : '0') + ' 0 0;' + (head ? 'color:' + col + ';' : '') + '">' + I(x) + '</p>'; }).join('') + '</td></tr></table>';
    } else if (b.t === 'ul') {
      var s = '<ul style="margin:0 0 13px;padding-left:22px">', open = 0;
      b.v.forEach(function (it, k) {
        if (it.lv === 1 && !open) { s += '<ul style="margin:4px 0 4px;padding-left:22px;list-style-type:circle">'; open = 1; }
        if (it.lv === 0 && open) { s += '</ul></li>'; open = 0; }
        else if (it.lv === 0 && k) s += '</li>';
        if (it.lv === 0) s += '<li style="margin:0 0 5px">' + I(it.v);
        else s += '<li style="margin:0 0 4px">' + I(it.v) + '</li>';
      });
      s += (open ? '</ul>' : '') + '</li></ul>';
      h += s;
    } else if (b.t === 'tbl') {
      var cols = Math.max.apply(null, b.v.map(function (r) { return r.length; }));
      var t = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0 16px;border:1px solid ' + line + '">';
      b.v.forEach(function (r, ri) {
        t += '<tr>';
        for (var c = 0; c < cols; c++) {
          var v = r[c] || '';
          if (ri === 0) t += '<td align="center" style="background:' + col + ';color:#ffffff;font-weight:bold;text-transform:uppercase;font-size:14px;padding:14px 12px;border:1px solid ' + col + '">' + I(v) + '</td>';
          else t += '<td valign="top" ' + (cols === 2 ? 'width="' + (c ? '62%' : '38%') + '" ' : '') + 'style="background:' + tint + ';border:1px solid ' + line + ';padding:11px 14px;font-size:14.5px;' + (c && cols === 2 ? 'font-weight:bold' : '') + '">' + I(v) + '</td>';
        }
        t += '</tr>';
      });
      h += t + '</table>';
    }
  });
  return '<div style="background:#f5f0f2;padding:22px 10px"><div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid ' + line + ';padding:30px 38px;font-family:Georgia,\'Times New Roman\',serif;font-size:15px;line-height:1.65;color:#222222">' + h + '</div></div>';
}
/** Bản văn bản thuần (cho phần dự phòng / mở bằng ứng dụng email / sao chép). */
function mrPlain(text) {
  var out = [];
  mrParse(text).forEach(function (b) {
    var P = function (s) { return String(s).replace(/<br>/g, '\n').replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1$2'); };
    if (b.t === 'h1' || b.t === 'h2') out.push(P(b.v).toUpperCase());
    else if (b.t === 'p') out.push(P(b.v));
    else if (b.t === 'hr') out.push('--------');
    else if (b.t === 'note' || b.t === 'right') out.push(b.v.map(P).join('\n'));
    else if (b.t === 'ul') out.push(b.v.map(function (it) { return (it.lv ? '    ◦ ' : '• ') + P(it.v); }).join('\n'));
    else if (b.t === 'tbl') out.push(b.v.slice(1).map(function (r) { return '• ' + P(r[0] || '') + (r[1] ? ': ' + P(r.slice(1).join(' – ')) : ''); }).join('\n'));
  });
  return out.join('\n\n');
}
/*MR-END*/

/** Logo dùng cho thư: logo của Mẫu phiếu đang hiệu lực (data URL). */
function mailLogoData_() {
  try {
    const today = today_();
    const items = readCol_('lib').filter(function (i) { return i._k === 'formTpls' && i.logoData; })
      .sort(function (a, b) { return String(a.effective || '').localeCompare(String(b.effective || '')); });
    let pick = items.length ? items[items.length - 1] : null;
    items.forEach(function (i) { if (String(i.effective || '') <= today) pick = i; });
    return pick ? String(pick.logoData) : '';
  } catch (e) { return ''; }
}
function logoBlob_(dataUrl) {
  const mm = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!mm) return null;
  return Utilities.newBlob(Utilities.base64Decode(mm[2]), mm[1], 'logo');
}
/** Dựng nội dung HTML của thư theo giao diện cấu hình ở Thiết lập. */
function mailBuild_(full, m) {
  if (m.rich === 0 || m.rich === '0') {
    return { html: '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#111">' + escHtml_(mrPlain(full)).replace(/\r?\n/g, '<br>') + '</div>', logo: '' };
  }
  const logo = (m.showLogo === 0 || m.showLogo === '0') ? '' : mailLogoData_();
  const html = mrRender(full, { color: m.brandColor, lines: String(m.headerLines || '').split(/\r?\n/), logo: !!logo });
  return { html: html, logo: logo };
}

function today_() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }

/** Chế độ "owner": gửi bằng tài khoản chủ dự án (có thể dùng alias). */
function api_sendMail(p) {
  guardMain_();
  const ctx = userCan_('cand.move');
  if (!ctx) throw new Error('Bạn không có quyền gửi email cho ứng viên.');
  const m = ctx.cfg.mail || {};
  const actor = who_();
  const to = String((p && p.to) || '').trim();
  const subject = String((p && p.subject) || '').trim().slice(0, 200);
  try {
    if (m.mode === 'user') throw new Error('Đang bật chế độ gửi bằng email của người bấm gửi; hãy dùng nút gửi trong ứng dụng.');
    const v = validateMail_(p, m);
    const options = {};
    if (m.senderName) options.name = String(m.senderName);
    if (m.replyTo) options.replyTo = String(m.replyTo);
    if (v.ccAll.length) options.cc = v.ccAll.join(',');
    if (v.bccAll.length) options.bcc = v.bccAll.join(',');
    if (m.fromAlias) {
      const aliases = GmailApp.getAliases().map(function (a) { return a.toLowerCase(); });
      if (aliases.indexOf(String(m.fromAlias).toLowerCase()) < 0) {
        throw new Error('"' + m.fromAlias + '" chưa là địa chỉ "Gửi thư với tư cách" trong Gmail của ' +
          Session.getEffectiveUser().getEmail() + '. Hãy thêm và xác minh alias trong Gmail trước.');
      }
      options.from = m.fromAlias;
    }
    if (v.ids.length) options.attachments = v.ids.map(function (id) { return DriveApp.getFileById(id).getBlob(); });
    const built = mailBuild_(v.full, m);
    options.htmlBody = built.html;
    if (built.logo) options.inlineImages = { vaslogo: logoBlob_(built.logo) };

    const props = PropertiesService.getScriptProperties();
    const key = 'mail_' + today_();
    const limit = Number(m.dailyLimit) || 200;
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const used = Number(props.getProperty(key)) || 0;
      if (used >= limit) throw new Error('Đã đạt giới hạn ' + limit + ' email/ngày đã đặt trong Thiết lập.');
      if (MailApp.getRemainingDailyQuota() < 1 + v.ccAll.length + v.bccAll.length) throw new Error('Đã hết hạn mức gửi email trong ngày của Google.');
      props.setProperty(key, String(used + 1));
    } finally { lock.releaseLock(); }

    GmailApp.sendEmail(v.to, v.subject, mrPlain(v.full), options);
    try { logMail_([new Date(), actor, v.to, v.ccAll.join(', '), v.subject, m.fromAlias || Session.getEffectiveUser().getEmail(), String(p.candidate || ''), 'ĐÃ GỬI']); } catch (x) { /* thư đã gửi; lỗi ghi nhật ký không được báo là gửi thất bại */ }
    return { ok: true, from: m.fromAlias || Session.getEffectiveUser().getEmail(), remaining: MailApp.getRemainingDailyQuota() };
  } catch (e) {
    try { logMail_([new Date(), actor, to, '', subject, m.fromAlias || '', String((p && p.candidate) || ''), 'LỖI: ' + e.message]); } catch (x) { /* bỏ qua */ }
    throw e;
  }
}

/* ---------- Chế độ "user": gửi bằng email của chính người bấm gửi (bản triển khai thứ hai) ---------- */

const DRAFT_TTL_ = 900;     // thư nháp chờ gửi: 15 phút
const RESULT_TTL_ = 21600;  // kết quả: 6 giờ

function tokOk_(t) { return /^[0-9a-f-]{36}$/.test(String(t || '')); }

function tplUser_(str, user, email) {
  return String(str || '').replace(/\{\{ten\}\}/g, (user && user.name) || email).replace(/\{\{email\}\}/g, email);
}

/** Bước 1 (bản chính, chạy bằng chủ dự án): kiểm tra thư, lưu nháp tạm, trả token để mở trang gửi. */
function api_mailPrepare(p) {
  guardMain_();
  const ctx = userCan_('cand.move');
  if (!ctx) throw new Error('Bạn không có quyền gửi email cho ứng viên.');
  const m = ctx.cfg.mail || {};
  if (m.mode !== 'user') throw new Error('Chưa bật chế độ "gửi bằng email của người bấm gửi" trong Thiết lập.');
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(String(m.senderUrl || ''))) throw new Error('Thiếu hoặc sai địa chỉ bản triển khai "người gửi" trong Thiết lập.');
  const actor = who_();
  const v = validateMail_(p, m);
  const built = mailBuild_(v.full, m);
  const draft = {
    email: actor, to: v.to, cc: v.ccAll, bcc: v.bccAll, subject: v.subject, full: v.full, ids: v.ids, html: built.html, logo: built.logo,
    senderName: tplUser_(m.senderName || '{{ten}}', ctx.user, actor),
    replyTo: tplUser_(m.replyTo || '{{email}}', ctx.user, actor),
    fromAlias: String(m.fromAlias || ''), limit: Number(m.dailyLimit) || 200,
    candidate: String((p && p.candidate) || '')
  };
  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  cache.put('maildraft:' + token, JSON.stringify(draft), DRAFT_TTL_);
  cache.put('mailmeta:' + token, JSON.stringify({ email: actor, to: v.to, cc: v.ccAll.join(', '), subject: v.subject, candidate: draft.candidate, logged: 0 }), RESULT_TTL_);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const q = JSON.parse(cache.get('mailq') || '[]');
    q.push(token);
    cache.put('mailq', JSON.stringify(q.slice(-60)), RESULT_TTL_);
  } finally { lock.releaseLock(); }
  try { flushMailLog_(); } catch (x) { /* bỏ qua */ }
  return { token: token, url: String(m.senderUrl) + '?t=' + token };
}

/** Ghi nhật ký các thư đã có kết quả (gọi khi hỏi trạng thái / chuẩn bị thư mới). */
function flushMailLog_() {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const q = JSON.parse(cache.get('mailq') || '[]');
    const keep = [];
    q.forEach(function (t) {
      const meta = JSON.parse(cache.get('mailmeta:' + t) || 'null');
      if (!meta) return;
      const res = JSON.parse(cache.get('mailres:' + t) || 'null');
      if (!res) { keep.push(t); return; }
      if (!meta.logged) {
        logMail_([new Date(), meta.email, meta.to, meta.cc, meta.subject, res.from || '', meta.candidate, res.ok ? 'ĐÃ GỬI' : 'LỖI: ' + res.error]);
        meta.logged = 1;
        cache.put('mailmeta:' + t, JSON.stringify(meta), RESULT_TTL_);
      }
    });
    cache.put('mailq', JSON.stringify(keep), RESULT_TTL_);
  } finally { lock.releaseLock(); }
}

/** Bước 3 (bản chính): giao diện hỏi trạng thái. */
function api_mailStatus(token) {
  guardMain_();
  if (!tokOk_(token)) throw new Error('Mã không hợp lệ.');
  const cache = CacheService.getScriptCache();
  const meta = JSON.parse(cache.get('mailmeta:' + token) || 'null');
  if (!meta || meta.email !== who_()) throw new Error('Không tìm thấy phiên gửi thư (đã hết hạn).');
  const res = JSON.parse(cache.get('mailres:' + token) || 'null');
  if (res) {
    try { flushMailLog_(); } catch (x) { /* bỏ qua */ }
    return res.ok ? { state: 'sent', from: res.from } : { state: 'error', error: res.error };
  }
  if (cache.get('maildraft:' + token)) return { state: 'pending' };
  return { state: 'expired' };
}

/** Điều kiện cho các hàm sender_*: phải chạy dưới tư cách chính người dùng và đúng chủ của nháp. */
function senderDraft_(token) {
  if (!tokOk_(token)) throw new Error('Mã không hợp lệ.');
  const eff = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  const act = who_();
  if (!act || eff !== act) throw new Error('Trang này phải được mở từ bản triển khai "người gửi" (Thực thi dưới tư cách người dùng truy cập).');
  const raw = CacheService.getScriptCache().get('maildraft:' + token);
  if (!raw) throw new Error('Thư nháp đã hết hạn hoặc đã được gửi. Hãy quay lại ứng dụng và bấm gửi lại.');
  const d = JSON.parse(raw);
  if (d.email !== act) throw new Error('Thư này được soạn bởi ' + d.email + ', bạn đang đăng nhập bằng ' + act + '.');
  return d;
}

function sender_peek(token) {
  const d = senderDraft_(token);
  let from = d.email;
  if (d.fromAlias) {
    try { if (GmailApp.getAliases().map(function (a) { return a.toLowerCase(); }).indexOf(d.fromAlias.toLowerCase()) >= 0) from = d.fromAlias; } catch (e) { /* dùng email của bạn */ }
  }
  return { from: from, to: d.to, cc: d.cc.join(', '), subject: d.subject, body: mrPlain(d.full), html: d.logo ? String(d.html).split('cid:vaslogo').join(d.logo) : d.html, attach: d.ids.length };
}

function sender_send(token) {
  const d = senderDraft_(token);
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let from = d.email;
  try {
    if (!cache.get('maildraft:' + token)) throw new Error('Thư này đã được gửi hoặc đã hết hạn.');
    cache.remove('maildraft:' + token); // dùng một lần
    try {
      const key = 'mail_' + today_() + '_' + d.email;
      const used = Number(props.getProperty(key)) || 0;
      if (used >= d.limit) throw new Error('Bạn đã đạt giới hạn ' + d.limit + ' email/ngày đặt trong Thiết lập.');
      if (MailApp.getRemainingDailyQuota() < 1 + d.cc.length + d.bcc.length) throw new Error('Tài khoản của bạn đã hết hạn mức gửi email trong ngày của Google.');
      const options = { name: d.senderName, replyTo: d.replyTo, htmlBody: d.html };
      if (d.logo) options.inlineImages = { vaslogo: logoBlob_(d.logo) };
      if (d.cc.length) options.cc = d.cc.join(',');
      if (d.bcc.length) options.bcc = d.bcc.join(',');
      if (d.fromAlias) {
        const al = GmailApp.getAliases().map(function (a) { return a.toLowerCase(); });
        if (al.indexOf(d.fromAlias.toLowerCase()) >= 0) { options.from = d.fromAlias; from = d.fromAlias; }
      }
      if (d.ids.length) options.attachments = d.ids.map(function (id) { return DriveApp.getFileById(id).getBlob(); });
      props.setProperty(key, String(used + 1));
      GmailApp.sendEmail(d.to, d.subject, mrPlain(d.full), options);
      cache.put('mailres:' + token, JSON.stringify({ ok: true, from: from }), RESULT_TTL_);
    } catch (e) {
      cache.put('mailres:' + token, JSON.stringify({ ok: false, error: String(e.message || e), from: from }), RESULT_TTL_);
      throw e;
    }
  } finally { lock.releaseLock(); }
  return { ok: true, from: from };
}

/** Trang gửi thư (hiển thị ở cửa sổ phụ); người dùng xem lại rồi bấm Gửi. */
function senderPage_(token) {
  const t = tokOk_(token) ? token : '';
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Arial,sans-serif;background:#f4f2fb;margin:0;padding:20px;color:#222}.c{max-width:640px;margin:auto;background:#fff;border-radius:12px;padding:22px;box-shadow:0 2px 12px #0002}' +
    'h2{margin:0 0 12px;color:#5b47d6;font-size:18px}.r{margin:6px 0;font-size:14px}.r b{display:inline-block;width:70px;color:#666}pre{white-space:pre-wrap;background:#faf9ff;border:1px solid #e3def8;border-radius:8px;padding:12px;font:13px/1.5 Arial}' +
    'button{background:#5b47d6;color:#fff;border:0;border-radius:8px;padding:10px 22px;font-size:15px;cursor:pointer}button:disabled{opacity:.5}.e{color:#c0392b}.o{color:#1e8e3e;font-weight:bold}</style></head><body><div class="c">' +
    '<h2>Gửi email cho ứng viên</h2><div id="m">Đang tải thư nháp…</div><div id="a" style="margin-top:14px"></div></div><script>' +
    'var T=' + JSON.stringify(t) + ';' +
    'function row(k,v){var d=document.createElement("div");d.className="r";var b=document.createElement("b");b.textContent=k;d.appendChild(b);d.appendChild(document.createTextNode(v));return d;}' +
    'function err(x){var m=document.getElementById("m");m.innerHTML="";var d=document.createElement("div");d.className="e";d.textContent=String(x&&x.message||x);m.appendChild(d);document.getElementById("a").innerHTML="";}' +
    'google.script.run.withFailureHandler(err).withSuccessHandler(function(p){var m=document.getElementById("m");m.innerHTML="";' +
    'm.appendChild(row("Từ:",p.from));m.appendChild(row("Đến:",p.to));if(p.cc)m.appendChild(row("CC:",p.cc));m.appendChild(row("Tiêu đề:",p.subject));if(p.attach)m.appendChild(row("Đính kèm:",p.attach+" tệp"));' +
    'var pre=document.createElement("iframe");pre.setAttribute("sandbox","");pre.style.cssText="width:100%;height:440px;border:1px solid #ddd;border-radius:8px;background:#fff";pre.srcdoc=p.html;m.appendChild(pre);' +
    'var b=document.createElement("button");b.textContent="Gửi ngay";b.onclick=function(){b.disabled=true;b.textContent="Đang gửi…";' +
    'google.script.run.withFailureHandler(function(e){err(e);}).withSuccessHandler(function(){document.getElementById("a").innerHTML="";var d=document.createElement("div");d.className="o";d.textContent="✓ Đã gửi. Bạn có thể đóng cửa sổ này.";document.getElementById("m").appendChild(d);setTimeout(function(){try{window.close();}catch(x){}},1500);}).sender_send(T);};' +
    'document.getElementById("a").appendChild(b);}).sender_peek(T);' +
    '<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Gửi email').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
