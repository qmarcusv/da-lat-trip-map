function initializeUsers_() {
  var properties = PropertiesService.getScriptProperties();
  var initialPassword = properties.getProperty(APP.initialPasswordProperty);
  if (!initialPassword) {
    throw new AppError("MISSING_INITIAL_PASSWORD", "Tạo Script Property INITIAL_PASSWORD rồi chạy lại setupProject().");
  }
  if (initialPassword.length < 3) throw new AppError("WEAK_PASSWORD", "Mật khẩu ban đầu phải có ít nhất 3 ký tự.");

  var users = APP.users.map(function (user) {
    var salt = Utilities.getUuid();
    return {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      salt: salt,
      passwordHash: hashSecret_(initialPassword, salt),
    };
  });
  properties.setProperty(APP.usersProperty, JSON.stringify(users));
  properties.deleteProperty(APP.initialPasswordProperty);
}

function resetAllPasswords() {
  return withScriptLock_(function () {
    initializeUsers_();
    deleteRowsWhere_("Sessions", function () { return true; });
    return "Đã đổi mật khẩu cho bốn tài khoản và đăng xuất mọi phiên cũ.";
  });
}

function login_(payload) {
  var username = cleanString_(payload.username, 30).toLowerCase();
  var password = String(payload.password || "");
  if (!username || !password) throw new AppError("INVALID_CREDENTIALS", "Username hoặc mật khẩu không đúng.");
  assertLoginAllowed_(username);

  var user = getUsers_().filter(function (candidate) { return candidate.username === username; })[0];
  if (!user || !constantTimeEqual_(hashSecret_(password, user.salt), user.passwordHash)) {
    recordLoginFailure_(username);
    throw new AppError("INVALID_CREDENTIALS", "Username hoặc mật khẩu không đúng.");
  }
  CacheService.getScriptCache().remove("login:" + username);

  return withScriptLock_(function () {
    removeExpiredSessions_();
    var token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    var createdAt = new Date();
    var expiresAt = new Date(createdAt.getTime() + APP.sessionHours * 60 * 60 * 1000);
    appendObject_("Sessions", APP.headers.Sessions, {
      tokenHash: hashToken_(token), username: user.username, role: user.role,
      expiresAt: expiresAt.toISOString(), createdAt: createdAt.toISOString(),
    });
    audit_(user.username, "login", "session", "", "Đăng nhập thành công");
    return {
      token: token,
      user: { username: user.username, displayName: user.displayName, role: user.role },
      expiresAt: expiresAt.toISOString(),
    };
  });
}

function logout_(session) {
  return withScriptLock_(function () {
    deleteRowsWhere_("Sessions", function (row) { return row.tokenHash === session.tokenHash; });
    audit_(session.username, "logout", "session", "", "Đăng xuất");
    return { loggedOut: true };
  });
}

function authenticate_(token) {
  if (!token || typeof token !== "string" || token.length > 200) throw new AppError("UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  var tokenHash = hashToken_(token);
  var now = Date.now();
  var row = getRows_("Sessions").filter(function (session) {
    return session.tokenHash === tokenHash && new Date(session.expiresAt).getTime() > now;
  })[0];
  if (!row) throw new AppError("SESSION_EXPIRED", "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
  var configuredUser = APP.users.filter(function (user) { return user.username === row.username; })[0];
  return { username: row.username, role: configuredUser ? configuredUser.role : row.role, tokenHash: tokenHash };
}

function requireAdmin_(session) {
  if (session.role !== "admin") throw new AppError("FORBIDDEN", "Chỉ admin được thực hiện thao tác này.");
}

function getUsers_() {
  var raw = PropertiesService.getScriptProperties().getProperty(APP.usersProperty);
  if (!raw) throw new AppError("NOT_CONFIGURED", "Chưa khởi tạo tài khoản. Hãy chạy setupProject().");
  var storedUsers = JSON.parse(raw);
  return APP.users.map(function (configuredUser) {
    var storedUser = storedUsers.filter(function (user) { return user.username === configuredUser.username; })[0] || {};
    return Object.assign({}, storedUser, configuredUser);
  });
}

function assertLoginAllowed_(username) {
  var cache = CacheService.getScriptCache();
  var key = "login:" + username;
  var attempts = Number(cache.get(key) || 0);
  if (attempts >= APP.maxLoginAttempts) throw new AppError("TOO_MANY_ATTEMPTS", "Đăng nhập sai quá nhiều lần. Hãy thử lại sau 15 phút.");
}

function recordLoginFailure_(username) {
  var cache = CacheService.getScriptCache();
  var key = "login:" + username;
  var attempts = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(attempts), APP.loginWindowSeconds);
}

function hashSecret_(secret, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ":" + secret, Utilities.Charset.UTF_8);
  return bytes.map(function (value) { return (value + 256) % 256; })
    .map(function (value) { return ("0" + value.toString(16)).slice(-2); }).join("");
}

function hashToken_(token) {
  return hashSecret_(token, "session-token-v1");
}

function constantTimeEqual_(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  var difference = 0;
  for (var index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function removeExpiredSessions_() {
  var now = Date.now();
  deleteRowsWhere_("Sessions", function (row) { return new Date(row.expiresAt).getTime() <= now; });
}
