import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIndex } from "@/components/PageIndex";
import { PageHead, Pager, Prose, Section } from "@/components/Sheet";
import { indexFor } from "@/lib/content";
import { getChapter, getChapters, getTeam } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getChapters()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getChapter(slug);
  if (!c) return { title: "Sheet not found" };
  return { title: `${c.title} · Handbook`, description: c.summary };
}

export default async function HandbookChapter({ params }: Props) {
  const { slug } = await params;
  const c = await getChapter(slug);
  if (!c) notFound();
  const [chapters, owner] = await Promise.all([getChapters(), getTeam(c.owner)]);
  const n = chapters.findIndex((x) => x.slug === c.slug);
  const prefix = String(n + 1).padStart(2, "0");
  const index = indexFor(c.sections, prefix);
  const prev = n > 0 ? chapters[n - 1] : undefined;
  const next = n >= 0 ? chapters[n + 1] : undefined;

  return (
    <>
      <PageIndex sections={index} />
      <PageHead
        trail={[{ label: "Handbook", href: "/handbook" }, { label: c.num }]}
        sheet={`Sheet 02 · Chapter ${c.num}`}
        title={c.title}
        lede={c.summary}
        block={[
          ["Chapter", <span key="n" className="mono">{c.num}</span>],
          ["Owner", <Link key="o" href={`/teams/${c.owner}`} className="u">{owner?.name}</Link>],
          ["Sections", String(c.sections.length)],
          ["Revision", <span key="r" className="mono">{c.revision}</span>],
        ]}
      />
      <article className="doc">
        {c.sections.map((s, i) => (
          <Section key={s.id} id={s.id} num={index[i].num} title={s.title} className="doc-sec">
            <Prose blocks={s.blocks} />
          </Section>
        ))}
      </article>
      <Pager
        prev={prev && { href: `/handbook/${prev.slug}`, label: `${prev.num} ${prev.title}` }}
        next={next && { href: `/handbook/${next.slug}`, label: `${next.num} ${next.title}` }}
      />
    </>
  );
}
