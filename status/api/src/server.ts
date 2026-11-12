// Entry point: read the environment, open the database, start the clock, listen.
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { startScheduler } from "./scheduler.js";
import { initStore } from "./store/index.js";

const config = loadConfig();

if (!config.db.uri) {
  console.warn("[status] MONGODB_URI is not set: every page will answer 'status unknown' until it is.");
} else {
  initStore(config);
}
if (config.setupToken) {
  console.warn("[status] SETUP_TOKEN is set, so tenant creation is open. Unset it once the tenants exist.");
}

const scheduler = startScheduler(config);
const server = createApp(config, scheduler).listen(config.port, () => {
  console.log(`[status] listening on :${config.port} (${config.production ? "production" : "development"}; ${config.publicUrl})`);
});

const shutdown = () => {
  scheduler.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
