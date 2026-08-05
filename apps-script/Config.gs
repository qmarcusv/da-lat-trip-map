var APP = Object.freeze({
  spreadsheetIdProperty: "SPREADSHEET_ID",
  usersProperty: "USERS_JSON",
  initialPasswordProperty: "INITIAL_PASSWORD",
  sessionHours: 6,
  maxLoginAttempts: 8,
  loginWindowSeconds: 900,
  users: Object.freeze([
    { username: "trucnhi", displayName: "Trúc Nhi", role: "admin" },
    { username: "thao", displayName: "Thảo", role: "user" },
    { username: "tuyen", displayName: "Tuyền", role: "user" },
    { username: "ngocnhi", displayName: "Ngọc Nhi", role: "user" },
  ]),
  personalSheets: Object.freeze({
    trucnhi: "Plan_trucnhi",
    thao: "Plan_thao",
    tuyen: "Plan_tuyen",
    ngocnhi: "Plan_ngocnhi",
  }),
  headers: Object.freeze({
    Locations: ["id", "name", "categories", "primaryCategory", "address", "googleMapsUrl", "latitude", "longitude", "estimatedCost", "openingHours", "note", "status", "createdBy", "createdAt", "updatedBy", "updatedAt"],
    SharedPlan: ["planItemId", "locationId", "day", "period", "plannedTime", "order", "note", "updatedBy", "updatedAt"],
    PersonalPlan: ["selectionId", "locationId", "day", "period", "plannedTime", "vote", "note", "updatedAt"],
    AuditLog: ["timestamp", "username", "action", "entityType", "entityId", "summary"],
    Sessions: ["tokenHash", "username", "role", "expiresAt", "createdAt"],
  }),
});

var CATEGORY_VALUES = Object.freeze(["food", "photo", "sightseeing", "homestay"]);
var DAY_VALUES = Object.freeze(["unassigned", "1", "2", "3"]);
var PERIOD_VALUES = Object.freeze(["unassigned", "morning", "afternoon", "evening"]);

function AppError(code, message) {
  this.name = "AppError";
  this.code = code;
  this.message = message;
  this.stack = new Error(message).stack;
}
AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

function nowIso_() {
  return new Date().toISOString();
}

function newId_() {
  return Utilities.getUuid();
}

function getSpreadsheet_() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty(APP.spreadsheetIdProperty);
  if (!spreadsheetId) {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (!active) throw new AppError("NOT_CONFIGURED", "Chưa cấu hình Spreadsheet ID. Hãy chạy setupProject().");
    spreadsheetId = active.getId();
    properties.setProperty(APP.spreadsheetIdProperty, spreadsheetId);
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function withScriptLock_(callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new AppError("BUSY", "Hệ thống đang bận ghi dữ liệu. Vui lòng thử lại.");
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}
