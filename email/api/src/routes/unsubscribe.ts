// Public, no sign-in: the link in every sent email. A contact's own token identifies them — that's
// the whole point of an unsubscribe link — and the suppression it writes is checked before every
// send on every list, not just the one they came in on.
//
//   GET  /unsubscribe/:token   -> { email } or 404
//   POST /unsubscribe/:token   -> marks this contact unsubscribed and suppresses the address
import { Router } from "express";
import type { Ctx } from "../app.js";
import { notFound } from "../http.js";
import { needsDatabase } from "../guard.js";
import { requireEmailStore } from "../store/index.js";

export function unsubscribeRoutes(_ctx: Ctx): Router {
  const r = Router();
  r.use("/unsubscribe", needsDatabase);

  r.get("/unsubscribe/:token", async (req, res) => {
    const contact = await requireEmailStore().getContactByToken(req.params.token);
    if (!contact) throw notFound("That unsubscribe link isn't valid.");
    res.json({ email: contact.email, alreadyUnsubscribed: contact.status === "unsubscribed" });
  });

  r.post("/unsubscribe/:token", async (req, res) => {
    const store = requireEmailStore();
    const contact = await store.getContactByToken(req.params.token);
    if (!contact) throw notFound("That unsubscribe link isn't valid.");
    // Every list this address is on, not only this one: the suppression applies everywhere anyway.
    await store.setStatusForEmail(contact.email, "unsubscribed");
    await store.addSuppression({ email: contact.email, reason: "unsubscribed", at: new Date() });
    res.json({ ok: true, email: contact.email });
  });

  return r;
}
