// Starts sign-in (or linking, when already signed in) with a provider.
//
// This origin owns the redirect URI and the short-lived state cookie; portal/api builds the authorize
// URL, because it is the only side that holds the client id and secret.
import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/portal";
import { setPending } from "@/lib/oauthState";
import { safeNext } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const back = (error: string) => NextResponse.redirect(new URL(`/sign-in?error=${error}`, req.url), 303);

  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const redirectUri = new URL(`/auth/${provider}/callback`, req.nextUrl.origin).toString();
  const user = req.nextUrl.searchParams.get("user") ?? undefined;

  const result = await authorize({ provider, next, redirectUri, ...(user ? { user } : {}) });
  if (!result.ok) return back(result.status === 429 ? "rate" : result.status === 503 ? "unavailable" : "provider");

  const res = NextResponse.redirect(result.url, 303);
  setPending(res, { s: result.state, v: result.verifier, p: result.provider, n: result.next });
  return res;
}
