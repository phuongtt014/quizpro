/**
 * Đọc văn bản dán từ Excel/Google Sheets (TSV) hoặc CSV. KHÔNG trim ô nào:
 * việc phát hiện khoảng trắng thừa là nhiệm vụ của Strict.checkCell.
 * Trả về { delim, rows: [{ n: số thứ tự bản ghi (1 = tiêu đề), cells: [...] }] }.
 */
var Csv = {
  parse: function (text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM đầu file là do mã hóa, không phải lỗi dữ liệu
    var firstLine = text.split(/\r?\n/)[0];
    var count = function (ch) { return firstLine.split(ch).length - 1; };
    var delim = count('\t') > 0 ? '\t' : (count(';') > count(',') ? ';' : ',');

    var rows = [], cells = [], cur = '', inQ = false, i = 0, n = 1, quoted = false;
    function endCell() { cells.push(cur); cur = ''; quoted = false; }
    function endRow() { endCell(); rows.push({ n: n++, cells: cells }); cells = []; }

    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        cur += c; i++; continue;
      }
      if (c === '"' && cur === '' && !quoted) { inQ = true; quoted = true; i++; continue; }
      if (c === delim) { endCell(); i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { endRow(); i++; continue; }
      cur += c; i++;
    }
    if (cur !== '' || cells.length > 0 || quoted) endRow();

    return { delim: delim, rows: rows };
  }
};
