// The Express app. Built from a config and a storage adapter so tests can run several instances side by side.
import express, { type RequestHandler } from "express";
import type { Config } from "./config.js";
import type { Mailer } from "./mail.js";
import { errorHandler, notFoundHandler, requestLog } from "./http.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { deliveryRoutes } from "./routes/delivery.js";
import { manageRoutes } from "./routes/manage.js";
import type { StorageAdapter } from "./types.js";

export interface Ctx {
  config: Config;
  store: StorageAdapter;
  /** Used to reply to an inbox submission. The log provider is the development default. */
  mailer: Mailer;
}

const BODY_LIMIT = "256kb";
const SCHEMA_PUT = /^\/v1\/spaces\/[^/]+\/schema\/?$/;

export function createApp(ctx: Ctx) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", ctx.config.trustProxy);
  app.set("etag", false);
  app.set("query parser", "simple");

  app.use(requestLog(ctx.config.log));
  app.use(((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    next();
  }) as RequestHandler);

  // JSON bodies everywhere, capped. Schema registration reads its own (larger) body after checking the key.
  const json = express.json({ limit: BODY_LIMIT });
  app.use(((req, res, next) => (req.method === "PUT" && SCHEMA_PUT.test(req.path) ? next() : json(req, res, next))) as RequestHandler);

  app.get("/health", async (_req, res) => {
    try {
      await ctx.store.ping();
      res.json({ ok: true, database: { kind: ctx.store.kind, reachable: true }, mail: { provider: ctx.mailer.kind, delivers: ctx.mailer.delivers } });
    } catch {
      res.status(503).json({ ok: false, database: { kind: ctx.store.kind, reachable: false }, mail: { provider: ctx.mailer.kind, delivers: ctx.mailer.delivers } });
    }
  });

  app.use(deliveryRoutes(ctx));
  app.use(authRoutes(ctx));
  app.use(adminRoutes(ctx));
  app.use(manageRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
