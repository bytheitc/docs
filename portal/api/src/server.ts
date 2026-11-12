// Entry point: read the environment, register the schema, listen.
import { createApp } from "./app.js";
import { CmsClient } from "./cms.js";
import { loadConfig } from "./config.js";
import { HOUSE } from "./content/house.js";
import { startJobs } from "./jobs.js";
import { initPortalStore, storageStatus } from "./portal/store.js";
import { registerSchemaWithRetry } from "./register.js";

const config = loadConfig();
if (config.production && !config.cms.key) console.warn(`[api] CMS_SPACE_KEY is not set: ${HOUSE.space} will serve seed content only.`);
if (config.production && !config.web.revalidateSecret) console.warn("[api] REVALIDATE_SECRET is not set: the web won't be told about changes.");

const status = storageStatus(config);
if (!status.configured) {
  // Not fatal: the public pages still read content, and every portal route answers 503.
  console.warn(`[api] ${status.problem} The portal's own endpoints will answer 503 until it is set.`);
}
initPortalStore(config);

const cms = new CmsClient(config);
registerSchemaWithRetry(config, cms);
const jobs = startJobs(config, cms);

const server = createApp({ config, cms }).listen(config.port, () => {
  console.log(`[api] ${HOUSE.space} api listening on :${config.port} (${config.production ? "production" : "development"}; cms ${config.cms.url})`);
});

const shutdown = () => {
  jobs.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
