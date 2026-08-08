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

test("Apps Script accepts date and time without a period and maps legacy day numbers", () => {
  const planned = context.validatePlanItem_({ locationId: "loc-1", day: "28", plannedTime: "12:00" }, false);
  const legacy = context.validatePlanItem_({ locationId: "loc-1", day: "1", plannedTime: "08:30" }, false);
  assert.equal(planned.day, "28");
  assert.equal(planned.period, "unassigned");
  assert.equal(legacy.day, "27");
});

test("Apps Script requires both date and time for schedule choices", () => {
  assert.throws(() => context.validatePlanItem_({ locationId: "loc-1", day: "unassigned", plannedTime: "" }, false), /Ngày/);
  assert.throws(() => context.validatePlanItem_({ locationId: "loc-1", day: "27", plannedTime: "" }, true), /Giờ/);
});

test("Apps Script converts legacy Sheet time dates to Vietnam GMT+7", () => {
  const shared = context.parseSharedPlanItem_({
    day: "27",
    plannedTime: "1899-12-30T13:45:30.000Z",
    order: 0,
  });
  const personal = context.parsePlanItem_({
    day: "27",
    plannedTime: "1899-12-29T23:53:30.000Z",
    vote: true,
  });

  assert.equal(shared.plannedTime, "20:45");
  assert.equal(personal.plannedTime, "06:53");
});

test("Apps Script keeps HH:mm plan values unchanged", () => {
  assert.equal(context.parsePlanItem_({ plannedTime: "08:30" }).plannedTime, "08:30");
});
