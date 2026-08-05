import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDistanceKm,
  filterLocations,
  formatCost,
  normalizeCategories,
  validateLocation,
} from "../js/domain.js";

test("normalizeCategories removes duplicates and unsupported values", () => {
  assert.deepEqual(
    normalizeCategories(["food", "photo", "food", "unknown"]),
    ["food", "photo"],
  );
});

test("validateLocation maps one group into the legacy location fields and keeps its schedule", () => {
  const result = validateLocation({
    name: "Quán A",
    category: "food",
    day: "27",
    period: "noon",
    address: "Đà Lạt",
    googleMapsUrl: "https://www.google.com/maps/place/test",
    latitude: 11.9404,
    longitude: 108.4583,
    estimatedCost: 120000,
    openingHours: "07:00-22:00",
    note: "",
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.value.categories, ["food"]);
  assert.equal(result.value.primaryCategory, "food");
  assert.equal(result.value.day, "27");
  assert.equal(result.value.period, "noon");
});

test("validateLocation allows both coordinates to be blank for automatic geocoding", () => {
  const result = validateLocation({
    name: "Quán A",
    category: "food",
    day: "28",
    period: "morning",
    address: "Đà Lạt",
    googleMapsUrl: "https://maps.app.goo.gl/VSVaexJc3HLynKvA9",
    latitude: "",
    longitude: "",
    estimatedCost: "",
  });

  assert.equal(result.isValid, true);
  assert.equal(result.value.latitude, null);
  assert.equal(result.value.longitude, null);
});

test("validateLocation rejects non-Maps paths on Google short-link hosts", () => {
  const result = validateLocation({
    name: "Quán A",
    category: "food",
    day: "29",
    period: "evening",
    address: "Đà Lạt",
    googleMapsUrl: "https://goo.gl/not-a-maps-link",
    latitude: "",
    longitude: "",
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.googleMapsUrl, /Google Maps/);
});

test("validateLocation rejects an unsupported group", () => {
  const result = validateLocation({
    name: "Quán A",
    category: "unknown",
    day: "27",
    period: "morning",
    address: "Đà Lạt",
    googleMapsUrl: "https://maps.app.goo.gl/example",
    latitude: 11.94,
    longitude: 108.45,
    estimatedCost: 0,
    openingHours: "Cả ngày",
    note: "",
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.category, /nhóm/i);
});

test("filterLocations combines text and category filters", () => {
  const locations = [
    { id: "1", name: "Tiệm cà phê Túi Mơ To", address: "Hẻm 31", categories: ["food", "photo"], status: "active" },
    { id: "2", name: "Hồ Xuân Hương", address: "Phường 1", categories: ["sightseeing"], status: "active" },
    { id: "3", name: "Đã xóa", address: "Đà Lạt", categories: ["food"], status: "deleted" },
  ];

  assert.deepEqual(
    filterLocations(locations, { search: "cà phê", category: "photo" }).map((item) => item.id),
    ["1"],
  );
});

test("calculateDistanceKm returns a plausible distance in Da Lat", () => {
  const distance = calculateDistanceKm(
    { latitude: 11.9404, longitude: 108.4583 },
    { latitude: 11.9515, longitude: 108.4422 },
  );

  assert.ok(distance > 1.5 && distance < 3);
});

test("formatCost formats VND and handles missing values", () => {
  assert.equal(formatCost(120000), "120.000 ₫");
  assert.equal(formatCost(""), "Chưa cập nhật");
});
