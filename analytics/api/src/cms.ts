// The CMS, used only for staff accounts: signing in, checking a session belongs to someone with the
// "analytics" space, and registering that (content-less) space on boot. Same calls as email/api.
import type { Config } from "./config.js";
import { log } from "./observe.js";

export interface StaffUser { id: string; email: string; name: string; role: "editor" | "publisher" | "admin" }

const TIMEOUT_MS = 5_000;
const BACKOFF_MS = [2_000, 5_000, 15_000, 60_000, 300_000];

export class CmsClient {
  private readonly sessions = new Map<string, { user: StaffUser | null; until: number }>();
  constructor(private readonly config: Config) {}

  get configured(): boolean {
    return Boolean(this.config.cms.key);
  }

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
      log("error", `CMS sign-in failed: ${(e as Error).message}`);
      return { error: "The CMS could not be reached.", status: 503 };
    }
  }

  /** The staff member a session token belongs to, if they may open this space. Cached for a minute. */
  async introspect(token: string): Promise<StaffUser | null> {
    if (!this.configured || !token) return null;
    const hit = this.sessions.get(token);
    if (hit && hit.until > Date.now()) return hit.user;
    let user: StaffUser | null = null;
    try {
      const res = await fetch(`${this.config.cms.url}/v1/auth/introspect`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${this.config.cms.key}` },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
      });
      if (res.ok) user = ((await res.json()) as { user?: StaffUser }).user ?? null;
    } catch (e) {
      log("error", `CMS introspection failed: ${(e as Error).message}`);
      return null; // not cached: try again next request
    }
    if (this.sessions.size > 1000) this.sessions.clear();
    this.sessions.set(token, { user, until: Date.now() + 60_000 });
    return user;
  }

  forget(token: string): void {
    this.sessions.delete(token);
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.cms.url}/health`, { signal: AbortSignal.timeout(3_000), redirect: "manual" });
      await res.body?.cancel().catch(() => {});
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Makes sure the "analytics" space exists in the CMS, so staff can be given access to it. Retries with backoff. */
  registerSpace(): void {
    if (!this.configured) {
      log("warn", "no CMS_SPACE_KEY: not registering the analytics space; nobody can sign in.");
      return;
    }
    let attempt = 0;
    const tick = async () => {
      try {
        const res = await fetch(`${this.config.cms.url}/v1/spaces/${this.config.cms.space}/schema`, {
          method: "PUT",
          headers: { "content-type": "application/json", authorization: `Bearer ${this.config.cms.key}` },
          body: JSON.stringify({ label: "Analytics", title: "Site analytics", collections: [], forms: {}, links: [{ label: "Open analytics", href: this.config.publicUrl }], webhook: null }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        log("info", 'registered space "analytics" with the CMS.');
      } catch (e) {
        const wait = BACKOFF_MS[Math.min(attempt++, BACKOFF_MS.length - 1)];
        log("warn", `registering the analytics space failed (${(e as Error).message}); retrying in ${wait / 1000}s.`);
        setTimeout(() => void tick(), wait).unref();
      }
    };
    void tick();
  }
}
