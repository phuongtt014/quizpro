/**
 * Kiểm tra dữ liệu theo SCHEMA. Dùng chung cho form nhập tay và nhập CSV.
 * Nguyên tắc: có bất kỳ lỗi nào thì KHÔNG ghi gì cả (all-or-nothing).
 */
var Validate = (function () {
  var MAX_ERRORS = 500, MAX_ROWS = 5000;

  function makeEnv() {
    var cache = {};
    return {
      refSet: function (spec) {
        if (cache[spec]) return cache[spec];
        var p = spec.split('.'), set = Object.create(null);
        Db.all(p[0]).forEach(function (r) { if (r[p[1]] !== '') set[String(r[p[1]])] = true; });
        cache[spec] = set;
        return set;
      }
    };
  }

  function keyOf(T, r) { return T.key.map(function (k) { return String(r[k]); }).join('\u0001'); }
  function keyText(T, r) { return T.key.filter(function (k) { return k !== T.ctx; }).map(function (k) { return r[k]; }).join(' / '); }
  function tFrom(r) { return r.hieu_luc_tu; }
  function tTo(r) { return r.hieu_luc_den || Util.MAX_DATE; }
  function span(r) { return Util.displayDate(r.hieu_luc_tu) + ' – ' + (r.hieu_luc_den ? Util.displayDate(r.hieu_luc_den) : 'nay'); }

  function checkOverlap(T, parsed, existing, updatedIds, push) {
    var groups = {};
    function gk(r) { return T.temporal.group.map(function (k) { return r[k]; }).join('\u0001'); }
    existing.forEach(function (r) {
      if (updatedIds[r.id]) return;
      (groups[gk(r)] = groups[gk(r)] || []).push({ r: r, own: false });
    });
    parsed.forEach(function (r) { (groups[gk(r)] = groups[gk(r)] || []).push({ r: r, own: true }); });
    Object.keys(groups).forEach(function (g) {
      var list = groups[g].sort(function (a, b) { return a.r.hieu_luc_tu < b.r.hieu_luc_tu ? -1 : 1; });
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          if (tFrom(list[j].r) > tTo(list[i].r)) break;
          [list[i], list[j]].forEach(function (x, idx) {
            if (x.own) {
              var other = idx === 0 ? list[j] : list[i];
              push(x.r.__n, 'hieu_luc_tu', Util.displayDate(x.r.hieu_luc_tu),
                'Khoảng hiệu lực (' + span(x.r) + ') trùng với ' + (other.own ? 'dòng ' + other.r.__n + ' trong file' : 'bản ghi đang có') + ' (' + span(other.r) + ')');
            }
          });
        }
      }
    });
  }

  /**
   * raws: [{ n, vals: { khóa_cột: chuỗi thô } }]
   * opts: { mode: 'insert'|'upsert', selfId, user }
   * -> { ok, errors: [{ n, field, label, value, msg }], rows: [giá trị chuẩn + __n, __update] }
   */
  function rows(table, raws, ctx, opts) {
    opts = opts || {};
    var T = SCHEMA[table], env = makeEnv(), errors = [], out = [], truncated = false;
    function push(n, field, value, msg) {
      if (errors.length >= MAX_ERRORS) { truncated = true; return; }
      var c = field ? SCHEMA[table].cols.filter(function (x) { return x.k === field; })[0] : null;
      errors.push({ n: n, field: field || '', label: c ? c.l : '', value: value === undefined ? '' : value, msg: msg });
    }

    if (T.ctx && !(ctx && ctx[T.ctx])) {
      push(0, T.ctx, '', 'Thiếu ngữ cảnh đề án'); return { ok: false, errors: errors, rows: [] };
    }
    var existing = Db.all(table).filter(function (r) { return !T.ctx || r[T.ctx] === ctx[T.ctx]; });
    var existKey = {};
    existing.forEach(function (r) { if (T.key.length) existKey[keyOf(T, r)] = r; });

    raws.forEach(function (raw) {
      var parsed = { __n: raw.n }, bad = false;
      T.cols.forEach(function (c) {
        if (c.k === T.ctx) { parsed[c.k] = ctx[c.k]; return; }
        var v = raw.vals[c.k] === undefined ? '' : raw.vals[c.k];
        if (v !== '') {
          var ce = Strict.checkCell(v, c.t === 'longtext');
          if (ce) { push(raw.n, c.k, Strict.show(v), ce); bad = true; return; }
          if (c.ro && !opts.system) { push(raw.n, c.k, Strict.show(v), 'Cột này do hệ thống quản lý, không nhập trực tiếp'); bad = true; return; }
        }
        var r = Strict.parseValue(c, v, env);
        if (r.e) { push(raw.n, c.k, Strict.show(v), r.e); bad = true; } else parsed[c.k] = r.v;
      });
      if (!bad && T.temporal && parsed.hieu_luc_den && parsed.hieu_luc_den < parsed.hieu_luc_tu) {
        push(raw.n, 'hieu_luc_den', Util.displayDate(parsed.hieu_luc_den), 'Hiệu lực đến phải ≥ Hiệu lực từ'); bad = true;
      }
      if (!bad && T.check) {
        var ce2 = T.check(parsed);
        if (ce2) { push(raw.n, '', '', ce2); bad = true; }
      }
      if (!bad && opts.user && T.scope) {
        var sf = Auth.scopeFn(table);
        if (sf && !Auth.canRow(opts.user, T.perm.w, sf(parsed))) {
          push(raw.n, '', '', 'Ngoài phạm vi dữ liệu bạn được phép ghi'); bad = true;
        }
      }
      if (!bad) out.push(parsed);
    });

    var seen = {}, updatedIds = {}, uniqSeen = {};
    out.forEach(function (r) {
      if (!T.key.length) return;
      var k = keyOf(T, r);
      if (seen[k]) { push(r.__n, '', keyText(T, r), 'Trùng khóa với dòng ' + seen[k] + ' trong file'); r.__bad = true; return; }
      seen[k] = r.__n;
      var ex = existKey[k];
      if (opts.selfId) {
        if (ex && ex.id !== opts.selfId) { push(r.__n, '', keyText(T, r), 'Đã tồn tại bản ghi khác có cùng khóa'); r.__bad = true; }
        else r.__update = opts.selfId;
      } else if (ex) {
        if (opts.mode === 'upsert') r.__update = ex.id;
        else { push(r.__n, '', keyText(T, r), 'Đã tồn tại trong hệ thống (khóa: ' + keyText(T, r) + '). Chọn chế độ "Thêm hoặc cập nhật" nếu muốn ghi đè'); r.__bad = true; }
      }
      if (r.__update) updatedIds[r.__update] = true;
    });

    T.cols.filter(function (c) { return c.uniq; }).forEach(function (c) {
      out.forEach(function (r) {
        var v = r[c.k];
        if (v === '' || r.__bad) return;
        var key = c.k + '\u0001' + v;
        if (uniqSeen[key]) { push(r.__n, c.k, v, 'Trùng giá trị với dòng ' + uniqSeen[key] + ' trong file'); r.__bad = true; return; }
        uniqSeen[key] = r.__n;
        var dup = existing.filter(function (e) { return e[c.k] === v && e.id !== r.__update && e.id !== opts.selfId; })[0];
        if (dup) { push(r.__n, c.k, v, 'Đã được dùng bởi bản ghi khác'); r.__bad = true; }
      });
    });

    if (T.checkSet) T.checkSet(out.filter(function (r) { return !r.__bad; }), existing, updatedIds, function (n, f, v, m) { push(n, f, v, m); });

    var closes = [];
    if (T.temporal) {
      var good = out.filter(function (r) { return !r.__bad; }), against = existing;
      if (opts.autoClose) {
        // Bản ghi đang mở sẽ được kết thúc ngay trước ngày bắt đầu của bản ghi mới (chỉ áp dụng khi lưu từ form).
        against = existing.map(function (r) {
          if (r.hieu_luc_den) return r;
          var starts = good.filter(function (p) {
            return p.hieu_luc_tu > r.hieu_luc_tu && T.temporal.group.every(function (k) { return p[k] === r[k]; });
          }).map(function (p) { return p.hieu_luc_tu; }).sort();
          if (!starts.length) return r;
          var end = Util.addDays(starts[0], -1);
          closes.push({ id: r.id, den: end });
          var c = {};
          Object.keys(r).forEach(function (k) { c[k] = r[k]; });
          c.hieu_luc_den = end;
          return c;
        });
      }
      checkOverlap(T, good, against, updatedIds, function (n, f, v, m) { push(n, f, v, m); });
    }

    return { ok: errors.length === 0, errors: errors, truncated: truncated, rows: out, closes: closes };
  }

  /** Chuẩn bị mô tả cột cho giao diện: tên, kiểu, bắt buộc, giá trị hợp lệ. */
  function spec(table) {
    var T = SCHEMA[table];
    var typeName = { text: 'Văn bản', longtext: 'Văn bản dài', email: 'Email (chữ thường)', int: 'Số nguyên', num: 'Số (vd 1,1)',
      money: 'Số tiền (vd 6000000)', pct: 'Tỷ lệ (vd 5%)', date: 'Ngày dd/MM/yyyy', enum: 'Chọn từ danh sách', ref: 'Phải có trong danh mục' };
    return T.cols.filter(function (c) { return c.k !== T.ctx && !c.ro; }).map(function (c) {
      return { k: c.k, label: c.l, type: typeName[c.t], req: !!c.req && c.def === undefined, ex: c.ex,
        values: c.t === 'enum' ? c.values : (c.t === 'ref' ? 'Mã trong ' + c.ref : (c.hint || '')) };
    });
  }

  function importText(table, text, ctx, opts) {
    var T = SCHEMA[table], errors = [];
    if (!text || text.trim() === '') return { ok: false, errors: [{ n: 0, field: '', label: '', value: '', msg: 'Chưa có dữ liệu để kiểm tra' }], rows: [] };
    var parsed = Csv.parse(text);
    if (parsed.rows.length < 2) return { ok: false, errors: [{ n: 1, field: '', label: '', value: '', msg: 'Cần có dòng tiêu đề và ít nhất 1 dòng dữ liệu' }], rows: [] };

    var cols = T.cols.filter(function (c) { return c.k !== T.ctx && !c.ro; });
    var byName = {};
    cols.forEach(function (c) { byName[c.l] = c; byName[c.k] = c; });
    var names = Object.keys(byName);
    var map = [], used = {};
    parsed.rows[0].cells.forEach(function (h, j) {
      var ce = Strict.checkCell(h);
      if (ce) { errors.push({ n: 1, field: '', label: 'Cột ' + (j + 1), value: Strict.show(h), msg: 'Tiêu đề: ' + ce }); map.push(null); return; }
      var c = byName[h];
      if (!c) {
        var sg = Strict.suggest(h, names);
        errors.push({ n: 1, field: '', label: 'Cột ' + (j + 1), value: Strict.show(h), msg: 'Tiêu đề không có trong mẫu' + (sg ? '. Ý bạn là "' + sg + '"?' : '') });
        map.push(null); return;
      }
      if (used[c.k]) { errors.push({ n: 1, field: c.k, label: c.l, value: h, msg: 'Cột bị lặp trong file' }); map.push(null); return; }
      used[c.k] = true; map.push(c.k);
    });
    cols.forEach(function (c) {
      if (c.req && c.def === undefined && !used[c.k]) errors.push({ n: 1, field: c.k, label: c.l, value: '', msg: 'Thiếu cột bắt buộc "' + c.l + '"' });
    });
    if (errors.length) return { ok: false, errors: errors, rows: [] };

    var raws = [];
    for (var i = 1; i < parsed.rows.length; i++) {
      var pr = parsed.rows[i];
      if (pr.cells.length === 1 && pr.cells[0] === '') continue;
      if (pr.cells.length !== map.length) {
        errors.push({ n: pr.n, field: '', label: '', value: '', msg: 'Số cột không khớp tiêu đề (có ' + pr.cells.length + ', cần ' + map.length + ')' });
        continue;
      }
      var vals = {};
      map.forEach(function (k, j) { vals[k] = pr.cells[j]; });
      raws.push({ n: pr.n, vals: vals });
    }
    if (raws.length > MAX_ROWS) return { ok: false, errors: [{ n: 0, field: '', label: '', value: '', msg: 'Tối đa ' + MAX_ROWS + ' dòng mỗi lần nhập' }], rows: [] };
    var res = rows(table, raws, ctx, opts);
    res.errors = errors.concat(res.errors);
    res.ok = res.errors.length === 0;
    res.total = raws.length;
    res.inserts = res.rows.filter(function (r) { return !r.__update; }).length;
    res.updates = res.rows.length - res.inserts;
    return res;
  }

  function csvCell(v) {
    var s = String(v === undefined || v === null ? '' : v);
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /**
   * Mẫu nhập: tiêu đề cột đúng như bộ kiểm tra yêu cầu + một dòng ví dụ hợp lệ (cột tham chiếu lấy mã thật đang có;
   * hai cột cùng tham chiếu một danh mục lấy hai mã khác nhau nếu có). Trả { header, example, tsv, csv }.
   */
  function template(table, ctx) {
    var T = SCHEMA[table], env = makeEnv(), used = {};
    var cols = T.cols.filter(function (c) { return c.k !== T.ctx && !c.ro; });
    var example = cols.map(function (c) {
      if (c.ex !== undefined) return c.ex;
      if (!c.req) return '';
      switch (c.t) {
        case 'enum': return c.values[0];
        case 'ref':
          var keys = Object.keys(env.refSet(c.ref));
          used[c.ref] = (used[c.ref] || 0) + 1;
          return keys.length ? keys[Math.min(used[c.ref] - 1, keys.length - 1)] : '';
        case 'date': return '01/09/2026';
        case 'int': return String(Math.max(c.min === undefined ? 1 : c.min, 1));
        case 'num': return '1,1';
        case 'money': return '6000000';
        case 'pct': return '5%';
        case 'email': return 'ten@vaschools.edu.vn';
        default: return 'Ví dụ';
      }
    });
    var header = cols.map(function (c) { return c.l; });
    return { header: header, example: example, tsv: header.join('\t') + '\n' + example.join('\t'),
      csv: header.map(csvCell).join(',') + '\n' + example.map(csvCell).join(',') };
  }

  function fmtOut(c, v) {
    if (v === '' || v === undefined || v === null) return '';
    switch (c.t) {
      case 'date': return Util.displayDate(v);
      case 'num': return String(v).replace('.', ',');
      case 'pct': return String(Math.round(Number(v) * 1e8) / 1e6).replace('.', ',') + '%';
      default: return String(v);
    }
  }

  /** Xuất dữ liệu đúng định dạng mẫu nhập (tiêu đề = nhãn cột nhập, giá trị theo định dạng nghiêm ngặt) để nhập lại được. */
  function exportRows(table, list) {
    var T = SCHEMA[table];
    var cols = T.cols.filter(function (c) { return c.k !== T.ctx && !c.ro; });
    var header = cols.map(function (c) { return c.l; });
    var data = list.map(function (r) { return cols.map(function (c) { return fmtOut(c, r[c.k]); }); });
    function cell(v, sep) { return /["\n\r]/.test(v) || v.indexOf(sep) >= 0 ? '"' + v.replace(/"/g, '""') + '"' : v; }
    function join(sep) { return [header].concat(data).map(function (a) { return a.map(function (v) { return cell(v, sep); }).join(sep); }).join('\n'); }
    return { header: header, tsv: join('\t'), csv: join(','), count: data.length };
  }

  return { rows: rows, importText: importText, spec: spec, template: template, exportRows: exportRows };
})();
