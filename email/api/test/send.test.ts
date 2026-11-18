// The send loop's two guarantees: a campaign is sent once, and a contact is mailed at most once
// per campaign, including when a send is interrupted and resumed.
import { strict as assert } from "node:assert";
import test from "node:test";

import type { Mailer, MailMessage } from "../src/mail.js";
import { buildCampaignMessage, leaseFromNow, resumeInterruptedCampaigns, runCampaignSend } from "../src/send.js";
import { createMemoryStore } from "./memory-store.js";

function fakeMailer(opts: { failFor?: string } = {}) {
  const sent: MailMessage[] = [];
  const mailer = {
    kind: "fake",
    delivers: false, // no pause between messages
    from: "ITC <hello@itc.test>",
    async send(msg: MailMessage) {
      if (msg.to === opts.failFor) return { ok: false as const, error: "rejected" };
      sent.push(msg);
      return { ok: true as const, id: `m-${sent.length}` };
    },
  } as unknown as Mailer;
  return { mailer, sent };
}

async function seed(n = 3) {
  const mem = createMemoryStore();
  const { store } = mem;
  await store.createList({ id: "L", name: "List", fieldNames: ["first_name"] });
  await store.insertContacts(Array.from({ length: n }, (_, i) => ({
    id: `c${i}`, listId: "L", email: `p${i}@x.org`, fields: { first_name: `P${i}` }, status: "subscribed" as const, unsubscribeToken: `t${i}`,
  })));
  await store.createTemplate({ id: "T", name: "T", subject: "Hi {{first_name}}", bodyMarkdown: "Hello {{first_name|friend}}." });
  await store.createCampaign({ id: "C", name: "C", templateId: "T", listId: "L" });
  return mem;
}

const deps = (store: ReturnType<typeof createMemoryStore>["store"], mailer: Mailer) => ({ store, mailer, webUrl: "https://mail.itc.test", sendDelayMs: 0 });

test("claim: only the first of two simultaneous Send presses wins", async () => {
  const { store } = await seed();
  const [a, b] = await Promise.all([
    store.claimCampaignForSending("C", { total: 3, leaseUntil: leaseFromNow(), sentBy: "a@x" }),
    store.claimCampaignForSending("C", { total: 3, leaseUntil: leaseFromNow(), sentBy: "b@x" }),
  ]);
  assert.equal([a, b].filter(Boolean).length, 1);
});

test("send: every subscribed contact once, suppressed ones skipped, stats add up", async () => {
  const { store } = await seed(4);
  await store.addSuppression({ email: "p2@x.org", reason: "bounced", at: new Date() });
  const { mailer, sent } = fakeMailer();
  await store.claimCampaignForSending("C", { total: 4, leaseUntil: leaseFromNow(), sentBy: "a@x" });
  await runCampaignSend(deps(store, mailer), "C");

  assert.deepEqual(sent.map((m) => m.to).sort(), ["p0@x.org", "p1@x.org", "p3@x.org"]);
  const c = await store.getCampaign("C");
  assert.equal(c?.status, "sent");
  assert.deepEqual(c?.stats, { total: 4, sent: 3, failed: 0, skipped: 1 });
});

test("send: two workers running the same campaign never mail anyone twice", async () => {
  const { store } = await seed(5);
  const { mailer, sent } = fakeMailer();
  await store.claimCampaignForSending("C", { total: 5, leaseUntil: leaseFromNow(), sentBy: "a@x" });
  await Promise.all([runCampaignSend(deps(store, mailer), "C"), runCampaignSend(deps(store, mailer), "C")]);
  assert.equal(sent.length, 5);
  assert.equal(new Set(sent.map((m) => m.to)).size, 5);
});

test("resume: an interrupted send finishes the rest, and a send left pending is not retried", async () => {
  const mem = await seed(4);
  const { store, expireLease } = mem;
  await store.claimCampaignForSending("C", { total: 4, leaseUntil: leaseFromNow(), sentBy: "a@x" });
  // The dead worker: mailed p0, and was mid-way through p1 when it stopped.
  await store.beginSend({ id: "s0", campaignId: "C", contactId: "c0", email: "p0@x.org", status: "pending" });
  await store.completeSend("C", "c0", { status: "sent" });
  await store.bumpCampaignStats("C", { sent: 1 });
  await store.beginSend({ id: "s1", campaignId: "C", contactId: "c1", email: "p1@x.org", status: "pending" });

  // Still leased: nobody may take it over yet.
  const { mailer, sent } = fakeMailer();
  await resumeInterruptedCampaigns(deps(store, mailer));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(sent.length, 0);

  expireLease("C");
  await resumeInterruptedCampaigns(deps(store, mailer));
  await new Promise((r) => setTimeout(r, 50));

  assert.deepEqual(sent.map((m) => m.to).sort(), ["p2@x.org", "p3@x.org"]);
  const c = await store.getCampaign("C");
  assert.equal(c?.status, "sent");
  assert.deepEqual(c?.stats, { total: 4, sent: 3, failed: 1, skipped: 0 });
});

test("send: a failure is recorded per recipient and doesn't stop the rest", async () => {
  const { store, sends } = await seed(3);
  const { mailer, sent } = fakeMailer({ failFor: "p1@x.org" });
  await store.claimCampaignForSending("C", { total: 3, leaseUntil: leaseFromNow(), sentBy: "a@x" });
  await runCampaignSend(deps(store, mailer), "C");
  assert.equal(sent.length, 2);
  assert.equal(sends.find((s) => s.contactId === "c1")?.status, "failed");
  assert.equal((await store.getCampaign("C"))?.status, "sent");
});

test("message: carries one-click List-Unsubscribe headers and goes on the broadcast stream", () => {
  const msg = buildCampaignMessage({ subject: "Hi {{first_name}}", bodyMarkdown: "Hello." }, "a@x.org", { first_name: "Amina" }, {
    unsubscribeUrl: "https://m/unsubscribe/tok",
    oneClickUrl: "https://m/unsubscribe/tok/one-click",
  });
  assert.equal(msg.subject, "Hi Amina");
  assert.equal(msg.stream, "broadcast");
  assert.equal(msg.headers?.["List-Unsubscribe"], "<https://m/unsubscribe/tok/one-click>");
  assert.equal(msg.headers?.["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(msg.text, /Unsubscribe: https:\/\/m\/unsubscribe\/tok/);
});

test("budget: a send out of time hands the campaign back, and the resumed send finishes without duplicates", async () => {
  const { store } = await seed(4);
  await store.claimCampaignForSending("C", { total: 4, leaseUntil: leaseFromNow(), sentBy: "a@x" });

  // A mailer that burns the whole budget on its second message, like a serverless function
  // nearing its time limit mid-campaign.
  const sent: MailMessage[] = [];
  let deadline = Infinity;
  const slow = {
    kind: "fake", delivers: false, from: "ITC <hello@itc.test>",
    async send(msg: MailMessage) {
      sent.push(msg);
      if (sent.length === 2) deadline = Date.now() - 1;
      return { ok: true as const, id: `m-${sent.length}` };
    },
  } as unknown as Mailer;
  await runCampaignSend({ ...deps(store, slow), get deadline() { return deadline; } }, "C");

  // Stopped after two, still "sending", and the lease is released for the cron to take over at once.
  assert.equal(sent.length, 2);
  assert.equal((await store.getCampaign("C"))?.status, "sending");

  const { mailer, sent: rest } = fakeMailer();
  const { resumed } = await resumeInterruptedCampaigns(deps(store, mailer), { wait: true });
  assert.equal(resumed, 1);
  assert.deepEqual(rest.map((m) => m.to).sort(), ["p2@x.org", "p3@x.org"]);
  const c = await store.getCampaign("C");
  assert.equal(c?.status, "sent");
  assert.deepEqual(c?.stats, { total: 4, sent: 4, failed: 0, skipped: 0 });
});
