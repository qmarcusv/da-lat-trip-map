import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadAuthContext() {
  const storedUsers = [
    { username: "trucnhi", displayName: "Trúc Nhi", role: "admin", salt: "a", passwordHash: "hash" },
    { username: "thao", displayName: "Thảo", role: "user", salt: "b", passwordHash: "hash" },
    { username: "tuyen", displayName: "Tuyền", role: "user", salt: "c", passwordHash: "hash" },
    { username: "ngocnhi", displayName: "Ngọc Nhi", role: "user", salt: "d", passwordHash: "hash" },
  ];
  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => JSON.stringify(storedUsers) }),
    },
    Date,
  });
  for (const filename of ["Config.gs", "Auth.gs"]) {
    vm.runInContext(readFileSync(new URL(`../apps-script/${filename}`, import.meta.url), "utf8"), context, { filename });
  }
  return context;
}

test("all four configured users have admin role", () => {
  const context = loadAuthContext();
  assert.deepEqual(Array.from(context.getUsers_(), (user) => user.role), ["admin", "admin", "admin", "admin"]);
});

test("existing sessions use the current configured role instead of stale sheet role", () => {
  const context = loadAuthContext();
  context.hashToken_ = () => "token-hash";
  context.getRows_ = () => [{
    tokenHash: "token-hash",
    username: "thao",
    role: "user",
    expiresAt: "2999-01-01T00:00:00.000Z",
  }];

  assert.equal(context.authenticate_("token").role, "admin");
});
