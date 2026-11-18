// analytics/api: the collective's own web analytics. Counts page views and custom events without
// cookies or stored IPs, and serves its staff dashboards itself. Built from a config, a CMS client
// and (optionally) a store, so tests can run instances side by side.
import express, { type Request, type RequestHandler, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { CmsClient } from "./cms.js";
import { loadConfig, type Config } from "./config.js";
import { errorHandler, notFoundHandler, requestLog } from "./http.js";
import { reportProcessErrors } from "./observe.js";
import { collectRoutes } from "./routes/collect.js";
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
  // Behind Vercel (or TRUST_PROXY=on) req.ip comes from the proxy's headers. It has to be the
  // visitor's address, or every visitor hashes to the proxy and counts as one.
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
    try { database = Boolean(store && (await store.listSites(), true)); } catch { database = false; }
    res.status(database ? 200 : 503).json({ ok: database, service: "analytics", database, cms: { configured: ctx.cms.configured } });
  });

  app.use(collectRoutes(ctx));
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
    reportProcessErrors();
    const config = loadConfig();
    if (!initStore(config)) console.warn("[analytics] MONGODB_URI is not set: collection and pages answer 503 until it is.");
    else if (!config.db.uri) console.warn("[analytics] no MONGODB_URI: using an in-memory store (development only; nothing survives a restart).");
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
