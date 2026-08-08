import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const ASSET_VERSION = "20260808-2";
const root = new URL("../", import.meta.url);

test("HTML loads local CSS and the entry module with the same deployment version", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  assert.match(html, new RegExp(`css/styles\\.css\\?v=${ASSET_VERSION}`));
  assert.match(html, new RegExp(`js/app\\.js\\?v=${ASSET_VERSION}`));
});

test("browser module imports use the same deployment version", () => {
  for (const name of readdirSync(new URL("js/", root))) {
    if (!name.endsWith(".js")) continue;
    const source = readFileSync(new URL(`js/${name}`, root), "utf8");
    const imports = [...source.matchAll(/from\s+["'](\.\/.+?)["']/g)];
    for (const match of imports) {
      assert.match(match[1], new RegExp(`\\?v=${ASSET_VERSION}$`), `${name}: ${match[1]}`);
    }
  }
});

test("the entry module reloads fresh HTML when required markup is stale", () => {
  const app = readFileSync(new URL("js/app.js", root), "utf8");
  assert.match(app, /function recoverFromStaleMarkup\(missingId\)/);
  assert.match(app, /url\.searchParams\.set\("ui-version", ASSET_VERSION\)/);
  assert.match(app, /window\.location\.replace\(url\)/);
});
