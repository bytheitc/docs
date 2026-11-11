"use server";
// Server actions behind the Collective's public forms. Each hands the submission to site/api,
// which forwards it to the CMS inbox (cms/web → space "site" → Inbox).
import { submitForm, type SubmitResult } from "@/lib/api";

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

/** /contact: general message. Form id "contact". */
export async function sendContact(fd: FormData) {
  return record("contact", fd, ["name", "email", "topic", "message"]);
}
