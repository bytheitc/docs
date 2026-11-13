// Long-running entry point, for hosts that aren't invoking app.ts directly per request.
// Forces app.ts's lazy composition root to build now (config and storage) instead of waiting
// for the first request.
import { createServer } from "node:http";
import handler, { getConfig, getStore } from "./app.js";

const config = getConfig();
const server = createServer(handler).listen(config.port, () => {
  console.log(`[cms] api listening on :${config.port} (${config.production ? "production" : "development"}; keys for: ${[...config.spaceKeys.keys()].join(", ") || "none"})`);
});

const shutdown = () => {
  server.close(() => void getStore().close().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
