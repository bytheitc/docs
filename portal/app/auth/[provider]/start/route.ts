// Starts sign-in (or linking, when already signed in) with a provider: random state + PKCE, then redirect.
import { NextResponse, type NextRequest } from "next/server";
import { DEV_PROVIDER_ENABLED, usableProvider } from "@/lib/providers";
import { DEV_USERNAME } from "@/lib/providers/dev";
import { authorizeUrl, randomToken } from "@/lib/providers/oauth";
import { safeNext } from "@/lib/portal/accounts";
import { setPending } from "@/lib/portal/oauthState";
import { clientIp, rateLimit } from "@/lib/portal/ratelimit";
import { getPortalStore } from "@/lib/portal/store";
import { origin } from "@/lib/portal/util";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const back = (error: string) => NextResponse.redirect(new URL(`/sign-in?error=${error}`, req.url), 303);
  if (!rateLimit(`auth:${clientIp(req.headers)}`, 30)) return back("rate");
  if (provider === "dev" && !DEV_PROVIDER_ENABLED) return new NextResponse("Not found", { status: 404 });
  const adapter = usableProvider(provider);
  if (!adapter) return back("provider");
  if (!getPortalStore()) return back("no-database");

  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const state = randomToken(24);
  const verifier = randomToken(48);
  const base = origin(req.url);
  let res: NextResponse;

  if (adapter.id === "dev") {
    const user = req.nextUrl.searchParams.get("user") || "dev-contributor";
    if (!DEV_USERNAME.test(user)) return back("provider");
    res = NextResponse.redirect(`${base}/auth/dev/callback?code=${encodeURIComponent(user)}&state=${state}`, 303);
  } else {
    const cfg = adapter.oauth(process.env as Record<string, string | undefined>);
    if (!cfg) return back("provider");
    res = NextResponse.redirect(authorizeUrl(cfg, `${base}/auth/${adapter.id}/callback`, state, cfg.pkce ? verifier : null), 303);
  }
  setPending(res, { s: state, v: verifier, p: adapter.id, n: next });
  return res;
}
