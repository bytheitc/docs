"use server";
// Staff-facing server actions: signing in and out, and the list/template/campaign CRUD every
// dashboard page calls into. Each one re-checks requireStaff() itself — a page is never trusted
// just because it rendered; the action re-reads the cookie every time.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/email";
import { clearStaffCookie, requireStaff, setStaffCookie } from "@/lib/staff-session";
import { safeNext } from "@/lib/util";

export interface FormState {
  error?: string;
  message?: string;
}

export async function signInStaff(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(String(fd.get("next") ?? ""), "/staff/lists");
  const result = await api.staffLogin(email, password);
  if (!result.ok) return { error: result.message };
  await setStaffCookie(result.token, result.expiresAt);
  redirect(next);
}

export async function signOutStaff() {
  await clearStaffCookie();
  redirect("/staff/sign-in");
}

/* ---------------- lists ---------------- */

export async function createListAction(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Give the list a name." };
  const result = await api.createList(token, name);
  if (!result.ok) return { error: result.message };
  revalidatePath("/staff/lists");
  redirect(`/staff/lists/${result.list.id}`);
}

export async function deleteListAction(fd: FormData) {
  const { token } = await requireStaff();
  await api.deleteList(token, String(fd.get("id") ?? ""));
  revalidatePath("/staff/lists");
  redirect("/staff/lists");
}

export async function uploadCsvAction(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  const listId = String(fd.get("listId") ?? "");
  const file = fd.get("csv");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file first." };
  const csv = await file.text();
  const result = await api.uploadCsv(token, listId, csv);
  if (!result.ok) return { error: result.message };
  revalidatePath(`/staff/lists/${listId}`);
  const skipped = result.skippedInvalid + result.skippedSuppressed + result.skippedDuplicate;
  return { message: `Added ${result.inserted} contact(s).${skipped ? ` Skipped ${skipped}.` : ""}` };
}

/* ---------------- templates ---------------- */

// What a new template opens with, so the editor isn't blank and the merge-tag syntax is shown once.
const STARTER_BODY = `Assalamu alaikum {{first_name|friend}},

Write your message here. Markdown works: **bold**, *italic*, [links](https://example.org), and lists.

— The ITC team
`;

export async function createTemplateAction(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  const name = String(fd.get("name") ?? "").trim();
  const subject = String(fd.get("subject") ?? "").trim();
  if (!name || !subject) return { error: "A name and a subject are both required." };
  const result = await api.createTemplate(token, { name, subject, bodyMarkdown: STARTER_BODY });
  if (!result.ok) return { error: result.message };
  revalidatePath("/staff/templates");
  redirect(`/staff/templates/${result.template.id}`);
}

export async function updateTemplateAction(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  const id = String(fd.get("id") ?? "");
  const result = await api.updateTemplate(token, id, {
    name: String(fd.get("name") ?? ""),
    subject: String(fd.get("subject") ?? ""),
    bodyMarkdown: String(fd.get("bodyMarkdown") ?? ""),
  });
  if (!result.ok) return { error: result.message };
  revalidatePath(`/staff/templates/${id}`);
  return { message: "Saved." };
}

export async function previewTemplateAction(bodyMarkdown: string, sampleFieldsJson: string): Promise<{ html?: string; text?: string; error?: string }> {
  const { token } = await requireStaff();
  let sampleFields: Record<string, string> = {};
  try {
    const parsed = sampleFieldsJson.trim() ? JSON.parse(sampleFieldsJson) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) sampleFields = parsed as Record<string, string>;
  } catch {
    return { error: "Sample fields must be valid JSON, e.g. {\"first_name\": \"Amina\"}." };
  }
  const result = await api.previewTemplate(token, bodyMarkdown, sampleFields);
  if (!result.ok) return { error: result.message };
  return { html: result.html, text: result.text };
}

export async function deleteTemplateAction(fd: FormData) {
  const { token } = await requireStaff();
  await api.deleteTemplate(token, String(fd.get("id") ?? ""));
  revalidatePath("/staff/templates");
  redirect("/staff/templates");
}

/* ---------------- campaigns ---------------- */

export async function createCampaignAction(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  const name = String(fd.get("name") ?? "").trim();
  const templateId = String(fd.get("templateId") ?? "");
  const listId = String(fd.get("listId") ?? "");
  if (!name || !templateId || !listId) return { error: "Name, template and list are all required." };
  const result = await api.createCampaign(token, { name, templateId, listId });
  if (!result.ok) return { error: result.message };
  revalidatePath("/staff/campaigns");
  redirect(`/staff/campaigns/${result.campaign.id}`);
}

export async function deleteCampaignAction(fd: FormData) {
  const { token } = await requireStaff();
  await api.deleteCampaign(token, String(fd.get("id") ?? ""));
  revalidatePath("/staff/campaigns");
  redirect("/staff/campaigns");
}

export async function sendCampaignAction(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  const id = String(fd.get("id") ?? "");
  const result = await api.sendCampaign(token, id, fd.get("acknowledgeMissingFields") === "on");
  if (!result.ok) return { error: result.message };
  revalidatePath(`/staff/campaigns/${id}`);
  return { message: "Sending." };
}

export async function testCampaignAction(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  const id = String(fd.get("id") ?? "");
  const to = String(fd.get("to") ?? "").trim();
  const result = await api.testCampaign(token, id, to);
  if (!result.ok) return { error: result.message };
  const sample = result.sampleContact ? ` using ${result.sampleContact}'s fields` : " with no contact fields (the list is empty)";
  return {
    message: result.delivered
      ? `Test sent to ${result.to}${sample}.`
      : `Rendered for ${result.to}${sample}, but the mail provider is "log", so it was only written to the api's log.`,
  };
}

/** Polled by the client while a campaign is sending, so the stats move without a page reload. */
export async function getCampaignStatusAction(id: string): Promise<api.Campaign | null> {
  const { token } = await requireStaff();
  return (await api.getCampaign(token, id))?.campaign ?? null;
}
