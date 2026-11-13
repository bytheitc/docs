// Long-running entry point, for hosts that aren't invoking app.ts directly per request.
// Forces app.ts's lazy composition root to build now (config, storage and the scheduler)
// instead of waiting for the first request.
import { createServer } from "node:http";
import handler, { getConfig, getScheduler } from "./app.js";

const config = getConfig();
const server = createServer(handler).listen(config.port, () => {
  console.log(`[status] listening on :${config.port} (${config.production ? "production" : "development"}; ${config.publicUrl})`);
});

const shutdown = () => {
  getScheduler().stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
