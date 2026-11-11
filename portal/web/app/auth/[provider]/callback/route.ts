// OAuth callback. The code goes straight to portal/api, which exchanges it, reads the profile and
// discards the access token. What comes back is a session token for this origin's cookie — or, when
// the visitor was linking rather than signing in, no token at all.
import { NextResponse, type NextRequest } from "next/server";
import { completeSignIn } from "@/lib/portal";
import { clearPending, readPending, sameState, STATE_COOKIE } from "@/lib/oauthState";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_CODE = 2000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const pending = readPending(req.cookies.get(STATE_COOKIE)?.value);
  const finish = (to: string) => {
    const res = NextResponse.redirect(new URL(to, req.url), 303);
    clearPending(res);
    return res;
  };
  const back = (error: string) => finish(`/sign-in?error=${error}`);

  if (req.nextUrl.searchParams.get("error")) return back("denied");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!pending || pending.p !== provider || !sameState(state, pending.s) || !code || code.length > MAX_CODE) return back("state");

  const result = await completeSignIn(
    { provider, code, redirectUri: new URL(`/auth/${provider}/callback`, req.nextUrl.origin).toString(), verifier: pending.v, next: pending.n },
    req.cookies.get(SESSION_COOKIE)?.value ?? null,
  );

  if (!result.ok) {
    if (result.status === 409) return finish("/dashboard/connections?error=taken");
    if (result.status === 429) return back("rate");
    return back(result.status === 502 ? "exchange" : "provider");
  }
  if (result.error === "disabled") return back("disabled");

  const res = finish(result.to);
  // A new session: the token lives in this origin's httpOnly cookie, never in the api's response to a browser.
  if (result.token && result.expiresAt) {
    res.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
      expires: new Date(result.expiresAt),
    });
  }
  return res;
}
