function validateLocation_(input, requireId) {
  input = input || {};
  var latitude = optionalNumber_(input.latitude);
  var longitude = optionalNumber_(input.longitude);
  var categories = input.categories;
  if (typeof categories === "string") {
    try { categories = JSON.parse(categories); } catch (error) { categories = []; }
  }
  categories = Array.isArray(categories) ? categories.filter(function (value, index, array) {
    return CATEGORY_VALUES.indexOf(value) >= 0 && array.indexOf(value) === index;
  }) : [];

  var value = {
    id: cleanString_(input.id, 80),
    name: cleanString_(input.name, 120),
    categories: categories,
    primaryCategory: cleanString_(input.primaryCategory, 30),
    address: cleanString_(input.address, 250),
    googleMapsUrl: cleanString_(input.googleMapsUrl, 500),
    latitude: latitude,
    longitude: longitude,
    estimatedCost: input.estimatedCost === "" || input.estimatedCost === null || input.estimatedCost === undefined ? "" : Number(input.estimatedCost),
    openingHours: cleanString_(input.openingHours, 100),
    note: cleanString_(input.note, 1000),
  };
  if (requireId && !value.id) throw new AppError("VALIDATION_ERROR", "Thiếu ID địa điểm.");
  if (!value.name) throw new AppError("VALIDATION_ERROR", "Tên địa điểm là bắt buộc.");
  if (categories.length !== 1) throw new AppError("VALIDATION_ERROR", "Mỗi địa điểm phải có đúng một nhóm.");
  if (categories.indexOf(value.primaryCategory) < 0) throw new AppError("VALIDATION_ERROR", "Nhóm chính phải thuộc danh sách nhóm.");
  if (!value.address) throw new AppError("VALIDATION_ERROR", "Địa chỉ là bắt buộc.");
  if (!isGoogleMapsUrl_(value.googleMapsUrl)) throw new AppError("VALIDATION_ERROR", "Link Google Maps không hợp lệ.");
  if (value.latitude !== null && (!isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90)) throw new AppError("VALIDATION_ERROR", "Vĩ độ không hợp lệ.");
  if (value.longitude !== null && (!isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180)) throw new AppError("VALIDATION_ERROR", "Kinh độ không hợp lệ.");
  if ((value.latitude === null) !== (value.longitude === null)) throw new AppError("VALIDATION_ERROR", "Hãy nhập cả vĩ độ và kinh độ, hoặc để trống cả hai để tự tìm.");
  if (value.estimatedCost !== "" && (!isFinite(value.estimatedCost) || value.estimatedCost < 0)) throw new AppError("VALIDATION_ERROR", "Chi phí không hợp lệ.");
  return value;
}

function optionalNumber_(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function validatePlanItem_(input, shared) {
  input = input || {};
  var value = {
    locationId: cleanString_(input.locationId, 80),
    day: normalizeTripDay_(cleanString_(input.day || "unassigned", 12)),
    period: "unassigned",
    plannedTime: cleanString_(input.plannedTime, 5),
    note: cleanString_(input.note, 500),
  };
  if (!value.locationId) throw new AppError("VALIDATION_ERROR", "Thiếu địa điểm.");
  if (DAY_VALUES.indexOf(value.day) < 0 || value.day === "unassigned") throw new AppError("VALIDATION_ERROR", "Ngày là bắt buộc và phải là 27, 28 hoặc 29.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.plannedTime)) throw new AppError("VALIDATION_ERROR", "Giờ dự kiến phải theo HH:mm.");
  if (shared) {
    value.planItemId = cleanString_(input.planItemId, 80);
    value.order = Math.max(0, Number(input.order) || 0);
  } else {
    value.selectionId = cleanString_(input.selectionId, 80);
    value.vote = input.vote === true || String(input.vote).toLowerCase() === "true";
  }
  return value;
}

function cleanString_(value, maximumLength) {
  var result = String(value === undefined || value === null ? "" : value).trim();
  if (result.length > maximumLength) throw new AppError("VALIDATION_ERROR", "Dữ liệu vượt quá độ dài cho phép.");
  return result;
}

function isGoogleMapsUrl_(value) {
  return /^https:\/\/(?:(?:www|maps)\.)?google\.(?:com|com\.vn)\/maps(?:\/|\?|$)/i.test(value)
    || /^https:\/\/maps\.app\.goo\.gl\/(?:[^/?#]+)(?:[/?#]|$)/i.test(value)
    || /^https:\/\/goo\.gl\/maps(?:\/|\?|$)/i.test(value);
}

function requireExistingLocation_(locationId) {
  var exists = getRows_("Locations").some(function (location) { return location.id === locationId && location.status === "active"; });
  if (!exists) throw new AppError("NOT_FOUND", "Địa điểm không tồn tại hoặc đã bị xóa.");
}
