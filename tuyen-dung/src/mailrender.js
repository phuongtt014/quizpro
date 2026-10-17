/* ---- Bộ dựng thư HTML (dùng chung: giao diện xem trước và Code.gs). Cú pháp: # Tiêu đề · ## Mục · | bảng | · - gạch đầu dòng (thụt 2 dấu cách = cấp con) · > ô lưu ý · ~ căn phải · --- đường kẻ · **đậm** · *nghiêng* · <br> xuống dòng */
function mrEsc(s) { return String(s).normalize('NFC').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
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
    if (/^@\s+/.test(tr)) {
      flush(); var bt = [], re = /\[([^\]]+)\]\(([^)]*)\)(?:\{(ok|no)\})?/g, mb;
      while (i < lines.length && /^@\s+/.test(lines[i])) { re.lastIndex = 0; while ((mb = re.exec(lines[i]))) bt.push({ label: mb[1], url: mb[2], kind: mb[3] || '' }); i++; }
      out.push({ t: 'btn', v: bt }); continue;
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
/** Địa chỉ nút: chỉ cho phép mailto: và https:; mailto được mã hoá phần tiêu đề/nội dung (\\n = xuống dòng). */
function mrHref(u) {
  u = String(u || '').trim();
  if (/^https?:\/\//i.test(u)) return mrEsc(u);
  if (!/^mailto:/i.test(u)) return '#';
  var q = u.indexOf('?'), head = q < 0 ? u : u.slice(0, q), rest = q < 0 ? '' : u.slice(q + 1);
  var ps = rest ? rest.split('&').map(function (kv) {
    var e = kv.indexOf('='); if (e < 0) return kv;
    return kv.slice(0, e) + '=' + encodeURIComponent(kv.slice(e + 1).replace(/\\n/g, '\n'));
  }).join('&') : '';
  return mrEsc(head + (ps ? '?' + ps : ''));
}
/** brand: {color, lines:[...], logo:boolean}. */
function mrRender(text, brand) {
  brand = brand || {};
  var col = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#8a1538';
  var line = '#ead9de', tint = '#fdf6f7', I = function (s) { return mrInline(s, col); };
  var h = '';
  var bl = (brand.lines || []).filter(function (x) { return String(x).trim(); });
  if (bl.length || brand.logo) {
    h += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px"><tr><td valign="top" style="font-family:Times New Roman,Times,serif;font-size:13px;line-height:1.55;font-weight:bold;color:' + col + '">' +
      bl.map(function (x) { return /^website/i.test(String(x).trim()) ? '<span style="color:#666">' + mrEsc(x) + '</span>' : mrEsc(x); }).join('<br>') + '</td>' +
      (brand.logo ? '<td width="110" align="right" valign="top"><img src="cid:vaslogo" width="90" alt="logo" style="display:block;border:0;max-width:90px;height:auto"></td>' : '') + '</tr></table>';
  }
  mrParse(text).forEach(function (b) {
    if (b.t === 'h1') h += '<h1 style="text-align:center;font-size:23px;line-height:1.3;color:' + col + ';margin:26px 0 20px;font-weight:bold">' + I(b.v) + '</h1>';
    else if (b.t === 'h2') h += '<h2 style="font-size:15px;line-height:1.4;color:' + col + ';margin:22px 0 10px;font-weight:bold">' + I(b.v) + '</h2>';
    else if (b.t === 'hr') h += '<hr style="border:0;border-top:1px solid ' + line + ';margin:18px 0">';
    else if (b.t === 'p') h += '<p style="margin:0 0 13px">' + I(b.v) + '</p>';
    else if (b.t === 'right') h += '<table role="presentation" align="right" width="300" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 0"><tr><td align="center" style="text-align:center;line-height:1.65;font-size:15px">' + b.v.map(function (x) { return '<div style="margin:0 0 3px">' + I(x) + '</div>'; }).join('') + '</td></tr></table><div style="clear:both;height:1px;line-height:1px">&nbsp;</div>';
    else if (b.t === 'btn' && brand.print) h += '<div style="margin:14px 0 10px;font-size:15px">' + b.v.map(function (x) { return '<span style="display:inline-block;margin-right:34px">&#9744; <b>' + mrEsc(String(x.label).replace(/^[^A-Za-zÀ-ỹ]+/, '')) + '</b></span>'; }).join('') + '</div><div style="margin:0 0 10px">Lý do (nếu từ chối): ..................................................................................................</div>';
    else if (b.t === 'btn') h += '<div style="text-align:center;margin:18px 0 8px">' + b.v.map(function (x) {
      var bg = x.kind === 'no' ? '#b42318' : x.kind === 'ok' ? '#1e7e34' : col;
      return '<a href="' + mrHref(x.url) + '" style="display:inline-block;margin:4px 8px;padding:13px 30px;background:' + bg + ';color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;border-radius:6px;font-family:Arial,Helvetica,sans-serif">' + mrEsc(x.label) + '</a>';
    }).join('') + '</div>';
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
  if (brand.print) return '<div style="font-family:Times New Roman,Times,serif;font-size:15px;line-height:1.6;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact">' + h + '</div>';
  return '<div style="background:#f5f0f2;padding:22px 10px"><div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid ' + line + ';padding:30px 38px;font-family:Times New Roman,Times,serif;font-size:15px;line-height:1.65;color:#222222">' + h + '</div></div>';
}
/** Bản văn bản thuần (cho phần dự phòng / mở bằng ứng dụng email / sao chép). */
function mrPlain(text) {
  var out = [];
  mrParse(text).forEach(function (b) {
    var P = function (s) { return String(s).replace(/<br>/g, '\n').replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1$2'); };
    if (b.t === 'h1' || b.t === 'h2') out.push(P(b.v).toUpperCase());
    else if (b.t === 'p') out.push(P(b.v));
    else if (b.t === 'hr') out.push('--------');
    else if (b.t === 'btn') out.push('Phản hồi (trả lời email này): ' + b.v.map(function (x) { return x.label; }).join(' / '));
    else if (b.t === 'note' || b.t === 'right') out.push(b.v.map(P).join('\n'));
    else if (b.t === 'ul') out.push(b.v.map(function (it) { return (it.lv ? '    ◦ ' : '• ') + P(it.v); }).join('\n'));
    else if (b.t === 'tbl') out.push(b.v.slice(1).map(function (r) { return '• ' + P(r[0] || '') + (r[1] ? ': ' + P(r.slice(1).join(' – ')) : ''); }).join('\n'));
  });
  return out.join('\n\n');
}
