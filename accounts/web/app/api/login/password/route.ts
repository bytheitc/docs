// Password (+ optional TOTP / recovery code) sign-in. A client component calls this twice when
// two-factor is on: once with just the password (gets `needsTotp`), once more with the code.
import { NextRequest, NextResponse } from "next/server";
import { passwordLogin } from "@/lib/accounts";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { handle?: string; password?: string; code?: string };
  if (!body.handle || !body.password) return NextResponse.json({ error: "A handle and password are required." }, { status: 400 });

  const result = await passwordLogin({ handle: body.handle, password: body.password, code: body.code });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  if (result.needsTotp) return NextResponse.json({ needsTotp: true });
  if (!result.token || !result.expiresAt) return NextResponse.json({ error: "Something went wrong signing you in." }, { status: 502 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    expires: new Date(result.expiresAt),
  });
  return res;
}
