"use server";
// Public: no staff session. A contact's own unsubscribe token is the only credential this needs.
import { confirmUnsubscribe } from "@/lib/email";

export async function confirmUnsubscribeAction(token: string): Promise<{ ok: boolean; error?: string }> {
  const result = await confirmUnsubscribe(token);
  if (!result.ok) return { ok: false, error: result.message };
  return { ok: true };
}
