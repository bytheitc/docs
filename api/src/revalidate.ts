// Tells docs/web to drop its cached pages after an edit, so a save shows at once instead of when
// the web's cache expires. Fire-and-forget: a failure only delays a change, it never loses it.
import type { Config } from "./config.js";

export function revalidateWeb(config: Config, slugs: string[]): void {
  if (!config.web.revalidateSecret) {
    console.warn("[api] REVALIDATE_SECRET is not set; the web will pick the change up when its cache expires.");
    return;
  }
  void (async () => {
    try {
      const res = await fetch(`${config.web.url}/api/revalidate`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidate-secret": config.web.revalidateSecret },
        body: JSON.stringify({ slugs }),
        signal: AbortSignal.timeout(4000),
        redirect: "manual",
      });
      await res.body?.cancel().catch(() => {});
      if (!res.ok) console.error(`[api] revalidating the web answered HTTP ${res.status}`);
    } catch (e) {
      console.error(`[api] could not reach the web to revalidate: ${(e as Error).message}`);
    }
  })();
}
