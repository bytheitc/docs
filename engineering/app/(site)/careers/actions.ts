"use server";

import { recordSubmission } from "@/lib/cms/submit";

export type ApplyState = {
  status: "idle" | "sent" | "invalid" | "unavailable";
  errors?: Partial<Record<"name" | "email" | "message", string>>;
  values?: Record<string, string>;
};

const FIELDS = ["name", "email", "role", "links", "message"] as const;

// Careers application: recorded in the admin inbox under the "careers-apply" form.
export async function submitApplication(_prev: ApplyState, fd: FormData): Promise<ApplyState> {
  const values: Record<string, string> = {};
  for (const k of FIELDS) values[k] = String(fd.get(k) ?? "").trim();

  const errors: ApplyState["errors"] = {};
  if (!values.name) errors.name = "Please tell us your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Please give an email address we can reply to.";
  if (!values.message) errors.message = "Please write a short note.";
  if (Object.keys(errors).length) return { status: "invalid", errors, values };

  const res = await recordSubmission("careers-apply", values, String(fd.get("website") ?? ""));
  if (res.ok) return { status: "sent" };
  return { status: "unavailable", values };
}
