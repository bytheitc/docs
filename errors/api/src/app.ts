// errors/api: the collective's own error tracker. Speaks the Sentry/GlitchTip ingest protocol, groups
// events into issues, alerts on new issues and regressions, and serves its staff pages itself.
// Built from a config, a CMS client and (optionally) a store, so tests can run instances side by side.
import express, { type Request, type RequestHandler, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { CmsClient } from "./cms.js";
import { loadConfig, type Config } from "./config.js";
import { errorHandler, notFoundHandler, requestLog } from "./http.js";
import { reportProcessErrors } from "./observe.js";
import { ingestRoutes } from "./routes/ingest.js";
import { uiRoutes } from "./routes/ui.js";
import { getStore, initStore } from "./store/index.js";

export interface Ctx {
  config: Config;
  cms: CmsClient;
}

export function createApp(ctx: Ctx) {
  const app = express();
  app.disable("x-powered-by");
  app.set("etag", false);
  app.set("query parser", "simple");
  // Behind Vercel (or TRUST_PROXY=on) req.ip and req.protocol come from the proxy's headers.
  app.set("trust proxy", process.env.TRUST_PROXY ? process.env.TRUST_PROXY === "on" : process.env.VERCEL === "1");

  app.use(requestLog(ctx.config.log));
  app.use(((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    next();
  }) as RequestHandler);

  app.get("/health", async (_req, res) => {
    const store = getStore();
    let database = false;
    try { database = Boolean(store && (await store.listProjects(), true)); } catch { database = false; }
    res.status(database ? 200 : 503).json({ ok: database, service: "errors", database, cms: { configured: ctx.cms.configured } });
  });

  app.use(ingestRoutes(ctx));
  app.use(uiRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Composition root, built lazily on the first request so importing createApp (the tests) touches
// nothing; server.ts forces it at startup instead.
interface Instance { app: ReturnType<typeof createApp>; config: Config }
let instance: Instance | undefined;

function getInstance(): Instance {
  if (!instance) {
    // This service's own failures go to its log unless told otherwise; see config.ts.
    process.env.ERROR_REPORTING ??= "logs";
    reportProcessErrors();
    const config = loadConfig();
    if (!initStore(config)) console.warn("[errors] MONGODB_URI is not set: ingest and pages answer 503 until it is.");
    else if (!config.db.uri) console.warn("[errors] no MONGODB_URI: using an in-memory store (development only; nothing survives a restart).");
    const cms = new CmsClient(config);
    cms.registerSpace();
    instance = { app: createApp({ config, cms }), config };
  }
  return instance;
}

export function getConfig(): Config {
  return getInstance().config;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  getInstance().app(req as Request, res as Response, () => {});
}
