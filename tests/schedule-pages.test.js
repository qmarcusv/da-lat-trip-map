import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("schedule navigation exposes separate shared and personal pages", () => {
  assert.match(html, /data-view="shared-schedule"[^>]*>Lịch chung</);
  assert.match(html, /data-view="personal-schedule"[^>]*>Lịch riêng</);
  assert.match(html, /id="shared-schedule-panel"/);
  assert.match(html, /id="personal-schedule-panel"/);
});

test("shared and personal schedules use the same page card design", () => {
  assert.equal((html.match(/class="schedule-card"/g) || []).length, 2);
  assert.match(html, /id="shared-plan-list"/);
  assert.match(html, /id="my-plan-list"/);
});
