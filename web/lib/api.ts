// This web's client for docs/api. Every call runs on the server. Reads are cached and tagged
// `docs`, so one POST /api/revalidate after an edit drops them all; staff calls are never cached.
const API_URL = (process.env.API_URL ?? "http://localhost:4013").replace(/\/+$/, "");
const TTL = Number(process.env.CONTENT_TTL) || 60;
export const DOCS_TAG = "docs";

export interface PageMeta { slug: string; title: string; description: string }
export interface NavSection { title: string; pages: PageMeta[] }
export interface Heading { depth: 2 | 3; text: string; id: string }
export interface DocPage { slug: string; title: string; description: string; markdown: string; section: string | null }
export interface SearchEntry extends PageMeta { section: string | null; headings: Heading[]; text: string }

async function read<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: { accept: "application/json" }, next: { revalidate: TTL, tags: [DOCS_TAG] }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[web] GET ${path} failed: ${(e as Error).message}`);
    return null;
  }
}

export const getNav = async () => (await read<{ sections: NavSection[] }>("/nav"))?.sections ?? [];
export const getPage = (slug: string) =>
  read<{ page: DocPage; headings: Heading[]; prev: PageMeta | null; next: PageMeta | null }>(`/pages/${slug.split("/").map(encodeURIComponent).join("/")}`);
export const getSearchIndex = async () => (await read<{ entries: SearchEntry[] }>("/search-index"))?.entries ?? [];

/* ---------------- staff ---------------- */

export type Fail = { ok: false; status: number; message: string; errors?: Record<string, string> };
export type Result<T> = ({ ok: true } & T) | Fail;

export interface StaffUser { id: string; email: string; name: string; role: "editor" | "publisher" | "admin" }
export interface StaffPage extends PageMeta { section: string | null; sha: string; words: number }
export interface StoredPage extends DocPage { sha: string }
export interface Revision { sha: string; message: string; author: string; date: string; url?: string }
export interface RawNav { sections: { title: string; pages: string[] }[] }

async function call<T>(path: string, opts: { method?: string; token?: string | null; body?: unknown } = {}): Promise<Result<T>> {
  const { method = "GET", token, body } = opts;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    if (!res.ok) {
      const err = typeof parsed.error === "object" && parsed.error ? (parsed.error as { message?: string; fields?: Record<string, string> }) : undefined;
      return { ok: false, status: res.status, message: err?.message ?? `The docs service answered HTTP ${res.status}.`, errors: err?.fields };
    }
    return { ok: true, ...(parsed as T) };
  } catch (e) {
    console.error(`[web] ${method} ${path} failed: ${(e as Error).message}`);
    return { ok: false, status: 503, message: "The docs service could not be reached." };
  }
}

const enc = (slug: string) => slug.split("/").map(encodeURIComponent).join("/");

export const staffLogin = (email: string, password: string) =>
  call<{ token: string; expiresAt: string; user: StaffUser }>("/staff/login", { method: "POST", body: { email, password } });
export const staffMe = (t: string) => call<{ user: StaffUser }>("/staff/me", { token: t });
export const staffStatus = (t: string) => call<{ source: "github" | "fs"; where: string; writable: boolean }>("/staff/status", { token: t });
export const staffPages = (t: string) => call<{ pages: StaffPage[] }>("/staff/pages", { token: t });
export const staffPage = (t: string, slug: string) => call<{ page: StoredPage }>(`/staff/pages/${enc(slug)}`, { token: t });
export const savePage = (t: string, slug: string, body: { title: string; description: string; markdown: string; sha: string; message: string }) =>
  call<{ revision: string }>(`/staff/pages/${enc(slug)}`, { method: "PUT", token: t, body });
export const createPage = (t: string, body: { slug: string; title: string; description: string; markdown: string; section?: string }) =>
  call<{ revision: string }>("/staff/pages", { method: "POST", token: t, body });
export const movePage = (t: string, from: string, to: string, sha: string) =>
  call<{ revision: string }>("/staff/move", { method: "POST", token: t, body: { from, to, sha } });
export const deletePage = (t: string, slug: string, sha: string) =>
  call<{ revision: string }>(`/staff/pages/${enc(slug)}?sha=${encodeURIComponent(sha)}`, { method: "DELETE", token: t });
export const staffNav = (t: string) => call<{ nav: RawNav; sha: string | null }>("/staff/nav", { token: t });
export const saveNav = (t: string, nav: RawNav, sha: string | null) => call<{ revision: string }>("/staff/nav", { method: "PUT", token: t, body: { nav, sha } });
export const pageHistory = (t: string, slug: string) => call<{ revisions: Revision[]; repo: string | null }>(`/staff/history/${enc(slug)}`, { token: t });
