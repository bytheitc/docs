import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PENDING } from "@/lib/model-cards";
import { getModelCard, getModelCards, getProject } from "@/lib/data";

export async function generateStaticParams() {
  return (await getModelCards()).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = await getModelCard(slug);
  if (!m) return { title: "Model card not found" };
  return { title: `${m.name} model card`, description: m.summary };
}

const Val = ({ v }: { v: string }) => (v === PENDING ? <span className="cell-pending">pending</span> : <>{v}</>);

export default async function ModelCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await getModelCard(slug);
  if (!m) notFound();
  const project = await getProject(m.project);

  return (
    <>
      <PageHero
        eyebrow={`model card · ${m.kind}`}
        title={<span className="mono-title">{m.name}</span>}
        sub={m.summary}
        crumbs={[{ href: "/model-cards", label: "model cards" }, { href: `/model-cards/${m.slug}`, label: m.slug }]}
      />
      <div className="wrap model-card">
        <dl className="facts">
          {m.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd><Val v={f.value} /></dd></div>)}
        </dl>

        <div className="mc-grid">
          <section className="panel">
            <h2 className="panel-label"><span>01</span> intended use</h2>
            <ul className="ticks">{m.intendedUse.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>
          <section className="panel panel-warn">
            <h2 className="panel-label"><span>02</span> out-of-scope use</h2>
            <ul className="crosses">{m.outOfScope.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>
          <section className="panel">
            <h2 className="panel-label"><span>03</span> data</h2>
            <dl className="kv">{m.data.map((d) => <div key={d.label}><dt>{d.label}</dt><dd><Val v={d.value} /></dd></div>)}</dl>
          </section>
          <section className="panel">
            <h2 className="panel-label"><span>04</span> evaluation</h2>
            <table className="metrics">
              <thead><tr><th scope="col">benchmark</th><th scope="col">result</th></tr></thead>
              <tbody>
                {m.evaluation.map((e) => <tr key={e.benchmark}><th scope="row">{e.benchmark}</th><td><Val v={e.result} /></td></tr>)}
              </tbody>
            </table>
            <p className="bench-foot"><Link href="/evals" className="text-link">about these benchmarks →</Link></p>
          </section>
          <section className="panel">
            <h2 className="panel-label"><span>05</span> limitations</h2>
            <ul className="ticks">{m.limitations.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>
          <section className="panel">
            <h2 className="panel-label"><span>06</span> contact</h2>
            <p>Report a problem, a harmful output or a mistake in this card:</p>
            <p><a className="text-link" href={`mailto:${m.contact}`}>{m.contact}</a></p>
            {project && <p className="bench-foot"><Link href={`/projects/${project.slug}`} className="text-link">project: {project.name} →</Link></p>}
          </section>
        </div>
        <p className="placeholder-note">{"// placeholder card. Fields marked pending are filled from real runs at release, never estimated."}</p>
      </div>
    </>
  );
}
