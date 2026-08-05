import test from "node:test";
import assert from "node:assert/strict";

import { ApiClient } from "../js/api.js";

test("ApiClient only accepts production Apps Script exec URLs", () => {
  assert.equal(new ApiClient("").isConfigured, false);
  assert.equal(new ApiClient("https://script.google.com/macros/s/example/dev").isConfigured, false);
  assert.equal(new ApiClient("https://script.google.com/macros/s/example/exec").isConfigured, true);
});
