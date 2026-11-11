// Tells this house's web to drop its cached copy of a collection. Fire-and-forget: the web also
// re-reads every CONTENT_TTL seconds, so a failure here only delays a change, it never loses it.
import type { Config } from "./config.js";

const TIMEOUT_MS = 4000;

export function revalidateWeb(config: Config, collection?: string): void {
  if (!config.web.revalidateSecret) {
    console.warn("[api] REVALIDATE_SECRET is not set; the web will pick the change up when its cache expires.");
    return;
  }
  void (async () => {
    try {
      const res = await fetch(`${config.web.url}/api/revalidate`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidate-secret": config.web.revalidateSecret },
        body: JSON.stringify({ collection }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
      });
      await res.body?.cancel().catch(() => {});
      if (!res.ok) console.error(`[api] revalidating the web answered HTTP ${res.status}`);
    } catch (e) {
      console.error(`[api] could not reach the web to revalidate: ${(e as Error).message}`);
    }
  })();
}
