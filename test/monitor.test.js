import assert from "node:assert/strict";
import test from "node:test";
import { checkTorBox, Monitor } from "../src/monitor.js";

const config = { apiKey: "secret", apiUrl: "https://example.test/me", timeoutMs: 100, ntfyUrl: "https://ntfy.test/topic", failuresBeforeAlert: 2 };

test("a successful TorBox response is healthy", async () => {
  const result = await checkTorBox({ ...config, fetchFn: async () => new Response(JSON.stringify({ success: true }), { status: 200 }) });
  assert.equal(result.state, "healthy");
});

test("authentication responses are classified as auth_failed", async () => {
  const result = await checkTorBox({ ...config, fetchFn: async () => new Response(JSON.stringify({ error: "BAD_TOKEN" }), { status: 401 }) });
  assert.equal(result.state, "auth_failed");
});

test("sends one outage alert across changing failures, then one recovery", async () => {
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
  });
  await monitor.run();
  await monitor.run();
  await monitor.run();
  await monitor.run();
  await monitor.run();
  assert.deepEqual(notices.map((notice) => notice.title), ["TorBox API issue", "TorBox API recovered"]);
});
