import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const expandedSampleUrl = "https://www.google.com/maps/place/4+Duong+Da+Minh/@11.9370998,108.4195752,1012m/data=!3m2!1e3!4b1!4m6!3m5!1splace!8m2!3d11.9370946!4d108.4221555";

function createContext(overrides = {}) {
  const source = readFileSync(new URL("../apps-script/Geocoding.gs", import.meta.url), "utf8");
  const context = vm.createContext({
    console: { log() {} },
    decodeURIComponent,
    ...overrides,
  });
  vm.runInContext(source, context);
  return context;
}

test("extracts the actual place coordinates from the expanded sample URL", () => {
  const context = createContext();
  assert.deepEqual(
    { ...context.extractCoordinatesFromGoogleMapsUrl_(expandedSampleUrl) },
    { latitude: 11.9370946, longitude: 108.4221555 },
  );
});

test("resolves the supplied maps.app.goo.gl URL before extracting coordinates", () => {
  const context = createContext({
    isGoogleMapsUrl_: () => true,
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 302,
        getHeaders: () => ({ Location: expandedSampleUrl }),
      }),
    },
  });

  const result = context.resolveLocationCoordinates_({
    name: "Địa điểm mẫu",
    address: "Đà Lạt",
    googleMapsUrl: "https://maps.app.goo.gl/VSVaexJc3HLynKvA9",
    latitude: "",
    longitude: "",
  });

  assert.deepEqual(
    { ...result },
    { latitude: 11.9370946, longitude: 108.4221555, source: "google_maps_url" },
  );
});

test("falls back to Apps Script geocoding when the URL has no coordinates", () => {
  const geocoder = {
    setBounds: () => geocoder,
    setRegion: () => geocoder,
    setLanguage: () => geocoder,
    geocode: () => ({ results: [{ geometry: { location: { lat: 11.95, lng: 108.44 } } }] }),
  };
  const context = createContext({
    isGoogleMapsUrl_: () => true,
    Maps: { newGeocoder: () => geocoder },
  });

  const result = context.resolveLocationCoordinates_({
    name: "Quán A",
    address: "Đà Lạt",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Quan+A",
    latitude: null,
    longitude: null,
  });

  assert.deepEqual({ ...result }, { latitude: 11.95, longitude: 108.44, source: "geocoder" });
});

test("rejects fallback geocoder results outside the Da Lat area", () => {
  const geocoder = {
    setBounds: () => geocoder,
    setRegion: () => geocoder,
    setLanguage: () => geocoder,
    geocode: () => ({ results: [{ geometry: { location: { lat: 21.0285, lng: 105.8542 } } }] }),
  };
  const context = createContext({ Maps: { newGeocoder: () => geocoder } });

  const result = context.resolveLocationCoordinates_({
    name: "Địa chỉ mơ hồ",
    address: "Chưa cập nhật, Đà Lạt",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=test",
    latitude: null,
    longitude: null,
  });

  assert.equal(result, null);
});

test("geocodeMissingLocations updates only active rows without coordinates", () => {
  const rows = [
    { id: "missing", name: "Mẫu", address: "Đà Lạt", googleMapsUrl: "https://maps.app.goo.gl/VSVaexJc3HLynKvA9", latitude: "", longitude: "", status: "active" },
    { id: "ready", name: "Đã có", address: "Đà Lạt", googleMapsUrl: "https://www.google.com/maps", latitude: 11.9, longitude: 108.4, status: "active" },
  ];
  const context = createContext({
    isGoogleMapsUrl_: () => true,
    UrlFetchApp: {
      fetch: () => ({ getResponseCode: () => 302, getHeaders: () => ({ Location: expandedSampleUrl }) }),
    },
    getRows_: () => rows.map((row) => ({ ...row })),
    withScriptLock_: (callback) => callback(),
    updateObjectById_: (_sheetName, _idField, id, patch) => Object.assign(rows.find((row) => row.id === id), patch),
    nowIso_: () => "2026-08-05T00:00:00.000Z",
  });

  const summary = context.geocodeMissingLocations();

  assert.deepEqual({ ...summary, errors: [...summary.errors] }, { checked: 1, updated: 1, unresolved: 0, errors: [] });
  assert.equal(rows[0].latitude, 11.9370946);
  assert.equal(rows[0].longitude, 108.4221555);
  assert.equal(rows[1].latitude, 11.9);
});
