// Subscribing to a status page: double opt-in, and an unsubscribe that needs no password.
//
//   POST /subscribe              { email }   → 202, and one confirmation email
//   GET  /confirm?token=…                    → confirms, and says so in a page
//   GET  /unsubscribe?token=…                → a page with a button (never acts on a GET: mail
//                                              clients and scanners follow links on their own)
//   POST /unsubscribe            { token }   → actually unsubscribes
//
// "Subscribe" answers the same way whether or not the address is already on the list, so this
// endpoint cannot be used to find out who is.
import { createHash, randomBytes } from "node:crypto";
import express, { Router } from "express";
import type { Config } from "../config.js";
import { body, invalid, rateLimit, str } from "../http.js";
import { isAddress, type Mailer } from "../mail.js";
import { getStore } from "../store/index.js";
import { confirmEmail, isConfirmable, newSubscriberId, unsubscribeToken, verifyUnsubscribeToken } from "../subscribers.js";
import type { Subscriber, Tenant } from "../types.js";
import { esc, normaliseHost } from "../util.js";

const CONFIRM_HOURS = 48;
const MAX_CONFIRM_SENDS = 5;
const RESEND_COOLDOWN_MS = 60_000;

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");

/** A small page, in the same voice as the status page, for the links people arrive on from email. */
function tell(title: string, message: string, extra = ""): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)}</title><style>
:root{--bg:#fbfbfa;--card:#fff;--ink:#16181d;--soft:#5b6472;--line:#e5e7eb;--accent:#0f766e}
@media(prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#161a21;--ink:#e8eaed;--soft:#9aa4b2;--line:#272d38;--accent:#5eead4}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);
font:16px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif}
main{max-width:460px;padding:32px;background:var(--card);border:1px solid var(--line);border-radius:14px;margin:16px}
h1{font-size:21px;margin:0 0 10px}p{color:var(--soft);margin:0 0 14px}
button{font:inherit;font-weight:600;padding:9px 18px;border-radius:10px;border:1px solid var(--line);
background:var(--accent);color:#fff;cursor:pointer}a{color:var(--accent)}
</style></head><body><main><h1>${esc(title)}</h1><p>${esc(message)}</p>${extra}</main></body></html>`;
}

export function subscribeRoutes(config: Config, mailer: Mailer): Router {
  const r = Router();
  const enabled = Boolean(config.subscribeSecret);

  async function tenantOf(req: import("express").Request): Promise<Tenant | null> {
    const store = getStore();
    if (!store) return null;
    const host = normaliseHost(req.headers.host ?? "");
    const asked = String((req.body as Record<string, unknown> | undefined)?.tenant ?? req.query.t ?? "").trim();
    try {
      return (host ? await store.getTenantByHost(host) : null)
        ?? (asked ? await store.getTenant(asked) : null)
        ?? (config.rootTenant ? await store.getTenant(config.rootTenant) : null);
    } catch {
      return null;
    }
  }

  r.post(
    "/subscribe",
    rateLimit({ max: config.subscribeLimit, windowMs: 10 * 60_000, name: "subscribe", key: (req) => req.ip ?? "unknown" }),
    async (req, res) => {
      const b = body(req);
      // The same honeypot the houses' public forms use.
      if (b.honeypot != null && String(b.honeypot).trim() !== "") return void res.status(202).json({ ok: true });
      if (!enabled) throw invalid({ email: "Status updates aren't switched on for this page." });

      const store = getStore();
      const tenant = await tenantOf(req);
      if (!store || !tenant) throw invalid({ email: "This status page isn't accepting subscriptions." });

      const email = str(b, "email", { required: true, max: 254 }).toLowerCase();
      if (!isAddress(email)) throw invalid({ email: "That doesn't look like an email address." });

      const existing = await store.getSubscriber(tenant.id, email);
      const now = new Date();

      // Already confirmed: say the same thing, send nothing. Re-subscribing someone who is already
      // on the list is how this endpoint would otherwise become a way to mail them.
      if (existing?.status === "confirmed") return void res.status(202).json({ ok: true });

      const sends = existing?.confirmSends ?? 0;
      const last = existing?.lastConfirmSentAt ? existing.lastConfirmSentAt.getTime() : 0;
      if (sends >= MAX_CONFIRM_SENDS || Date.now() - last < RESEND_COOLDOWN_MS) {
        return void res.status(202).json({ ok: true });
      }

      const confirmToken = randomToken();
      const sub: Subscriber = {
        id: existing?.id ?? newSubscriberId(),
        email,
        tenantId: tenant.id,
        status: "pending",
        confirmTokenHash: hash(confirmToken),
        confirmExpiresAt: new Date(now.getTime() + CONFIRM_HOURS * 3600e3),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        confirmSends: sends + 1,
        lastConfirmSentAt: now,
      };
      await store.putSubscriber(sub);

      const url = `${config.publicUrl}/confirm?token=${encodeURIComponent(confirmToken)}`;
      const { subject, text } = confirmEmail(tenant.name, url);
      // Awaited so a hard failure is logged next to the request, but the answer never varies.
      await mailer.send({ to: email, subject, text });
      res.status(202).json({ ok: true });
    },
  );

  r.get("/confirm", async (req, res) => {
    const store = getStore();
    const token = String(req.query.token ?? "");
    const sub = store && token ? await store.subscriberByConfirmHash(hash(token)) : null;

    if (!sub || !isConfirmable(sub)) {
      return void res.status(400).type("html").send(
        tell("That link didn't work", "It may have already been used, or it may have expired. Subscribing again will send a fresh one."),
      );
    }
    await store!.patchSubscriber(sub.tenantId, sub.email, {
      status: "confirmed",
      confirmedAt: new Date(),
      updatedAt: new Date(),
      confirmTokenHash: undefined,
      confirmExpiresAt: undefined,
      confirmSends: 0,
      unsubscribedAt: undefined,
    });
    const tenant = await store!.getTenant(sub.tenantId);
    res.type("html").send(
      tell(
        "You're subscribed",
        `We'll email this address when ${tenant?.name ?? "this service"} reports an incident or resolves one. Every message carries an unsubscribe link.`,
        `<p><a href="${esc(`${config.publicUrl}/s/${sub.tenantId}`)}">See the status page</a></p>`,
      ),
    );
  });

  // A GET only ever shows the button. Mail clients, link scanners and corporate proxies follow
  // links on their own, and an unsubscribe that happened because a scanner looked at it is a bug.
  r.get("/unsubscribe", async (req, res) => {
    const token = String(req.query.token ?? "");
    const id = enabled ? verifyUnsubscribeToken(token, config.subscribeSecret) : null;
    const store = getStore();
    const sub = id && store ? await store.subscriberById(id) : null;

    if (!sub) {
      return void res.status(400).type("html").send(tell("That link didn't work", "It may be incomplete. Try copying the whole link from the email."));
    }
    if (sub.status === "unsubscribed") {
      return void res.type("html").send(tell("Already unsubscribed", "This address isn't on the list. Nothing more will be sent to it."));
    }
    res.type("html").send(
      tell(
        "Unsubscribe?",
        `${sub.email} will stop receiving status updates. You can subscribe again at any time.`,
        `<form method="post" action="${esc(`${config.publicUrl}/unsubscribe`)}">
          <input type="hidden" name="token" value="${esc(token)}">
          <button type="submit">Unsubscribe</button>
        </form>`,
      ),
    );
  });

  // The button on the unsubscribe page posts a form, not JSON, so this route reads both.
  r.post("/unsubscribe", express.urlencoded({ extended: false, limit: "4kb" }), async (req, res) => {
    const token = String((body(req).token ?? req.query.token) ?? "");
    const id = enabled ? verifyUnsubscribeToken(token, config.subscribeSecret) : null;
    const store = getStore();
    const sub = id && store ? await store.subscriberById(id) : null;
    if (!sub) {
      return void res.status(400).type("html").send(tell("That link didn't work", "It may be incomplete. Try copying the whole link from the email."));
    }
    if (sub.status !== "unsubscribed") {
      await store!.patchSubscriber(sub.tenantId, sub.email, {
        status: "unsubscribed",
        unsubscribedAt: new Date(),
        updatedAt: new Date(),
      });
    }
    res.type("html").send(tell("Unsubscribed", `${sub.email} won't receive any more status updates.`));
  });

  return r;
}
