import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../apps-script/SeedData.gs", import.meta.url), "utf8");
const context = vm.createContext({ encodeURIComponent, console: { log() {} } });
vm.runInContext(source, context);

const locations = context.getExistingLocationSeed_();

test("initial import contains all 32 supplied locations with unique names", () => {
  assert.equal(locations.length, 32);
  assert.equal(new Set(locations.map((item) => item.name.trim().toLocaleLowerCase("vi"))).size, 32);
});

test("initial votes are assigned to the four application usernames", () => {
  const totals = { thao: 0, trucnhi: 0, ngocnhi: 0, tuyen: 0 };
  for (const location of locations) {
    assert.equal(new Set(location.votes).size, location.votes.length);
    for (const username of location.votes) {
      assert.ok(Object.hasOwn(totals, username), `Unknown username: ${username}`);
      totals[username] += 1;
    }
  }
  assert.deepEqual(totals, { thao: 17, trucnhi: 9, ngocnhi: 19, tuyen: 17 });
});

test("seed records have valid categories and Google Maps search links", () => {
  const allowed = new Set(["food", "cafe", "photo", "sightseeing", "homestay"]);
  for (const location of locations) {
    assert.ok(location.name);
    assert.ok(location.address);
    assert.ok(location.categories.length > 0);
    assert.ok(location.categories.every((category) => allowed.has(category)));
    assert.ok(location.categories.includes(location.primaryCategory));
    assert.match(location.googleMapsUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  }
});

test("the two supplied Cafe entries keep a distinct primary category", () => {
  assert.equal(locations.filter((location) => location.primaryCategory === "cafe").length, 2);
});

test("seedExistingData is idempotent for locations and votes", () => {
  const headers = {
    Locations: ["id", "name", "categories", "primaryCategory", "address", "googleMapsUrl", "latitude", "longitude", "estimatedCost", "openingHours", "note", "status", "createdBy", "createdAt", "updatedBy", "updatedAt"],
    PersonalPlan: ["selectionId", "locationId", "day", "period", "plannedTime", "vote", "note", "updatedAt"],
    AuditLog: ["timestamp", "username", "action", "entityType", "entityId", "summary"],
  };
  const sheetNames = { trucnhi: "Plan_trucnhi", thao: "Plan_thao", tuyen: "Plan_tuyen", ngocnhi: "Plan_ngocnhi" };
  const sheets = { Locations: [], AuditLog: [], Plan_trucnhi: [], Plan_thao: [], Plan_tuyen: [], Plan_ngocnhi: [] };
  let id = 0;
  Object.assign(context, {
    APP: { headers, personalSheets: sheetNames },
    withScriptLock_: (callback) => callback(),
    getRows_: (sheetName) => sheets[sheetName].map((row) => ({ ...row })),
    appendObject_: (sheetName, _headers, object) => sheets[sheetName].push({ ...object }),
    updateObjectById_: (sheetName, idField, value, patch) => {
      const row = sheets[sheetName].find((item) => item[idField] === value);
      Object.assign(row, patch);
      return { ...row };
    },
    audit_: (username, action, entityType, entityId, summary) => sheets.AuditLog.push({ username, action, entityType, entityId, summary }),
    newId_: () => `seed-${++id}`,
    nowIso_: () => "2026-08-05T00:00:00.000Z",
  });

  const first = context.seedExistingData();
  const second = context.seedExistingData();

  assert.deepEqual({ ...first }, { locationsCreated: 32, locationsReused: 0, votesCreated: 62, votesUpdated: 0 });
  assert.deepEqual({ ...second }, { locationsCreated: 0, locationsReused: 32, votesCreated: 0, votesUpdated: 0 });
  assert.equal(sheets.Locations.length, 32);
  assert.equal(Object.values(sheetNames).reduce((sum, sheetName) => sum + sheets[sheetName].length, 0), 62);
});
