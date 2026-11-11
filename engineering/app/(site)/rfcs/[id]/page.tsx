import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIndex } from "@/components/PageIndex";
import { Chip, PageHead, Pager, Prose, Section } from "@/components/Sheet";
import { getPlatforms, getRfc, getRfcs, getTeam } from "@/lib/data";
import { findPlatform } from "@/lib/platforms";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return (await getRfcs()).map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await getRfc(id);
  if (!r) return { title: "Sheet not found" };
  return { title: `RFC-${r.id}: ${r.title}`, description: r.summary };
}

const SECTIONS = [
  { id: "summary", num: "1", label: "Summary" },
  { id: "motivation", num: "2", label: "Motivation" },
  { id: "design", num: "3", label: "Design" },
  { id: "alternatives", num: "4", label: "Alternatives" },
  { id: "decision", num: "5", label: "Decision" },
];

export default async function RfcSheet({ params }: Props) {
  const { id } = await params;
  const r = await getRfc(id);
  if (!r) notFound();
  const [owner, rfcs, platforms] = await Promise.all([getTeam(r.team), getRfcs(), getPlatforms()]);
  const i = rfcs.findIndex((x) => x.id === r.id);
  const prev = i > 0 ? rfcs[i - 1] : undefined;
  const next = i >= 0 ? rfcs[i + 1] : undefined;
  const supersedes = rfcs.find((x) => x.supersededBy === r.id);
  const index = SECTIONS.map((s) => ({ ...s, num: `03.${s.num}` }));

  return (
    <>
      <PageIndex sections={index} />
      <PageHead
        trail={[{ label: "RFCs", href: "/rfcs" }, { label: `RFC-${r.id}` }]}
        sheet={`Sheet 03 · RFC-${r.id}`}
        title={r.title}
        block={[
          ["Status", <Chip key="s" kind={r.status} />],
          ["Author team", <Link key="t" href={`/teams/${r.team}`} className="u">{owner?.name}</Link>],
          ["Date", <span key="d" className="mono">{r.date}</span>],
          ["Platforms", r.platforms.length ? (
            <span key="p">{r.platforms.map((s, k) => <span key={s}>{k > 0 && ", "}<Link href={`/platforms/${s}`} className="u">{findPlatform(platforms, s)?.name ?? s}</Link></span>)}</span>
          ) : "Cross-cutting"],
        ]}
      />
      {(r.supersededBy || supersedes) && (
        <div className="banner mono" role="note">
          {r.supersededBy && <>Superseded by <Link href={`/rfcs/${r.supersededBy}`} className="u">RFC-{r.supersededBy}</Link>. Kept for the record.</>}
          {supersedes && <>Supersedes <Link href={`/rfcs/${supersedes.id}`} className="u">RFC-{supersedes.id}</Link>.</>}
        </div>
      )}
      <article className="doc">
        <Section id="summary" num="03.1" title="Summary" className="doc-sec">
          <Prose blocks={[{ kind: "p", text: r.summary }]} />
        </Section>
        <Section id="motivation" num="03.2" title="Motivation" className="doc-sec"><Prose blocks={r.motivation} /></Section>
        <Section id="design" num="03.3" title="Design" className="doc-sec"><Prose blocks={r.design} /></Section>
        <Section id="alternatives" num="03.4" title="Alternatives" className="doc-sec"><Prose blocks={r.alternatives} /></Section>
        <Section id="decision" num="03.5" title="Decision" className="doc-sec decision">
          <div className="decision-row"><Chip kind={r.status} /></div>
          <Prose blocks={r.decision} />
        </Section>
      </article>
      <Pager
        prev={prev && { href: `/rfcs/${prev.id}`, label: `RFC-${prev.id} ${prev.title}` }}
        next={next && { href: `/rfcs/${next.id}`, label: `RFC-${next.id} ${next.title}` }}
      />
    </>
  );
}
