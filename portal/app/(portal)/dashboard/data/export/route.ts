// Exports everything the portal holds about the signed-in contributor, as JSON.
import { NextResponse } from "next/server";
import { currentContributor } from "@/lib/portal/session";
import { requirePortalStore } from "@/lib/portal/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentContributor();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const store = requirePortalStore();
  const [accounts, contributions, claims] = await Promise.all([
    store.listAccounts(me.id),
    store.listContributions({ contributorId: me.id, includeHidden: true, limit: 100000 }),
    store.listClaims({ contributorId: me.id }),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    note: "Everything the ITC Contributor Portal stores about you. No access tokens are ever stored.",
    contributor: me,
    linkedAccounts: accounts.map(({ contributorId: _c, ...a }) => (void _c, a)),
    contributions: contributions.map(({ contributorId: _c, ...c }) => (void _c, c)),
    claims: claims.map(({ contributorId: _c, ...c }) => (void _c, c)),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="itc-portal-${me.handle}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
