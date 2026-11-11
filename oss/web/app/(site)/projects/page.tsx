import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { RepoIndex } from "@/components/RepoIndex";
import { getRepos } from "@/lib/data";
import { allIssues } from "@/lib/repos";

export const metadata: Metadata = {
  title: "Projects",
  description: "Every ITC Open Source repo: what it does, who owns it, and where to start.",
};

export default async function ProjectsPage() {
  const REPOS = await getRepos();
  const ALL_ISSUES = allIssues(REPOS);
  return (
    <>
      <PageHead
        crumbs={[{ href: "/projects", label: "PROJECTS" }]}
        kicker={`[${REPOS.length}] REPOS · PLACEHOLDER`}
        title={<>EVERY REPO.<br /><span className="hl">PICK ONE.</span></>}
        lede={<p>Libraries and tools held in common by the collective. Each one has a house that stewards it, a licence you can read in one sitting, and issues waiting for someone like you.</p>}
        arabic={{ word: "مشاع", translit: "mashāʿ", sense: "the commons" }}
      />
      <section className="block">
        <h2 className="block-title"><span>INDEX</span><small>grep it, filter it, open it</small></h2>
        <RepoIndex repos={REPOS} />
      </section>
      <section className="block">
        <h2 className="block-title"><span>ALL GOOD FIRST ISSUES</span><small>[{ALL_ISSUES.length}] across every repo</small></h2>
        <ol className="issues">
          {ALL_ISSUES.map((i, n) => (
            <li key={`${i.repo}-${i.title}`}>
              <Link href={`/projects/${i.repo}#issues`}>
                <span className="i-n">#{String(n + 1).padStart(2, "0")}</span>
                <span className="i-repo">{i.repo}</span>
                <span className="i-title">{i.title}</span>
                <span className="i-label">{i.label}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section className="cta-strip">
        <p>WANT A NEW REPO IN THE COMMONS?</p>
        <Link href="/governance#rfcs" className="btn">WRITE AN RFC →</Link>
      </section>
    </>
  );
}
