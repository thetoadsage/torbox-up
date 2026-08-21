function positiveInteger(value, name, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function timeZone(value) {
  const zone = value?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    throw new Error(`TIME_ZONE must be a valid IANA time zone (for example, America/Chicago).`);
  }
  return zone;
}

export function loadConfig(env = process.env) {
  if (!env.TORBOX_API_KEY?.trim()) {
    throw new Error("TORBOX_API_KEY is required.");
  }

  return {
    apiKey: env.TORBOX_API_KEY.trim(),
    apiUrl: env.TORBOX_API_URL || "https://api.torbox.app/v1/api/user/me",
    premiumizeApiKey: env.PREMIUMIZE_API_KEY?.trim() || null,
    premiumizeApiUrl: env.PREMIUMIZE_API_URL || "https://www.premiumize.me/api/account/info",
    ntfyUrl: env.NTFY_URL?.trim() || null,
    timeZone: timeZone(env.TIME_ZONE),
    intervalMs: positiveInteger(env.CHECK_INTERVAL_MS, "CHECK_INTERVAL_MS", 120000),
    timeoutMs: positiveInteger(env.TIMEOUT_MS, "TIMEOUT_MS", 10000),
    failuresBeforeAlert: positiveInteger(
      env.FAILURES_BEFORE_ALERT,
      "FAILURES_BEFORE_ALERT",
      2,
    ),
    successesBeforeRecovery: positiveInteger(
      env.SUCCESSES_BEFORE_RECOVERY,
      "SUCCESSES_BEFORE_RECOVERY",
      2,
    ),
  };
}
