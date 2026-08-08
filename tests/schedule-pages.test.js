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
  assert.equal((html.match(/class="schedule-card"/g) || []).length, 4);
  assert.match(html, /id="shared-plan-list"/);
  assert.match(html, /id="shared-unselected-list"/);
  assert.match(html, /id="my-plan-list"/);
  assert.match(html, /id="personal-unselected-list"/);
  assert.equal((html.match(/class="schedule-columns"/g) || []).length, 2);
});

test("schedule forms use only date and required time", () => {
  assert.doesNotMatch(html, /id="plan-period"/);
  assert.doesNotMatch(html, /id="shared-plan-period"/);
  assert.match(html, /id="plan-time"[^>]*type="time"[^>]*required/);
  assert.match(html, /id="shared-plan-time"[^>]*type="time"[^>]*required/);
});
