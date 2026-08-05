import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("shared plan upsert reuses an existing item for the same location", () => {
  const existing = {
    planItemId: "plan-1",
    locationId: "loc-1",
    day: "27",
    period: "morning",
    plannedTime: "",
    order: 0,
    note: "",
  };
  let saved;
  const context = vm.createContext({ console, isFinite });
  for (const filename of ["Config.gs", "Validation.gs", "Services.gs"]) {
    vm.runInContext(readFileSync(new URL(`../apps-script/${filename}`, import.meta.url), "utf8"), context, { filename });
  }
  Object.assign(context, {
    requireAdmin_: () => {},
    requireExistingLocation_: () => {},
    withScriptLock_: (callback) => callback(),
    getRows_: () => [{ ...existing }],
    newId_: () => "plan-2",
    updateObjectById_: (_sheet, _field, _id, patch) => (saved = { ...existing, ...patch }),
    appendObject_: () => assert.fail("must not append a duplicate shared-plan item"),
    audit_: () => {},
  });

  const result = context.upsertSharedPlanItem_({ username: "thao", role: "admin" }, {
    locationId: "loc-1",
    day: "28",
    period: "noon",
    plannedTime: "12:00",
    order: 0,
    note: "Ăn trưa",
  });

  assert.equal(saved.planItemId, "plan-1");
  assert.equal(result.day, "28");
  assert.equal(result.period, "noon");
});
