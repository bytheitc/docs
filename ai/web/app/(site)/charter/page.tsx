import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { getPrinciples, getProjects } from "@/lib/data";

export const metadata: Metadata = {
  title: "Charter",
  description: "The five principles that govern every AI system ITC builds: amānah, ṣidq, ʿadl, shūrā and ʿilm, and how each is enforced at release.",
};

export default async function CharterPage() {
  const [PRINCIPLES, PROJECTS] = await Promise.all([getPrinciples(), getProjects()]);
  return (
    <>
      <PageHero
        eyebrow="the charter · five principles"
        title={<>Principles that can <span className="grad">block a release.</span></>}
        sub="A charter is only as strong as what it stops. Each principle below comes with its reasoning, what it means day to day, and the release gates that enforce it."
        crumbs={[{ href: "/charter", label: "charter" }]}
      >
        <nav className="toc" aria-label="Principles">
          {PRINCIPLES.map((p, i) => (
            <a key={p.id} href={`#${p.id}`}><span>0{i + 1}</span> {p.k}</a>
          ))}
        </nav>
      </PageHero>

      <div className="wrap">
        <aside className="note-panel">
          <p className="eyebrow">a note on the words</p>
          <p>
            We use these Arabic words because they name obligations our communities already recognise. We do not claim to
            define them; that belongs to scholars. Here they describe commitments we hold ourselves to as builders.
          </p>
        </aside>

        {PRINCIPLES.map((p, i) => {
          const related = PROJECTS.filter((pr) => pr.principles.includes(p.id));
          return (
            <article key={p.id} id={p.id} className="principle">
              <header className="principle-head">
                <span className="sec-num">0{i + 1}</span>
                <p className="principle-ar" lang="ar" dir="rtl">{p.arabic}</p>
                <p className="principle-k"><b>{p.k}</b> · {p.sense}</p>
                <h2>{p.title}</h2>
                <p className="principle-sum">{p.summary}</p>
              </header>
              <div className="principle-grid">
                <section className="panel">
                  <h3 className="panel-label">why</h3>
                  {p.reasoning.map((r) => <p key={r.slice(0, 24)}>{r}</p>)}
                </section>
                <section className="panel">
                  <h3 className="panel-label">in practice</h3>
                  <ul className="ticks">{p.practice.map((x) => <li key={x}>{x}</li>)}</ul>
                </section>
                <section className="panel panel-wide">
                  <h3 className="panel-label">enforced at release</h3>
                  <ol className="gates">
                    {p.enforcement.map((g) => (
                      <li key={g.gate}><span className="gate">{g.gate}</span><span>{g.detail}</span></li>
                    ))}
                  </ol>
                </section>
              </div>
              {related.length > 0 && (
                <p className="related">
                  <span>projects held to this most closely:</span>
                  {related.map((r) => <Link key={r.slug} href={`/projects/${r.slug}`} className="tag">{r.name}</Link>)}
                </p>
              )}
            </article>
          );
        })}

        <p className="placeholder-note">{"// placeholder charter text. Review with the collective's scholars and advisors before launch."}</p>
      </div>
    </>
  );
}
