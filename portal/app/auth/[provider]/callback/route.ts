// OAuth callback: verify state, exchange the code, read the profile, discard the token, then sign in or link.
import { NextResponse, type NextRequest } from "next/server";
import { DEV_PROVIDER_ENABLED, usableProvider } from "@/lib/providers";
import { exchangeCode } from "@/lib/providers/oauth";
import type { ProviderProfile } from "@/lib/providers/types";
import { signInOrLink } from "@/lib/portal/accounts";
import { clearPending, readPending, sameState, STATE_COOKIE } from "@/lib/portal/oauthState";
import { clientIp, rateLimit } from "@/lib/portal/ratelimit";
import { getPortalStore } from "@/lib/portal/store";
import { origin } from "@/lib/portal/util";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const pending = readPending(req.cookies.get(STATE_COOKIE)?.value);
  const finish = (to: string) => {
    const res = NextResponse.redirect(new URL(to, req.url), 303);
    clearPending(res);
    return res;
  };
  const back = (error: string) => finish(`/sign-in?error=${error}`);

  if (!rateLimit(`auth:${clientIp(req.headers)}`, 30)) return back("rate");
  if (provider === "dev" && !DEV_PROVIDER_ENABLED) return new NextResponse("Not found", { status: 404 });
  const adapter = usableProvider(provider);
  if (!adapter) return back("provider");
  if (!getPortalStore()) return back("no-database");
  if (req.nextUrl.searchParams.get("error")) return back("denied");

  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!pending || pending.p !== adapter.id || !sameState(state, pending.s) || !code || code.length > 2000) return back("state");

  let profile: ProviderProfile;
  try {
    if (adapter.id === "dev") {
      profile = await adapter.profile({ dev_user: code }, { fetch, env: {} });
    } else {
      const cfg = adapter.oauth(process.env as Record<string, string | undefined>);
      if (!cfg) return back("provider");
      // The token lives only inside this block: used once for the profile, never stored or logged.
      const token = await exchangeCode(fetch, cfg, code, `${origin(req.url)}/auth/${adapter.id}/callback`, cfg.pkce ? pending.v : null);
      profile = await adapter.profile(token, { fetch, env: process.env as Record<string, string | undefined> });
    }
  } catch {
    return back("exchange");
  }

  const result = await signInOrLink(adapter.id, profile, pending.n);
  if (!result.ok) return result.error === "taken" ? finish("/dashboard/connections?error=taken") : back(result.error);
  return finish(result.to);
}
