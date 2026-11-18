// Campaigns: a template sent to a list.
//
//   GET    /campaigns
//   POST   /campaigns                { name, templateId, listId }
//   GET    /campaigns/:id            plus mergeTags: which tags the template uses, and which the
//                                    list has no column for (and no fallback covers)
//   DELETE /campaigns/:id            only while still a draft
//   POST   /campaigns/:id/test       { to? } one copy to yourself (default: your staff address),
//                                    rendered with the list's first contact's fields
//   POST   /campaigns/:id/send       requires the publisher role — the one irreversible action
//   GET    /campaigns/:id/sends      the per-recipient audit log
import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Ctx } from "../app.js";
import { badRequest, body, notFound, rateLimit, str, HttpError } from "../http.js";
import { atLeast, needsDatabase, needsStaff } from "../guard.js";
import { isAddress } from "../mail.js";
import { mergeTagsIn } from "../render.js";
import { buildCampaignMessage, leaseFromNow, runCampaignSend } from "../send.js";
import { requireEmailStore } from "../store/index.js";
import type { EmailList, Template } from "../store/types.js";
import { waitUntil } from "@vercel/functions";

/** Tags the template uses that this list can't fill and that have no fallback. */
function mergeTagReport(template: Template, list: EmailList | null) {
  const used = mergeTagsIn(template.subject, template.bodyMarkdown);
  const have = new Set((list?.fieldNames ?? []).map((f) => f.toLowerCase()));
  return {
    used: used.map((u) => u.key),
    missing: used.filter((u) => !have.has(u.key) && !u.hasFallback).map((u) => u.key),
  };
}

export function campaignsRoutes(ctx: Ctx): Router {
  const r = Router();
  r.use("/campaigns", needsDatabase, needsStaff(ctx.cms));

  r.get("/campaigns", async (_req, res) => {
    res.json({ campaigns: await requireEmailStore().listCampaigns() });
  });

  r.post("/campaigns", async (req, res) => {
    const store = requireEmailStore();
    const b = body(req);
    const name = str(b, "name", { required: true, max: 120 });
    const templateId = str(b, "templateId", { required: true });
    const listId = str(b, "listId", { required: true });
    if (!(await store.getTemplate(templateId))) throw badRequest("No such template.");
    if (!(await store.getList(listId))) throw badRequest("No such list.");
    const campaign = await store.createCampaign({ id: randomUUID(), name, templateId, listId });
    res.status(201).json({ campaign });
  });

  r.get("/campaigns/:id", async (req, res) => {
    const store = requireEmailStore();
    const campaign = await store.getCampaign(req.params.id);
    if (!campaign) throw notFound("No such campaign.");
    const [template, list] = await Promise.all([store.getTemplate(campaign.templateId), store.getList(campaign.listId)]);
    res.json({ campaign, mergeTags: template ? mergeTagReport(template, list) : { used: [], missing: [] } });
  });

  r.delete("/campaigns/:id", async (req, res) => {
    const store = requireEmailStore();
    const campaign = await store.getCampaign(req.params.id);
    if (!campaign) throw notFound("No such campaign.");
    if (campaign.status !== "draft") throw new HttpError(409, "bad_request", "Only a draft campaign can be deleted.");
    await store.deleteCampaign(req.params.id);
    res.status(204).end();
  });

  // Ten test sends a minute per staff account is plenty, and stops a stuck button spamming an inbox.
  const testLimit = rateLimit({ name: "test-send", max: 10, windowMs: 60_000, key: (req) => req.staff?.id ?? req.ip ?? "?" });

  r.post("/campaigns/:id/test", testLimit, async (req, res) => {
    const store = requireEmailStore();
    const campaign = await store.getCampaign(String(req.params.id));
    if (!campaign) throw notFound("No such campaign.");
    const template = await store.getTemplate(campaign.templateId);
    if (!template) throw badRequest("This campaign's template no longer exists.");
    if (!template.bodyMarkdown.trim()) throw badRequest("This campaign's template has no body yet. Write it before sending.");

    const to = str(body(req), "to", { max: 254 }) || req.staff!.email;
    if (!isAddress(to)) throw badRequest("That isn't an email address.", { to: "Not an email address." });

    // Render with a real contact's fields, so the test shows what recipients will actually see.
    const { contacts } = await store.listContacts(campaign.listId, { limit: 1, offset: 0 });
    const sample = contacts[0];
    const msg = buildCampaignMessage(template, to, sample?.fields ?? {}, {
      unsubscribeUrl: `${ctx.config.web.url}/unsubscribe/preview`,
      oneClickUrl: `${ctx.config.web.url}/unsubscribe/preview/one-click`,
    });
    msg.subject = `[Test] ${msg.subject}`;
    const result = await ctx.mailer.send(msg);
    if (!result.ok) throw new HttpError(502, "unavailable", `The test didn't send: ${result.error}`);
    res.json({ ok: true, to, sampleContact: sample?.email ?? null, delivered: ctx.mailer.delivers });
  });

  r.post("/campaigns/:id/send", atLeast("publisher"), async (req, res) => {
    const store = requireEmailStore();
    const campaignId = String(req.params.id);
    const campaign = await store.getCampaign(campaignId);
    if (!campaign) throw notFound("No such campaign.");
    if (campaign.status !== "draft") throw new HttpError(409, "bad_request", "This campaign has already been sent or is sending.");
    const template = await store.getTemplate(campaign.templateId);
    if (!template) throw badRequest("This campaign's template no longer exists.");
    if (!template.bodyMarkdown.trim()) throw badRequest("This campaign's template has no body yet. Write it before sending.");
    const list = await store.getList(campaign.listId);
    if (!list) throw badRequest("This campaign's list no longer exists.");
    const tags = mergeTagReport(template, list);
    if (tags.missing.length && body(req).acknowledgeMissingFields !== true) {
      throw badRequest(
        `The template uses ${tags.missing.map((k) => `{{${k}}}`).join(", ")}, which this list has no column for. Add a fallback like {{${tags.missing[0]}|friend}}, or confirm you want to send anyway.`,
        { mergeTags: tags.missing.join(",") },
      );
    }

    const { total } = await store.listContacts(campaign.listId, { limit: 1, offset: 0 });
    // The atomic step: only one caller can move this campaign out of draft.
    const claimed = await store.claimCampaignForSending(campaignId, { total, leaseUntil: leaseFromNow(), sentBy: req.staff!.email });
    if (!claimed) throw new HttpError(409, "bad_request", "This campaign has already been sent or is sending.");

    // The send outlives this response. waitUntil keeps a serverless function alive for it (and is
    // a no-op on a long-running server); the budget hands it back before the host's time limit.
    const deadline = ctx.config.sendBudgetMs ? Date.now() + ctx.config.sendBudgetMs : undefined;
    waitUntil(runCampaignSend({ store, mailer: ctx.mailer, webUrl: ctx.config.web.url, sendDelayMs: ctx.config.sendDelayMs, deadline }, campaignId).catch((e) => {
      console.error(`[api] campaign ${campaignId} send crashed: ${(e as Error).message}`);
    }));
    res.status(202).json({ ok: true });
  });

  r.get("/campaigns/:id/sends", async (req, res) => {
    res.json({ sends: await requireEmailStore().listSends(req.params.id) });
  });

  return r;
}
