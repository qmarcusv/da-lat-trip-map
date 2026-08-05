function listLocations_() {
  return getRows_("Locations").filter(function (location) { return location.status === "active"; }).map(parseLocation_);
}

function createLocation_(session, payload) {
  var value = validateLocation_(payload, false);
  return withScriptLock_(function () {
    var timestamp = nowIso_();
    var location = Object.assign({}, value, {
      id: newId_(), status: "active", createdBy: session.username, createdAt: timestamp,
      updatedBy: session.username, updatedAt: timestamp,
    });
    appendObject_("Locations", APP.headers.Locations, location);
    audit_(session.username, "create", "location", location.id, location.name);
    return location;
  });
}

function updateLocation_(session, payload) {
  var value = validateLocation_(payload, true);
  return withScriptLock_(function () {
    var current = getRows_("Locations").filter(function (location) { return location.id === value.id && location.status === "active"; })[0];
    if (!current) throw new AppError("NOT_FOUND", "Không tìm thấy địa điểm.");
    var updated = updateObjectById_("Locations", "id", value.id, Object.assign({}, value, {
      updatedBy: session.username, updatedAt: nowIso_(),
    }));
    audit_(session.username, "update", "location", value.id, value.name);
    return parseLocation_(updated);
  });
}

function deleteLocation_(session, id) {
  requireAdmin_(session);
  id = cleanString_(id, 80);
  return withScriptLock_(function () {
    var updated = updateObjectById_("Locations", "id", id, {
      status: "deleted", updatedBy: session.username, updatedAt: nowIso_(),
    });
    audit_(session.username, "delete", "location", id, updated.name);
    return { id: id };
  });
}

function restoreLocation_(session, id) {
  requireAdmin_(session);
  id = cleanString_(id, 80);
  return withScriptLock_(function () {
    var updated = updateObjectById_("Locations", "id", id, {
      status: "active", updatedBy: session.username, updatedAt: nowIso_(),
    });
    audit_(session.username, "restore", "location", id, updated.name);
    return parseLocation_(updated);
  });
}

function getMyPlan_(session) {
  return getRows_(personalSheetFor_(session.username)).map(parsePlanItem_);
}

function upsertMyPlanItem_(session, payload) {
  var value = validatePlanItem_(payload, false);
  requireExistingLocation_(value.locationId);
  var sheetName = personalSheetFor_(session.username);
  return withScriptLock_(function () {
    var existing = getRows_(sheetName).filter(function (item) { return item.locationId === value.locationId; })[0];
    var saved;
    if (existing) {
      saved = updateObjectById_(sheetName, "selectionId", existing.selectionId, Object.assign({}, value, {
        selectionId: existing.selectionId, updatedAt: nowIso_(),
      }));
    } else {
      saved = Object.assign({}, value, { selectionId: newId_(), updatedAt: nowIso_() });
      appendObject_(sheetName, APP.headers.PersonalPlan, saved);
    }
    audit_(session.username, "upsert", "personal_plan", saved.selectionId, value.locationId);
    return parsePlanItem_(saved);
  });
}

function deleteMyPlanItem_(session, locationId) {
  locationId = cleanString_(locationId, 80);
  var sheetName = personalSheetFor_(session.username);
  return withScriptLock_(function () {
    var deleted = deleteRowsWhere_(sheetName, function (item) { return item.locationId === locationId; });
    if (!deleted) throw new AppError("NOT_FOUND", "Địa điểm chưa có trong lịch cá nhân.");
    audit_(session.username, "delete", "personal_plan", locationId, "Bỏ khỏi lịch cá nhân");
    return { locationId: locationId };
  });
}

function getVoteSummary_() {
  var totals = {};
  Object.keys(APP.personalSheets).forEach(function (username) {
    getRows_(APP.personalSheets[username]).forEach(function (item) {
      if (item.vote === true || String(item.vote).toLowerCase() === "true") totals[item.locationId] = (totals[item.locationId] || 0) + 1;
    });
  });
  return totals;
}

function getSharedPlan_() {
  return getRows_("SharedPlan").map(parseSharedPlanItem_);
}

function upsertSharedPlanItem_(session, payload) {
  requireAdmin_(session);
  var value = validatePlanItem_(payload, true);
  requireExistingLocation_(value.locationId);
  return withScriptLock_(function () {
    var saved;
    if (value.planItemId) {
      saved = updateObjectById_("SharedPlan", "planItemId", value.planItemId, Object.assign({}, value, {
        updatedBy: session.username, updatedAt: nowIso_(),
      }));
    } else {
      saved = Object.assign({}, value, { planItemId: newId_(), updatedBy: session.username, updatedAt: nowIso_() });
      appendObject_("SharedPlan", APP.headers.SharedPlan, saved);
    }
    audit_(session.username, "upsert", "shared_plan", saved.planItemId, value.locationId);
    return parseSharedPlanItem_(saved);
  });
}

function deleteSharedPlanItem_(session, planItemId) {
  requireAdmin_(session);
  planItemId = cleanString_(planItemId, 80);
  return withScriptLock_(function () {
    var deleted = deleteRowsWhere_("SharedPlan", function (item) { return item.planItemId === planItemId; });
    if (!deleted) throw new AppError("NOT_FOUND", "Không tìm thấy mục lịch chung.");
    audit_(session.username, "delete", "shared_plan", planItemId, "Xóa khỏi lịch chung");
    return { planItemId: planItemId };
  });
}

function getAllPersonalPlans_(session) {
  requireAdmin_(session);
  var result = {};
  Object.keys(APP.personalSheets).forEach(function (username) {
    result[username] = getRows_(APP.personalSheets[username]).map(parsePlanItem_);
  });
  return result;
}

function getAuditLog_(session) {
  requireAdmin_(session);
  return getRows_("AuditLog").slice(-200).reverse();
}

function personalSheetFor_(username) {
  var sheetName = APP.personalSheets[username];
  if (!sheetName) throw new AppError("FORBIDDEN", "Tài khoản không có Sheet cá nhân.");
  return sheetName;
}

function parseLocation_(location) {
  var result = Object.assign({}, location);
  if (typeof result.categories === "string") {
    try { result.categories = JSON.parse(result.categories); } catch (error) { result.categories = []; }
  }
  result.latitude = result.latitude === "" || result.latitude === null || result.latitude === undefined ? null : Number(result.latitude);
  result.longitude = result.longitude === "" || result.longitude === null || result.longitude === undefined ? null : Number(result.longitude);
  result.estimatedCost = result.estimatedCost === "" ? "" : Number(result.estimatedCost);
  return result;
}

function parsePlanItem_(item) {
  var result = Object.assign({}, item);
  result.day = String(result.day || "unassigned");
  result.vote = result.vote === true || String(result.vote).toLowerCase() === "true";
  return result;
}

function parseSharedPlanItem_(item) {
  var result = Object.assign({}, item);
  result.day = String(result.day || "unassigned");
  result.order = Number(result.order || 0);
  return result;
}
