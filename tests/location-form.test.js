import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("location form has one group field instead of duplicate category controls", () => {
  assert.match(html, /id="location-category"/);
  assert.doesNotMatch(html, /name="categories"/);
  assert.doesNotMatch(html, /id="location-primary-category"/);
});

test("location form schedules a place by trip date and period", () => {
  assert.match(html, /id="location-day"/);
  assert.match(html, /<option value="27">Ngày 27<\/option>/);
  assert.match(html, /<option value="28">Ngày 28<\/option>/);
  assert.match(html, /<option value="29">Ngày 29<\/option>/);
  assert.match(html, /id="location-period"/);
  assert.match(html, /<option value="noon">Buổi trưa<\/option>/);
});
