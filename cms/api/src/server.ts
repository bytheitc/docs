// Entry point: read the environment, connect storage, listen.
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { Mailer, loadMailConfig } from "./mail.js";
import { SUPPORTED_DATABASES, createStorage, storageStatus } from "./storage.js";

const config = loadConfig();
const status = storageStatus(config);
if (!status.configured) {
  console.error(`[cms] ${status.problem} Supported databases: ${SUPPORTED_DATABASES.join(", ")}.`);
  process.exit(1);
}
if (config.production && !config.spaceKeys.size) console.warn("[cms] CMS_SPACE_KEYS is empty: no house api can authenticate.");
if (config.production && !config.setupToken) console.warn("[cms] CMS_SETUP_TOKEN is not set: the first admin can't be created until it is.");

const mailer = new Mailer(loadMailConfig());
if (config.production && !mailer.delivers) {
  console.warn(`[cms] MAIL_PROVIDER is "${mailer.kind}": replies from the inbox will not reach anyone.`);
}

const store = createStorage(config);
store.ping().then(
  () => console.log(`[cms] ${store.kind} reachable (database ${config.db.name})`),
  (e) => console.error(`[cms] ${store.kind} is not reachable yet: ${(e as Error).message}`),
);

const server = createApp({ config, store, mailer }).listen(config.port, () => {
  console.log(`[cms] api listening on :${config.port} (${config.production ? "production" : "development"}; keys for: ${[...config.spaceKeys.keys()].join(", ") || "none"})`);
});

const shutdown = () => {
  server.close(() => void store.close().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
