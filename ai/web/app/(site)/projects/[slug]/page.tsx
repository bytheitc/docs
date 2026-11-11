import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { principleById } from "@/lib/charter";
import { house } from "@/lib/houses";
import { getBenchmarks, getGuide, getModelCard, getPrinciples, getProject, getProjects } from "@/lib/data";

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) return { title: "Project not found" };
  return { title: p.name, description: p.summary };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) notFound();

  const [card, guide, benchmarks, principles] = await Promise.all([
    p.modelCard ? getModelCard(p.modelCard) : undefined,
    p.guide ? getGuide(p.guide) : undefined,
    getBenchmarks(),
    getPrinciples(),
  ]);
  const evals = benchmarks.filter((b) => p.evals?.includes(b.id));
  const heldTo = p.principles.map((id) => principleById(principles, id)).filter((pr) => pr !== undefined);

  return (
    <>
      <PageHero
        eyebrow={`${p.kind} · ${p.status}`}
        title={p.name}
        sub={p.tagline}
        crumbs={[{ href: "/projects", label: "projects" }, { href: `/projects/${p.slug}`, label: p.slug }]}
      />
      <div className="wrap detail">
        <div className="detail-main prose">
          <p className="lede">{p.summary}</p>
          {p.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}
          <h2>Goals</h2>
          <ul className="ticks">{p.goals.map((g) => <li key={g}>{g}</li>)}</ul>
          <h2>Held to</h2>
          <ul className="principle-chips">
            {heldTo.map((pr) => {
              return (
                <li key={pr.id}>
                  <Link href={`/charter#${pr.id}`}>
                    <span className="chip-ar" lang="ar" dir="rtl">{pr.arabic}</span>
                    <span><b>{pr.k}</b> · {pr.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="detail-side">
          <section className="panel">
            <h2 className="panel-label">status</h2>
            <p className="status-line"><span className="spec">{p.status}</span></p>
          </section>
          <section className="panel">
            <h2 className="panel-label">built with</h2>
            <ul className="house-list">
              <li><b>AI</b><span>leads the project</span></li>
              {p.houses.map((h) => (
                <li key={h.id}><b>{house(h.id).name}</b><span>{h.role}</span></li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2 className="panel-label">links</h2>
            <ul className="link-list">
              {p.links.map((l) => (
                <li key={l.label}>
                  <a href={l.url || house(l.house).url}>
                    <span>{l.label} <span aria-hidden="true">↗</span></span>
                    <small>ITC {house(l.house).name} · {l.note}</small>
                  </a>
                </li>
              ))}
              {card && (
                <li><Link href={`/model-cards/${card.slug}`}><span>Model card →</span><small>{card.name}</small></Link></li>
              )}
              {evals.map((e) => (
                <li key={e.id}><Link href={`/evals#${e.id}`}><span>Benchmark →</span><small>{e.name} · results pending</small></Link></li>
              ))}
              {guide && (
                <li><Link href="/guides"><span>Guides →</span><small>mosques, schools, nonprofits</small></Link></li>
              )}
            </ul>
          </section>
        </aside>
      </div>
      <div className="wrap">
        <p className="placeholder-note">{"// placeholder project. Links point to house home pages until real repositories and papers exist."}</p>
      </div>
    </>
  );
}
