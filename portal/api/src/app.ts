// The Express app for the contributor portal's api. Built from a config and a CMS client so tests can run
// several instances side by side.
import express, { type Request, type RequestHandler, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { CmsClient } from "./cms.js";
import { loadConfig, type Config } from "./config.js";
import { COLLECTIONS, FORMS } from "./content/collections.js";
import { HOUSE } from "./content/house.js";
import { errorHandler, notFoundHandler, requestLog } from "./http.js";
import { startJobs } from "./jobs.js";
import { getPortalStore, initPortalStore, storageStatus } from "./portal/store.js";
import { registerSchemaWithRetry } from "./register.js";
import { authRoutes } from "./routes/auth.js";
import { contentRoutes } from "./routes/content.js";
import { formRoutes } from "./routes/forms.js";
import { maintainerRoutes } from "./routes/maintainers.js";
import { meRoutes } from "./routes/me.js";
import { oauthRoutes } from "./routes/oauth.js";
import { publicRoutes } from "./routes/public.js";
import { staffRoutes } from "./routes/staff.js";
import { webhookRoutes } from "./routes/webhook.js";

export interface Ctx {
  config: Config;
  cms: CmsClient;
}

const BODY_LIMIT = "256kb";

export function createApp(ctx: Ctx) {
  const app = express();
  app.disable("x-powered-by");
  app.set("etag", false);
  app.set("query parser", "simple");

  app.use(requestLog(ctx.config.log));
  app.use(((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    next();
  }) as RequestHandler);

  // The webhook reads its own raw body, so it is mounted before the JSON parser.
  app.use(webhookRoutes(ctx));
  app.use(express.json({ limit: BODY_LIMIT }));

  // Cheap and path-only: some hosts probe the bare root as a liveness check, and this api
  // otherwise has no route there. /health is the real (CMS-reaching) check.
  app.get("/", (_req, res) => {
    res.json({ ok: true, service: `${HOUSE.space} api` });
  });

  app.get("/health", async (_req, res) => {
    const reachable = ctx.cms.configured ? await ctx.cms.ping() : false;
    res.status(reachable || !ctx.cms.configured ? 200 : 503).json({
      ok: reachable,
      space: HOUSE.space,
      cms: { url: ctx.config.cms.url, configured: ctx.cms.configured, reachable },
      // What the next content read would serve if the CMS stays as it is.
      contentSource: reachable ? "cms" : "seed",
      // The portal's own data. Without it the public pages still render and every portal route is 503.
      database: { configured: Boolean(getPortalStore()), name: ctx.config.db.name },
      collections: COLLECTIONS.map((c) => c.name),
      forms: Object.keys(FORMS),
    });
  });

  app.use(contentRoutes(ctx));
  app.use(formRoutes(ctx));
  app.use(authRoutes(ctx));
  app.use(publicRoutes(ctx));
  app.use(meRoutes(ctx));
  app.use(oauthRoutes(ctx));
  app.use(maintainerRoutes(ctx));
  app.use(staffRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Composition root: this module's default export is what the host (serverless or otherwise)
// invokes directly. The instance is built lazily, on first request rather than on import, so
// importing this module for its createApp factory (as tests do, with their own ctx) never
// connects to anything, registers a schema, or starts the background jobs. server.ts (the
// long-running-process entry point) forces that first build at startup instead of waiting for
// a request.
interface Instance {
  app: ReturnType<typeof createApp>;
  config: Config;
  jobs: ReturnType<typeof startJobs>;
}
let instance: Instance | undefined;

function getInstance(): Instance {
  if (!instance) {
    const config = loadConfig();
    if (config.production && !config.cms.key) console.warn(`[api] CMS_SPACE_KEY is not set: ${HOUSE.space} will serve seed content only.`);
    if (config.production && !config.web.revalidateSecret) console.warn("[api] REVALIDATE_SECRET is not set: the web won't be told about changes.");

    const storage = storageStatus(config);
    if (!storage.configured) {
      // Not fatal: the public pages still read content, and every portal route answers 503.
      console.warn(`[api] ${storage.problem} The portal's own endpoints will answer 503 until it is set.`);
    }
    initPortalStore(config);

    const cms = new CmsClient(config);
    registerSchemaWithRetry(config, cms);
    const jobs = startJobs(config, cms);
    instance = { app: createApp({ config, cms }), config, jobs };
  }
  return instance;
}

export function getConfig(): Config {
  return getInstance().config;
}

export function getJobs() {
  return getInstance().jobs;
}

// Typed as the plain Node listener shape so this can be passed straight to http.createServer;
// Express's own types (req, res) extend these at runtime, which is all app() actually needs.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  getInstance().app(req as Request, res as Response, () => {});
}
