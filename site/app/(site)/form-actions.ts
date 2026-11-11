"use server";
// Server actions behind the Collective's public forms. Submissions land in the admin inbox (/admin/inbox).
import { recordSubmission, type SubmitResult } from "@/lib/cms/submit";

/** Name of the hidden honeypot field rendered by every public form. */
const HONEYPOT = "website";

async function record(form: string, fd: FormData, keys: string[]): Promise<SubmitResult> {
  const fields = Object.fromEntries(keys.map((k) => [k, fd.get(k)]));
  return recordSubmission(form, fields, String(fd.get(HONEYPOT) ?? ""));
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
