import { loadConfig } from "./config.js";
import { checkPremiumize, checkTorBox, Monitor } from "./monitor.js";

const config = loadConfig();
const monitors = [
  new Monitor({ config: { ...config, serviceName: "TorBox" }, check: checkTorBox }),
];

if (config.premiumizeApiKey) {
  monitors.push(new Monitor({
    config: {
      ...config,
      serviceName: "Premiumize",
      apiKey: config.premiumizeApiKey,
      apiUrl: config.premiumizeApiUrl,
    },
    check: checkPremiumize,
  }));
}

async function run() {
  await Promise.all(monitors.map((monitor) => monitor.run()));
}

run().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exitCode = 1;
});

setInterval(() => {
  run().catch((error) => console.error(`[unexpected] ${error.message}`));
}, config.intervalMs);
