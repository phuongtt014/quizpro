/**
 * SheetDB.gs
 * Lớp truy xuất dữ liệu chung: mở Spreadsheet, đảm bảo sheet/tiêu đề tồn tại,
 * đọc/ghi theo tên cột (không phụ thuộc thứ tự cột vật lý).
 */

function getDb_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SPREADSHEET_ID_PROPERTY_KEY);
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty(SPREADSHEET_ID_PROPERTY_KEY, active.getId());
    return active;
  }
  // Chưa có DB nào -> tạo mới
  var ss = SpreadsheetApp.create('QuizPro - CSDL Quản lý công việc nhóm');
  props.setProperty(SPREADSHEET_ID_PROPERTY_KEY, ss.getId());
  return ss;
}

function getSheet_(sheetName) {
  var ss = getDb_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headerKey = Object.keys(SHEET_NAMES).filter(function (k) {
      return SHEET_NAMES[k] === sheetName;
    })[0];
    var headers = COLUMNS[headerKey] || [];
    if (headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/** Đảm bảo mọi sheet + header cần thiết đã tồn tại. Gọi khi khởi tạo hệ thống. */
function ensureAllSheets_() {
  Object.keys(SHEET_NAMES).forEach(function (key) {
    getSheet_(SHEET_NAMES[key]);
  });
}

function getHeaderMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function (h, idx) {
    if (h) map[h] = idx;
  });
  return map;
}

/** Đọc toàn bộ sheet thành mảng object {tenCot: giaTri} */
function readAll_(sheetName) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return [];
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var obj = { _row: r + 2 };
    var isEmpty = true;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      obj[headers[c]] = values[r][c];
      if (values[r][c] !== '' && values[r][c] !== null) isEmpty = false;
    }
    if (!isEmpty) out.push(obj);
  }
  return out;
}

/** Thêm 1 dòng theo object {tenCot: giaTri} */
function appendRow_(sheetName, obj) {
  var sheet = getSheet_(sheetName);
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = headers.map(function (h) {
    return obj.hasOwnProperty(h) ? obj[h] : '';
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/** Tìm 1 dòng theo điều kiện field=value, trả về object hoặc null */
function findOne_(sheetName, field, value) {
  var rows = readAll_(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][field]) === String(value)) return rows[i];
  }
  return null;
}

/** Tìm nhiều dòng theo điều kiện field=value */
function findMany_(sheetName, field, value) {
  var rows = readAll_(sheetName);
  return rows.filter(function (r) {
    return String(r[field]) === String(value);
  });
}

/** Cập nhật 1 dòng (theo số dòng vật lý _row) với các field mới - merge object */
function updateRow_(sheetName, rowIndex, patch) {
  var sheet = getSheet_(sheetName);
  var map = getHeaderMap_(sheet);
  Object.keys(patch).forEach(function (key) {
    if (map.hasOwnProperty(key)) {
      sheet.getRange(rowIndex, map[key] + 1).setValue(patch[key]);
    }
  });
}

/** Cập nhật theo điều kiện khoá chính keyField=keyValue, trả về true nếu tìm thấy */
function updateWhere_(sheetName, keyField, keyValue, patch) {
  var row = findOne_(sheetName, keyField, keyValue);
  if (!row) return false;
  updateRow_(sheetName, row._row, patch);
  return true;
}
