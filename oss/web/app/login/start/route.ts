// Starts "Sign in with ITC." This origin owns the redirect URI and the short-lived state/PKCE
// cookie; accounts/api holds everything else.
import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizeUrl, createPkcePair, randomToken } from "@/lib/accounts";
import { setPending } from "@/lib/oauthState";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const redirectUri = new URL("/login/callback", req.nextUrl.origin).toString();
  const { verifier, challenge } = await createPkcePair();
  const state = randomToken();

  let url: string;
  try {
    url = await buildAuthorizeUrl({ redirectUri, state, codeChallenge: challenge });
  } catch (e) {
    console.error(`[web] accounts discovery failed: ${(e as Error).message}`);
    return NextResponse.redirect(new URL("/?error=signin-unavailable", req.url), 303);
  }

  const res = NextResponse.redirect(url, 303);
  setPending(res, { s: state, v: verifier });
  return res;
}
