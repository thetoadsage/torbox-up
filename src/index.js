import { loadConfig } from "./config.js";
import { Monitor } from "./monitor.js";

const config = loadConfig();
const monitor = new Monitor({ config });

async function run() {
  await monitor.run();
}

run().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exitCode = 1;
});

setInterval(() => {
  run().catch((error) => console.error(`[unexpected] ${error.message}`));
}, config.intervalMs);
