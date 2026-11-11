import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/PageHead";
import { Inline } from "@/components/Prose";
import { findRepo, getRepos, getSettings, getSprint, getSprints } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getSprints()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSprint(slug);
  if (!s) return { title: "Not found" };
  return { title: `${s.code}: ${s.title} · Commons Sprint`, description: s.summary };
}

export default async function SprintPage({ params }: Props) {
  const { slug } = await params;
  const s = await getSprint(slug);
  if (!s) notFound();
  const [repos, { contact: CONTACT }] = await Promise.all([getRepos(), getSettings()]);
  const upcoming = s.status === "upcoming";

  return (
    <>
      <PageHead
        crumbs={[{ href: "/sprints", label: "SPRINTS" }, { href: `/sprints/${s.slug}`, label: s.code }]}
        kicker={`${s.code} · ${upcoming ? "UPCOMING" : "PAST"} · ${s.format.toUpperCase()}`}
        title={upcoming ? <>{s.title}<span className="hl">.</span></> : <span className="dim-title">{s.title}.</span>}
        lede={<p><Inline text={s.summary} /></p>}
      >
        <dl className="policy head-facts">
          <div><dt>DATES</dt><dd>{s.dates}</dd></div>
          <div><dt>FORMAT</dt><dd>{s.format}</dd></div>
          <div><dt>THEME</dt><dd>{s.theme}</dd></div>
          <div><dt>STATUS</dt><dd>{upcoming ? "Sign-ups open soon" : "Finished"}</dd></div>
        </dl>
      </PageHead>

      <div className="project">
        <div className="project-main">
          <section className="doc-sec">
            <h2>GOALS</h2>
            <ol className="prose-steps">{s.goals.map((g) => <li key={g}><Inline text={g} /></li>)}</ol>
          </section>
          <section className="doc-sec">
            <h2>SCHEDULE</h2>
            <dl className="defs">
              {s.schedule.map((d) => <div key={d.when}><dt>{d.when}</dt><dd>{d.what}</dd></div>)}
            </dl>
          </section>
          {s.outcome && (
            <section className="doc-sec">
              <h2>OUTCOME</h2>
              <p className="note note-mint">{s.outcome}</p>
            </section>
          )}
          <section className="doc-sec">
            <h2>{upcoming ? "JOIN" : "MISSED IT?"}</h2>
            {upcoming ? (
              <p>Dates are TBA. To get the announcement, email <a href={`mailto:${CONTACT.sprints}`}>{CONTACT.sprints}</a>. Before the sprint, set up your machine with the <Link href="/contribute">first-timer&apos;s guide</Link> so day one is for building, not installing.</p>
            ) : (
              <p>The issues don&apos;t stop when the sprint does. Pick one up from the <Link href="/projects">projects</Link>, or see what&apos;s <Link href="/sprints">coming next</Link>.</p>
            )}
            <p>Every sprint runs under the <Link href="/code-of-conduct">code of conduct</Link>.</p>
          </section>
        </div>
        <aside className="project-side" aria-label="Repos in this sprint">
          <div className="side-box">
            <span className="side-label">REPOS IN FOCUS</span>
            <ul className="side-links">
              {s.repos.map((slug) => {
                const r = findRepo(repos, slug);
                return r ? <li key={slug}><Link href={`/projects/${slug}`}>itc/{r.name} →</Link></li> : null;
              })}
            </ul>
          </div>
          <div className="side-box">
            <span className="side-label">MENTORS</span>
            <p className="side-big">TBA</p>
            <p className="side-fine">Maintainers on call for the week. Names posted with the dates.</p>
          </div>
        </aside>
      </div>

      <Link href="/sprints" className="next-strip">
        <span>ALL SPRINTS</span>
        <b>← BACK TO THE LIST</b>
      </Link>
    </>
  );
}
