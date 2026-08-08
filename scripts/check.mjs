import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const directories = ["js"];
const javaScriptFiles = [];

for (const directory of directories) {
  for (const name of readdirSync(new URL(`${directory}/`, root))) {
    if (extname(name) === ".js") javaScriptFiles.push(join(directory, name));
  }
}

for (const name of readdirSync(new URL("apps-script/", root))) {
  if (extname(name) !== ".gs") continue;
  const source = readFileSync(new URL(`apps-script/${name}`, root), "utf8");
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`Apps Script syntax error in ${name}: ${error.message}`);
  }
}

JSON.parse(readFileSync(new URL("apps-script/appsscript.json", root), "utf8"));

for (const file of javaScriptFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
}

const html = readFileSync(new URL("index.html", root), "utf8");
const requiredIds = [
  "login-screen", "app-shell", "map", "location-list", "shared-schedule-panel", "personal-schedule-panel",
  "location-dialog", "plan-dialog", "shared-plan-dialog", "toast-region",
];
for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) throw new Error(`index.html thiếu #${id}`);
}

if (/innerHTML\s*=/.test(readFileSync(new URL("js/app.js", root), "utf8"))) {
  throw new Error("Không được render dữ liệu người dùng bằng innerHTML.");
}

console.log(`Checked ${javaScriptFiles.length} JavaScript files and required HTML landmarks.`);
