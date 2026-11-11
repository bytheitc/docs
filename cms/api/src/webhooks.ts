// Webhooks: after a change that affects published content, POST { space, collection, id, event } to the space's
// registered webhook URL, signed with X-CMS-Signature: sha256=<HMAC-SHA256 of the raw body, keyed by the space key>.
// Fire-and-forget with a short timeout; the outcome goes to the audit log.
import { createHmac } from "node:crypto";
import { signingKey } from "./auth.js";
import type { Config } from "./config.js";
import type { SpaceRecord, StorageAdapter } from "./types.js";

export type WebhookEvent = "publish" | "update" | "unpublish" | "delete" | "move" | "seed";

const TIMEOUT_MS = 4000;

export function sign(body: string, key: string): string {
  return `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
}

export function fireWebhook(
  config: Config,
  store: StorageAdapter,
  space: SpaceRecord,
  payload: { collection: string; id: string | null; event: WebhookEvent },
): void {
  const url = space.webhook?.url;
  if (!url) return;
  const target = `${payload.collection}${payload.id ? `/${payload.id}` : ""}`;
  const audit = (action: string, detail: string) =>
    store.addAudit({ at: new Date(), space: space.id, actor: "cms", action, target, detail }).catch(() => {});

  const key = signingKey(config, space.id);
  if (!key) {
    void audit("webhook.skipped", "no space key is configured to sign with");
    return;
  }
  const body = JSON.stringify({ space: space.id, collection: payload.collection, id: payload.id, event: payload.event });
  void (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-cms-signature": sign(body, key), "user-agent": "itc-cms-webhook/1" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
      });
      await res.body?.cancel().catch(() => {});
      await audit(res.ok ? "webhook.ok" : "webhook.failed", `${payload.event} → HTTP ${res.status}`);
    } catch (e) {
      const why = (e as Error).name === "TimeoutError" ? `timed out after ${TIMEOUT_MS} ms` : "could not connect";
      await audit("webhook.failed", `${payload.event} → ${why}`);
    }
  })();
}
