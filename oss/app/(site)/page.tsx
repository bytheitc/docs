import Link from "next/link";
import { RepoIndex } from "@/components/RepoIndex";
import { getRepos } from "@/lib/data";
import { featuredIssues } from "@/lib/repos";
import { house } from "@/lib/houses";

const STEPS = [
  { n: "01", title: "PICK", body: "Find an issue labeled good-first-issue, or open one for the bug that's been bugging you." },
  { n: "02", title: "FORK", body: "Fork, branch, and run `bayt up`. Every repo boots with one command." },
  { n: "03", title: "FIX", body: "Small PRs, clear commits, tests where it counts. Ask in the issue if you get stuck." },
  { n: "04", title: "SHIP", body: "A maintainer reviews within a week. Merged means you're a contributor. Welcome." },
];

const POLICY = [
  { k: "LICENSES", v: "OSI-approved only" },
  { k: "CLA", v: "None. Your code stays yours" },
  { k: "GOVERNANCE", v: "Public RFCs, open roadmaps" },
  { k: "TELEMETRY", v: "Off. Always" },
];

export default async function OSSHome() {
  const self = house("oss");
  const REPOS = await getRepos();
  const ISSUES = featuredIssues(REPOS);
  const marquee = REPOS.map((r) => `itc/${r.name}`);
  return (
    <>
        <section className="hero">
          <div className="hero-ar" lang="ar" aria-hidden="true">{self.arabic}</div>
          <h1>
            <span>FORK IT.</span>
            <span>FIX IT.</span>
            <span className="hl">SHIP IT.</span>
          </h1>
          <div className="hero-foot">
            <p>
              <b>{self.transliteration.toUpperCase()}</b>: the commons. Land, water and pasture held in common so all can use it.
              Our code works the same way. Built by the Islamic Tech Collective, owned by no one, open to everyone.
            </p>
            <dl className="policy">
              {POLICY.map((p) => (
                <div key={p.k}><dt>{p.k}</dt><dd>{p.v}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...marquee, ...marquee].map((m, i) => <span key={i}>{m} <i>✦</i></span>)}
          </div>
        </div>

        <section id="repos" className="block">
          <h2 className="block-title"><span>REPOS</span><small>[{REPOS.length}] · placeholder</small></h2>
          <RepoIndex repos={REPOS} />
          <Link href="/projects" className="block-more">ALL PROJECTS →</Link>
        </section>

        <section id="issues" className="block split">
          <h2 className="block-title"><span>GOOD FIRST ISSUES</span><small>start here</small></h2>
          <ol className="issues">
            {ISSUES.map((i, n) => (
              <li key={i.title}>
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

        <section id="contribute" className="block">
          <h2 className="block-title"><span>HOW TO CONTRIBUTE</span><small>4 steps, no gatekeeping</small></h2>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="s-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
          <Link href="/contribute" className="block-more">THE FULL FIRST-TIMER&apos;S GUIDE →</Link>
        </section>

        <section id="adab" className="adab">
          <div className="adab-ar" lang="ar" aria-hidden="true">أدب</div>
          <div>
            <h2>ADAB IS NOT OPTIONAL.</h2>
            <p>
              <b>Adab</b> means good conduct, the manners of a person of knowledge. Critique the code, never the coder.
              Assume good faith. Make room for beginners. Our code of conduct applies in every repo, issue and chat,
              and maintainers enforce it.
            </p>
            <Link href="/code-of-conduct" className="btn">READ THE CODE OF CONDUCT →</Link>
          </div>
        </section>
    </>
  );
}
