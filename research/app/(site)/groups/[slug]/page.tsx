import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/PageHead";
import { PubEntry } from "@/components/PubEntry";
import { getDatasets, getGroup, getGroups, getNotes, getPublications } from "@/lib/data";
import { house } from "@/lib/houses";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getGroups()).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGroup(slug);
  if (!g) return { title: "Not in the archive" };
  return { title: `${g.name} Group`, description: `${g.name}: ${g.focus}. Agenda, open questions and publications.` };
}

export default async function GroupPage({ params }: Props) {
  const { slug } = await params;
  const g = await getGroup(slug);
  if (!g) notFound();

  const [GROUPS, PUBLICATIONS, DATASETS, NOTES] = await Promise.all([getGroups(), getPublications(), getDatasets(), getNotes()]);
  const n = GROUPS.findIndex((x) => x.slug === g.slug) + 1;
  const pubs = PUBLICATIONS.filter((p) => p.group === g.name);
  const data = DATASETS.filter((d) => d.group === g.name);
  const notes = NOTES.filter((x) => x.group === g.name);

  return (
    <div className="page">
      <PageHead kicker={`Research group · §${n}`} title={g.name} lede={g.focus} crumbs={[{ href: "/groups", label: "Groups" }]} />

      <div className="article">
        <div className="article-main">
          <section aria-labelledby="agenda" className="block">
            <h2 id="agenda" className="label-h">Agenda</h2>
            <div className="prose">{g.agenda.map((p, i) => <p key={i}>{p}</p>)}</div>
          </section>
          <section aria-labelledby="questions" className="block">
            <h2 id="questions" className="label-h">Open questions</h2>
            <ol className="questions">
              {g.questions.map((q, i) => <li key={i}><span className="c-num">Q{i + 1}</span><span>{q}</span></li>)}
            </ol>
          </section>
        </div>
        <aside className="article-side" aria-label="Collaborating houses">
          <p className="label-h">Works with</p>
          <ul className="houses">
            {g.collaborators.map((c) => {
              const h = house(c.house);
              return (
                <li key={c.house}>
                  <a href={h.url}>ITC {h.name}</a> <span className="h-ar" lang="ar" title={h.transliteration}>{h.arabic}</span> <span className="h-tr">{h.transliteration}</span>
                  <p>{c.how}</p>
                </li>
              );
            })}
          </ul>
          <p className="side-note"><Link href={`/people#${g.slug}`}>Roles in this group →</Link></p>
        </aside>
      </div>

      <section className="sec">
        <header className="sec-head"><h2>Publications</h2><p>{pubs.length} entries</p></header>
        <ol className="pubs">{pubs.map((p) => <PubEntry key={p.id} p={p} showGroup={false} />)}</ol>
      </section>

      {(data.length > 0 || notes.length > 0) && (
        <section className="sec">
          <header className="sec-head"><h2>Data &amp; notes</h2></header>
          <ul className="plain-list">
            {data.map((d) => <li key={d.slug}><span className="pub-type">Datasheet</span> <Link href={`/datasets/${d.slug}`}>{d.title}</Link></li>)}
            {notes.map((x) => <li key={x.slug}><span className="pub-type">Note</span> <Link href={`/notes/${x.slug}`}>{x.title}</Link></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
