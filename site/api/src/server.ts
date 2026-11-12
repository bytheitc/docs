// Entry point: read the environment, register the schema, listen.
import { createApp } from "./app.js";
import { CmsClient } from "./cms.js";
import { loadConfig } from "./config.js";
import { HOUSE } from "./content/house.js";
import { Mailer, loadMailConfig } from "./mail.js";
import { initNewsletterStore } from "./newsletter/store.js";
import { registerSchemaWithRetry } from "./register.js";

const config = loadConfig();
if (config.production && !config.cms.key) console.warn(`[api] CMS_SPACE_KEY is not set: ${HOUSE.space} will serve seed content only.`);
if (config.production && !config.web.revalidateSecret) console.warn("[api] REVALIDATE_SECRET is not set: the web won't be told about changes.");

const mailer = new Mailer(loadMailConfig());
if (config.production && !mailer.delivers) console.warn(`[api] MAIL_PROVIDER is "${mailer.kind}": nobody can confirm a newsletter subscription.`);

// Not fatal: without a database the newsletter answers 503 and the rest of the site is unaffected.
if (!initNewsletterStore(config)) console.warn("[api] MONGODB_URI is not set: the newsletter is switched off.");

const cms = new CmsClient(config);
registerSchemaWithRetry(config, cms);

const server = createApp({ config, cms, mailer }).listen(config.port, () => {
  console.log(`[api] ${HOUSE.space} api listening on :${config.port} (${config.production ? "production" : "development"}; cms ${config.cms.url})`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
