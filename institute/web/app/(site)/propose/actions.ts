"use server";

import { submitForm, type SubmitResult } from "@/lib/api";

const FIELDS = ["name", "email", "role", "centerName", "arabic", "translit", "area", "question", "summary", "firstYear", "people", "consent"] as const;

/** Sends a center proposal to the Institute Studio inbox (form id "center-proposal"). */
export async function submitProposal(formData: FormData): Promise<SubmitResult> {
  const fields: Record<string, string> = {};
  for (const k of FIELDS) {
    const v = formData.get(k);
    if (typeof v === "string") fields[k] = v;
  }
  if (!fields.name?.trim() || !fields.email?.trim() || !fields.centerName?.trim() || !fields.question?.trim() || !fields.summary?.trim()) {
    return { ok: false, reason: "invalid" };
  }
  const honeypot = formData.get("website");
  return submitForm("center-proposal", fields, typeof honeypot === "string" ? honeypot : undefined);
}
