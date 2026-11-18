// The Express app for this house's api. Built from a config and a CMS client so tests can run
// several instances side by side.
import express, { type Request, type RequestHandler, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { CmsClient } from "./cms.js";
import { loadConfig, type Config } from "./config.js";
import { Mailer, loadMailConfig } from "./mail.js";
import { getNewsletterStore, initNewsletterStore } from "./newsletter/store.js";
import { COLLECTIONS, FORMS } from "./content/collections.js";
import { HOUSE } from "./content/house.js";
import { errorHandler, notFoundHandler, requestLog, trustProxySetting } from "./http.js";
import { registerSchemaWithRetry } from "./register.js";
import { contentRoutes } from "./routes/content.js";
import { firstHundredRoutes } from "./routes/firstHundred.js";
import { formRoutes } from "./routes/forms.js";
import { newsletterRoutes } from "./routes/newsletter.js";
import { webhookRoutes } from "./routes/webhook.js";
import { reportProcessErrors } from "./observe.js";

export interface Ctx {
  config: Config;
  cms: CmsClient;
  /** Confirmation and welcome emails for the newsletter. */
  mailer: Mailer;
}

const BODY_LIMIT = "256kb";

export function createApp(ctx: Ctx) {
  const app = express();
  app.disable("x-powered-by");
  app.set("etag", false);
  app.set("query parser", "simple");
  // So req.ip is the visitor, not the proxy in front of this api (rate limits key on it).
  app.set("trust proxy", trustProxySetting());

  app.use(requestLog(ctx.config.log));
  app.use(((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    next();
  }) as RequestHandler);

  // The webhook reads its own raw body, so it is mounted before the JSON parser.
  app.use(webhookRoutes(ctx));
  app.use(express.json({ limit: BODY_LIMIT }));

  app.get("/health", async (_req, res) => {
    const reachable = ctx.cms.configured ? await ctx.cms.ping() : false;
    res.status(reachable || !ctx.cms.configured ? 200 : 503).json({
      ok: reachable,
      space: HOUSE.space,
      cms: { url: ctx.config.cms.url, configured: ctx.cms.configured, reachable },
      // What the next content read would serve if the CMS stays as it is.
      contentSource: reachable ? "cms" : "seed",
      collections: COLLECTIONS.map((c) => c.name),
      forms: Object.keys(FORMS),
      newsletter: { database: Boolean(getNewsletterStore()), mail: ctx.mailer.kind, delivers: ctx.mailer.delivers },
    });
  });

  app.use(contentRoutes(ctx));
  app.use(firstHundredRoutes(ctx));
  app.use(formRoutes(ctx));
  app.use(newsletterRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Composition root: this module's default export is what the host (serverless or otherwise)
// invokes directly. The instance is built lazily, on first request rather than on import, so
// importing this module for its createApp factory (as tests do, with their own ctx) never
// connects to the CMS, sends mail, or opens the newsletter store. server.ts (the
// long-running-process entry point) forces that first build at startup instead of waiting for
// a request.
interface Instance {
  app: ReturnType<typeof createApp>;
  config: Config;
}
let instance: Instance | undefined;

function getInstance(): Instance {
  if (!instance) {
    reportProcessErrors();
    const config = loadConfig();
    if (config.production && !config.cms.key) console.warn(`[api] CMS_SPACE_KEY is not set: ${HOUSE.space} will serve seed content only.`);
    if (config.production && !config.web.revalidateSecret) console.warn("[api] REVALIDATE_SECRET is not set: the web won't be told about changes.");

    const mailer = new Mailer(loadMailConfig());
    if (config.production && !mailer.delivers) console.warn(`[api] MAIL_PROVIDER is "${mailer.kind}": nobody can confirm a newsletter subscription.`);

    // Not fatal: without a database the newsletter answers 503 and the rest of the site is unaffected.
    if (!initNewsletterStore(config)) console.warn("[api] MONGODB_URI is not set: the newsletter is switched off.");

    const cms = new CmsClient(config);
    registerSchemaWithRetry(config, cms);
    instance = { app: createApp({ config, cms, mailer }), config };
  }
  return instance;
}

export function getConfig(): Config {
  return getInstance().config;
}

// Typed as the plain Node listener shape so this can be passed straight to http.createServer;
// Express's own types (req, res) extend these at runtime, which is all app() actually needs.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  getInstance().app(req as Request, res as Response, () => {});
}
