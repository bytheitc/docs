import Link from "next/link";
import { Avatar } from "@/components/portal/Avatar";
import { TopBar } from "@/components/portal/TopBar";
import { getLanding } from "@/lib/data";
import { getWall } from "@/lib/portal";
import { fmtDate } from "@/lib/util";

export const metadata = { title: "Contributors" };

export default async function Wall({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const byJoin = order === "joined";
  // portal/api returns the wall A–Z; "joined" re-sorts it. Never ordered by volume.
  const people = await getWall();
  const sorted = people && byJoin ? [...people].sort((a, b) => a.joined.localeCompare(b.joined)) : people;
  const copy = await getLanding();

  return (
    <>
      <TopBar current="contributors" />
      <main id="main" className="wrap">
        <header className="page-head">
          <p className="kicker">Contributors wall</p>
          <h1>The people who carry the work</h1>
          <p>{copy.wallIntro}</p>
          {sorted !== null && sorted.length > 1 && (
          <p className="sortbar" aria-label="Order">
            <span className="muted">Order:</span>
            <Link href="/contributors" aria-current={!byJoin ? "true" : undefined}>A–Z</Link>
            <Link href="/contributors?order=joined" aria-current={byJoin ? "true" : undefined}>Joining date</Link>
          </p>
          )}
        </header>
        {sorted === null ? (
          <p className="flash bad" role="alert" style={{ marginBottom: 56 }}>
            The wall couldn&rsquo;t be loaded just now. Please try again in a moment.
          </p>
        ) : sorted.length ? (
          <ul className="wall">
            {sorted.map((p) => (
              <li key={p.handle}>
                <Link href={`/u/${p.handle}`}>
                  <Avatar name={p.name} url={p.avatarUrl ?? undefined} />
                  <span><strong>{p.name}</strong><small>Joined {fmtDate(p.joined)}</small></span>
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
