// Hands the visitor everything portal/api holds about them, as a JSON download (amānah).
import { NextResponse } from "next/server";
import { exportMyData } from "@/lib/portal";
import { currentContributor, sessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const [me, token] = await Promise.all([currentContributor(), sessionToken()]);
  if (!me || !token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const result = await exportMyData(token);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  const { ok: _ok, ...data } = result;
  void _ok;
  const body = {
    note: "Everything the ITC Contributor Portal stores about you. No access tokens are ever stored.",
    ...data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="itc-portal-${me.handle}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
