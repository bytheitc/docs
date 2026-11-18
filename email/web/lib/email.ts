// This web's client for email/api. Every call runs on the server and carries a staff bearer
// token; nothing here reaches a browser.
const API_URL = (process.env.API_URL ?? "http://localhost:4010").replace(/\/+$/, "");
const TIMEOUT_MS = 10_000;

export type Fail = { ok: false; status: number; message: string; errors?: Record<string, string> };
export type Result<T> = ({ ok: true } & T) | Fail;

interface CallOpts {
  method?: string;
  token?: string | null;
  body?: unknown;
}

async function call<T>(path: string, opts: CallOpts = {}): Promise<Result<T>> {
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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    if (!res.ok) {
      const nested = typeof parsed.error === "object" && parsed.error ? (parsed.error as { message?: string; fields?: Record<string, string> }) : undefined;
      return { ok: false, status: res.status, message: nested?.message ?? `email answered HTTP ${res.status}.`, errors: nested?.fields };
    }
    return { ok: true, ...(parsed as T) };
  } catch (e) {
    console.error(`[web] ${method} ${path} failed: ${(e as Error).message}`);
    return { ok: false, status: 503, message: "The email service could not be reached." };
  }
}

const orNull = async <T>(p: Promise<Result<T>>): Promise<T | null> => {
  const r = await p;
  return r.ok ? (r as T) : null;
};

/* ---------------- staff ---------------- */

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: "editor" | "publisher" | "admin";
}

export const staffLogin = (email: string, password: string) =>
  call<{ token: string; expiresAt: string; user: StaffUser }>("/staff/login", { method: "POST", body: { email, password } });

export const staffMe = (token: string) => orNull<{ user: StaffUser }>(call<{ user: StaffUser }>("/staff/me", { token }));

/* ---------------- lists ---------------- */

export interface EmailList {
  id: string;
  name: string;
  fieldNames: string[];
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  listId: string;
  email: string;
  fields: Record<string, string>;
  status: "subscribed" | "unsubscribed" | "bounced";
  createdAt: string;
}

export const listLists = (token: string) => orNull<{ lists: EmailList[] }>(call<{ lists: EmailList[] }>("/lists", { token }));
export const createList = (token: string, name: string) => call<{ list: EmailList }>("/lists", { method: "POST", token, body: { name } });
export const getList = (token: string, id: string, limit = 50, offset = 0) =>
  orNull<{ list: EmailList; contacts: Contact[]; total: number }>(
    call<{ list: EmailList; contacts: Contact[]; total: number }>(`/lists/${encodeURIComponent(id)}?limit=${limit}&offset=${offset}`, { token }),
  );
export const deleteList = (token: string, id: string) => call<Record<string, never>>(`/lists/${encodeURIComponent(id)}`, { method: "DELETE", token });
export const uploadCsv = (token: string, id: string, csv: string) =>
  call<{ inserted: number; skippedInvalid: number; skippedSuppressed: number; skippedDuplicate: number; fieldNames: string[] }>(
    `/lists/${encodeURIComponent(id)}/upload`, { method: "POST", token, body: { csv } },
  );

/* ---------------- templates ---------------- */

export interface Template {
  id: string;
  name: string;
  subject: string;
  bodyMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export const listTemplates = (token: string) => orNull<{ templates: Template[] }>(call<{ templates: Template[] }>("/templates", { token }));
export const createTemplate = (token: string, t: { name: string; subject: string; bodyMarkdown: string }) =>
  call<{ template: Template }>("/templates", { method: "POST", token, body: t });
export const getTemplate = (token: string, id: string) => orNull<{ template: Template }>(call<{ template: Template }>(`/templates/${encodeURIComponent(id)}`, { token }));
export const updateTemplate = (token: string, id: string, patch: Partial<{ name: string; subject: string; bodyMarkdown: string }>) =>
  call<{ template: Template }>(`/templates/${encodeURIComponent(id)}`, { method: "PUT", token, body: patch });
export const deleteTemplate = (token: string, id: string) => call<Record<string, never>>(`/templates/${encodeURIComponent(id)}`, { method: "DELETE", token });
export const previewTemplate = (token: string, bodyMarkdown: string, sampleFields: Record<string, string>) =>
  call<{ html: string; text: string }>("/templates/preview", { method: "POST", token, body: { bodyMarkdown, sampleFields } });

/* ---------------- campaigns ---------------- */

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  listId: string;
  status: "draft" | "sending" | "sent" | "failed";
  stats: { total: number; sent: number; failed: number; skipped: number };
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export const listCampaigns = (token: string) => orNull<{ campaigns: Campaign[] }>(call<{ campaigns: Campaign[] }>("/campaigns", { token }));
export const createCampaign = (token: string, c: { name: string; templateId: string; listId: string }) =>
  call<{ campaign: Campaign }>("/campaigns", { method: "POST", token, body: c });
export interface MergeTagReport {
  used: string[];
  /** Used by the template, absent from the list's columns, and with no fallback. */
  missing: string[];
}
export const getCampaign = (token: string, id: string) =>
  orNull<{ campaign: Campaign; mergeTags: MergeTagReport }>(call<{ campaign: Campaign; mergeTags: MergeTagReport }>(`/campaigns/${encodeURIComponent(id)}`, { token }));
export const deleteCampaign = (token: string, id: string) => call<Record<string, never>>(`/campaigns/${encodeURIComponent(id)}`, { method: "DELETE", token });
export const sendCampaign = (token: string, id: string, acknowledgeMissingFields = false) =>
  call<Record<string, never>>(`/campaigns/${encodeURIComponent(id)}/send`, { method: "POST", token, body: { acknowledgeMissingFields } });
export const testCampaign = (token: string, id: string, to: string) =>
  call<{ to: string; sampleContact: string | null; delivered: boolean }>(`/campaigns/${encodeURIComponent(id)}/test`, { method: "POST", token, body: { to } });

/* ---------------- sending readiness and transactional log ---------------- */

export interface ReadinessCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}
export interface Readiness {
  ready: boolean;
  fromDomain: string | null;
  checks: ReadinessCheck[];
}
export const getReadiness = (token: string) => orNull<Readiness>(call<Readiness>("/staff/readiness", { token }));

export interface TransactionalMessage {
  id: string;
  service: string;
  category: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "suppressed";
  error?: string;
  at: string;
}
export const listTransactional = (token: string) =>
  orNull<{ messages: TransactionalMessage[] }>(call<{ messages: TransactionalMessage[] }>("/staff/transactional", { token }));

/* ---------------- unsubscribe (public, no token) ---------------- */

export const getUnsubscribe = (token: string) => orNull<{ email: string; alreadyUnsubscribed: boolean }>(call<{ email: string; alreadyUnsubscribed: boolean }>(`/unsubscribe/${encodeURIComponent(token)}`));
export const confirmUnsubscribe = (token: string) => call<{ email: string }>(`/unsubscribe/${encodeURIComponent(token)}`, { method: "POST" });
