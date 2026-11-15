// Completes a passkey sign-in and sets this origin's session cookie — the same httpOnly cookie
// every other sign-in path sets, just reached from a client component instead of a redirect.
import { NextRequest, NextResponse } from "next/server";
import { webauthnLoginVerify } from "@/lib/accounts";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { flowId, response } = (await req.json().catch(() => ({}))) as { flowId?: string; response?: unknown };
  if (!flowId || !response) return NextResponse.json({ error: "A WebAuthn response is required." }, { status: 400 });

  const result = await webauthnLoginVerify(flowId, response);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    expires: new Date(result.expiresAt),
  });
  return res;
}
