function setupProject() {
  return withScriptLock_(function () {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new AppError("NO_SPREADSHEET", "Hãy mở Apps Script từ Google Sheet bằng Extensions > Apps Script.");
    spreadsheet.setSpreadsheetTimeZone(APP.timeZone);
    PropertiesService.getScriptProperties().setProperty(APP.spreadsheetIdProperty, spreadsheet.getId());

    ensureSheet_(spreadsheet, "Locations", APP.headers.Locations);
    ensureSheet_(spreadsheet, "SharedPlan", APP.headers.SharedPlan);
    Object.keys(APP.personalSheets).forEach(function (username) {
      ensureSheet_(spreadsheet, APP.personalSheets[username], APP.headers.PersonalPlan);
    });
    ensureSheet_(spreadsheet, "AuditLog", APP.headers.AuditLog);
    ensureSheet_(spreadsheet, "Sessions", APP.headers.Sessions);

    if (!PropertiesService.getScriptProperties().getProperty(APP.usersProperty)) initializeUsers_();
    formatSheets_(spreadsheet);
    return "Đã tạo database và bốn tài khoản.";
  });
}

function ensureSheet_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var actual = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (actual.join("|") !== headers.join("|")) {
      throw new AppError("SCHEMA_MISMATCH", "Sai cột ở Sheet " + sheetName + ". Không tự ghi đè dữ liệu hiện có.");
    }
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function formatSheets_(spreadsheet) {
  Object.keys(APP.headers).forEach(function (key) {
    var names = key === "PersonalPlan" ? Object.keys(APP.personalSheets).map(function (username) { return APP.personalSheets[username]; }) : [key];
    names.forEach(function (name) {
      var sheet = spreadsheet.getSheetByName(name);
      if (!sheet) return;
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setBackground("#123c34").setFontColor("#ffffff").setFontWeight("bold");
      sheet.autoResizeColumns(1, sheet.getLastColumn());
    });
  });
}

function getSheet_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new AppError("MISSING_SHEET", "Không tìm thấy Sheet " + sheetName + ". Hãy chạy setupProject().");
  return sheet;
}

function getRows_(sheetName) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function (row) { return row.some(function (cell) { return cell !== ""; }); }).map(function (row) {
    var result = {};
    headers.forEach(function (header, index) { result[header] = serializeCell_(row[index]); });
    return result;
  });
}

function appendObject_(sheetName, headers, object) {
  getSheet_(sheetName).appendRow(headers.map(function (header) { return toCellValue_(object[header], header); }));
}

function updateObjectById_(sheetName, idField, id, patch) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) throw new AppError("NOT_FOUND", "Không tìm thấy dữ liệu cần sửa.");
  var headers = values[0].map(String);
  var idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw new AppError("SCHEMA_MISMATCH", "Sheet " + sheetName + " thiếu cột " + idField + ".");
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idIndex]) !== String(id)) continue;
    var current = {};
    headers.forEach(function (header, index) { current[header] = serializeCell_(values[rowIndex][index]); });
    var next = Object.assign({}, current, patch);
    sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([headers.map(function (header) { return toCellValue_(next[header], header); })]);
    return next;
  }
  throw new AppError("NOT_FOUND", "Không tìm thấy dữ liệu cần sửa.");
}

function deleteRowsWhere_(sheetName, predicate) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return 0;
  var headers = values[0].map(String);
  var rowsToDelete = [];
  values.slice(1).forEach(function (row, index) {
    var object = {};
    headers.forEach(function (header, column) { object[header] = serializeCell_(row[column]); });
    if (predicate(object)) rowsToDelete.push(index + 2);
  });
  rowsToDelete.reverse().forEach(function (rowNumber) { sheet.deleteRow(rowNumber); });
  return rowsToDelete.length;
}

function serializeCell_(value) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toCellValue_(value, header) {
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  if (value === undefined || value === null) return "";
  if (header === "plannedTime" && value !== "") return "'" + String(value);
  return value;
}

function audit_(username, action, entityType, entityId, summary) {
  appendObject_("AuditLog", APP.headers.AuditLog, {
    timestamp: nowIso_(), username: username, action: action,
    entityType: entityType, entityId: entityId || "", summary: cleanString_(summary, 300),
  });
}
