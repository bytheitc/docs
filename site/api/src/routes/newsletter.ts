// The newsletter: double opt-in, one list per house, and an unsubscribe link that always works.
//
//   POST /newsletter/subscribe    { email, lists[] }  → 202, and a confirmation email
//   POST /newsletter/confirm      { token }           → confirms that address
//   GET  /newsletter/preferences  ?token=…            → the lists behind an unsubscribe token
//   POST /newsletter/preferences  { token, lists[] }  → change them, or unsubscribe with []
//
// Nothing is ever sent to an address that has not confirmed. "Subscribe" says the same thing whether
// or not the address is already on the list, so this endpoint cannot be used to find out who is.
import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { HOUSES } from "../content/houses.js";
import { HttpError, body, invalid, rateLimit, str } from "../http.js";
import { isAddress } from "../mail.js";
import { getNewsletterStore } from "../newsletter/store.js";
import type { Subscriber } from "../newsletter/types.js";
import type { Ctx } from "../app.js";

/** The lists someone can choose: the Collective, plus one per house. */
export const LISTS: { id: string; label: string }[] = HOUSES.map((h) => ({ id: h.id, label: h.id === "site" ? "The Collective" : h.name }));
const LIST_IDS = new Set(LISTS.map((l) => l.id));

const CONFIRM_HOURS = 48;
const MAX_CONFIRM_SENDS = 5;
const RESEND_COOLDOWN_MS = 60_000;

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const token = () => randomBytes(32).toString("base64url");

const cleanLists = (raw: unknown): string[] => {
  const given = Array.isArray(raw) ? raw.map(String) : typeof raw === "string" ? raw.split(",") : [];
  return [...new Set(given.map((l) => l.trim()).filter((l) => LIST_IDS.has(l)))];
};

const labels = (ids: string[]) => ids.map((id) => LISTS.find((l) => l.id === id)?.label ?? id);

export function newsletterRoutes({ config, mailer }: Ctx): Router {
  const r = Router();

  const storeOr503 = () => {
    const store = getNewsletterStore();
    if (!store) throw new HttpError(503, "unavailable", "The newsletter isn't connected to a database yet.");
    return store;
  };

  r.get("/newsletter/lists", (_req, res) => {
    res.json({ lists: LISTS, available: Boolean(getNewsletterStore()) });
  });

  r.post(
    "/newsletter/subscribe",
    rateLimit({ max: 10, windowMs: 10 * 60_000, name: "newsletter", key: (req) => req.ip ?? "unknown" }),
    async (req, res) => {
      const store = storeOr503();
      const b = body(req);
      // The same honeypot every public form uses.
      if (b.honeypot != null && String(b.honeypot).trim() !== "") return void res.status(202).json({ ok: true });

      const email = str(b, "email", { required: true, max: 254 }).toLowerCase();
      if (!isAddress(email)) throw invalid({ email: "That doesn't look like an email address." });
      const lists = cleanLists(b.lists);
      if (!lists.length) throw invalid({ lists: "Choose at least one list." });

      const existing = await store.get(email);
      const now = new Date();

      // Already confirmed: add the new lists quietly and tell them it is done. No new email, so this
      // endpoint can't be used to pester someone who already subscribed.
      if (existing?.status === "confirmed") {
        const merged = [...new Set([...existing.lists, ...lists])];
        if (merged.length !== existing.lists.length) await store.patch(email, { lists: merged });
        return void res.status(202).json({ ok: true });
      }

      // Don't let anyone use us to mail a stranger repeatedly.
      const sends = existing?.confirmSends ?? 0;
      const last = existing?.lastConfirmSentAt ? new Date(existing.lastConfirmSentAt).getTime() : 0;
      if (sends >= MAX_CONFIRM_SENDS || Date.now() - last < RESEND_COOLDOWN_MS) {
        return void res.status(202).json({ ok: true });
      }

      const confirmToken = token();
      const sub: Subscriber = {
        email,
        status: "pending",
        lists,
        confirmTokenHash: hash(confirmToken),
        confirmExpiresAt: new Date(now.getTime() + CONFIRM_HOURS * 3600e3),
        unsubscribeTokenHash: existing?.unsubscribeTokenHash ?? hash(token()),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        confirmSends: sends + 1,
        lastConfirmSentAt: now,
      };
      // While pending, the unsubscribe token is a placeholder nobody has been told: there is nothing
      // to unsubscribe from yet. The real one is minted and mailed the moment they confirm.
      await store.put(sub);

      const confirmUrl = `${config.web.url}/newsletter/confirm?token=${encodeURIComponent(confirmToken)}`;
      const sent = await mailer.send({
        to: email,
        subject: "Confirm your Islamic Tech Collective subscription",
        text: [
          "Assalāmu ʿalaykum,",
          "",
          `Someone — we hope you — asked for the Islamic Tech Collective newsletter: ${labels(lists).join(", ")}.`,
          "",
          "Confirm by opening this link within two days:",
          confirmUrl,
          "",
          "If it wasn't you, ignore this message. We will not write to you again, and we will remove the",
          "address from our records once the link expires.",
          "",
          "— The Islamic Tech Collective",
        ].join("\n"),
      });
      if (!sent.ok) throw new HttpError(502, "unavailable", "We couldn't send the confirmation email. Please try again shortly.");

      res.status(202).json({ ok: true });
    },
  );

  r.post("/newsletter/confirm", async (req, res) => {
    const store = storeOr503();
    const given = str(body(req), "token", { required: true, max: 400 });
    const sub = await store.byConfirmTokenHash(hash(given));
    if (!sub) throw new HttpError(404, "not_found", "That confirmation link isn't valid. It may already have been used.");
    if (sub.confirmExpiresAt && new Date(sub.confirmExpiresAt) < new Date()) {
      throw new HttpError(410, "not_found", "That confirmation link has expired. Please subscribe again.");
    }

    // The unsubscribe token is minted here, because this is the one moment we can mail it.
    const unsubscribeToken = token();
    await store.patch(sub.email, {
      status: "confirmed",
      confirmedAt: new Date(),
      confirmTokenHash: undefined,
      confirmExpiresAt: undefined,
      confirmSends: 0,
      unsubscribeTokenHash: hash(unsubscribeToken),
    });

    const manageUrl = `${config.web.url}/newsletter/preferences?token=${encodeURIComponent(unsubscribeToken)}`;
    await mailer.send({
      to: sub.email,
      subject: "You're subscribed",
      text: [
        "Assalāmu ʿalaykum,",
        "",
        `You're on the list for: ${labels(sub.lists).join(", ")}.`,
        "",
        "Keep this link. It changes which lists you're on, and unsubscribes you, with no password and no",
        "sign-in:",
        manageUrl,
        "",
        "— The Islamic Tech Collective",
      ].join("\n"),
    });

    res.json({ ok: true, lists: sub.lists, manageUrl });
  });

  r.get("/newsletter/preferences", async (req, res) => {
    const store = storeOr503();
    const given = typeof req.query.token === "string" ? req.query.token : "";
    const sub = given ? await store.byUnsubscribeTokenHash(hash(given)) : null;
    if (!sub) throw new HttpError(404, "not_found", "That link isn't valid.");
    res.json({ email: sub.email, status: sub.status, lists: sub.lists, allLists: LISTS });
  });

  r.post("/newsletter/preferences", async (req, res) => {
    const store = storeOr503();
    const b = body(req);
    const given = str(b, "token", { required: true, max: 400 });
    const sub = await store.byUnsubscribeTokenHash(hash(given));
    if (!sub) throw new HttpError(404, "not_found", "That link isn't valid.");

    const lists = cleanLists(b.lists);
    if (!lists.length) {
      await store.patch(sub.email, { status: "unsubscribed", lists: [], unsubscribedAt: new Date() });
      return void res.json({ ok: true, status: "unsubscribed", lists: [] });
    }
    await store.patch(sub.email, { status: "confirmed", lists, unsubscribedAt: undefined });
    res.json({ ok: true, status: "confirmed", lists });
  });

  return r;
}
