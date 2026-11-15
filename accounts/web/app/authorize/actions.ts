"use server";
// The person approves. A plain form post, not a closure over the request: the session token is
// read from this browser's own cookie, never from a hidden field, and the authorize parameters
// travel as hidden inputs exactly as the client sent them (accounts/api re-validates all of it).
import { redirect } from "next/navigation";
import { approveAuthorize } from "@/lib/accounts";
import { sessionToken } from "@/lib/session";

const FIELD = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === "string" && v ? v : undefined; };

export async function approveConsent(fd: FormData) {
  const token = await sessionToken();
  if (!token) redirect("/sign-in");

  const clientId = FIELD(fd, "client_id") ?? "";
  const redirectUri = FIELD(fd, "redirect_uri") ?? "";
  const back = `/authorize?${new URLSearchParams(
    Object.fromEntries(["client_id", "redirect_uri", "response_type", "scope", "state", "nonce", "code_challenge", "code_challenge_method"]
      .map((k) => [k, FIELD(fd, k)]).filter(([, v]) => v) as [string, string][]),
  ).toString()}`;

  const result = await approveAuthorize(
    {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: FIELD(fd, "response_type") ?? "code",
      scope: FIELD(fd, "scope") ?? "openid",
      state: FIELD(fd, "state"),
      nonce: FIELD(fd, "nonce"),
      code_challenge: FIELD(fd, "code_challenge") ?? "",
      code_challenge_method: FIELD(fd, "code_challenge_method") ?? "S256",
    },
    token,
  );

  if (!result.ok) redirect(back);
  redirect(result.redirectTo);
}
