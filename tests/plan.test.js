import test from "node:test";
import assert from "node:assert/strict";

import { formatPlannedTime, validatePlanItem } from "../js/domain.js";

test("validatePlanItem accepts one day, one period and a valid time", () => {
  const result = validatePlanItem({
    locationId: "loc-1",
    day: "27",
    period: "morning",
    plannedTime: "08:30",
    vote: true,
    note: "Ăn sáng",
  });

  assert.equal(result.isValid, true);
});

test("validatePlanItem accepts the noon period", () => {
  const result = validatePlanItem({
    locationId: "loc-1",
    day: "28",
    period: "noon",
    plannedTime: "12:00",
    vote: false,
  });

  assert.equal(result.isValid, true);
});

test("validatePlanItem rejects unsupported period values", () => {
  const result = validatePlanItem({
    locationId: "loc-1",
    day: "27",
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
    day: "28",
    period: "evening",
    plannedTime: "25:15",
    vote: false,
    note: "",
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.plannedTime, /giờ/i);
});

test("formatPlannedTime displays legacy Sheet dates in Vietnam GMT+7", () => {
  assert.equal(formatPlannedTime("1899-12-30T13:45:30.000Z"), "20:45");
  assert.equal(formatPlannedTime("1899-12-29T23:53:30.000Z"), "06:53");
  assert.equal(formatPlannedTime("13:45"), "13:45");
  assert.equal(formatPlannedTime(""), "");
});
