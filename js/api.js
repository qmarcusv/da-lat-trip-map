export class ApiError extends Error {
  constructor(message, code = "REQUEST_FAILED") {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export class ApiClient {
  #apiUrl;
  #timeoutMs;
  #token = "";

  constructor(apiUrl, timeoutMs = 15000) {
    this.#apiUrl = String(apiUrl || "").trim();
    this.#timeoutMs = timeoutMs;
  }

  get isConfigured() {
    return /^https:\/\/script\.google\.com\/.*\/exec$/.test(this.#apiUrl);
  }

  async login(username, password) {
    const data = await this.request("login", { username, password }, false);
    this.#token = data.token;
    return data.user;
  }

  async logout() {
    if (this.#token) {
      try {
        await this.request("logout");
      } finally {
        this.#token = "";
      }
    }
  }

  async request(action, payload = {}, authenticated = true) {
    if (!this.isConfigured) {
      throw new ApiError("Ứng dụng chưa được kết nối Google Apps Script.", "API_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    const body = { action, payload };
    if (authenticated) body.token = this.#token;

    try {
      const response = await fetch(this.#apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok) throw new ApiError(`Máy chủ phản hồi HTTP ${response.status}.`, "HTTP_ERROR");

      const result = await response.json();
      if (!result?.success) {
        throw new ApiError(result?.error?.message || "Yêu cầu không thành công.", result?.error?.code);
      }
      return result.data;
    } catch (error) {
      if (error.name === "AbortError") throw new ApiError("Yêu cầu quá thời gian chờ.", "TIMEOUT");
      if (error instanceof ApiError) throw error;
      throw new ApiError("Không thể kết nối Google Apps Script. Hãy kiểm tra URL /exec và deployment.", "NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
    }
  }
}
