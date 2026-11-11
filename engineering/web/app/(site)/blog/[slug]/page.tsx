import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIndex } from "@/components/PageIndex";
import { PageHead, Pager, Prose, Section } from "@/components/Sheet";
import { indexFor } from "@/lib/content";
import { getPlatforms, getPost, getPosts, getTeam } from "@/lib/data";
import { findPlatform } from "@/lib/platforms";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return { title: "Sheet not found" };
  return { title: `${p.title} · Blog`, description: p.dek };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) notFound();
  const [posts, owner, platforms] = await Promise.all([getPosts(), getTeam(p.team), getPlatforms()]);
  const index = indexFor(p.sections, "04");
  const i = posts.findIndex((x) => x.slug === p.slug);
  const prev = i > 0 ? posts[i - 1] : undefined;
  const next = i >= 0 ? posts[i + 1] : undefined;

  return (
    <>
      <PageIndex sections={index} />
      <PageHead
        trail={[{ label: "Blog", href: "/blog" }, { label: p.num }]}
        sheet={`Sheet 04 · ${p.num} · ${p.kind}`}
        title={p.title}
        lede={p.dek}
        block={[
          ["Kind", p.kind],
          ["Team", <Link key="t" href={`/teams/${p.team}`} className="u">{owner?.name}</Link>],
          ["Date", <span key="d" className="mono">{p.date}</span>],
          ["Platforms", p.platforms.length ? (
            <span key="p">{p.platforms.map((s, k) => <span key={s}>{k > 0 && ", "}<Link href={`/platforms/${s}`} className="u">{findPlatform(platforms, s)?.name ?? s}</Link></span>)}</span>
          ) : "—"],
        ]}
      />
      {p.facts && (
        <div className="facts">
          <p className="cell-k mono">Incident fact sheet · placeholder values</p>
          <dl>
            {p.facts.map(([k, v]) => <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      )}
      <article className="doc">
        {p.sections.map((s, k) => (
          <Section key={s.id} id={s.id} num={index[k].num} title={s.title} className="doc-sec">
            <Prose blocks={s.blocks} />
          </Section>
        ))}
      </article>
      <Pager
        prev={prev && { href: `/blog/${prev.slug}`, label: prev.title }}
        next={next && { href: `/blog/${next.slug}`, label: next.title }}
      />
    </>
  );
}
