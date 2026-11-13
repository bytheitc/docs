// The Express app. Built from a config and a storage adapter so tests can run several instances side by side.
import express, { type Request, type RequestHandler, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig, type Config } from "./config.js";
import { Mailer, loadMailConfig } from "./mail.js";
import { errorHandler, notFoundHandler, requestLog } from "./http.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { deliveryRoutes } from "./routes/delivery.js";
import { manageRoutes } from "./routes/manage.js";
import { SUPPORTED_DATABASES, createStorage, storageStatus } from "./storage.js";
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

// Composition root: this module's default export is what the host (serverless or otherwise)
// invokes directly. The instance is built lazily, on first request rather than on import, so
// importing this module for its createApp factory (as the contract tests do, with their own
// ctx) never opens storage, exits the process on bad config, or sends mail. server.ts (the
// long-running-process entry point) forces that first build at startup instead of waiting for
// a request.
interface Instance {
  app: ReturnType<typeof createApp>;
  config: Config;
  store: StorageAdapter;
}
let instance: Instance | undefined;

function getInstance(): Instance {
  if (!instance) {
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

    instance = { app: createApp({ config, store, mailer }), config, store };
  }
  return instance;
}

export function getConfig(): Config {
  return getInstance().config;
}

export function getStore(): StorageAdapter {
  return getInstance().store;
}

// Typed as the plain Node listener shape so this can be passed straight to http.createServer;
// Express's own types (req, res) extend these at runtime, which is all app() actually needs.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  getInstance().app(req as Request, res as Response, () => {});
}
