import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { principleById } from "@/lib/charter";
import { cellDisplay } from "@/lib/evals";
import { getBenchmarks, getPrinciples, getResults } from "@/lib/data";

export const metadata: Metadata = {
  title: "Evals",
  description: "Open benchmarks for honesty, citation fidelity, dialect fairness and privacy. Results are pending: no numbers have been published yet.",
};

export default async function EvalsPage() {
  const [BENCHMARKS, RESULTS, principles] = await Promise.all([getBenchmarks(), getResults(), getPrinciples()]);
  return (
    <>
      <PageHero
        eyebrow="evals · open benchmarks"
        title={<>Measured, <span className="grad">not claimed.</span></>}
        sub="Each benchmark tests one principle of the charter. We publish the method before the numbers, and the numbers only when they can be reproduced."
        crumbs={[{ href: "/evals", label: "evals" }]}
      />
      <div className="wrap">
        <div className="banner" role="note">
          <span className="banner-k">placeholder</span>
          <p>
            No results have been measured or published yet. Every cell below is a placeholder, shown so you can see what
            we intend to report. Numbers will appear only with a linked, reproducible run from ITC Research.
          </p>
        </div>

        <header className="sec-head"><span className="sec-num">01</span><h2>Results</h2></header>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Results table, scrolls horizontally">
          <table className="results">
            <caption>Primary metric per benchmark · placeholder</caption>
            <thead>
              <tr>
                <th scope="col">system</th>
                {BENCHMARKS.map((b) => <th key={b.id} scope="col"><a href={`#${b.id}`}>{b.name}</a></th>)}
              </tr>
            </thead>
            <tbody>
              {RESULTS.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.system}<small>{r.note}</small></th>
                  {BENCHMARKS.map((b) => {
                    const v = cellDisplay(r, b.id);
                    if (v.kind === "result") return <td key={b.id} className="cell-result"><a href={v.run} className="text-link">{v.text}</a></td>;
                    return <td key={b.id} className={v.kind === "pending" ? "cell-pending" : "cell-na"}>{v.text}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="legend"><span className="cell-pending">pending</span> run planned, not yet published · <span className="cell-na">—</span> not applicable to this system</p>

        <header className="sec-head sec-gap"><span className="sec-num">02</span><h2>Benchmarks</h2></header>
        <div className="bench-list">
          {BENCHMARKS.map((b) => {
            const pr = principleById(principles, b.principle);
            return (
              <article key={b.id} id={b.id} className="card bench">
                <div className="card-top"><span className="tag">{pr?.k ?? b.principle}</span><span className="spec">{b.status}</span></div>
                <h3>{b.name}</h3>
                <p>{b.question}</p>
                <table className="metrics">
                  <thead><tr><th scope="col">metric</th><th scope="col">meaning</th><th scope="col">better</th><th scope="col">result</th></tr></thead>
                  <tbody>
                    {b.metrics.map((m) => (
                      <tr key={m.name}><th scope="row">{m.name}</th><td>{m.meaning}</td><td>{m.better === "higher" ? "↑ higher" : "↓ lower"}</td>{b.run && m.result ? <td className="cell-result">{m.result}</td> : <td className="cell-pending">pending</td>}</tr>
                    ))}
                  </tbody>
                </table>
                {b.run && <p className="bench-foot"><a href={b.run} className="text-link">reproducible run →</a></p>}
                <p className="bench-foot"><Link href={`/projects/${b.project}`} className="text-link">maintained by {b.project} →</Link></p>
              </article>
            );
          })}
        </div>
        <p className="placeholder-note">{"// placeholder benchmarks. Do not add numbers without a reproducible, published run."}</p>
      </div>
    </>
  );
}
