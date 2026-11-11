import { notFound } from "next/navigation";
import { Avatar } from "@/components/portal/Avatar";
import { ContributionItem } from "@/components/portal/ContributionItem";
import { TopBar } from "@/components/portal/TopBar";
import { providerName } from "@/lib/providers";
import { counts } from "@/lib/portal/milestones";
import { getPortalStore } from "@/lib/portal/store";
import { HANDLE, houseName, httpUrl } from "@/lib/portal/util";

type Props = { params: Promise<{ handle: string }> };

async function load(handle: string) {
  const store = getPortalStore();
  if (!store || !HANDLE.test(handle)) return null;
  const c = await store.getContributorByHandle(handle).catch(() => null);
  return c && c.profile.public && !c.disabled ? { c, store } : null;
}

export async function generateMetadata({ params }: Props) {
  const r = await load((await params).handle);
  return r ? { title: r.c.displayName, robots: { index: false } } : { title: "Not found" };
}

export default async function PublicProfile({ params }: Props) {
  const r = await load((await params).handle);
  if (!r) notFound();
  const { c, store } = r;
  const p = c.profile;
  const [accounts, contributions] = await Promise.all([
    p.showAccounts ? store.listAccounts(c.id) : Promise.resolve([]),
    p.showHouses || p.showContributions ? store.listContributions({ contributorId: c.id, limit: 200 }) : Promise.resolve([]),
  ]);
  const visible = contributions.filter(counts);
  const houses = [...new Set(visible.map((x) => x.house))];
  const website = p.website ? httpUrl(p.website) : null;

  return (
    <>
      <TopBar current="contributors" />
      <main id="main" className="wrap" style={{ paddingBottom: 48, display: "grid", gap: 20 }}>
        <header className="profile">
          <Avatar name={c.displayName} url={c.avatarUrl} />
          <div>
            <h1>{c.displayName}</h1>
            {p.bio && <p>{p.bio}</p>}
            {website && <p><a href={website} rel="noopener noreferrer nofollow">{website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></p>}
          </div>
        </header>
        {p.showHouses && houses.length > 0 && (
          <section className="panel" aria-labelledby="houses-h">
            <h2 id="houses-h">Contributes to</h2>
            <ul className="taglist">{houses.map((h) => <li key={h}>{houseName(h)}</li>)}</ul>
          </section>
        )}
        {p.showAccounts && accounts.length > 0 && (
          <section className="panel" aria-labelledby="acc-h">
            <h2 id="acc-h">Elsewhere</h2>
            <ul className="taglist">
              {accounts.map((a) => {
                const u = a.profileUrl ? httpUrl(a.profileUrl) : null;
                return <li key={`${a.provider}:${a.providerUserId}`}>{u ? <a href={u} rel="noopener noreferrer nofollow">{providerName(a.provider)}: {a.username}</a> : `${providerName(a.provider)}: ${a.username}`}</li>;
              })}
            </ul>
          </section>
        )}
        {p.showContributions && visible.length > 0 && (
          <section className="panel" aria-labelledby="recent-h">
            <h2 id="recent-h">Recent contributions</h2>
            <ul className="clist">{visible.slice(0, 10).map((x) => <ContributionItem key={x.id} c={x} />)}</ul>
          </section>
        )}
      </main>
    </>
  );
}
