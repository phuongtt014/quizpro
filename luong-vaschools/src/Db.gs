/**
 * Lớp truy cập dữ liệu (Google Sheets). Toàn bộ nghiệp vụ chỉ đi qua đây,
 * nên sau này có thể thay bằng CSDL khác mà không đổi nghiệp vụ.
 * Ghi dữ liệu phải nằm trong Db.tx() (khóa script + đọc mới).
 */
var Db = (function () {
  var memo = {}, heads = {}, ssRef = null, depth = 0;
  var SYS_TAIL = ['created_at', 'created_by', 'updated_at', 'updated_by'];
  var NUMERIC = { int: 1, num: 1, money: 1, pct: 1 };

  function ss() {
    if (!ssRef) {
      var id = PropertiesService.getScriptProperties().getProperty('DB_ID');
      if (!id) throw new AppError('NO_DB', 'Hệ thống chưa được cài đặt (chạy setupInstall trong trình soạn thảo Apps Script).');
      ssRef = SpreadsheetApp.openById(id);
    }
    return ssRef;
  }

  function sheet(t) {
    var s = ss().getSheetByName(t);
    if (!s) throw new AppError('NO_SHEET', 'Thiếu sheet "' + t + '". Chạy setupEnsureSheets.');
    return s;
  }

  function wantedHeader(t) {
    return ['id'].concat(SCHEMA[t].cols.map(function (c) { return c.k; })).concat(SYS_TAIL);
  }

  function colDef(t, k) {
    var cols = SCHEMA[t].cols;
    for (var i = 0; i < cols.length; i++) if (cols[i].k === k) return cols[i];
    return null;
  }

  function coerce(def, v) {
    if (v instanceof Date) return Utilities.formatDate(v, Util.TZ, 'yyyy-MM-dd');
    if (v === null || v === undefined || v === '') return '';
    if (def && NUMERIC[def.t]) return Number(v);
    return String(v);
  }

  function header(t) {
    if (!heads[t]) heads[t] = sheet(t).getRange(1, 1, 1, sheet(t).getLastColumn()).getValues()[0];
    return heads[t];
  }

  /* ---------- Bộ nhớ đệm giữa các lượt chạy (CacheService) ----------
   * Mỗi lần gọi Apps Script là một lượt chạy mới nên không nhớ gì; đọc lại cả trang tính mất ~0,1-0,4s/bảng.
   * Dữ liệu từng bảng được lưu trong đệm theo "số phiên bản" của bảng. Số phiên bản nằm ở Script Properties (bền vững, không mất khi đệm hỏng/hết hạn)
   * và được tăng ở CUỐI mỗi giao dịch ghi (còn giữ khóa) nên bản đệm cũ không bao giờ được dùng lại, kể cả khi đệm gặp sự cố đúng lúc ghi.
   * Đọc dở dang trong lúc có người ghi cũng an toàn: kết quả được lưu theo phiên bản cũ nên bị bỏ ngay khi phiên bản tăng. */
  var CACHE_TTL = 600, CHUNK = 30000, VER_PROP = 'DBVER';
  var NOCACHE = { AUDIT_LOG: 1 };
  var vers = null, pending = {}, dirty = {};

  function cacheSvc() {
    try { return CacheService.getScriptCache(); } catch (e) { return null; }
  }
  function newVer() { return String(Date.now()) + String(Math.floor(Math.random() * 1000)); }

  function loadVers() {
    try {
      var s = PropertiesService.getScriptProperties().getProperty(VER_PROP);
      vers = s ? JSON.parse(s) : {};
    } catch (e) { vers = null; }
    return vers;
  }
  /** Số phiên bản hiện tại của bảng; null nếu không đọc được (khi đó không dùng đệm). */
  function verOf(t) {
    if (!vers && !loadVers()) return null;
    return vers[t] || '0';
  }

  /** Tăng phiên bản các bảng (ghi bền vững). Gọi khi còn giữ khóa để không mất cập nhật của người khác. */
  function commitBumps(tables) {
    if (!tables.length) return;
    var props = PropertiesService.getScriptProperties(), cur = {};
    try { cur = JSON.parse(props.getProperty(VER_PROP) || '{}'); } catch (e) { cur = {}; }
    tables.forEach(function (t) { if (!NOCACHE[t]) cur[t] = newVer(); });
    props.setProperty(VER_PROP, JSON.stringify(cur));
    vers = cur;
  }

  function parseChunks(t, ver, meta, got) {
    var n = parseInt(meta, 10), s = '';
    for (var i = 0; i < n; i++) {
      var part = got['d:' + t + ':' + ver + ':' + i];
      if (part === undefined || part === null) return null;
      s += part;
    }
    return JSON.parse(s);
  }

  function cacheRead(t, ver, c) {
    try {
      var meta = c.get('m:' + t + ':' + ver);
      if (!meta) return null;
      var keys = [];
      for (var i = 0; i < parseInt(meta, 10); i++) keys.push('d:' + t + ':' + ver + ':' + i);
      return parseChunks(t, ver, meta, c.getAll(keys));
    } catch (e) { return null; }
  }

  function cacheWrite(t, ver, rows, c) {
    try {
      var s = JSON.stringify(rows), n = Math.max(1, Math.ceil(s.length / CHUNK)), put = {};
      for (var i = 0; i < n; i++) put['d:' + t + ':' + ver + ':' + i] = s.substr(i * CHUNK, CHUNK);
      put['m:' + t + ':' + ver] = String(n);
      c.putAll(put, CACHE_TTL);
    } catch (e) { /* đệm lỗi hoặc quá lớn: bỏ qua, vẫn đúng nhờ đọc trang tính */ }
  }

  /**
   * Bảng vừa bị ghi: tới khi phiên bản được tăng (cuối giao dịch) thì bản trong đệm đã cũ, nên trong thời gian đó
   * bảng này luôn đọc thẳng từ trang tính và không ghi vào đệm.
   */
  function invalidate(t) {
    delete memo[t];
    if (NOCACHE[t]) return;
    if (depth > 0) { pending[t] = true; dirty[t] = true; } else commitBumps([t]);
  }

  function flushPending() {
    var list = Object.keys(pending);
    pending = {};
    try { commitBumps(list); dirty = {}; } catch (e) { /* giữ dirty: tiếp tục đọc thẳng trang tính */ throw e; }
  }

  function readAll(t) {
    if (memo[t]) return memo[t];
    var c = NOCACHE[t] || dirty[t] ? null : cacheSvc(), ver = c ? verOf(t) : null;
    if (c && ver !== null) {
      var hit = cacheRead(t, ver, c);
      if (hit) { memo[t] = hit; return hit; }
    }
    var vals = sheet(t).getDataRange().getValues();
    var head = vals[0], defs = head.map(function (h) { return colDef(t, h); });
    var rows = [];
    for (var i = 1; i < vals.length; i++) {
      var o = {}, empty = true;
      for (var j = 0; j < head.length; j++) {
        var v = coerce(defs[j], vals[i][j]);
        if (v !== '') empty = false;
        o[head[j]] = v;
      }
      if (empty) continue;
      o.__row = i + 1;
      rows.push(o);
    }
    memo[t] = rows;
    if (c && ver !== null) cacheWrite(t, ver, rows, c);
    return rows;
  }

  /** Nạp sẵn nhiều bảng bằng vài lần gọi đệm gộp (nhanh hơn đọc từng bảng). Bảng nào chưa có trong đệm thì để đọc lười sau. */
  function preload(tables) {
    var c = cacheSvc();
    if (!c) return;
    try {
      var want = tables.filter(function (t) { return !memo[t] && !NOCACHE[t] && !dirty[t] && verOf(t) !== null; });
      if (!want.length) return;
      var metaKeys = want.map(function (t) { return 'm:' + t + ':' + verOf(t); }), metas = c.getAll(metaKeys), keys = [], ok = [];
      want.forEach(function (t, i) {
        var m = metas[metaKeys[i]];
        if (!m) return;
        ok.push(t);
        for (var k = 0; k < parseInt(m, 10); k++) keys.push('d:' + t + ':' + verOf(t) + ':' + k);
      });
      var got = c.getAll(keys);
      ok.forEach(function (t) {
        var ver = verOf(t), rows = parseChunks(t, ver, metas['m:' + t + ':' + ver], got);
        if (rows) memo[t] = rows;
      });
    } catch (e) { /* bỏ qua: sẽ đọc lười */ }
  }

  /** Bỏ toàn bộ đệm (dùng sau khi ai đó sửa trực tiếp trong Google Sheet, hoặc sau khi cập nhật cấu trúc). */
  function flushCache() {
    commitBumps(Object.keys(SCHEMA));
    memo = {};
  }

  return {
    SYS_TAIL: SYS_TAIL,

    /** Chạy fn trong khóa ghi. Đọc lại dữ liệu mới nhất khi vào. */
    tx: function (fn) {
      if (depth > 0) return fn();
      var lock = LockService.getScriptLock();
      lock.waitLock(30000);
      depth++;
      try { memo = {}; heads = {}; vers = null; pending = {}; dirty = {}; return fn(); }
      finally {
        try { flushPending(); }
        finally { depth--; lock.releaseLock(); }
      }
    },

    preload: preload,
    flushCache: flushCache,
    all: function (t) { return readAll(t); },
    find: function (t, pred) { var r = readAll(t); for (var i = 0; i < r.length; i++) if (pred(r[i])) return r[i]; return null; },
    filter: function (t, pred) { return readAll(t).filter(pred); },
    get: function (t, id) { return Db.find(t, function (r) { return r.id === id; }); },

    insertMany: function (t, rows, actor) {
      if (!rows.length) return [];
      var head = header(t), s = sheet(t), now = Util.nowIso(), out = [], mat = [];
      rows.forEach(function (r) {
        var o = {};
        Object.keys(r).forEach(function (k) { if (k.indexOf('__') !== 0) o[k] = r[k]; });
        o.id = o.id || Util.uuid();
        o.created_at = now; o.created_by = actor || ''; o.updated_at = now; o.updated_by = actor || '';
        out.push(o);
        mat.push(head.map(function (h) { var v = o[h]; return v === undefined || v === null ? '' : v; }));
      });
      var start = s.getLastRow() + 1, need = start + mat.length - 1;
      if (s.getMaxRows() < need) s.insertRowsAfter(s.getMaxRows(), need - s.getMaxRows());
      s.getRange(start, 1, mat.length, head.length).setValues(mat);
      invalidate(t);
      return out;
    },

    /** updates: [{ id, patch }]. Ghi lại toàn bộ vùng dữ liệu bằng một lần setValues. */
    updateMany: function (t, updates, actor) {
      if (!updates.length) return;
      var s = sheet(t), vals = s.getDataRange().getValues(), head = vals[0];
      var idc = head.indexOf('id'), idx = {}, now = Util.nowIso();
      for (var i = 1; i < vals.length; i++) idx[vals[i][idc]] = i;
      updates.forEach(function (u) {
        var i2 = idx[u.id];
        if (i2 === undefined) throw new AppError('NOT_FOUND', 'Không tìm thấy bản ghi ' + u.id + ' trong ' + t);
        Object.keys(u.patch).forEach(function (k) {
          var j = head.indexOf(k);
          if (j < 0 || k === 'id' || k.indexOf('__') === 0) return;
          vals[i2][j] = u.patch[k] === undefined || u.patch[k] === null ? '' : u.patch[k];
        });
        vals[i2][head.indexOf('updated_at')] = now;
        vals[i2][head.indexOf('updated_by')] = actor || '';
      });
      s.getRange(1, 1, vals.length, head.length).setValues(vals);
      invalidate(t);
    },

    removeMany: function (t, ids) {
      var set = {};
      ids.forEach(function (i) { set[i] = true; });
      var rows = readAll(t).filter(function (r) { return set[r.id]; })
        .map(function (r) { return r.__row; }).sort(function (a, b) { return b - a; });
      var s = sheet(t);
      rows.forEach(function (n) { s.deleteRow(n); });
      invalidate(t);
    },

    /** Tạo spreadsheet CSDL (nếu chưa có) và đảm bảo đủ sheet/cột/định dạng. */
    createIfMissing: function () {
      var props = PropertiesService.getScriptProperties();
      if (!props.getProperty('DB_ID')) {
        var created = SpreadsheetApp.create('LUONG-VASCHOOLS-DB');
        props.setProperty('DB_ID', created.getId());
        ssRef = null;
      }
      return props.getProperty('DB_ID');
    },

    ensureSheets: function () {
      var book = ss(), report = [];
      Object.keys(SCHEMA).forEach(function (t) {
        var s = book.getSheetByName(t), want = wantedHeader(t);
        if (!s) { s = book.insertSheet(t); report.push('tạo sheet ' + t); }
        if (s.getLastRow() === 0) {
          if (s.getMaxColumns() < want.length) s.insertColumnsAfter(s.getMaxColumns(), want.length - s.getMaxColumns());
          s.getRange(1, 1, 1, want.length).setValues([want]);
        } else {
          var cur = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
          var add = want.filter(function (h) { return cur.indexOf(h) < 0; });
          if (add.length) {
            if (s.getMaxColumns() < cur.length + add.length) s.insertColumnsAfter(s.getMaxColumns(), cur.length + add.length - s.getMaxColumns());
            s.getRange(1, cur.length + 1, 1, add.length).setValues([add]);
            report.push(t + ': thêm cột ' + add.join(','));
          }
        }
        var head = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
        head.forEach(function (h, j) {
          var def = colDef(t, h), fmt = '@';
          if (def && NUMERIC[def.t]) fmt = def.t === 'money' ? '#,##0' : 'General';
          s.getRange(1, j + 1, s.getMaxRows(), 1).setNumberFormat(fmt);
        });
        s.getRange(1, 1, 1, head.length).setFontWeight('bold');
        s.setFrozenRows(1);
      });
      var def = book.getSheetByName('Sheet1') || book.getSheetByName('Trang tính1');
      if (def && book.getSheets().length > 1) book.deleteSheet(def);
      heads = {}; memo = {};
      flushCache();
      return report;
    },

    reset: function () { memo = {}; heads = {}; ssRef = null; depth = 0; vers = null; pending = {}; dirty = {}; }
  };
})();
