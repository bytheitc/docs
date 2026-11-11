import Link from "next/link";
import { PubIndex } from "@/components/PubIndex";
import { ChainFigure } from "@/components/ChainFigure";
import { formatDate } from "@/lib/notes";
import { getGroups, getNotes, getPolicies, getPublications } from "@/lib/data";
import { HOUSES } from "@/lib/houses";

const COMMITMENT_SLUGS = ["open-access", "open-data", "open-code", "negative-results"];

export default async function ResearchHome() {
  const [GROUPS, NOTES, POLICIES, publications] = await Promise.all([getGroups(), getNotes(), getPolicies(), getPublications()]);
  const houseName = (id: string) => HOUSES.find((h) => h.id === id)?.name ?? id;
  const commitments = POLICIES.filter((p) => COMMITMENT_SLUGS.includes(p.slug));
  return (
    <>
      <h1 className="sr-only">ITC Research</h1>
      <section className="intro">
        <p><em>Careful questions, published in the open.</em> ITC Research studies how technology can serve people of faith and their communities honestly, and publishes everything it finds.</p>
      </section>

      <article id="featured" className="featured">
        <div className="feat-label">Featured · Paper · itc-r-002</div>
        <h2><Link href="/publications/itc-r-002" className="plain">Isnad-style provenance for retrieval-augmented generation</Link></h2>
        <p className="byline">Language &amp; Text Group, with ITC AI</p>
        <div className="feat-body">
          <div className="abstract">
            <h3>Abstract</h3>
            <p>
              Language models that cite sources often cite them wrongly, and the reader has no easy way to check.
              The classical hadith sciences faced the same problem and solved it with the <i>isnād</i>, a chain of
              transmission that names every link between a report and its origin. We propose an analogous structure
              for retrieval-augmented generation, so that every claim carries a chain back to a primary source.
            </p>
            <p className="placeholder">Placeholder abstract. Replace with the published version.</p>
            <div className="feat-actions"><Link href="/publications/itc-r-002" className="btn">Read the paper</Link><Link href="/publications" className="link">All publications →</Link></div>
          </div>
          <ChainFigure />
        </div>
      </article>

      <section id="index" className="sec">
        <header className="sec-head"><h2>Index</h2><p><Link href="/publications">Search the full index →</Link></p></header>
        <PubIndex publications={publications} />
      </section>

      <section id="groups" className="sec">
        <header className="sec-head"><h2>Research groups</h2><p><Link href="/groups">All groups →</Link></p></header>
        <table className="groups">
          <thead><tr><th>Group</th><th>Focus</th><th>Works with</th></tr></thead>
          <tbody>
            {GROUPS.map((g) => (
              <tr key={g.slug}>
                <td className="g-name"><Link href={`/groups/${g.slug}`}>{g.name}</Link></td>
                <td>{g.focus}</td>
                <td className="g-with">{g.collaborators.map((c) => houseName(c.house)).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="notes" className="sec">
        <header className="sec-head"><h2>Working notes</h2><p><Link href="/notes">All notes →</Link></p></header>
        <ol className="note-list">
          {NOTES.slice(0, 3).map((n) => (
            <li key={n.slug}>
              <p className="pub-meta"><span className="pub-type">{n.group}</span><time dateTime={n.date}>{formatDate(n.date)}</time></p>
              <h3><Link href={`/notes/${n.slug}`}>{n.title}</Link></h3>
              <p className="pub-sum">{n.dek}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="open" className="sec open">
        <header className="sec-head"><h2>Open science</h2><p><Link href="/open-science">Full policies →</Link></p></header>
        <dl className="commitments">
          {commitments.map((c, i) => (
            <div key={c.slug}><dt><span className="c-num">§{i + 1}</span><Link href={`/open-science#${c.slug}`} className="plain">{c.title}</Link></dt><dd>{c.lede}</dd></div>
          ))}
        </dl>
        <p className="contact">Collaborations, data requests and corrections: <a href="mailto:research@example.org">research@example.org</a></p>
      </section>
    </>
  );
}
