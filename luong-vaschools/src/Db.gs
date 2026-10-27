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

  function invalidate(t) { delete memo[t]; }

  function readAll(t) {
    if (memo[t]) return memo[t];
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
    return rows;
  }

  return {
    SYS_TAIL: SYS_TAIL,

    /** Chạy fn trong khóa ghi. Đọc lại dữ liệu mới nhất khi vào. */
    tx: function (fn) {
      if (depth > 0) return fn();
      var lock = LockService.getScriptLock();
      lock.waitLock(30000);
      depth++;
      try { memo = {}; heads = {}; return fn(); }
      finally { depth--; lock.releaseLock(); }
    },

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
      return report;
    },

    reset: function () { memo = {}; heads = {}; ssRef = null; depth = 0; }
  };
})();
