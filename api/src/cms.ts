// This api's client for cms/api, used for one thing: letting staff sign in with the CMS account they
// already have, checked against access to the "docs" space. The docs themselves are not in the CMS;
// they are Markdown in the bytheitc/docs repository (see source.ts). The space key never leaves here.
import type { Config } from "./config.js";

const TIMEOUT_MS = 6000;

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: "editor" | "publisher" | "admin";
}

export class CmsClient {
  constructor(private readonly config: Config) {}

  get configured(): boolean {
    return Boolean(this.config.cms.key);
  }

  private headers(body: boolean) {
    return { authorization: `Bearer ${this.config.cms.key}`, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) };
  }

  /** Registers the docs space, so staff can be given access to it and the CMS links to the editor. */
  async registerSpace(payload: unknown): Promise<{ changed: boolean }> {
    const res = await fetch(`${this.config.cms.url}/v1/spaces/${this.config.space}/schema`, {
      method: "PUT", headers: this.headers(true), body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000), redirect: "manual",
    });
    const body = (await res.json().catch(() => ({}))) as { changed?: boolean; error?: { message?: string } };
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.error?.message ?? "schema rejected"}`);
    return { changed: Boolean(body.changed) };
  }

  /** Signs a staff member in against the CMS. Only the opaque token comes back; no password is kept. */
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
      if (!res.ok || !parsed.token) return { error: parsed.error?.message ?? "That email and password did not match.", status: res.status === 429 ? 429 : 401 };
      return { token: parsed.token, expiresAt: parsed.expiresAt ?? new Date(Date.now() + 864e5).toISOString() };
    } catch (e) {
      console.error(`[api] CMS sign-in failed: ${(e as Error).message}`);
      return { error: "The CMS could not be reached.", status: 503 };
    }
  }

  /** The staff member behind a CMS session token, if they may open the docs space. */
  async introspect(token: string): Promise<StaffUser | null> {
    if (!this.configured) return null;
    try {
      const res = await fetch(`${this.config.cms.url}/v1/auth/introspect`, {
        method: "POST", headers: this.headers(true), body: JSON.stringify({ token }), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual",
      });
      if (!res.ok) return null;
      return ((await res.json()) as { user?: StaffUser }).user ?? null;
    } catch (e) {
      console.error(`[api] CMS introspection failed: ${(e as Error).message}`);
      return null;
    }
  }

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
