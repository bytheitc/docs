// Long-running entry point: builds the app now instead of on the first request, then listens.
import { createServer } from "node:http";
import handler, { getConfig } from "./app.js";

const config = getConfig();
const server = createServer(handler).listen(config.port, () => {
  console.log(`[errors] listening on :${config.port} (${config.production ? "production" : "development"}; DSNs use ${config.publicUrl})`);
});
const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
