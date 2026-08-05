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

test("validateLocation accepts multiple unique categories and a matching primary category", () => {
  const result = validateLocation({
    name: "Quán A",
    categories: ["food", "photo", "food"],
    primaryCategory: "food",
    address: "Đà Lạt",
    googleMapsUrl: "https://www.google.com/maps/place/test",
    latitude: 11.9404,
    longitude: 108.4583,
    estimatedCost: 120000,
    openingHours: "07:00-22:00",
    note: "",
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.value.categories, ["food", "photo"]);
});

test("validateLocation allows both coordinates to be blank for automatic geocoding", () => {
  const result = validateLocation({
    name: "Quán A",
    categories: ["food"],
    primaryCategory: "food",
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
    categories: ["food"],
    primaryCategory: "food",
    address: "Đà Lạt",
    googleMapsUrl: "https://goo.gl/not-a-maps-link",
    latitude: "",
    longitude: "",
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.googleMapsUrl, /Google Maps/);
});

test("validateLocation rejects a primary category outside categories", () => {
  const result = validateLocation({
    name: "Quán A",
    categories: ["food"],
    primaryCategory: "photo",
    address: "Đà Lạt",
    googleMapsUrl: "https://maps.app.goo.gl/example",
    latitude: 11.94,
    longitude: 108.45,
    estimatedCost: 0,
    openingHours: "Cả ngày",
    note: "",
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.primaryCategory, /nhóm chính/i);
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
