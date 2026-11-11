// This api's client for cms/api. It is the only place that holds the space key, and the only place
// that talks to the CMS (ARCHITECTURE.md, rules 2 and 3).
//
// Reads are held in memory for Config.contentTtlMs. When the CMS cannot be reached, reads fall back
// to the house's built-in seed content and say so, so the web can set X-Content-Source: seed and the
// site keeps working read-only (rule 5). Form submissions have no fallback: they answer 503, and the
// web shows "please email us instead".
import type { Config } from "./config.js";
import { findCollection } from "./content/collections.js";

const TIMEOUT_MS = 6000;

export type ContentSource = "cms" | "seed";

export interface ContentResult {
  entries: Record<string, unknown>[];
  source: ContentSource;
}

export type SubmitResult = { ok: true } | { ok: false; status: number; fields?: Record<string, string>; message: string };

interface CacheEntry {
  at: number;
  result: ContentResult;
}

interface CmsError {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

export class CmsClient {
  private readonly cache = new Map<string, CacheEntry>();
  /** Null until the first call; then whether the last CMS call succeeded. */
  private lastOk: boolean | null = null;

  constructor(private readonly config: Config) {}

  get configured(): boolean {
    return Boolean(this.config.cms.key);
  }

  /** Whether the last call to the CMS succeeded. Null before the first call. */
  get reachable(): boolean | null {
    return this.lastOk;
  }

  private url(path: string): string {
    return `${this.config.cms.url}/v1/spaces/${this.config.space}${path}`;
  }

  private async call(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
    const { timeoutMs = TIMEOUT_MS, ...rest } = init;
    const res = await fetch(url, {
      ...rest,
      headers: {
        authorization: `Bearer ${this.config.cms.key}`,
        accept: "application/json",
        ...(rest.body ? { "content-type": "application/json" } : {}),
        ...rest.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    });
    this.lastOk = res.ok;
    return res;
  }

  private seed(collection: string): ContentResult {
    const def = findCollection(collection);
    return { entries: def ? (def.seed() as Record<string, unknown>[]) : [], source: "seed" };
  }

  private fresh(key: string): ContentResult | null {
    const hit = this.cache.get(key);
    return hit && Date.now() - hit.at < this.config.contentTtlMs ? hit.result : null;
  }

  /** Drops cached reads: everything, or one collection. Called when the CMS reports a change. */
  invalidate(collection?: string) {
    if (!collection) return this.cache.clear();
    for (const key of this.cache.keys()) if (key === collection || key.startsWith(`${collection}/`)) this.cache.delete(key);
  }

  /** All published entries of a collection, in editor order. Falls back to seed content. */
  async content(collection: string): Promise<ContentResult> {
    const cached = this.fresh(collection);
    if (cached) return cached;
    if (!this.configured) return this.seed(collection);

    let result: ContentResult;
    try {
      const res = await this.call(this.url(`/content/${encodeURIComponent(collection)}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { entries?: Record<string, unknown>[] };
      result = { entries: body.entries ?? [], source: "cms" };
    } catch (e) {
      console.error(`[api] CMS read ${collection} failed (${(e as Error).message}); serving seed content.`);
      result = this.seed(collection);
    }
    this.cache.set(collection, { at: Date.now(), result });
    return result;
  }

  /** One published entry, or null. Falls back to the seed entry with that id. */
  async entry(collection: string, id: string): Promise<{ entry: Record<string, unknown> | null; source: ContentSource }> {
    const def = findCollection(collection);
    const fromSeed = () => {
      const match = (def?.seed() as Record<string, unknown>[] | undefined)?.find((d) => String(d[def!.idField]) === id);
      return { entry: match ?? null, source: "seed" as const };
    };
    if (!this.configured) return fromSeed();

    const key = `${collection}/${id}`;
    const cached = this.fresh(key);
    if (cached) return { entry: cached.entries[0] ?? null, source: cached.source };

    try {
      const res = await this.call(this.url(`/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`));
      if (res.status === 404) {
        this.cache.set(key, { at: Date.now(), result: { entries: [], source: "cms" } });
        return { entry: null, source: "cms" };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { entry?: Record<string, unknown> };
      const entry = body.entry ?? null;
      this.cache.set(key, { at: Date.now(), result: { entries: entry ? [entry] : [], source: "cms" } });
      return { entry, source: "cms" };
    } catch (e) {
      console.error(`[api] CMS read ${collection}/${id} failed (${(e as Error).message}); serving seed content.`);
      return fromSeed();
    }
  }

  /** Hands a public form submission to the CMS inbox. No fallback: a failure is a 503 to the web. */
  async submit(form: string, fields: Record<string, string>, honeypot?: string): Promise<SubmitResult> {
    if (!this.configured) return { ok: false, status: 503, message: "No CMS key is configured, so submissions can't be stored." };
    try {
      const res = await this.call(this.url("/submissions"), {
        method: "POST",
        body: JSON.stringify({ form, fields, honeypot }),
      });
      if (res.ok) return { ok: true };
      const body = (await res.json().catch(() => ({}))) as CmsError;
      const message = body.error?.message ?? `The CMS answered HTTP ${res.status}.`;
      // The CMS rejecting the shape of a submission is the visitor's problem; anything else is ours.
      const status = res.status === 400 ? 400 : 503;
      return { ok: false, status, fields: body.error?.fields, message };
    } catch (e) {
      console.error(`[api] CMS submission (${form}) failed: ${(e as Error).message}`);
      return { ok: false, status: 503, message: "The CMS could not be reached." };
    }
  }

  /** Registers this house's schema. Returns what the CMS did, or throws. */
  async registerSchema(payload: unknown): Promise<{ changed: boolean; seeded: string[] }> {
    const res = await this.call(this.url("/schema"), { method: "PUT", body: JSON.stringify(payload), timeoutMs: 20_000 });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as CmsError;
      const fields = body.error?.fields;
      const detail = fields ? ` ${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("; ")}` : "";
      throw new Error(`HTTP ${res.status}: ${body.error?.message ?? "schema rejected"}.${detail}`);
    }
    const body = (await res.json()) as { changed?: boolean; seeded?: string[] };
    return { changed: Boolean(body.changed), seeded: body.seeded ?? [] };
  }

  /**
   * Signs a staff member in against the CMS, so the portal's tools reuse the one editorial account
   * rather than inventing a second one. Only the opaque token comes back; no password is kept here.
   */
  async login(email: string, password: string): Promise<{ token: string; expiresAt: string } | { error: string; status: number }> {
    try {
      const res = await fetch(`${this.config.cms.url}/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
      });
      const parsed = (await res.json().catch(() => ({}))) as { token?: string; expiresAt?: string; error?: { message?: string } };
      if (!res.ok || !parsed.token) {
        return { error: parsed.error?.message ?? "That email and password did not match.", status: res.status === 429 ? 429 : 401 };
      }
      return { token: parsed.token, expiresAt: parsed.expiresAt ?? new Date(Date.now() + 864e5).toISOString() };
    } catch (e) {
      console.error(`[api] CMS sign-in failed: ${(e as Error).message}`);
      return { error: "The CMS could not be reached.", status: 503 };
    }
  }

  /**
   * Asks the CMS whether a staff session token belongs to someone who may open this space.
   * Returns the user, or null. Used by the portal's staff tools.
   */
  async introspect(token: string): Promise<{ id: string; email: string; name: string; role: "editor" | "publisher" | "admin" } | null> {
    if (!this.configured) return null;
    try {
      const res = await this.call(`${this.config.cms.url}/v1/auth/introspect`, { method: "POST", body: JSON.stringify({ token }) });
      if (!res.ok) return null;
      const body = (await res.json()) as { user?: { id: string; email: string; name: string; role: "editor" | "publisher" | "admin" } };
      return body.user ?? null;
    } catch (e) {
      console.error(`[api] CMS introspection failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** Is the CMS answering at all? Used by GET /health. */
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.cms.url}/health`, { signal: AbortSignal.timeout(3000), redirect: "manual" });
      await res.body?.cancel().catch(() => {});
      return res.ok;
    } catch {
      return false;
    }
  }
}
