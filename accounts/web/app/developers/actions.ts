"use server";
// Self-service app management. Each one carries this browser's session token to accounts/api,
// which re-checks ownership and every rule (redirect_uri shape, the review gate) itself — this
// side only shapes the answer for the UI.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/accounts";
import { sessionToken } from "@/lib/session";
import type { PartnerApp } from "@/lib/accounts";

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  client?: PartnerApp;
  secret?: string;
}

const lines = (fd: FormData, k: string) => String(fd.get(k) ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
const s = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

async function requireToken(): Promise<string> {
  const token = await sessionToken();
  if (!token) redirect("/sign-in?next=/developers");
  return token;
}

export async function registerApp(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = await requireToken();
  const type = fd.get("type") === "confidential" ? "confidential" : "public";
  const scopes = fd.getAll("scopes").map(String);
  const result = await api.registerApp(token, {
    name: s(fd, "name", 80),
    homepage: s(fd, "homepage") || undefined,
    type,
    redirectUris: lines(fd, "redirectUris"),
    scopes,
  });
  if (!result.ok) return { errors: result.errors, message: result.message };
  revalidatePath("/developers");
  return {
    ok: true,
    client: result.client,
    secret: result.secret,
    message: result.client.status === "approved" ? "Registered and ready to use." : "Registered. This app needs staff review before it can sign anyone in.",
  };
}

export async function updateApp(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const token = await requireToken();
  const result = await api.updateApp(token, clientId, {
    name: s(fd, "name", 80),
    homepage: s(fd, "homepage") || undefined,
    redirectUris: lines(fd, "redirectUris"),
  });
  if (!result.ok) return { errors: result.errors, message: result.message };
  revalidatePath(`/developers/${clientId}`);
  return { ok: true, client: result.app, message: "Saved." };
}

export async function regenerateSecret(clientId: string): Promise<ActionState> {
  const token = await requireToken();
  const result = await api.regenerateAppSecret(token, clientId);
  if (!result.ok) return { message: result.message };
  return { ok: true, secret: result.secret, message: "New secret. The old one stopped working immediately." };
}

export async function deleteApp(fd: FormData) {
  const token = await requireToken();
  await api.deleteApp(token, String(fd.get("clientId") ?? ""));
  revalidatePath("/developers");
  redirect("/developers");
}
