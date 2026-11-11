import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Khatam } from "@/components/Khatam";
import { PageHead } from "@/components/PageHead";
import { CodeBlock, Inline } from "@/components/Prose";
import { house } from "@/lib/houses";
import { getRepo, getRepos, getSettings } from "@/lib/data";
import { repoUrl } from "@/lib/site";
import { claimUrl } from "@/lib/portal";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getRepos()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getRepo(slug);
  if (!repo) return { title: "Not found" };
  return { title: `itc/${repo.name}`, description: repo.desc };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const repo = await getRepo(slug);
  if (!repo) notFound();
  const [REPOS, settings] = await Promise.all([getRepos(), getSettings()]);
  const owner = house(repo.houseId);
  const url = repoUrl(settings.githubOrgUrl, repo.slug); // TODO(launch): placeholder org, set in Site settings
  const idx = REPOS.findIndex((r) => r.slug === repo.slug);
  const next = REPOS[(idx + 1) % REPOS.length];

  return (
    <>
      <PageHead
        crumbs={[{ href: "/projects", label: "PROJECTS" }, { href: `/projects/${repo.slug}`, label: repo.name.toUpperCase() }]}
        kicker={`${repo.lang.toUpperCase()} · ${repo.license} · ${owner.name.toUpperCase()} HOUSE`}
        title={<><span className="dim">itc/</span>{repo.name}</>}
        lede={<p>{repo.desc}</p>}
      >
        <div className="head-actions">
          <a className="btn" href={url} rel="noreferrer">VIEW SOURCE ↗</a>
          <a className="btn btn-ghost" href="#issues">GOOD FIRST ISSUES [{repo.issues.length}]</a>
        </div>
      </PageHead>

      <div className="project">
        <div className="project-main">
          <section className="doc-sec" id="overview">
            <h2>README</h2>
            {repo.overview.map((p, i) => <p key={i}><Inline text={p} /></p>)}
            <ul className="prose-list">
              {repo.features.map((f) => <li key={f}><Inline text={f} /></li>)}
            </ul>
          </section>
          <section className="doc-sec" id="install">
            <h2>INSTALL</h2>
            <CodeBlock code={repo.install.code} lang={repo.install.lang} title="install" />
            <p className="note note-mint">Package names are placeholders. Nothing is published yet.</p>
          </section>
          <section className="doc-sec" id="usage">
            <h2>USAGE</h2>
            <CodeBlock code={repo.usage.code} lang={repo.usage.lang} title="quick start" />
          </section>
          <section className="doc-sec" id="issues">
            <h2>GOOD FIRST ISSUES</h2>
            <p>Scoped small, explained properly, and a maintainer has promised to help. Claim one on the contributor portal (it assigns the issue to you), or comment <b>&quot;I&apos;ll take this&quot;</b> on GitHub. New here? <Link href="/contribute">Read the guide first.</Link></p>
            <ol className="issues issues-boxed">
              {repo.issues.map((i, n) => {
                const claim = i.number ? claimUrl(url, i.number) : null;
                return (
                  <li key={i.title}>
                    <a href={i.number ? `${url}/issues/${i.number}` : `${url}/issues`} rel="noreferrer">
                      <span className="i-n">#{i.number ?? String(n + 1).padStart(2, "0")}</span>
                      <span className="i-title">{i.title}</span>
                      <span className="i-label">{i.label}</span>
                    </a>
                    {claim && <a className="i-claim" href={claim}>CLAIM ON THE PORTAL →</a>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="project-side" aria-label="Project facts">
          <div className="side-box side-house">
            <span className="side-label">OWNING HOUSE</span>
            <a href={owner.url} className="side-house-link">
              <Khatam variant={owner.id} className="side-mark" strokeWidth={7} accent="var(--mint)" />
              <span>
                <b>ITC {owner.name.toUpperCase()}</b>
                <span lang="ar" className="side-ar">{owner.arabic}</span>
                <small>{owner.transliteration} · {owner.sense}</small>
              </span>
            </a>
          </div>
          <div className="side-box">
            <span className="side-label">MAINTAINERS</span>
            <dl className="side-dl">
              {repo.maintainers.map((m) => (
                <div key={m.role}><dt>{m.role}</dt><dd>{m.name}</dd></div>
              ))}
            </dl>
            <p className="side-fine">Seats open. <Link href="/governance#maintainers">How to become one →</Link></p>
          </div>
          <div className="side-box">
            <span className="side-label">LICENSE</span>
            <p className="side-big">{repo.license}</p>
            <p className="side-fine">OSI-approved. No CLA. <Link href="/governance#licensing">Licensing policy →</Link></p>
          </div>
          <div className="side-box">
            <span className="side-label">LINKS</span>
            <ul className="side-links">
              <li><a href={url} rel="noreferrer">Repository ↗</a></li>
              <li><a href={`${url}/issues`} rel="noreferrer">Issues ↗</a></li>
              <li><a href={`${url}/blob/main/CONTRIBUTING.md`} rel="noreferrer">CONTRIBUTING.md ↗</a></li>
              <li><Link href="/code-of-conduct">Code of conduct</Link></li>
            </ul>
            <p className="side-fine">Repo URLs are placeholders.</p>
          </div>
        </aside>
      </div>

      <Link href={`/projects/${next.slug}`} className="next-strip">
        <span>NEXT REPO</span>
        <b>itc/{next.name} →</b>
      </Link>
    </>
  );
}
