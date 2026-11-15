// Proxies accounts/api's passkey-registration options, forwarding this browser's session cookie
// as a bearer. The client component never holds that token — only this server-side route does.
import { NextResponse } from "next/server";
import { webauthnRegisterOptions } from "@/lib/accounts";
import { sessionToken } from "@/lib/session";

export async function POST() {
  const token = await sessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await webauthnRegisterOptions(token);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.options);
}
