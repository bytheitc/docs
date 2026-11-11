import Link from "next/link";
import { Avatar } from "@/components/portal/Avatar";
import { TopBar } from "@/components/portal/TopBar";
import { getLanding } from "@/lib/data";
import { getPortalStore } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/util";

export const metadata = { title: "Contributors" };

export default async function Wall({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const byJoin = order === "joined";
  const store = getPortalStore();
  const people = store ? await store.listContributors({ publicWall: true }).catch(() => []) : [];
  // Never ordered by volume: alphabetical, or by the date someone joined.
  const sorted = byJoin ? people : [...people].sort((a, b) => a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" }));
  const copy = await getLanding();

  return (
    <>
      <TopBar current="contributors" />
      <main id="main" className="wrap">
        <header className="page-head">
          <p className="kicker">Contributors wall</p>
          <h1>The people who carry the work</h1>
          <p>{copy.wallIntro}</p>
          <p className="sortbar" aria-label="Order">
            <span className="muted">Order:</span>
            <Link href="/contributors" aria-current={!byJoin ? "true" : undefined}>A–Z</Link>
            <Link href="/contributors?order=joined" aria-current={byJoin ? "true" : undefined}>Joining date</Link>
          </p>
        </header>
        {sorted.length ? (
          <ul className="wall">
            {sorted.map((p) => (
              <li key={p.id}>
                <Link href={`/u/${p.handle}`}>
                  <Avatar name={p.displayName} url={p.avatarUrl} />
                  <span><strong>{p.displayName}</strong><small>Joined {fmtDate(p.createdAt)}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty" style={{ paddingBottom: 56 }}>No one has chosen to be listed yet.</p>
        )}
      </main>
    </>
  );
}
