"use server";
// Server action behind the Register interest form on /collaborate. Submissions land in the admin inbox.
import { submitForm, type SubmitResult } from "@/lib/api";

export interface InterestFields {
  name: string;
  email: string;
  role: string;
  interests: string[];
  note: string;
}

export async function sendInterest(fields: InterestFields, honeypot: string): Promise<SubmitResult> {
  const f = fields ?? ({} as InterestFields);
  const interests = Array.isArray(f.interests) ? f.interests.map(String).join(", ") : "";
  return submitForm(
    "interest",
    { name: f.name, email: f.email, role: f.role, interests, note: f.note },
    typeof honeypot === "string" ? honeypot : "",
  );
}
