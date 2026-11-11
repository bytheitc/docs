// Records a public form submission in the inbox. Identical in every app.
// Call it from a server action behind a public form. It never throws at the visitor.
import { randomUUID } from "node:crypto";
import { getStorage } from "@/lib/cms/storage";

const MAX_FIELDS = 30;
const MAX_LEN = 5000;

export type SubmitResult = { ok: true } | { ok: false; reason: "no-database" | "invalid" | "error" };

/**
 * `honeypot` is the value of a visually hidden field that people never fill in; bots often do.
 * Such submissions are accepted silently and dropped.
 */
export async function recordSubmission(form: string, fields: Record<string, unknown>, honeypot?: string): Promise<SubmitResult> {
  if (honeypot) return { ok: true };
  const store = getStorage();
  if (!store) return { ok: false, reason: "no-database" };

  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields).slice(0, MAX_FIELDS)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,40}$/.test(k)) continue;
    const val = (typeof v === "string" ? v : v == null ? "" : String(v)).trim().slice(0, MAX_LEN);
    if (val) data[k] = val;
  }
  if (!Object.keys(data).length) return { ok: false, reason: "invalid" };

  try {
    const now = new Date();
    await store.addSubmission({ id: randomUUID(), form, data, status: "new", createdAt: now, updatedAt: now });
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
