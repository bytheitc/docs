// The CMS calls this after a change to the "oauth-clients" (trusted clients) collection.
//   POST /cms/webhook
//   x-cms-signature: sha256=<HMAC-SHA256 of the raw body, keyed by this space's key>
//   { space, collection, id, event }
// We verify the signature and drop our cached copy. accounts/web renders nothing from the CMS, so
// unlike other houses there is no web cache to tell about it.
import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { HttpError, badRequest, unauthorized } from "../http.js";
import type { Ctx } from "../app.js";

const COLLECTION = /^[a-z][a-z0-9_-]{0,47}$/;
const MAX_BODY = "64kb";

function signatureMatches(raw: Buffer, given: string, key: string): boolean {
  const expected = `sha256=${createHmac("sha256", key).update(raw).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function webhookRoutes({ config, cms }: Ctx): Router {
  const r = Router();

  r.post("/cms/webhook", express.raw({ type: "*/*", limit: MAX_BODY }), (req, res) => {
    if (!config.cms.key) throw new HttpError(503, "unavailable", "No space key is configured, so webhooks can't be verified.");
    const given = req.header("x-cms-signature") ?? "";
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!given || !signatureMatches(raw, given, config.cms.key)) throw unauthorized("Bad signature.");

    let payload: { space?: unknown; collection?: unknown; event?: unknown };
    try {
      payload = JSON.parse(raw.toString("utf8")) as typeof payload;
    } catch {
      throw badRequest("The webhook body is not valid JSON.");
    }
    if (payload.space !== config.space) throw badRequest("That webhook is for another space.");

    const collection = typeof payload.collection === "string" && COLLECTION.test(payload.collection) ? payload.collection : undefined;
    cms.invalidate(collection);
    console.log(`[api] CMS change: ${String(payload.event ?? "?")} in ${collection ?? "(unknown collection)"}`);
    res.json({ ok: true });
  });

  return r;
}
