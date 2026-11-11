import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/notes";
import { groupByName } from "@/lib/groups";
import { getGroups, getNote, getNotes, getPublications } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getNotes()).map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const n = await getNote(slug);
  if (!n) return { title: "Not in the archive" };
  return { title: n.title, description: n.dek };
}

export default async function NotePage({ params }: Props) {
  const { slug } = await params;
  const n = await getNote(slug);
  if (!n) notFound();

  const [pubs, NOTES, groups] = await Promise.all([getPublications(), getNotes(), getGroups()]);
  const related = (n.related ?? []).map((id) => pubs.find((p) => p.id === id)).filter((p) => p !== undefined);
  const others = NOTES.filter((x) => x.slug !== n.slug).slice(0, 2);
  let sec = 0;

  return (
    <article className="essay">
      <header className="essay-head">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Research</Link> / <Link href="/notes">Notes</Link></nav>
        <p className="feat-label">Working note · {n.group === "Editorial" ? "Editorial" : <Link href={`/groups/${groupByName(groups, n.group).slug}`}>{n.group}</Link>}</p>
        <h1>{n.title}</h1>
        <p className="dek">{n.dek}</p>
        <p className="byline">
          {n.group === "Editorial" ? "The editors" : `${n.group} Group`} · <time dateTime={n.date}>{formatDate(n.date)}</time> · {n.readingMinutes} min read
        </p>
      </header>

      <div className="essay-body">
        {n.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2><span className="c-num">§{++sec}</span>{s.heading}</h2>}
            {s.paragraphs.map((p, j) => <p key={j} className={i === 0 && j === 0 ? "first" : undefined}>{p}</p>)}
          </section>
        ))}
        <p className="placeholder">Placeholder essay. Replace or revise before launch.</p>
      </div>

      <footer className="essay-foot">
        {related.length > 0 && (
          <div>
            <p className="label-h">Publications discussed</p>
            <ul className="plain-list">
              {related.map((p) => <li key={p.id}><Link href={`/publications/${p.id}`}>{p.title}</Link> <span className="mono">{p.id}</span></li>)}
            </ul>
          </div>
        )}
        <div>
          <p className="label-h">Further notes</p>
          <ul className="plain-list">
            {others.map((x) => <li key={x.slug}><Link href={`/notes/${x.slug}`}>{x.title}</Link></li>)}
          </ul>
        </div>
        <p className="side-note">Responses and corrections: <a href="mailto:research@example.org">research@example.org</a></p>
      </footer>
    </article>
  );
}
