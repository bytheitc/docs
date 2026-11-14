"use server";
// Server actions behind the Collective's public forms. Each hands the submission to site/api,
// which forwards it to the CMS inbox (cms/web → space "site" → Inbox).
import { saveNewsletterPreferences, submitForm, subscribeToNewsletter, type SubmitResult } from "@/lib/api";

/** Name of the hidden honeypot field rendered by every public form. */
const HONEYPOT = "website";

async function record(form: string, fd: FormData, keys: string[]): Promise<SubmitResult> {
  const fields = Object.fromEntries(keys.map((k) => [k, fd.get(k)]));
  return submitForm(form, fields, String(fd.get(HONEYPOT) ?? ""));
}

/** /join: expression of interest. Form id "join". */
export async function sendJoin(fd: FormData) {
  return record("join", fd, ["way", "name", "email", "house", "message"]);
}

/** Home page: invitation request. Form id "invite". */
export async function sendInvite(fd: FormData) {
  return record("invite", fd, ["email"]);
}

/** /rfps/[slug]: a proposal against a published brief. Form id "rfp-proposal". */
export async function sendProposal(fd: FormData) {
  return record("rfp-proposal", fd, ["rfp", "name", "organisation", "email", "links", "approach", "availability"]);
}

/** /suggest: what the Collective should build. Form id "suggestion". */
export async function sendSuggestion(fd: FormData) {
  return record("suggestion", fd, ["area", "who", "today", "change", "existing", "name", "email"]);
}

/** /contact: general message. Form id "contact". */
export async function sendContact(fd: FormData) {
  return record("contact", fd, ["name", "email", "topic", "message"]);
}

/** /products/[slug]: a review, held for a steward to publish. Form id "product-review". */
export async function sendProductReview(fd: FormData) {
  return record("product-review", fd, ["product", "name", "rating", "body"]);
}

/* ---------------- Newsletter ---------------- */

/** Double opt-in: this only ever asks the api to send one confirmation email. */
export async function subscribe(fd: FormData) {
  const email = String(fd.get("email") ?? "").trim();
  const lists = fd.getAll("lists").map(String);
  const result = await subscribeToNewsletter(email, lists, String(fd.get(HONEYPOT) ?? ""));
  return result.ok ? { ok: true as const } : { ok: false as const, message: result.message, errors: result.errors };
}

/** Changes which lists an unsubscribe token is on. An empty list unsubscribes. */
export async function savePreferences(token: string, lists: string[]) {
  const result = await saveNewsletterPreferences(token, lists);
  return result.ok ? { ok: true as const, status: result.status, lists: result.lists } : { ok: false as const, message: result.message };
}
