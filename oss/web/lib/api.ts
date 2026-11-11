// The only way this web talks to the outside world: its own api, server-side, over HTTP.
// A web never touches a database and never holds a service credential (ARCHITECTURE.md, rules 1 and 3).
//
//   API_URL   base URL of this house's api (http://localhost:4004 in development)
//
// Reads are cached for CONTENT_TTL seconds and tagged, so POST /api/revalidate can drop them
// the moment an editor publishes. When the api is unreachable a read yields nothing and the page
// renders its empty state rather than failing: the api itself falls back to built-in seed content,
// so this only happens when the api is down.
//
// Everything here runs on the server only: it is called from server components and server actions.
const API_URL = (process.env.API_URL ?? "http://localhost:4004").replace(/\/+$/, "");
const CONTENT_TTL = 60;
const TIMEOUT_MS = 5000;

export const CONTENT_TAG = "content";
export const collectionTag = (collection: string) => `content:${collection}`;

/** Where the entries came from, as reported by the api. */
export type ContentSource = "cms" | "seed" | "none";

async function readJson<T>(path: string, collection: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { accept: "application/json" },
      next: { revalidate: CONTENT_TTL, tags: [CONTENT_TAG, collectionTag(collection)] },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`[web] GET ${path} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[web] GET ${path} failed: ${(e as Error).message}`);
    return null;
  }
}

/** All published entries of a collection, in editor-chosen order. */
export async function getPublished<T>(collection: string): Promise<T[]> {
  const body = await readJson<{ entries: T[] }>(`/content/${encodeURIComponent(collection)}`, collection);
  return body?.entries ?? [];
}

/** One published entry by id, or undefined. */
export async function getPublishedOne<T>(collection: string, id: string): Promise<T | undefined> {
  const body = await readJson<{ entry: T }>(`/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, collection);
  return body?.entry ?? undefined;
}

/** The single entry of a singleton collection (a settings-style document). */
export async function getSingleton<T>(collection: string): Promise<T | undefined> {
  return (await getPublished<T>(collection))[0];
}

/* ------------------------------------------------------------------ */
/* Forms                                                              */
/* ------------------------------------------------------------------ */

export type SubmitResult = { ok: true } | { ok: false; reason: "unavailable" | "invalid" | "error" };

/**
 * Hands a public form submission to the api, which forwards it to the CMS inbox.
 * `honeypot` is the value of a visually hidden field people never fill in; bots often do.
 * Such submissions are accepted and dropped. This never throws at the visitor.
 */
export async function submitForm(form: string, fields: Record<string, unknown>, honeypot?: string): Promise<SubmitResult> {
  try {
    const res = await fetch(`${API_URL}/forms/${encodeURIComponent(form)}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ fields, honeypot }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    if (res.status === 400) return { ok: false, reason: "invalid" };
    if (res.status === 503) return { ok: false, reason: "unavailable" };
    console.error(`[web] POST /forms/${form} → HTTP ${res.status}`);
    return { ok: false, reason: "error" };
  } catch (e) {
    console.error(`[web] POST /forms/${form} failed: ${(e as Error).message}`);
    return { ok: false, reason: "unavailable" };
  }
}
