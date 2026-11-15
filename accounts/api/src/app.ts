// The Express app for "Sign in with ITC," as its own service. Built from a config and a CMS client
// so tests can run several instances side by side.
import express, { type Request, type RequestHandler, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { CmsClient } from "./cms.js";
import { loadConfig, type Config } from "./config.js";
import { COLLECTIONS, FORMS } from "./content/collections.js";
import { HOUSE } from "./content/house.js";
import { errorHandler, notFoundHandler, requestLog } from "./http.js";
import { registerSchemaWithRetry } from "./register.js";
import { accountRoutes } from "./routes/account.js";
import { credentialsLoginRoutes } from "./routes/credentials-login.js";
import { developersRoutes } from "./routes/developers.js";
import { loginRoutes } from "./routes/login.js";
import { oauthRoutes } from "./routes/oauth.js";
import { securityRoutes } from "./routes/security.js";
import { staffRoutes } from "./routes/staff.js";
import { webhookRoutes } from "./routes/webhook.js";
import { getAccountsStore, initAccountsStore, storageStatus } from "./store/index.js";

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
  // otherwise has no route there. /health is the real (CMS- and database-reaching) check.
  app.get("/", (_req, res) => {
    res.json({ ok: true, service: `${HOUSE.space} api` });
  });

  app.get("/health", async (_req, res) => {
    const reachable = ctx.cms.configured ? await ctx.cms.ping() : false;
    res.status(reachable || !ctx.cms.configured ? 200 : 503).json({
      ok: reachable,
      space: HOUSE.space,
      cms: { url: ctx.config.cms.url, configured: ctx.cms.configured, reachable },
      contentSource: reachable ? "cms" : "seed",
      database: { configured: Boolean(getAccountsStore()), name: ctx.config.db.name },
      portal: { apiUrl: ctx.config.portal.apiUrl },
      collections: COLLECTIONS.map((c) => c.name),
      forms: Object.keys(FORMS),
    });
  });

  app.use(loginRoutes(ctx));
  app.use(credentialsLoginRoutes(ctx));
  app.use(accountRoutes(ctx));
  app.use(securityRoutes(ctx));
  app.use(developersRoutes(ctx));
  app.use(staffRoutes(ctx));
  app.use(oauthRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Composition root: this module's default export is what the host (serverless or otherwise)
// invokes directly. The instance is built lazily, on first request rather than on import, so
// importing this module for its createApp factory (as tests do, with their own ctx) never
// connects to anything or registers a schema. server.ts (the long-running-process entry point)
// forces that first build at startup instead of waiting for a request.
interface Instance {
  app: ReturnType<typeof createApp>;
  config: Config;
}
let instance: Instance | undefined;

function getInstance(): Instance {
  if (!instance) {
    const config = loadConfig();
    if (config.production && !config.cms.key) console.warn(`[api] CMS_SPACE_KEY is not set: ${HOUSE.space} will serve seed (first-party-only) clients.`);
    if (config.production && !config.portal.serviceKey) console.warn("[api] ACCOUNTS_SERVICE_KEY is not set: calls to portal/api's internal endpoint will be refused.");

    const storage = storageStatus(config);
    if (!storage.configured) {
      // Not fatal: every accounts endpoint answers 503 until it is set.
      console.warn(`[api] ${storage.problem} Accounts' own endpoints will answer 503 until it is set.`);
    }
    initAccountsStore(config);

    const cms = new CmsClient(config);
    registerSchemaWithRetry(config, cms);
    instance = { app: createApp({ config, cms }), config };
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
