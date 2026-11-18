// The Express app for the docs, as its own service. Built from a config, a CMS client and the docs
// model, so tests can run an instance over a temporary folder.
import express, { type Request, type RequestHandler, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { CmsClient } from "./cms.js";
import { loadConfig, type Config } from "./config.js";
import { HOUSE } from "./content/house.js";
import { errorHandler, notFoundHandler, requestLog, trustProxySetting } from "./http.js";
import { reportProcessErrors } from "./observe.js";
import { Docs } from "./pages.js";
import { registerWithRetry } from "./register.js";
import { publicRoutes } from "./routes/public.js";
import { staffRoutes } from "./routes/staff.js";
import { FsSource, GithubSource, type DocsSource } from "./source.js";

export interface Ctx {
  config: Config;
  cms: CmsClient;
  docs: Docs;
}

export function sourceFor(config: Config): DocsSource {
  const s = config.source;
  return s.kind === "github" ? new GithubSource({ repo: s.repo, branch: s.branch, dir: s.dir, token: s.token }) : new FsSource(s.dir, s.writable);
}

export function createApp(ctx: Ctx) {
  const app = express();
  app.disable("x-powered-by");
  app.set("etag", false);
  app.set("query parser", "simple");
  // So req.ip is the visitor, not the proxy in front of this api (the sign-in limit keys on it).
  app.set("trust proxy", trustProxySetting());

  app.use(requestLog(ctx.config.log));
  app.use(((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    next();
  }) as RequestHandler);
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => res.json({ ok: true, service: `${HOUSE.space} api` }));

  app.get("/health", async (_req, res) => {
    let pages = 0;
    let readable = true;
    try {
      pages = (await ctx.docs.all()).length;
    } catch (e) {
      readable = false;
      console.error(`[api] health: reading the docs failed: ${(e as Error).message}`);
    }
    const cms = ctx.cms.configured ? await ctx.cms.ping() : false;
    res.status(readable ? 200 : 503).json({
      ok: readable,
      space: HOUSE.space,
      source: { kind: ctx.docs.source.kind, where: ctx.docs.source.where, writable: ctx.docs.source.writable, readable, pages },
      cms: { url: ctx.config.cms.url, configured: ctx.cms.configured, reachable: cms },
    });
  });

  app.use(publicRoutes(ctx));
  app.use(staffRoutes(ctx));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Composition root, built on first use: a serverless host calls the default export directly, and
// server.ts forces it eagerly on a long-running one.
interface Instance {
  app: ReturnType<typeof createApp>;
  config: Config;
}
let instance: Instance | undefined;

function getInstance(): Instance {
  if (!instance) {
    reportProcessErrors();
    const config = loadConfig();
    if (config.production && !config.cms.key) console.warn("[api] CMS_SPACE_KEY is not set: no one will be able to sign in to the docs editor.");
    if (config.production && config.source.kind !== "github") console.warn("[api] DOCS_GITHUB_TOKEN is not set: the docs are read-only, served from the files deployed with this api.");
    const cms = new CmsClient(config);
    registerWithRetry(config, cms);
    const docs = new Docs(sourceFor(config), config.source.kind === "github" ? config.contentTtlMs : 1000);
    instance = { app: createApp({ config, cms, docs }), config };
  }
  return instance;
}

export function getConfig(): Config {
  return getInstance().config;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  getInstance().app(req as Request, res as Response, () => {});
}
