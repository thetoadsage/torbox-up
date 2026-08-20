const AUTH_ERRORS = new Set(["BAD_TOKEN", "NO_AUTH"]);

function apiError(data) {
  return data?.detail || data?.error || null;
}

export async function checkTorBox({ apiKey, apiUrl, timeoutMs, fetchFn = fetch }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(apiUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "TorBoxUp/1.0.0",
        Accept: "application/json",
      },
    });
    const data = await response.json().catch(() => null);
    const error = apiError(data);

    if (response.ok && data?.success === true) {
      return { state: "healthy", message: "TorBox API key is valid and responding." };
    }
    if (response.status === 401 || response.status === 403 || AUTH_ERRORS.has(error)) {
      return { state: "auth_failed", message: `TorBox authentication failed: ${error || `HTTP ${response.status}`}.` };
    }
    return { state: "api_issue", message: `TorBox API is unhealthy: ${error || `HTTP ${response.status}`}.` };
  } catch (error) {
    const detail = error?.name === "AbortError" ? "request timed out" : error?.message || "unknown error";
    return { state: "connection_issue", message: `TorBox API connection failed: ${detail}.` };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendNtfy({ ntfyUrl, title, message, priority = "high", fetchFn = fetch }) {
  if (!ntfyUrl) return false;
  const response = await fetchFn(ntfyUrl, {
    method: "POST",
    body: message,
    headers: { Title: title, Priority: priority, Tags: priority === "high" ? "warning" : "white_check_mark" },
  });
  if (!response.ok) throw new Error(`ntfy notification failed with HTTP ${response.status}.`);
  return true;
}

function formatTimestamp(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${parts.timeZoneName}`;
}

export class Monitor {
  constructor({ config, check = checkTorBox, notify = sendNtfy, logger = console, now = () => new Date() }) {
    this.config = config;
    this.check = check;
    this.notify = notify;
    this.logger = logger;
    this.now = now;
    this.consecutiveFailures = 0;
    this.outageAlerted = false;
  }

  async run() {
    const result = await this.check(this.config);
    if (result.state === "healthy") {
      const recovered = this.outageAlerted;
      this.consecutiveFailures = 0;
      this.logger.log(`[healthy] ${result.message}`);
      if (recovered) {
        await this.#notify("TorBox API recovered", result.message, "default");
        this.outageAlerted = false;
      }
      return result;
    }

    this.consecutiveFailures += 1;
    this.logger.error(`[${result.state}] ${result.message}`);
    if (this.consecutiveFailures >= this.config.failuresBeforeAlert && !this.outageAlerted) {
      await this.#notify("TorBox API issue", result.message);
      this.outageAlerted = true;
    }
    return result;
  }

  async #notify(title, message, priority) {
    try {
      const timeZone = this.config.timeZone || "UTC";
      const timestamp = formatTimestamp(this.now(), timeZone);
      await this.notify({
        ntfyUrl: this.config.ntfyUrl,
        title,
        message: `Time (${timeZone}): ${timestamp}\n\n${message}`,
        priority,
      });
    } catch (error) {
      this.logger.error(`[notification_issue] ${error.message}`);
    }
  }
}
