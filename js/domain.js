import {
  ALLOWED_CATEGORIES,
  ALLOWED_DAYS,
  ALLOWED_PERIODS,
} from "./constants.js";

const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "google.com.vn",
  "www.google.com.vn",
  "maps.google.com.vn",
]);

export function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return [...new Set(categories.filter((value) => ALLOWED_CATEGORIES.includes(value)))];
}

export function validateLocation(input) {
  const latitude = optionalNumber(input.latitude);
  const longitude = optionalNumber(input.longitude);
  const value = {
    id: String(input.id || "").trim(),
    name: String(input.name || "").trim(),
    categories: normalizeCategories(input.categories),
    primaryCategory: String(input.primaryCategory || "").trim(),
    address: String(input.address || "").trim(),
    googleMapsUrl: String(input.googleMapsUrl || "").trim(),
    latitude,
    longitude,
    estimatedCost: input.estimatedCost === "" || input.estimatedCost == null
      ? ""
      : Number(input.estimatedCost),
    openingHours: String(input.openingHours || "").trim(),
    note: String(input.note || "").trim(),
  };
  const errors = {};

  if (!value.name || value.name.length > 120) errors.name = "Tên phải có từ 1 đến 120 ký tự.";
  if (value.categories.length === 0) errors.categories = "Chọn ít nhất một nhóm.";
  if (!value.categories.includes(value.primaryCategory)) {
    errors.primaryCategory = "Nhóm chính phải nằm trong các nhóm đã chọn.";
  }
  if (!value.address || value.address.length > 250) errors.address = "Địa chỉ phải có từ 1 đến 250 ký tự.";
  if (!isGoogleMapsUrl(value.googleMapsUrl)) errors.googleMapsUrl = "Link Google Maps không hợp lệ.";
  if (value.latitude !== null && (!Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90)) {
    errors.latitude = "Vĩ độ phải nằm trong khoảng -90 đến 90.";
  }
  if (value.longitude !== null && (!Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180)) {
    errors.longitude = "Kinh độ phải nằm trong khoảng -180 đến 180.";
  }
  if ((value.latitude === null) !== (value.longitude === null)) {
    errors.latitude = "Hãy nhập cả vĩ độ và kinh độ, hoặc để trống cả hai để tự tìm.";
  }
  if (value.estimatedCost !== "" && (!Number.isFinite(value.estimatedCost) || value.estimatedCost < 0)) {
    errors.estimatedCost = "Chi phí phải là số không âm.";
  }
  if (value.openingHours.length > 100) errors.openingHours = "Giờ mở cửa tối đa 100 ký tự.";
  if (value.note.length > 1000) errors.note = "Ghi chú tối đa 1000 ký tự.";

  return { isValid: Object.keys(errors).length === 0, errors, value };
}

function optionalNumber(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

export function validatePlanItem(input) {
  const value = {
    selectionId: String(input.selectionId || "").trim(),
    locationId: String(input.locationId || "").trim(),
    day: String(input.day || "unassigned"),
    period: String(input.period || "unassigned"),
    plannedTime: String(input.plannedTime || "").trim(),
    vote: Boolean(input.vote),
    note: String(input.note || "").trim(),
  };
  const errors = {};

  if (!value.locationId) errors.locationId = "Thiếu địa điểm.";
  if (!ALLOWED_DAYS.includes(value.day)) errors.day = "Ngày không hợp lệ.";
  if (!ALLOWED_PERIODS.includes(value.period)) errors.period = "Buổi không hợp lệ.";
  if (value.plannedTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.plannedTime)) {
    errors.plannedTime = "Giờ dự kiến phải theo định dạng HH:mm.";
  }
  if (value.note.length > 500) errors.note = "Ghi chú cá nhân tối đa 500 ký tự.";

  return { isValid: Object.keys(errors).length === 0, errors, value };
}

export function filterLocations(locations, filters = {}) {
  const search = normalizeText(filters.search || "");
  const category = filters.category || "all";
  return locations.filter((location) => {
    if (location.status === "deleted") return false;
    if (category !== "all" && !location.categories?.includes(category)) return false;
    if (!search) return true;
    return normalizeText(`${location.name || ""} ${location.address || ""}`).includes(search);
  });
}

export function calculateDistanceKm(pointA, pointB) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeA = toRadians(Number(pointA.latitude));
  const latitudeB = toRadians(Number(pointB.latitude));
  const deltaLatitude = toRadians(Number(pointB.latitude) - Number(pointA.latitude));
  const deltaLongitude = toRadians(Number(pointB.longitude) - Number(pointA.longitude));
  const haversine = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatCost(value) {
  if (value === "" || value == null || !Number.isFinite(Number(value))) return "Chưa cập nhật";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
}

export function formatDistance(kilometers) {
  if (!Number.isFinite(kilometers)) return "—";
  if (kilometers < 1) return `${Math.round(kilometers * 1000)} m`;
  return `${kilometers.toFixed(kilometers < 10 ? 1 : 0)} km`;
}

function normalizeText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

function isGoogleMapsUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    if (GOOGLE_MAPS_HOSTS.has(url.hostname)) return url.pathname === "/maps" || url.pathname.startsWith("/maps/");
    if (url.hostname === "maps.app.goo.gl") return url.pathname.length > 1;
    if (url.hostname === "goo.gl") return url.pathname === "/maps" || url.pathname.startsWith("/maps/");
    return false;
  } catch {
    return false;
  }
}
