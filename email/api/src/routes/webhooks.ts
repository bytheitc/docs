// Provider webhooks: bounces, spam complaints and provider-side unsubscribes. Each one suppresses
// the address everywhere (every list, every future campaign) and marks its contacts, so we stop
// mailing people who can't or won't receive it. Mailing them anyway is what gets a sending
// domain's reputation ruined.
//
//   POST /webhooks/resend     signed by Resend (Svix): MAIL_WEBHOOK_SECRET is the "whsec_…" signing secret
//   POST /webhooks/postmark   HTTP Basic auth: any username, MAIL_WEBHOOK_SECRET as the password,
//                             set in Postmark as https://user:SECRET@<api>/webhooks/postmark
//
// Only permanent failures suppress. A soft bounce (mailbox full, greylisting) is left alone.
// Unknown event types answer 200 and are ignored, so a provider never retries them forever.
import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import type { Ctx } from "../app.js";
import { body, HttpError, unauthorized } from "../http.js";
import { needsDatabase } from "../guard.js";
import { isAddress } from "../mail.js";
import { requireEmailStore } from "../store/index.js";
import type { Suppression } from "../store/types.js";

const TOLERANCE_S = 5 * 60;

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Svix's scheme, which Resend uses: HMAC-SHA256 over "id.timestamp.body", base64. */
export function verifySvix(secret: string, headers: { id?: string; timestamp?: string; signature?: string }, rawBody: string, nowS = Math.floor(Date.now() / 1000)): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowS - ts) > TOLERANCE_S) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",", 2);
    return version === "v1" && Boolean(sig) && safeEqual(sig, expected);
  });
}

type Outcome = { email: string; reason: Suppression["reason"] } | null;

/** Resend: email.bounced (permanent unless it says otherwise) and email.complained. */
export function readResendEvent(e: Record<string, unknown>): Outcome[] {
  const data = (e.data ?? {}) as { to?: unknown; bounce?: { type?: string } };
  const to = Array.isArray(data.to) ? data.to.filter((x): x is string => typeof x === "string") : [];
  if (e.type === "email.bounced") {
    if ((data.bounce?.type ?? "").toLowerCase() === "transient") return [];
    return to.map((email) => ({ email, reason: "bounced" as const }));
  }
  if (e.type === "email.complained") return to.map((email) => ({ email, reason: "complained" as const }));
  return [];
}

const POSTMARK_HARD = new Set(["HardBounce", "BadEmailAddress", "ManuallyDeactivated"]);

/** Postmark: hard bounces, spam complaints, and recipients it has suppressed itself. */
export function readPostmarkEvent(e: Record<string, unknown>): Outcome[] {
  const str = (k: string) => (typeof e[k] === "string" ? (e[k] as string) : "");
  switch (e.RecordType) {
    case "Bounce":
      if (str("Type") === "SpamNotification" || str("Type") === "SpamComplaint") return [{ email: str("Email"), reason: "complained" }];
      return POSTMARK_HARD.has(str("Type")) ? [{ email: str("Email"), reason: "bounced" }] : [];
    case "SpamComplaint":
      return [{ email: str("Email"), reason: "complained" }];
    case "SubscriptionChange":
      return e.SuppressSending === true ? [{ email: str("Recipient"), reason: "unsubscribed" }] : [];
    default:
      return [];
  }
}

async function apply(outcomes: Outcome[]): Promise<number> {
  const store = requireEmailStore();
  let n = 0;
  for (const o of outcomes) {
    if (!o || !isAddress(o.email)) continue;
    const email = o.email.trim().toLowerCase();
    await store.addSuppression({ email, reason: o.reason, at: new Date() });
    await store.setStatusForEmail(email, o.reason === "bounced" ? "bounced" : "unsubscribed");
    console.log(`[api] suppressed ${email}: ${o.reason}`);
    n++;
  }
  return n;
}

const rawBody = (req: Request) => ((req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0)).toString("utf8");

export function webhooksRoutes(ctx: Ctx): Router {
  const r = Router();
  const secret = ctx.config.mail.webhookSecret;
  r.use("/webhooks", needsDatabase, (_req, _res, next) => {
    if (!secret) return next(new HttpError(503, "unavailable", "MAIL_WEBHOOK_SECRET is not set, so provider webhooks are refused."));
    next();
  });

  r.post("/webhooks/resend", async (req, res) => {
    const ok = verifySvix(secret!, {
      id: req.header("svix-id"),
      timestamp: req.header("svix-timestamp"),
      signature: req.header("svix-signature"),
    }, rawBody(req));
    if (!ok) throw unauthorized("Bad webhook signature.");
    const suppressed = await apply(readResendEvent(body(req)));
    res.json({ ok: true, suppressed });
  });

  r.post("/webhooks/postmark", async (req, res) => {
    const m = /^Basic\s+(\S+)$/i.exec(req.header("authorization") ?? "");
    const password = m ? Buffer.from(m[1], "base64").toString("utf8").split(":").slice(1).join(":") : "";
    if (!password || !safeEqual(password, secret!)) throw unauthorized("Bad webhook credentials.");
    const suppressed = await apply(readPostmarkEvent(body(req)));
    res.json({ ok: true, suppressed });
  });

  return r;
}
