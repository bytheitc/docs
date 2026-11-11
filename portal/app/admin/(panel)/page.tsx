import Link from "next/link";
import { COLLECTIONS } from "@/lib/cms/collections";
import { ensureSeeded } from "@/lib/cms/content";
import { requireUser } from "@/lib/cms/auth";
import { requireStorage } from "@/lib/cms/storage";
import { CMS_CONFIG } from "@/lib/cms/config";

export const metadata = { title: "Overview" };

export default async function Overview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const store = requireStorage();
  await Promise.all(COLLECTIONS.map(ensureSeeded));

  const counts = await Promise.all(
    COLLECTIONS.map(async (c) => {
      const all = await store.listEntries(c.name);
      return {
        def: c,
        total: all.length,
        published: all.filter((e) => e.status === "published").length,
        waiting: all.filter((e) => e.status === "review" || e.pending).map((e) => ({ id: e.id, title: String(e.data[c.titleField] ?? e.id), pending: !!e.pending })),
      };
    }),
  );
  const waiting = counts.flatMap((c) => c.waiting.map((w) => ({ ...w, collection: c.def })));
  const newSubs = await store.countSubmissions({ status: "new" });
  const recent = await store.listAudit(8);

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">{CMS_CONFIG.title}</p>
        <h1>Assalāmu ʿalaykum, {user.name.split(" ")[0]}.</h1>
      </header>

      {denied && <p className="cms-flash bad" role="alert">That page needs the {denied} role. Ask an admin if you need access.</p>}

      <section className="cms-cards" aria-label="Content">
        {counts.map((c) => (
          <Link key={c.def.name} href={`/admin/c/${c.def.name}`} className="cms-card">
            <span className="cms-card-n">{c.total}</span>
            <span className="cms-card-label">{c.def.label}</span>
            <span className="cms-card-sub">{c.published} live</span>
          </Link>
        ))}
        <Link href="/admin/inbox" className="cms-card">
          <span className="cms-card-n">{newSubs}</span>
          <span className="cms-card-label">New in inbox</span>
          <span className="cms-card-sub">form submissions</span>
        </Link>
      </section>

      <div className="cms-two">
        <section className="cms-panel">
          <h2>Waiting for review</h2>
          {waiting.length ? (
            <ul className="cms-list">
              {waiting.map((w) => (
                <li key={`${w.collection.name}/${w.id}`}>
                  <Link href={`/admin/c/${w.collection.name}/${w.id}`}>{w.title}</Link>
                  <span className="cms-muted"> · {w.collection.singular}{w.pending ? " · changes to a live entry" : ""}</span>
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
                <li key={i}><span className="cms-mono">{a.action}</span> {a.target && <span>{a.target}</span>} <span className="cms-muted">· {a.actor ?? "anonymous"} · {a.at.toLocaleString("en-GB")}</span></li>
              ))}
            </ul>
          ) : <p className="cms-muted">No activity yet.</p>}
        </section>
      </div>
    </div>
  );
}
