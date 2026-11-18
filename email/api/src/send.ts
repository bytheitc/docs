// The campaign send loop, and the pieces the test send shares with it.
//
// Two guarantees, both enforced in the database rather than in memory:
//
//   1. A campaign is sent once. Pressing Send moves it draft -> sending in one atomic update
//      (claimCampaignForSending); a second press finds it isn't a draft and is refused.
//   2. A contact is mailed at most once per campaign. Before the provider is called, a "pending"
//      send record is inserted, unique per (campaign, contact). A worker that finds one already
//      there skips that contact.
//
// Because of (2), an interrupted send can simply be run again: the worker that holds the
// campaign's lease walks the list from the top and skips everyone already handled. A lease that
// isn't renewed (the process died) expires, and the next boot takes the campaign over and
// finishes it. Sends the dead worker left "pending" are closed as failed, not retried — whether
// the provider got them is unknown, and a gap is better than a duplicate.
import { randomUUID } from "node:crypto";
import { applyMergeTags, renderEmail } from "./render.js";
import type { Mailer, MailMessage } from "./mail.js";
import type { Contact, EmailStore, Template } from "./store/types.js";

const PAGE_SIZE = 200;
/** How long a worker owns a campaign without renewing. Renewed after every message. */
export const LEASE_MS = 2 * 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const leaseFromNow = () => new Date(Date.now() + LEASE_MS);

export const unsubscribePageUrl = (webUrl: string, token: string) => `${webUrl}/unsubscribe/${encodeURIComponent(token)}`;
/** RFC 8058 one-click endpoint: a POST here unsubscribes with no further step. */
export const oneClickUrl = (webUrl: string, token: string) => `${unsubscribePageUrl(webUrl, token)}/one-click`;

/**
 * One campaign message for one contact: merge tags applied, rendered, and carrying the
 * List-Unsubscribe headers Gmail and Yahoo require of bulk senders.
 */
export function buildCampaignMessage(
  template: Pick<Template, "subject" | "bodyMarkdown">,
  to: string,
  fields: Record<string, string>,
  links: { unsubscribeUrl: string; oneClickUrl: string },
): MailMessage {
  const subject = applyMergeTags(template.subject, fields);
  const { html, text } = renderEmail(applyMergeTags(template.bodyMarkdown, fields), { unsubscribeUrl: links.unsubscribeUrl });
  return {
    to,
    subject,
    text,
    html,
    stream: "broadcast",
    headers: {
      "List-Unsubscribe": `<${links.oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

export interface SendDeps {
  store: EmailStore;
  mailer: Mailer;
  webUrl: string;
  sendDelayMs: number;
  /** Epoch ms after which this worker stops and hands the campaign back. Omit for no limit. */
  deadline?: number;
}

/**
 * Runs (or resumes) a campaign the caller has already claimed or taken over. Never throws out:
 * every failure is per recipient, and a crash leaves the lease to expire for the next boot.
 */
export async function runCampaignSend(deps: SendDeps, campaignId: string): Promise<void> {
  const { store, mailer, webUrl, sendDelayMs } = deps;
  const campaign = await store.getCampaign(campaignId);
  if (!campaign || campaign.status !== "sending") return;
  const template = await store.getTemplate(campaign.templateId);
  if (!template) { await store.finishCampaign(campaignId, "failed"); return; }

  const orphaned = await store.closeOrphanedSends(campaignId);
  if (orphaned) await store.bumpCampaignStats(campaignId, { failed: orphaned });

  let offset = 0;
  for (;;) {
    const { contacts } = await store.listContacts(campaign.listId, { limit: PAGE_SIZE, offset });
    if (!contacts.length) break;
    for (const contact of contacts) {
      if (deps.deadline && Date.now() >= deps.deadline) {
        // Out of time for this invocation. Expire the lease now so the next cron run takes the
        // campaign straight over; everyone already handled is skipped by the per-contact lock.
        await store.renewCampaignLease(campaignId, new Date(0));
        console.log(`[api] campaign ${campaignId}: send budget used, handing back at offset ${offset}.`);
        return;
      }
      await sendOne(deps, campaignId, template, contact);
      await store.renewCampaignLease(campaignId, leaseFromNow());
      if (mailer.delivers) await sleep(sendDelayMs);
    }
    offset += contacts.length;
  }

  const finished = await store.getCampaign(campaignId);
  const s = finished?.stats;
  // Failed only when nothing went out and something was tried; an all-skipped list is "sent".
  const allFailed = Boolean(s && s.sent === 0 && s.failed > 0);
  await store.finishCampaign(campaignId, allFailed ? "failed" : "sent");
}

async function sendOne(deps: SendDeps, campaignId: string, template: Template, contact: Contact) {
  const { store, mailer, webUrl } = deps;
  const base = { id: randomUUID(), campaignId, contactId: contact.id, email: contact.email };

  if (contact.status !== "subscribed" || (await store.isSuppressed(contact.email))) {
    if (await store.beginSend({ ...base, status: "skipped" })) await store.bumpCampaignStats(campaignId, { skipped: 1 });
    return;
  }

  // The lock: if this contact already has a record for this campaign, someone handled them.
  if (!(await store.beginSend({ ...base, status: "pending" }))) return;

  const msg = buildCampaignMessage(template, contact.email, contact.fields, {
    unsubscribeUrl: unsubscribePageUrl(webUrl, contact.unsubscribeToken),
    oneClickUrl: oneClickUrl(webUrl, contact.unsubscribeToken),
  });
  const result = await mailer.send(msg);
  if (result.ok) {
    await store.completeSend(campaignId, contact.id, { status: "sent", ...(result.id ? { providerId: result.id } : {}) });
    await store.bumpCampaignStats(campaignId, { sent: 1 });
  } else {
    await store.completeSend(campaignId, contact.id, { status: "failed", error: result.error });
    await store.bumpCampaignStats(campaignId, { failed: 1 });
  }
}

/**
 * Finishes any campaign whose worker stopped: on boot, on a timer, or from /cron/resume-campaigns.
 * With `wait`, resolves only when those sends end (a cron request must stay open while it works,
 * or a serverless host freezes it); without, the sends run on in the background.
 */
export async function resumeInterruptedCampaigns(deps: SendDeps, opts: { wait?: boolean } = {}): Promise<{ resumed: number }> {
  const stuck = await deps.store.listInterruptedCampaigns();
  const runs: Promise<void>[] = [];
  for (const c of stuck) {
    const mine = await deps.store.takeOverInterruptedCampaign(c.id, leaseFromNow());
    if (!mine) continue; // another instance got there first
    console.log(`[api] resuming interrupted campaign ${c.id} ("${c.name}")`);
    runs.push(runCampaignSend(deps, c.id).catch((e) => console.error(`[api] resumed campaign ${c.id} crashed: ${(e as Error).message}`)));
  }
  if (opts.wait) await Promise.all(runs);
  return { resumed: runs.length };
}
