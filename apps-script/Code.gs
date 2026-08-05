function doGet() {
  return jsonResponse_({ success: true, data: { service: "Da Lat Trip API", status: "ok" } });
}

function doPost(event) {
  try {
    var request = parseRequest_(event);
    if (request.action === "login") return jsonResponse_({ success: true, data: login_(request.payload || {}) });

    var session = authenticate_(request.token);
    var payload = request.payload || {};
    var actions = {
      logout: function () { return logout_(session); },
      listLocations: function () { return listLocations_(); },
      createLocation: function () { return createLocation_(session, payload); },
      updateLocation: function () { return updateLocation_(session, payload); },
      deleteLocation: function () { return deleteLocation_(session, payload.id); },
      restoreLocation: function () { return restoreLocation_(session, payload.id); },
      getMyPlan: function () { return getMyPlan_(session); },
      upsertMyPlanItem: function () { return upsertMyPlanItem_(session, payload); },
      deleteMyPlanItem: function () { return deleteMyPlanItem_(session, payload.locationId); },
      getVoteSummary: function () { return getVoteSummary_(); },
      getSharedPlan: function () { return getSharedPlan_(); },
      upsertSharedPlanItem: function () { return upsertSharedPlanItem_(session, payload); },
      deleteSharedPlanItem: function () { return deleteSharedPlanItem_(session, payload.planItemId); },
      getAllPersonalPlans: function () { return getAllPersonalPlans_(session); },
      getAuditLog: function () { return getAuditLog_(session); },
    };
    if (!actions[request.action]) throw new AppError("UNKNOWN_ACTION", "Action không được hỗ trợ.");
    return jsonResponse_({ success: true, data: actions[request.action]() });
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    var isKnown = error && error.name === "AppError";
    return jsonResponse_({
      success: false,
      error: {
        code: isKnown ? error.code : "SERVER_ERROR",
        message: isKnown ? error.message : "Máy chủ gặp lỗi. Hãy kiểm tra Apps Script Executions.",
      },
    });
  }
}

function parseRequest_(event) {
  if (!event || !event.postData || !event.postData.contents) throw new AppError("INVALID_REQUEST", "Request body rỗng.");
  if (event.postData.contents.length > 20000) throw new AppError("PAYLOAD_TOO_LARGE", "Request vượt quá kích thước cho phép.");
  try {
    var request = JSON.parse(event.postData.contents);
    if (!request || typeof request.action !== "string") throw new Error("missing action");
    return request;
  } catch (error) {
    throw new AppError("INVALID_JSON", "Request JSON không hợp lệ.");
  }
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
