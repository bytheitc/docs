// Verifies the browser's WebAuthn registration response and stores the new passkey, by way of
// accounts/api. See options/route.ts for why this proxy exists.
import { NextRequest, NextResponse } from "next/server";
import { webauthnRegisterVerify } from "@/lib/accounts";
import { sessionToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = await sessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { response, name } = (await req.json().catch(() => ({}))) as { response?: unknown; name?: string };
  if (!response) return NextResponse.json({ error: "A WebAuthn response is required." }, { status: 400 });
  const result = await webauthnRegisterVerify(token, response, (name ?? "Passkey").slice(0, 60));
  if (!result.ok) return NextResponse.json({ error: result.message, errors: result.errors }, { status: result.status });
  return NextResponse.json(result.credential);
}
