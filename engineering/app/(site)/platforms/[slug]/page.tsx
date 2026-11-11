import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIndex } from "@/components/PageIndex";
import { Chip, PageHead, Pager, Section } from "@/components/Sheet";
import { getPlatform, getPlatforms, getRfcs, getTeam } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPlatforms()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPlatform(slug);
  if (!p) return { title: "Sheet not found" };
  return { title: `${p.name} · Platforms`, description: p.summary };
}

const SECTIONS = [
  { id: "purpose", num: "01", label: "Purpose" },
  { id: "interfaces", num: "02", label: "Interfaces" },
  { id: "dependencies", num: "03", label: "Dependencies" },
  { id: "roadmap", num: "04", label: "Roadmap" },
  { id: "operations", num: "05", label: "Runbook & ownership" },
];

export default async function PlatformSheet({ params }: Props) {
  const { slug } = await params;
  const p = await getPlatform(slug);
  if (!p) notFound();
  const [owner, allRfcs, platforms] = await Promise.all([getTeam(p.owner), getRfcs(), getPlatforms()]);
  const rfcs = allRfcs.filter((r) => r.platforms.includes(p.slug));
  const i = platforms.findIndex((x) => x.slug === p.slug);
  const prev = i > 0 ? platforms[i - 1] : undefined;
  const next = i >= 0 ? platforms[i + 1] : undefined;

  return (
    <>
      <PageIndex sections={SECTIONS} />
      <PageHead
        trail={[{ label: "Platforms", href: "/platforms" }, { label: p.name }]}
        sheet={`Sheet 01 · ${p.id} · Spec sheet`}
        title={p.name}
        lede={p.summary}
        word={{ arabic: p.arabic, transliteration: p.transliteration, gloss: p.gloss }}
        block={[
          ["ID", <span key="id" className="mono">{p.id}</span>],
          ["Owner", <Link key="o" href={`/teams/${p.owner}`} className="u">{owner?.name}</Link>],
          ["Status", <Chip key="s" kind={p.status} />],
          ["Revision", <span key="r" className="mono">rev. 0.1 · placeholder</span>],
        ]}
      />

      <Section id="purpose" num={`${p.id} · 01`} title="Purpose">
        <div className="two-col">
          <div className="prose">
            <p className="big">{p.purpose}.</p>
          </div>
          <div>
            <p className="cell-k mono">Design principles</p>
            <ol className="pl ordered">{p.principles.map((x) => <li key={x}>{x}</li>)}</ol>
          </div>
        </div>
      </Section>

      <Section id="interfaces" num={`${p.id} · 02`} title="Interfaces" note="placeholder · not a live API">
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>Interface</th><th>Kind</th><th>Surface</th><th>Notes</th></tr></thead>
            <tbody>
              {p.interfaces.map((x) => (
                <tr key={x.name}>
                  <td className="strong">{x.name}</td>
                  <td className="mono">{x.kind}</td>
                  <td><code className="inline">{x.surface}</code></td>
                  <td>{x.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="dependencies" num={`${p.id} · 03`} title="Dependencies">
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>Depends on</th><th>Kind</th><th>Why</th></tr></thead>
            <tbody>
              {p.dependencies.map((d) => (
                <tr key={d.name}>
                  <td className="strong">{d.ref ? <Link href={`/platforms/${d.ref}`} className="row-link">{d.name}</Link> : d.name}</td>
                  <td className="mono">{d.kind}</td>
                  <td>{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="roadmap" num={`${p.id} · 04`} title="Roadmap" note="no dates until committed">
        <ol className="roadmap">
          {p.roadmap.map((r) => (
            <li key={r.title} className={`rm ${r.phase}`}>
              <Chip kind={r.phase} />
              <div>
                <h3>{r.title}</h3>
                <p>{r.note}</p>
              </div>
            </li>
          ))}
        </ol>
        {rfcs.length > 0 && (
          <p className="after mono">
            Related decisions:{" "}
            {rfcs.map((r, k) => (
              <span key={r.id}>{k > 0 && ", "}<Link href={`/rfcs/${r.id}`} className="u">RFC-{r.id}</Link></span>
            ))}
          </p>
        )}
      </Section>

      <Section id="operations" num={`${p.id} · 05`} title="Runbook & ownership">
        <dl className="spec-dl wide">
          <div><dt className="mono">Owning team</dt><dd><Link href={`/teams/${p.owner}`} className="u">{owner?.name}</Link> · {owner?.reach[0]?.value}</dd></div>
          <div><dt className="mono">Runbook</dt><dd><code className="inline">{p.runbook.path || "—"}</code> <span className="muted">(internal · placeholder)</span></dd></div>
          <div><dt className="mono">Covers</dt><dd>{p.runbook.covers.join(" · ") || "—"}</dd></div>
          <div><dt className="mono">On-call</dt><dd>Paged through Manara. See <Link href="/handbook/on-call-and-incidents#runbooks" className="u">H-04 · Runbooks</Link>.</dd></div>
          <div><dt className="mono">Live status</dt><dd><Link href="/status" className="u">Status sheet →</Link></dd></div>
        </dl>
      </Section>

      <Pager
        prev={prev && { href: `/platforms/${prev.slug}`, label: `${prev.id} ${prev.name}` }}
        next={next && { href: `/platforms/${next.slug}`, label: `${next.id} ${next.name}` }}
      />
    </>
  );
}
