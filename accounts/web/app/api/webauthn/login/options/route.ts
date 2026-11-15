// Starts a passkey sign-in: no identifier needed, the browser offers whichever discoverable
// passkey it has for this site.
import { NextResponse } from "next/server";
import { webauthnLoginOptions } from "@/lib/accounts";

export async function POST() {
  const result = await webauthnLoginOptions();
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result);
}
