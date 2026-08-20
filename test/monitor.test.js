import assert from "node:assert/strict";
import test from "node:test";
import { checkTorBox, Monitor } from "../src/monitor.js";

const config = { apiKey: "secret", apiUrl: "https://example.test/me", timeoutMs: 100, ntfyUrl: "https://ntfy.test/topic", timeZone: "America/Chicago", failuresBeforeAlert: 2, successesBeforeRecovery: 2 };

test("a successful TorBox response is healthy", async () => {
  const result = await checkTorBox({ ...config, fetchFn: async () => new Response(JSON.stringify({ success: true }), { status: 200 }) });
  assert.equal(result.state, "healthy");
});

test("authentication responses are classified as auth_failed", async () => {
  const result = await checkTorBox({ ...config, fetchFn: async () => new Response(JSON.stringify({ error: "BAD_TOKEN" }), { status: 401 }) });
  assert.equal(result.state, "auth_failed");
});

test("sends one outage alert and recovers after consecutive successful checks", async () => {
  const results = [
    { state: "api_issue", message: "origin refused" },
    { state: "connection_issue", message: "timed out" },
    { state: "auth_failed", message: "verification unavailable" },
    { state: "healthy", message: "back" },
    { state: "healthy", message: "still back" },
  ];
  const notices = [];
  const monitor = new Monitor({
    config,
    check: async () => results.shift(),
    notify: async (notice) => notices.push(notice),
    logger: { log() {}, error() {} },
    now: () => new Date("2026-08-20T12:34:56.000Z"),
  });
  await monitor.run();
  await monitor.run();
  await monitor.run();
  assert.deepEqual(notices.map((notice) => notice.title), ["TorBox API issue"]);
  await monitor.run();
  await monitor.run();
  assert.deepEqual(notices.map((notice) => notice.title), ["TorBox API issue", "TorBox API recovered"]);
  assert.ok(notices.every((notice) => notice.message.startsWith("Time (America/Chicago): 2026-08-20 07:34:56 CDT\n\n")));
});
