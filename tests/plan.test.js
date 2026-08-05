import test from "node:test";
import assert from "node:assert/strict";

import { validatePlanItem } from "../js/domain.js";

test("validatePlanItem accepts one day, one period and a valid time", () => {
  const result = validatePlanItem({
    locationId: "loc-1",
    day: "1",
    period: "morning",
    plannedTime: "08:30",
    vote: true,
    note: "Ăn sáng",
  });

  assert.equal(result.isValid, true);
});

test("validatePlanItem rejects unsupported period values", () => {
  const result = validatePlanItem({
    locationId: "loc-1",
    day: "1",
    period: ["morning", "afternoon"],
    plannedTime: "08:30",
    vote: false,
    note: "",
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.period, /buổi/i);
});

test("validatePlanItem rejects invalid time", () => {
  const result = validatePlanItem({
    locationId: "loc-1",
    day: "2",
    period: "evening",
    plannedTime: "25:15",
    vote: false,
    note: "",
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.plannedTime, /giờ/i);
});
