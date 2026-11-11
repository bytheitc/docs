import Link from "next/link";
import { loadSpace, requireUser } from "@/lib/session";
import { fmt } from "@/lib/types";

type Props = { params: Promise<{ space: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: (await params).space };
}

export default async function Overview({ params }: Props) {
  const user = await requireUser();
  const { space: id } = await params;
  const { space, counts, review, inboxNew, recent } = await loadSpace(id);
  const base = `/spaces/${space.id}`;
  const label = (name: string) => space.collections.find((c) => c.name === name)?.singular ?? name;

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">{space.title}</p>
        <h1>Assalāmu ʿalaykum, {user.name.split(" ")[0]}.</h1>
      </header>

      <section className="cms-cards" aria-label="Content">
        {space.collections.map((c) => (
          <Link key={c.name} href={`${base}/c/${c.name}`} className="cms-card">
            <span className="cms-card-n">{counts[c.name]?.total ?? 0}</span>
            <span className="cms-card-label">{c.label}</span>
            <span className="cms-card-sub">{counts[c.name]?.published ?? 0} live</span>
          </Link>
        ))}
        <Link href={`${base}/inbox`} className="cms-card">
          <span className="cms-card-n">{inboxNew}</span>
          <span className="cms-card-label">New in inbox</span>
          <span className="cms-card-sub">form submissions</span>
        </Link>
      </section>

      <div className="cms-two">
        <section className="cms-panel">
          <h2>Waiting for review</h2>
          {review.length ? (
            <ul className="cms-list">
              {review.map((w) => (
                <li key={`${w.collection}/${w.id}`}>
                  <Link href={`${base}/c/${w.collection}/${w.id}`}>{w.title}</Link>
                  <span className="cms-muted"> · {label(w.collection)}{w.pending ? " · changes to a live entry" : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="cms-muted">Nothing is waiting.</p>}
        </section>
        <section className="cms-panel">
          <h2>Recent activity</h2>
          {recent.length ? (
            <ul className="cms-list">
              {recent.map((a, i) => (
                <li key={i}><span className="cms-mono">{a.action}</span> {a.target && <span>{a.target}</span>} <span className="cms-muted">· {a.actor ?? "anonymous"} · {fmt(a.at)}</span></li>
              ))}
            </ul>
          ) : <p className="cms-muted">No activity yet.</p>}
        </section>
      </div>
    </div>
  );
}
