import { notFound } from "next/navigation";
import { Avatar } from "@/components/portal/Avatar";
import { ContributionItem } from "@/components/portal/ContributionItem";
import { TopBar } from "@/components/portal/TopBar";
import { getPublicProfile } from "@/lib/portal";
import { HANDLE, fmtDate, houseName, httpUrl, providerName } from "@/lib/util";

type Props = { params: Promise<{ handle: string }> };

// portal/api decides what is public: it sends a list only for the switches this person turned on.
const load = async (handle: string) => (HANDLE.test(handle) ? await getPublicProfile(handle) : null);

export async function generateMetadata({ params }: Props) {
  const r = await load((await params).handle);
  return r ? { title: r.contributor.name, robots: { index: false } } : { title: "Not found" };
}

export default async function PublicProfile({ params }: Props) {
  const r = await load((await params).handle);
  if (!r) notFound();
  const c = r.contributor;
  const { houses, accounts, contributions } = r;
  const website = c.website ? httpUrl(c.website) : null;

  return (
    <>
      <TopBar current="contributors" />
      <main id="main" className="wrap" style={{ paddingBottom: 48, display: "grid", gap: 20 }}>
        <header className="profile">
          <Avatar name={c.name} url={c.avatarUrl ?? undefined} />
          <div>
            <h1>{c.name}</h1>
            {/* Everything below the name is optional, and most of it is switched off by default.
                The handle and the joining date are the two facts being listed at all implies, so
                a profile is never just a name on an empty page. */}
            <p className="profile-meta">@{c.handle} · Contributing since {fmtDate(c.joined)}</p>
            {c.bio && <p>{c.bio}</p>}
            {website && <p><a href={website} rel="noopener noreferrer nofollow">{website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></p>}
          </div>
        </header>
        {houses && houses.length > 0 && (
          <section className="panel" aria-labelledby="houses-h">
            <h2 id="houses-h">Contributes to</h2>
            <ul className="taglist">{houses.map((h) => <li key={h}>{houseName(h)}</li>)}</ul>
          </section>
        )}
        {accounts && accounts.length > 0 && (
          <section className="panel" aria-labelledby="acc-h">
            <h2 id="acc-h">Elsewhere</h2>
            <ul className="taglist">
              {accounts.map((a) => {
                const u = a.profileUrl ? httpUrl(a.profileUrl) : null;
                return <li key={`${a.provider}:${a.username}`}>{u ? <a href={u} rel="noopener noreferrer nofollow">{providerName(a.provider)}: {a.username}</a> : `${providerName(a.provider)}: ${a.username}`}</li>;
              })}
            </ul>
          </section>
        )}
        {contributions && contributions.length > 0 && (
          <section className="panel" aria-labelledby="recent-h">
            <h2 id="recent-h">Recent contributions</h2>
            <ul className="clist">{contributions.slice(0, 10).map((x) => <ContributionItem key={x.id} c={{ ...x, url: x.url ?? undefined, repo: x.repo ?? undefined }} />)}</ul>
          </section>
        )}
      </main>
    </>
  );
}
