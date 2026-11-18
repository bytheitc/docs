// Long-running entry point, for hosts that aren't invoking app.ts directly per request.
import { createServer } from "node:http";
import handler, { getConfig } from "./app.js";
import { HOUSE } from "./content/house.js";

const config = getConfig();
const where = config.source.kind === "github" ? `${config.source.repo}@${config.source.branch}` : config.source.dir;
const server = createServer(handler).listen(config.port, () => {
  console.log(`[api] ${HOUSE.space} api listening on :${config.port} (${config.production ? "production" : "development"}; pages from ${config.source.kind} ${where})`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
