// Provider webhooks, merge-tag fallbacks, service keys and the mailer's header rules.
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import test from "node:test";

import { parseServiceKeys } from "../src/config.js";
import { Mailer, type MailMessage } from "../src/mail.js";
import { domainOf } from "../src/readiness.js";
import { applyMergeTags, mergeTagsIn, renderEmail } from "../src/render.js";
import { readPostmarkEvent, readResendEvent, verifySvix } from "../src/routes/webhooks.js";

/* ---------------- Resend (Svix) signatures ---------------- */

const SECRET = `whsec_${Buffer.from("a-test-signing-secret-of-some-length").toString("base64")}`;
function sign(id: string, ts: string, body: string) {
  const key = Buffer.from(SECRET.slice(6), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
}

test("svix: accepts a correct signature, rejects a tampered body or a stale timestamp", () => {
  const now = 1_800_000_000;
  const body = JSON.stringify({ type: "email.bounced", data: { to: ["a@x.org"] } });
  const sig = sign("msg_1", String(now), body);
  assert.equal(verifySvix(SECRET, { id: "msg_1", timestamp: String(now), signature: sig }, body, now), true);
  assert.equal(verifySvix(SECRET, { id: "msg_1", timestamp: String(now), signature: `v1,bogus ${sig}` }, body, now), true, "any matching v1 entry passes");
  assert.equal(verifySvix(SECRET, { id: "msg_1", timestamp: String(now), signature: sig }, body.replace("a@", "b@"), now), false);
  assert.equal(verifySvix(SECRET, { id: "msg_1", timestamp: String(now), signature: sig }, body, now + 3600), false);
  assert.equal(verifySvix(SECRET, { id: "msg_1", timestamp: String(now) }, body, now), false);
});

/* ---------------- event mapping ---------------- */

test("resend events: hard bounces and complaints suppress; transient bounces and others don't", () => {
  assert.deepEqual(readResendEvent({ type: "email.bounced", data: { to: ["a@x.org"], bounce: { type: "Permanent" } } }), [{ email: "a@x.org", reason: "bounced" }]);
  assert.deepEqual(readResendEvent({ type: "email.bounced", data: { to: ["a@x.org"] } }), [{ email: "a@x.org", reason: "bounced" }]);
  assert.deepEqual(readResendEvent({ type: "email.bounced", data: { to: ["a@x.org"], bounce: { type: "Transient" } } }), []);
  assert.deepEqual(readResendEvent({ type: "email.complained", data: { to: ["a@x.org"] } }), [{ email: "a@x.org", reason: "complained" }]);
  assert.deepEqual(readResendEvent({ type: "email.delivered", data: { to: ["a@x.org"] } }), []);
});

test("postmark events: hard bounce, spam complaint, suppressing subscription change", () => {
  assert.deepEqual(readPostmarkEvent({ RecordType: "Bounce", Type: "HardBounce", Email: "a@x.org" }), [{ email: "a@x.org", reason: "bounced" }]);
  assert.deepEqual(readPostmarkEvent({ RecordType: "Bounce", Type: "SoftBounce", Email: "a@x.org" }), []);
  assert.deepEqual(readPostmarkEvent({ RecordType: "SpamComplaint", Email: "a@x.org" }), [{ email: "a@x.org", reason: "complained" }]);
  assert.deepEqual(readPostmarkEvent({ RecordType: "SubscriptionChange", Recipient: "a@x.org", SuppressSending: true }), [{ email: "a@x.org", reason: "unsubscribed" }]);
  assert.deepEqual(readPostmarkEvent({ RecordType: "SubscriptionChange", Recipient: "a@x.org", SuppressSending: false }), []);
  assert.deepEqual(readPostmarkEvent({ RecordType: "Delivery", Recipient: "a@x.org" }), []);
});

/* ---------------- merge-tag fallbacks ---------------- */

test("merge tags: a fallback fills a missing or blank field, never a present one", () => {
  assert.equal(applyMergeTags("Hi {{first_name|friend}},", {}), "Hi friend,");
  assert.equal(applyMergeTags("Hi {{first_name|friend}},", { first_name: "  " }), "Hi friend,");
  assert.equal(applyMergeTags("Hi {{ first_name | dear friend }},", { first_name: "Amina" }), "Hi Amina,");
  assert.equal(applyMergeTags("Hi {{first_name}},", {}), "Hi ,");
});

test("merge tags: mergeTagsIn reports keys and whether every use has a fallback", () => {
  assert.deepEqual(mergeTagsIn("{{First_Name|friend}} {{org}}", "{{first_name}}"), [
    { key: "first_name", hasFallback: false },
    { key: "org", hasFallback: false },
  ]);
  assert.deepEqual(mergeTagsIn("{{first_name|friend}}"), [{ key: "first_name", hasFallback: true }]);
});

test("render: no unsubscribe footer when no unsubscribe URL is given (transactional mail)", () => {
  const { html, text } = renderEmail("Your sign-in link.");
  assert.doesNotMatch(html, /Unsubscribe/);
  assert.doesNotMatch(text, /Unsubscribe/);
});

/* ---------------- config and readiness helpers ---------------- */

test("service keys: house:key pairs, short keys and bad names refused", () => {
  const long = "k".repeat(24);
  const m = parseServiceKeys(`portal:${long}, accounts:${"a".repeat(30)},bad name:${long}x,short:abc`);
  assert.equal(m.get(long), "portal");
  assert.equal(m.get("a".repeat(30)), "accounts");
  assert.equal(m.size, 2);
});

test("readiness: the From address's domain", () => {
  assert.equal(domainOf("ITC <hello@ITC.org>"), "itc.org");
  assert.equal(domainOf("hello@itc.org"), "itc.org");
  assert.equal(domainOf("no address"), null);
});

/* ---------------- mailer header rules ---------------- */

test("mailer: passes List-Unsubscribe through, drops address headers and header injection", async () => {
  const mailer = new Mailer({ provider: "none", from: "ITC <hello@itc.test>", postmarkBroadcastStream: "broadcast" });
  let seen: MailMessage | undefined;
  (mailer as unknown as { adapter: { send: (m: MailMessage) => Promise<{ ok: true }> } }).adapter = {
    send: async (m: MailMessage) => { seen = m; return { ok: true }; },
  } as never;
  await mailer.send({
    to: "a@x.org", subject: "s", text: "t", stream: "broadcast",
    headers: { "List-Unsubscribe": "<https://u>", Bcc: "evil@x.org", "X-Bad\r\nBcc": "evil@x.org", "X-Note": "a\r\nBcc: evil@x.org" },
  });
  assert.deepEqual(seen?.headers, { "List-Unsubscribe": "<https://u>", "X-Note": "a Bcc: evil@x.org" });
  assert.equal(seen?.stream, "broadcast");
});
