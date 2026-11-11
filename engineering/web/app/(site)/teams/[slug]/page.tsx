import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIndex } from "@/components/PageIndex";
import { Chip, PageHead, Pager, Section } from "@/components/Sheet";
import { getChapters, getPlatforms, getRoles, getTeam, getTeams } from "@/lib/data";
import { platformsOwnedBy } from "@/lib/platforms";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getTeams()).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTeam(slug);
  if (!t) return { title: "Sheet not found" };
  return { title: `${t.name} · Teams`, description: t.mission };
}

const SECTIONS = [
  { id: "scope", num: "05.1", label: "Scope" },
  { id: "owns", num: "05.2", label: "Owned platforms" },
  { id: "reach", num: "05.3", label: "How to reach us" },
  { id: "rhythm", num: "05.4", label: "Working rhythm" },
];

export default async function TeamSheet({ params }: Props) {
  const { slug } = await params;
  const t = await getTeam(slug);
  if (!t) notFound();
  const [teams, platforms, allChapters, allRoles] = await Promise.all([getTeams(), getPlatforms(), getChapters(), getRoles()]);
  const owned = platformsOwnedBy(platforms, t.slug);
  const chapters = allChapters.filter((c) => c.owner === t.slug);
  const roles = allRoles.filter((r) => r.team === t.slug);
  const i = teams.findIndex((x) => x.slug === t.slug);
  const prev = i > 0 ? teams[i - 1] : undefined;
  const next = i >= 0 ? teams[i + 1] : undefined;

  return (
    <>
      <PageIndex sections={SECTIONS} />
      <PageHead
        trail={[{ label: "Teams", href: "/teams" }, { label: t.code }]}
        sheet={`Sheet 05 · Team ${t.code}`}
        title={t.name}
        lede={t.mission}
        block={[
          ["Code", <span key="c" className="team-code mono">{t.code}</span>],
          ["Platforms", String(owned.length)],
          ["Chapters", String(chapters.length)],
          ["Open roles", roles.length ? <Link key="r" href="/careers" className="u">{roles.length} →</Link> : "—"],
        ]}
      />

      <Section id="scope" num="05.1" title="Scope">
        <div className="two-col">
          <div>
            <p className="cell-k mono">In scope</p>
            <ul className="pl">{t.scope.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <p className="cell-k mono">Not in scope</p>
            <ul className="pl minus">{t.notScope.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
      </Section>

      <Section id="owns" num="05.2" title="Owned platforms">
        {owned.length ? (
          <div className="table-wrap">
            <table className="spec">
              <thead><tr><th>ID</th><th>Platform</th><th>Purpose</th><th>Status</th></tr></thead>
              <tbody>
                {owned.map((p) => (
                  <tr key={p.slug}>
                    <td className="mono">{p.id}</td>
                    <td className="strong"><Link href={`/platforms/${p.slug}`} className="row-link">{p.name}</Link></td>
                    <td>{p.purpose}</td>
                    <td><Chip kind={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">This team owns no platform directly; it supports all of them.</p>
        )}
        {chapters.length > 0 && (
          <p className="after mono">
            Handbook chapters owned:{" "}
            {chapters.map((c, k) => <span key={c.slug}>{k > 0 && ", "}<Link href={`/handbook/${c.slug}`} className="u">{c.num} {c.title}</Link></span>)}
          </p>
        )}
      </Section>

      <Section id="reach" num="05.3" title="How to reach us" note="placeholder channels">
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>Channel</th><th>Address</th><th>Use it for</th></tr></thead>
            <tbody>
              {t.reach.map((r) => (
                <tr key={r.channel + r.value}>
                  <td className="mono">{r.channel}</td>
                  <td className="strong">{r.href ? <a href={r.href} className="row-link">{r.value}</a> : r.value}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="rhythm" num="05.4" title="Working rhythm">
        <div className="grid three">
          {t.rhythm.map((r, k) => (
            <div key={r.name} className="cell"><p className="cell-k mono">05.4.{k + 1}</p><h3>{r.name}</h3><p>{r.detail}</p></div>
          ))}
          <div className="cell"><p className="cell-k mono">05.4.{t.rhythm.length + 1}</p><h3>Join this team</h3><p>{roles.length ? `${roles.length} placeholder role${roles.length > 1 ? "s" : ""} listed.` : "No roles listed right now."}</p><Link className="more mono" href="/careers">Careers →</Link></div>
        </div>
      </Section>

      <Pager
        prev={prev && { href: `/teams/${prev.slug}`, label: `${prev.code} ${prev.name}` }}
        next={next && { href: `/teams/${next.slug}`, label: `${next.code} ${next.name}` }}
      />
    </>
  );
}
