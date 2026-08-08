import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../apps-script/Repository.gs", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);

test("planned times are written to Sheets as text instead of 1899 Date values", () => {
  assert.equal(context.toCellValue_("20:45", "plannedTime"), "'20:45");
  assert.equal(context.toCellValue_("20:45", "note"), "20:45");
  assert.equal(context.toCellValue_("", "plannedTime"), "");
});
