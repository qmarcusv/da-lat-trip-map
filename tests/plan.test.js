import test from "node:test";
import assert from "node:assert/strict";

import { formatPlannedTime, partitionLocationsByPlan, validatePlanItem } from "../js/domain.js";

test("validatePlanItem accepts one day and a valid time without a period", () => {
  const result = validatePlanItem({
    locationId: "loc-1",
    day: "27",
    plannedTime: "08:30",
    vote: true,
    note: "Ăn sáng",
  });

  assert.equal(result.isValid, true);
  assert.equal(result.value.period, "unassigned");
});

test("validatePlanItem requires both a date and a time", () => {
  const result = validatePlanItem({ locationId: "loc-1", day: "unassigned", plannedTime: "" });
  assert.equal(result.isValid, false);
  assert.match(result.errors.day, /ngày/i);
  assert.match(result.errors.plannedTime, /giờ/i);
});

test("validatePlanItem rejects invalid time", () => {
  const result = validatePlanItem({
    locationId: "loc-1",
    day: "28",
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

test("partitionLocationsByPlan separates selected and unselected places", () => {
  const locations = [
    { id: "loc-1", name: "A", status: "active" },
    { id: "loc-2", name: "B", status: "active" },
    { id: "loc-3", name: "C", status: "deleted" },
  ];
  const result = partitionLocationsByPlan(locations, [{ locationId: "loc-1" }]);

  assert.deepEqual(result.selected.map((item) => item.id), ["loc-1"]);
  assert.deepEqual(result.unselected.map((item) => item.id), ["loc-2"]);
});
