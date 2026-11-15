// This api's client for cms/api. It is the only place that holds the space key, and the only place
// that talks to the CMS (ARCHITECTURE.md, rules 2 and 3). It holds exactly one collection for
// accounts: the collective's own trusted ("first-party") OAuth clients. Everything self-service
// (partner clients, credentials, sessions, tokens) lives in AccountsStore instead. It is also how
// staff sign in to review a partner's registration — the same CMS account editors already have,
// checked against access to the "accounts" space, so there is no second password anywhere.
import type { Config } from "./config.js";
import { findCollection } from "./content/collections.js";

const TIMEOUT_MS = 6000;

export type ContentSource = "cms" | "seed";

export interface ContentResult {
  entries: Record<string, unknown>[];
  source: ContentSource;
}

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
   * Signs a staff member in against the CMS, so reviewing a partner's app reuses the one
   * editorial account rather than inventing a second one. Only the opaque token comes back; no
   * password is kept here.
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
   * Returns the user, or null. Used to gate /staff/*.
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
