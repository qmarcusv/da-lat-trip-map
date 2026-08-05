import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ console, isFinite });
for (const filename of ["Config.gs", "Validation.gs", "Services.gs"]) {
  const source = readFileSync(new URL(`../apps-script/${filename}`, import.meta.url), "utf8");
  vm.runInContext(source, context, { filename });
}

test("Apps Script validation normalizes duplicate categories", () => {
  const result = context.validateLocation_({
    name: "Quán A",
    categories: ["food", "food"],
    primaryCategory: "food",
    address: "Đà Lạt",
    googleMapsUrl: "https://www.google.com/maps/place/example",
    latitude: 11.94,
    longitude: 108.45,
    estimatedCost: 50000,
  }, false);

  assert.deepEqual(Array.from(result.categories), ["food"]);
});

test("Apps Script validation rejects more than one distinct group", () => {
  assert.throws(() => context.validateLocation_({
    name: "Quán A",
    categories: ["food", "photo"],
    primaryCategory: "food",
    address: "Đà Lạt",
    googleMapsUrl: "https://www.google.com/maps/place/example",
    latitude: 11.94,
    longitude: 108.45,
  }, false), /một nhóm/i);
});

test("Apps Script validation accepts blank coordinate pairs for automatic geocoding", () => {
  const result = context.validateLocation_({
    name: "Quán A",
    categories: ["food"],
    primaryCategory: "food",
    address: "Đà Lạt",
    googleMapsUrl: "https://maps.app.goo.gl/VSVaexJc3HLynKvA9",
    latitude: "",
    longitude: "",
    estimatedCost: "",
  }, false);

  assert.equal(result.latitude, null);
  assert.equal(result.longitude, null);
});

test("Apps Script keeps missing coordinates as null instead of zero", () => {
  const result = context.parseLocation_({ categories: "[\"food\"]", latitude: "", longitude: "", estimatedCost: "" });
  assert.equal(result.latitude, null);
  assert.equal(result.longitude, null);
});

test("Apps Script validation rejects a mismatched primary category", () => {
  assert.throws(() => context.validateLocation_({
    name: "Quán A",
    categories: ["food"],
    primaryCategory: "photo",
    address: "Đà Lạt",
    googleMapsUrl: "https://maps.app.goo.gl/example",
    latitude: 11.94,
    longitude: 108.45,
  }, false), /Nhóm chính/);
});

test("Apps Script validation rejects lookalike Google Maps hosts", () => {
  assert.throws(() => context.validateLocation_({
    name: "Quán A",
    categories: ["food"],
    primaryCategory: "food",
    address: "Đà Lạt",
    googleMapsUrl: "https://google.evil.com/maps/place/example",
    latitude: "",
    longitude: "",
  }, false), /Link Google Maps/);
});

test("Apps Script validation rejects multiple periods in one plan item", () => {
  assert.throws(() => context.validatePlanItem_({
    locationId: "loc-1",
    day: "27",
    period: ["morning", "afternoon"],
  }, false), /Buổi/);
});

test("Apps Script accepts noon on dates 27 to 29 and maps legacy day numbers", () => {
  const noon = context.validatePlanItem_({ locationId: "loc-1", day: "28", period: "noon" }, false);
  const legacy = context.validatePlanItem_({ locationId: "loc-1", day: "1", period: "morning" }, false);
  assert.equal(noon.day, "28");
  assert.equal(noon.period, "noon");
  assert.equal(legacy.day, "27");
});
