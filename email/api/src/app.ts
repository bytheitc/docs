// The Express app for the email house, as its own service. Built from a config, a CMS client and a
// mailer so tests can run several instances side by side.
import express, { type Request, type RequestHandler, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { CmsClient } from "./cms.js";
import { loadConfig, type Config } from "./config.js";
import { HOUSE } from "./content/house.js";
import { errorHandler, notFoundHandler, requestLog, trustProxySetting } from "./http.js";
import { Mailer } from "./mail.js";
import { registerSchemaWithRetry } from "./register.js";
import { campaignsRoutes } from "./routes/campaigns.js";
import { listsRoutes } from "./routes/lists.js";
import { staffRoutes } from "./routes/staff.js";
import { templatesRoutes } from "./routes/templates.js";
import { transactionalRoutes } from "./routes/transactional.js";
import { unsubscribeRoutes } from "./routes/unsubscribe.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { cronRoutes, serverless } from "./cron.js";
import { LEASE_MS, resumeInterruptedCampaigns } from "./send.js";
import { getEmailStore, initEmailStore, storageStatus } from "./store/index.js";
import { reportProcessErrors } from "./observe.js";

export interface Ctx {
  config: Config;
  cms: CmsClient;
  mailer: Mailer;
}

const BODY_LIMIT = "6mb"; // CSV uploads travel as a JSON string field.

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

  // The raw bytes are kept for the provider webhooks, whose signatures cover the exact body.
  app.use(express.json({
    limit: BODY_LIMIT,
    verify: (req, _res, buf) => { (req as unknown as { rawBody?: Buffer }).rawBody = buf; },
  }));

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: `${HOUSE.space} api` });
  });

  app.get("/health", async (_req, res) => {
    const reachable = ctx.cms.configured ? await ctx.cms.ping() : false;
    res.status(reachable || !ctx.cms.configured ? 200 : 503).json({
      ok: reachable,
      space: HOUSE.space,
      cms: { url: ctx.config.cms.url, configured: ctx.cms.configured, reachable },
      database: { configured: Boolean(getEmailStore()), name: ctx.config.db.name },
      mail: { provider: ctx.mailer.kind, delivers: ctx.mailer.delivers },
    });
  });

  app.use(cronRoutes({
    // Picks up any campaign whose worker stopped or ran out of budget. Schedule it every minute.
    "resume-campaigns": async () => {
      const store = getEmailStore();
      if (!store) return { resumed: 0 };
      const deadline = ctx.config.sendBudgetMs ? Date.now() + ctx.config.sendBudgetMs : undefined;
      return resumeInterruptedCampaigns({ store, mailer: ctx.mailer, webUrl: ctx.config.web.url, sendDelayMs: ctx.config.sendDelayMs, deadline }, { wait: true });
    },
  }));

  app.use(staffRoutes(ctx));
  app.use(listsRoutes(ctx));
  app.use(templatesRoutes(ctx));
  app.use(campaignsRoutes(ctx));
  app.use(unsubscribeRoutes(ctx));
  app.use(webhooksRoutes(ctx));
  app.use(transactionalRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Composition root: see accounts/api/src/app.ts for why this is lazy and why it exists at all
// (a serverless host calls the default export directly; server.ts forces it eagerly instead).
interface Instance {
  app: ReturnType<typeof createApp>;
  config: Config;
}
let instance: Instance | undefined;

function getInstance(): Instance {
  if (!instance) {
    reportProcessErrors();
    const config = loadConfig();
    if (config.production && !config.cms.key) console.warn(`[api] CMS_SPACE_KEY is not set: no one will be able to sign in to ${HOUSE.space}/staff.`);
    if (config.production && config.mail.provider === "log") console.warn("[api] MAIL_PROVIDER is \"log\": no campaign will actually send.");

    const storage = storageStatus(config);
    if (!storage.configured) console.warn(`[api] ${storage.problem} Email's own endpoints will answer 503 until it is set.`);
    const store = initEmailStore(config);

    const cms = new CmsClient(config);
    registerSchemaWithRetry(config, cms);
    const mailer = new Mailer(config.mail);
    instance = { app: createApp({ config, cms, mailer }), config };

    // Finish any campaign a previous process was sending when it stopped, now and then once per
    // lease period. Only expired leases are taken, so a send another live instance is still
    // running (a rolling deploy) is left alone.
    // On a serverless host /cron/resume-campaigns does this instead: background work started here
    // would be frozen with the request that happened to boot the instance.
    if (store && !serverless()) {
      const resume = () => resumeInterruptedCampaigns({ store, mailer, webUrl: config.web.url, sendDelayMs: config.sendDelayMs })
        .catch((e) => console.error(`[api] could not check for interrupted campaigns: ${(e as Error).message}`));
      void resume();
      setInterval(resume, LEASE_MS).unref();
    }
  }
  return instance;
}

export function getConfig(): Config {
  return getInstance().config;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  getInstance().app(req as Request, res as Response, () => {});
}
