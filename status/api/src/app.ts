import express, { type Express, type Request, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig, type Config } from "./config.js";
import { errorHandler, notFoundHandler, rateLimit, requestLog } from "./http.js";
import { Mailer, loadMailConfig } from "./mail.js";
import { createNotifier, type Notifier } from "./notify.js";
import { adminRoutes } from "./routes/admin.js";
import { publicRoutes } from "./routes/public.js";
import { subscribeRoutes } from "./routes/subscribe.js";
import { startScheduler, type Scheduler } from "./scheduler.js";
import { getStore, initStore } from "./store/index.js";

export function createApp(config: Config, scheduler: Scheduler, deps: { mailer?: Mailer; notifier?: Notifier } = {}): Express {
  const mailer = deps.mailer ?? new Mailer(loadMailConfig());
  const notifier = deps.notifier ?? createNotifier(config, mailer);
  /**
   * Whether to offer the form at all. In production a real provider is required: a form that takes
   * an address and silently goes nowhere is worse than no form. In development the log provider
   * counts, because printing the confirmation link to the log is exactly how the flow is tried
   * without a vendor.
   */
  const offerSubscriptions = notifier.enabled && (mailer.delivers || !config.production);
  const app = express();
  app.disable("x-powered-by");
  // Behind a proxy the Host header is what routes status.<domain> to the right tenant.
  if (config.trustProxy) app.set("trust proxy", true);
  app.use(express.json({ limit: "64kb" }));
  app.use(requestLog(config.log));

  // This service's own health, which is a different question from the health of what it watches.
  // Deliberately thin: it is reachable from anywhere, so it says whether this process is working
  // and nothing about how it is wired up.
  app.get("/health", async (_req, res) => {
    const store = getStore();
    let database = false;
    try {
      if (store) {
        await store.listTenants();
        database = true;
      }
    } catch {
      database = false;
    }
    res.status(database || !store ? 200 : 503).json({
      ok: database,
      database,
      checks: config.checkIntervalMs > 0,
      // Subscriptions need both a signing secret and a provider that actually delivers.
      subscriptions: offerSubscriptions,
      mail: { provider: mailer.kind, delivers: mailer.delivers },
    });
  });

  app.use(
    "/v1/admin",
    rateLimit({ max: 60, windowMs: 60_000, name: "admin", key: (req) => req.ip ?? "?" }),
  );
  app.use(adminRoutes(config, scheduler, notifier));
  app.use(subscribeRoutes(config, mailer));
  app.use(publicRoutes(config, offerSubscriptions));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Composition root: this module's default export is what the host (serverless or otherwise)
// invokes directly. The instance is built lazily, on first request rather than on import, so
// importing this module for its createApp factory (as the fallback/subscriptions tests do,
// with their own config, scheduler and deps) never opens the store or starts the scheduler.
// server.ts (the long-running-process entry point) forces that first build at startup instead
// of waiting for a request.
interface Instance {
  app: Express;
  config: Config;
  scheduler: Scheduler;
}
let instance: Instance | undefined;

function getInstance(): Instance {
  if (!instance) {
    const config = loadConfig();

    if (!config.db.uri) {
      console.warn("[status] MONGODB_URI is not set: every page will answer 'status unknown' until it is.");
    } else {
      initStore(config);
    }
    if (config.setupToken) {
      console.warn("[status] SETUP_TOKEN is set, so tenant creation is open. Unset it once the tenants exist.");
    }

    if (!config.subscribeSecret) {
      console.warn("[status] SUBSCRIBE_SECRET is not set: subscriptions are off. Mail that cannot be unsubscribed from should not be sent.");
    } else if (loadMailConfig().provider === "log") {
      console.warn('[status] MAIL_PROVIDER is "log": confirmation links are printed to this log and nothing is delivered.');
    }

    const scheduler = startScheduler(config);
    instance = { app: createApp(config, scheduler), config, scheduler };
  }
  return instance;
}

export function getConfig(): Config {
  return getInstance().config;
}

export function getScheduler(): Scheduler {
  return getInstance().scheduler;
}

// Typed as the plain Node listener shape so this can be passed straight to http.createServer;
// Express's own types (req, res) extend these at runtime, which is all app() actually needs.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  getInstance().app(req as Request, res as Response, () => {});
}
