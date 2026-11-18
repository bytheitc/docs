// Transactional mail for the other houses: magic links, confirmations, application updates.
// One message to one person, sent now, on another house's behalf — so every house sends through
// one provider account, one sending domain and one suppression list, instead of each holding its
// own mail key.
//
//   POST /transactional
//     X-Service-Key: <that house's key from EMAIL_SERVICE_KEYS>
//     { to, category, subject, markdown | text, replyTo? }
//     -> 200 { ok, id, delivered }      delivered is false under the log/none providers
//     -> 409 when the address has hard-bounced or complained: mailing it again hurts every house
//
// A marketing unsubscribe does NOT block transactional mail: someone who left the newsletter
// still needs their sign-in link. No unsubscribe footer is added, for the same reason.
// The body is never stored, only who it went to, the subject, the category and the outcome.
import { randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";
import type { Ctx } from "../app.js";
import { badRequest, body, HttpError, rateLimit, str, unauthorized } from "../http.js";
import { needsDatabase } from "../guard.js";
import { isAddress } from "../mail.js";
import { renderEmail } from "../render.js";
import { requireEmailStore } from "../store/index.js";

declare module "express-serve-static-core" {
  interface Request {
    service?: string;
  }
}

function needsService(keys: Map<string, string>): RequestHandler {
  return (req, _res, next) => {
    const given = req.header("x-service-key") ?? "";
    if (!given) return next(unauthorized("An X-Service-Key header is required."));
    // Compare against every key in constant time, so timing doesn't reveal a near match.
    let house: string | undefined;
    for (const [key, name] of keys) {
      const a = Buffer.from(given);
      const b = Buffer.from(key);
      if (a.length === b.length && timingSafeEqual(a, b)) house = name;
    }
    if (!house) return next(unauthorized("Unknown service key."));
    req.service = house;
    next();
  };
}

const CATEGORY = /^[a-z][a-z0-9-]{0,47}$/;

export function transactionalRoutes(ctx: Ctx): Router {
  const r = Router();
  r.use("/transactional", needsDatabase, needsService(ctx.config.serviceKeys));
  // Per calling house. Generous for real traffic, low enough to cap a runaway loop in a caller.
  const limit = rateLimit({ name: "transactional", max: 120, windowMs: 60_000, key: (req) => req.service ?? "?" });

  r.post("/transactional", limit, async (req, res) => {
    const store = requireEmailStore();
    const b = body(req);
    const to = str(b, "to", { required: true, max: 254 }).toLowerCase();
    if (!isAddress(to)) throw badRequest("\"to\" isn't an email address.", { to: "Not an email address." });
    const category = str(b, "category", { required: true, max: 48 });
    if (!CATEGORY.test(category)) throw badRequest("\"category\" must be lower-case words joined by hyphens, e.g. \"magic-link\".", { category: "Invalid." });
    const subject = str(b, "subject", { required: true, max: 200 });
    const markdown = str(b, "markdown", { max: 50_000 });
    const plain = str(b, "text", { max: 50_000 });
    if (!markdown && !plain) throw badRequest("Send either \"markdown\" or \"text\".");
    const replyTo = str(b, "replyTo", { max: 254 }) || undefined;
    if (replyTo && !isAddress(replyTo)) throw badRequest("\"replyTo\" isn't an email address.", { replyTo: "Not an email address." });

    const id = randomUUID();
    const base = { id, service: req.service!, category, to, subject };

    const suppression = await store.getSuppression(to);
    if (suppression && suppression.reason !== "unsubscribed") {
      await store.addTransactional({ ...base, status: "suppressed", error: suppression.reason });
      throw new HttpError(409, "bad_request", `Not sent: this address ${suppression.reason === "bounced" ? "hard-bounced" : "marked our mail as spam"} before.`);
    }

    const rendered = markdown ? renderEmail(markdown) : { text: plain, html: undefined };
    const result = await ctx.mailer.send({ to, subject, text: rendered.text, html: rendered.html, replyTo, stream: "transactional" });
    if (!result.ok) {
      await store.addTransactional({ ...base, status: "failed", error: result.error });
      throw new HttpError(502, "unavailable", `Not sent: ${result.error}`);
    }
    await store.addTransactional({ ...base, status: "sent", ...(result.id ? { providerId: result.id } : {}) });
    res.json({ ok: true, id, delivered: ctx.mailer.delivers });
  });

  return r;
}
