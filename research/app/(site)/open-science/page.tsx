import type { Metadata } from "next";
import { PageHead } from "@/components/PageHead";
import { getPolicies } from "@/lib/data";

export const metadata: Metadata = {
  title: "Open science",
  description: "ITC Research policies on open access, open data and consent, open code, preregistration, negative results and corrections.",
};

export default async function OpenSciencePage() {
  const POLICIES = await getPolicies();
  return (
    <div className="page">
      <PageHead
        kicker="Policy · Open science"
        title="Open science"
        lede="The commitments below govern everything ITC Research publishes. Where openness and consent conflict, consent comes first."
      />
      <div className="article">
        <div className="article-main">
          {POLICIES.map((p, i) => (
            <section key={p.slug} id={p.slug} className="ds-section" aria-labelledby={`${p.slug}-h`}>
              <h2 id={`${p.slug}-h`}><span className="c-num">§{i + 1}</span>{p.title}</h2>
              <p className="policy-lede">{p.lede}</p>
              <ol className="clauses">
                {p.clauses.map((c, j) => <li key={j}><span className="c-num">{i + 1}.{j + 1}</span><span>{c}</span></li>)}
              </ol>
            </section>
          ))}
          <p className="placeholder">Placeholder policy text. Have it reviewed before launch.</p>
        </div>
        <aside className="article-side" aria-label="Sections">
          <nav className="toc">
            <p className="label-h">Contents</p>
            <ol>{POLICIES.map((p, i) => <li key={p.slug}><a href={`#${p.slug}`}><span className="c-num">§{i + 1}</span>{p.title}</a></li>)}</ol>
          </nav>
          <dl className="meta-list">
            <div><dt>Corrections</dt><dd><a href="mailto:corrections@example.org">corrections@example.org</a></dd></div>
            <div><dt>Data requests</dt><dd><a href="mailto:data@example.org">data@example.org</a></dd></div>
            <div><dt>Policy version</dt><dd><span className="pending">pending</span></dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
