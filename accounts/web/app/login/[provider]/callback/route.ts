// Federated-login callback. The code goes to accounts/api, which proxies portal/api's exchange,
// reads the contributor once and discards that portal token. What comes back is this web's own
// ITC-account session token.
import { NextResponse, type NextRequest } from "next/server";
import { completeLogin } from "@/lib/accounts";
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

  const result = await completeLogin({
    provider, code, redirectUri: new URL(`/login/${provider}/callback`, req.nextUrl.origin).toString(),
    verifier: pending.v, next: pending.n,
  });

  if (!result.ok) {
    if (result.status === 429) return back("rate");
    if (result.status === 403) return back("disabled");
    return back(result.status === 502 ? "exchange" : "provider");
  }

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
