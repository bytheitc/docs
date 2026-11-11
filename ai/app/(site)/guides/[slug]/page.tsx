import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { readingMinutes } from "@/lib/guides";
import { principleById } from "@/lib/charter";
import { getGuide, getGuides, getPrinciples } from "@/lib/data";

export async function generateStaticParams() {
  return (await getGuides()).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGuide(slug);
  if (!g) return { title: "Guide not found" };
  return { title: g.title, description: g.dek };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await getGuide(slug);
  if (!g) notFound();
  const [all, principles] = await Promise.all([getGuides(), getPrinciples()]);
  const others = all.filter((o) => o.slug !== g.slug);
  const grounded = g.principles.map((id) => principleById(principles, id)).filter((p) => p !== undefined);

  return (
    <>
      <PageHero
        eyebrow={`guide · ${g.audience} · ~${readingMinutes(g)} min`}
        title={g.title}
        sub={g.dek}
        crumbs={[{ href: "/guides", label: "guides" }, { href: `/guides/${g.slug}`, label: g.slug }]}
      />
      <div className="wrap detail">
        <article className="detail-main prose">
          <aside className="note-panel">
            <p className="eyebrow">before you begin</p>
            <p>This guide is general and placeholder. It is not legal advice, and it offers no religious rulings. Questions of fiqh belong with your imam or a scholar you trust.</p>
          </aside>
          {g.sections.map((s, i) => (
            <section key={s.id} id={s.id}>
              <h2><span className="sec-num">0{i + 1}</span> {s.heading}</h2>
              {s.paragraphs.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
              {s.list && <ul className="ticks">{s.list.map((x) => <li key={x}>{x}</li>)}</ul>}
            </section>
          ))}
          <section id="checklist" className="panel checklist">
            <h2 className="panel-label">checklist</h2>
            <ul>{g.checklist.map((c) => <li key={c}><span aria-hidden="true" className="box" />{c}</li>)}</ul>
          </section>
        </article>
        <aside className="detail-side">
          <nav className="panel" aria-label="In this guide">
            <h2 className="panel-label">in this guide</h2>
            <ol className="toc-list">
              {g.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.heading}</a></li>)}
              <li><a href="#checklist">Checklist</a></li>
            </ol>
          </nav>
          <section className="panel">
            <h2 className="panel-label">grounded in</h2>
            <ul className="link-list">
              {grounded.map((p) => (
                <li key={p.id}><Link href={`/charter#${p.id}`}><span>{p.k}</span><small>{p.title}</small></Link></li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2 className="panel-label">other guides</h2>
            <ul className="link-list">
              {others.map((o) => <li key={o.slug}><Link href={`/guides/${o.slug}`}><span>{o.audience} →</span><small>{o.title}</small></Link></li>)}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
