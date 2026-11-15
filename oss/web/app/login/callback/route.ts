// "Sign in with ITC" callback: trades the code for tokens, verifies who it is by calling
// userinfo once (nothing is cached — see lib/session.ts), and sets this origin's session cookie.
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, getUserInfo } from "@/lib/accounts";
import { clearPending, readPending, sameState, STATE_COOKIE } from "@/lib/oauthState";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_CODE = 500;

export async function GET(req: NextRequest) {
  const pending = readPending(req.cookies.get(STATE_COOKIE)?.value);
  const finish = (to: string) => {
    const res = NextResponse.redirect(new URL(to, req.url), 303);
    clearPending(res);
    return res;
  };
  const back = (error: string) => finish(`/?error=${error}`);

  if (req.nextUrl.searchParams.get("error")) return back("signin-denied");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!pending || !sameState(state, pending.s) || !code || code.length > MAX_CODE) return back("signin-state");

  const tokens = await exchangeCode({ code, redirectUri: new URL("/login/callback", req.nextUrl.origin).toString(), codeVerifier: pending.v });
  if (!tokens) return back("signin-exchange");

  // One read to confirm the token is actually good before trusting it with a cookie.
  const me = await getUserInfo(tokens.access_token);
  if (!me) return back("signin-exchange");

  const res = finish("/account");
  res.cookies.set(SESSION_COOKIE, tokens.access_token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    maxAge: tokens.expires_in,
  });
  return res;
}
