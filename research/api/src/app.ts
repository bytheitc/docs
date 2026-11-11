// The Express app for this house's api. Built from a config and a CMS client so tests can run
// several instances side by side.
import express, { type RequestHandler } from "express";
import type { CmsClient } from "./cms.js";
import type { Config } from "./config.js";
import { COLLECTIONS, FORMS } from "./content/collections.js";
import { HOUSE } from "./content/house.js";
import { errorHandler, notFoundHandler, requestLog } from "./http.js";
import { contentRoutes } from "./routes/content.js";
import { formRoutes } from "./routes/forms.js";
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
    });
  });

  app.use(contentRoutes(ctx));
  app.use(formRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
