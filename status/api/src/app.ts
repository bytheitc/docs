import express, { type Express } from "express";
import type { Config } from "./config.js";
import { errorHandler, notFoundHandler, rateLimit, requestLog } from "./http.js";
import { Mailer, loadMailConfig } from "./mail.js";
import { createNotifier, type Notifier } from "./notify.js";
import { adminRoutes } from "./routes/admin.js";
import { publicRoutes } from "./routes/public.js";
import { subscribeRoutes } from "./routes/subscribe.js";
import type { Scheduler } from "./scheduler.js";
import { getStore } from "./store/index.js";

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
