import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CiteButton } from "@/components/CiteButton";
import { ChainFigure } from "@/components/ChainFigure";
import { PageHead } from "@/components/PageHead";
import { PubEntry } from "@/components/PubEntry";
import { house } from "@/lib/houses";
import { groupByName } from "@/lib/groups";
import { bibtex, citation, relatedPublications } from "@/lib/publications";
import { getDataset, getGroups, getNotes, getPublication, getPublications } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return (await getPublications()).map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getPublication(id);
  if (!p) return { title: "Not in the archive" };
  return { title: p.title, description: p.summary, keywords: p.keywords };
}

export default async function PublicationPage({ params }: Props) {
  const { id } = await params;
  const p = await getPublication(id);
  if (!p) notFound();

  const [groups, all, allNotes] = await Promise.all([getGroups(), getPublications(), getNotes()]);
  const group = groupByName(groups, p.group);
  const dataset = p.dataset ? await getDataset(p.dataset) : undefined;
  const related = relatedPublications(p, all);
  const notes = allNotes.filter((n) => n.related?.includes(p.id));
  const oss = house("oss");

  return (
    <div className="page">
      <PageHead
        kicker={`${p.type} · ${p.year} · ${p.id}`}
        title={p.title}
        crumbs={[{ href: "/publications", label: "Publications" }]}
      >
        <p className="byline">
          <Link href={`/groups/${group.slug}`}>{p.group} Group</Link>
          {p.with && p.with.length > 0 && <>, with {p.with.map((w) => `ITC ${w}`).join(" and ")}</>}
        </p>
      </PageHead>

      <div className="article">
        <div className="article-main">
          <section className="abstract" aria-labelledby="abs">
            <h2 id="abs" className="label-h">Abstract</h2>
            {p.abstract.map((para, i) => <p key={i}>{para}</p>)}
            <p className="placeholder">Placeholder abstract. Replace with the published version.</p>
          </section>

          <section aria-labelledby="kw" className="block">
            <h2 id="kw" className="label-h">Keywords</h2>
            <p className="keywords">{p.keywords.join(" · ")}</p>
          </section>

          {p.id === "itc-r-002" && <ChainFigure />}

          <section id="pdf" aria-labelledby="pdf-h" className="block pdf-slot">
            <h2 id="pdf-h" className="label-h">Full text</h2>
            <p><span className="pending-mark">PDF pending</span> The full text has not yet been deposited in the archive. When it is, it will appear here, free to read, with its version history.</p>
          </section>

          <section aria-labelledby="cite-h" className="block">
            <h2 id="cite-h" className="label-h">Cite this {p.type.toLowerCase()}</h2>
            <p className="citation">{citation(p)}</p>
            <pre className="bibtex" tabIndex={0} aria-label="BibTeX entry"><code>{bibtex(p)}</code></pre>
            <CiteButton pub={p} label="Copy BibTeX" />
          </section>
        </div>

        <aside className="article-side" aria-label="Publication details">
          <dl className="meta-list">
            <div><dt>Identifier</dt><dd className="pub-id">{p.id}</dd></div>
            <div><dt>Type</dt><dd>{p.type}</dd></div>
            <div><dt>Group</dt><dd><Link href={`/groups/${group.slug}`}>{p.group}</Link></dd></div>
            <div><dt>Year</dt><dd>{p.year}</dd></div>
            <div><dt>Licence</dt><dd><span className="pending">pending</span></dd></div>
            <div><dt>Code &amp; data</dt><dd>
              {p.repo
                ? <><a href={oss.url}>ITC Open Source</a><br /><span className="mono">{p.repo}</span> <span className="pending">placeholder</span></>
                : <span className="pending">none planned</span>}
            </dd></div>
            {dataset && <div><dt>Datasheet</dt><dd><Link href={`/datasets/${dataset.slug}`}>{dataset.title}</Link></dd></div>}
            <div><dt>Tags</dt><dd className="tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</dd></div>
          </dl>
          <p className="side-note">Found an error? Write to <a href="mailto:corrections@example.org">corrections@example.org</a>. See the <Link href="/open-science#corrections">corrections policy</Link>.</p>
        </aside>
      </div>

      {notes.length > 0 && (
        <section className="sec">
          <header className="sec-head"><h2>Discussed in</h2></header>
          <ul className="plain-list">
            {notes.map((n) => <li key={n.slug}><Link href={`/notes/${n.slug}`}>{n.title}</Link></li>)}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="sec">
          <header className="sec-head"><h2>Related publications</h2><p>Same group or shared keywords</p></header>
          <ol className="pubs">{related.map((r) => <PubEntry key={r.id} p={r} />)}</ol>
        </section>
      )}
    </div>
  );
}
