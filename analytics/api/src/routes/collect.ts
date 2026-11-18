// What browsers talk to.
//
//   GET  /script.js    the tracker (tracker.ts), cached for an hour
//   POST /api/event    one page view or custom event, as JSON in a text/plain body (what sendBeacon
//                      sends, so no CORS preflight). Answers 202 whether it was counted or dropped
//                      as a bot, a foreign host or an opt-out; X-Analytics-Drop says why, for setup.
import express, { Router, type RequestHandler } from "express";
import type { Ctx } from "../app.js";
import { isBot, readBeacon, visitorHash, type Beacon } from "../hit.js";
import { rateLimit, sendError } from "../http.js";
import { getStore } from "../store/index.js";
import type { Site } from "../store/types.js";
import { TRACKER } from "../tracker.js";

const cors: RequestHandler = (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return void res.status(204).end();
  next();
};

export function collectRoutes(ctx: Ctx): Router {
  const r = Router();
  // Sites change rarely and every beacon needs one: a minute's cache per instance, misses included.
  const sites = new Map<string, { site: Site | null; until: number }>();
  const siteById = async (id: string): Promise<Site | null> => {
    const hit = sites.get(id);
    if (hit && hit.until > Date.now()) return hit.site;
    const site = await getStore()!.getSite(id);
    if (sites.size > 500) sites.clear();
    sites.set(id, { site, until: Date.now() + 60_000 });
    return site;
  };

  r.get("/script.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.send(TRACKER);
  });

  const limit = rateLimit({ name: "analytics-collect", max: ctx.config.collectRatePerMin, windowMs: 60_000, key: (req) => req.ip ?? "?" });
  const text = express.text({ type: () => true, limit: "4kb" });

  r.options("/api/event", cors);
  r.post("/api/event", cors, limit, text, async (req, res) => {
    const store = getStore();
    if (!store) return sendError(res, 503, "unavailable", "Analytics has no database.");
    const drop = (why: string) => res.setHeader("X-Analytics-Drop", why).status(202).end();

    const ua = (req.get("user-agent") ?? "").slice(0, 500);
    if (isBot(ua)) return drop("bot");
    // The tracker already checks these; a hand-rolled client or an old cached script might not.
    if (req.get("dnt") === "1" || req.get("sec-gpc") === "1") return drop("opt-out");

    let b: Beacon;
    try {
      const parsed = JSON.parse(typeof req.body === "string" ? req.body : "") as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      b = parsed as Beacon;
    } catch {
      return sendError(res, 400, "bad_request", "The body must be a JSON object.");
    }
    if (typeof b.s !== "string" || !b.s || b.s.length > 40) return sendError(res, 400, "bad_request", "Missing site id.");
    const site = await siteById(b.s);
    if (!site) return sendError(res, 404, "not_found", "No such site. Check data-site on the script tag.");

    const now = new Date();
    const country = req.get("x-vercel-ip-country") ?? req.get("cf-ipcountry") ?? undefined;
    const out = readBeacon(b, site, now, { country, ua });
    if ("drop" in out) return drop(out.drop);

    const { host: _host, ...hit } = out.hit;
    void _host;
    const salt = await store.salt(hit.day);
    await store.record({ ...hit, site: site.id, visitor: visitorHash(salt, site.id, req.ip ?? "", ua) }, ctx.config.retentionDays);
    res.status(202).end();
  });

  return r;
}
