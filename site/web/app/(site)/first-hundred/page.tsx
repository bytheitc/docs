import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { getFirstHundred, type FirstHundredTask } from "@/lib/api";
import { PORTAL_URL } from "@/lib/houses";

export const metadata: Metadata = {
  title: "The First Hundred",
  description: "Real tasks on four open projects: signed chains of ijazah, Qur'an-aware khutbah transcripts, Hifz Trail and Zakat Kit. Pick one, claim it, open a pull request.",
};

// The board is rebuilt from GitHub at most once a minute (portal/api); this page follows it.
export const revalidate = 60;

const GITHUB_SEARCH = "https://github.com/search?q=org%3Abytheitc+label%3Afirst-hundred+is%3Aissue+is%3Aopen&type=issues";
const ZAKAT_SCENARIO = "https://github.com/bytheitc/zakat/issues/new?template=scenario.yml";

const TRACK_LABEL: Record<string, string> = {
  code: "Code", tests: "Tests", docs: "Docs", design: "Design", accessibility: "Accessibility", writing: "Writing", other: "Other",
};

// What each project is, in a sentence. A repository not listed here still shows, under its name.
const PROJECTS: Record<string, { name: string; ar?: string; line: string }> = {
  "bytheitc/ijaazah": { name: "Ijaazah", ar: "إجازة", line: "The isnad as a protocol: ijazahs signed by the teacher who grants them, carrying their whole chain, verifiable by anyone, offline. Go." },
  "bytheitc/khutbah": { name: "Khutbah", ar: "خطبة", line: "Finds the Qur'an in khutbah transcripts, even where speech recognition garbled it, and puts back the exact text with its reference. Python." },
  "bytheitc/hifz": { name: "Hifz Trail", ar: "حفظ", line: "A revision schedule for what you have memorised, in the order of the mushaf, private by default. TypeScript and Next.js." },
  "bytheitc/zakat": { name: "Zakat Kit", ar: "زكاة", line: "Works out the zakat you owe, in your currency, from every account you hold, with the working shown. Includes tools for businesses. TypeScript and Next.js." },
};

// The portal's board carries each task's claim link; a board built straight from GitHub (when the
// portal can't be reached) doesn't, so the same link is made here.
const claimUrlFor = (t: FirstHundredTask) => `${PORTAL_URL}/claim?provider=github&repo=${encodeURIComponent(t.repo)}&issue=${t.number}`;

function Task({ t }: { t: FirstHundredTask }) {
  return (
    <li className={`fh-task is-${t.state}`}>
      <p className="fh-ref"><span>{TRACK_LABEL[t.track] ?? t.track}</span> #{t.number}</p>
      <h3>{t.title}</h3>
      <div className="fh-actions">
        {t.state === "open" && <a className="btn btn-small" href={t.claimUrl ?? claimUrlFor(t)} data-itc-event="First Hundred: claim">Claim it</a>}
        {t.state === "claimed" && <span className="fh-state">Someone is on it</span>}
        {t.state === "done" && <span className="fh-state">Done</span>}
        <a className="text-link" href={t.url} rel="noopener noreferrer" target="_blank">Read the issue</a>
      </div>
    </li>
  );
}

export default async function FirstHundredPage() {
  const board = await getFirstHundred();
  const portal = PORTAL_URL;
  const goal = board?.goal ?? 100;
  const done = board?.done ?? 0;
  const pct = Math.min(100, Math.round((done / goal) * 100));

  return (
    <>
      <PageHero
        eyebrow="The First Hundred"
        title={<>A hundred small things, <em>done together</em>.</>}
        lede="The Collective opens with its doors open. Four projects, each a piece of technology in service of the Qur'an, the Sunnah and the people who keep them, with real tasks on each, scoped and explained. Pick one, claim it, and send a pull request."
      >
        <div className="fh-progress" role="group" aria-label="Progress">
          <p className="fh-count"><strong>{done}</strong> of {goal} done</p>
          <div className="fh-bar" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={done} aria-label={`${done} of ${goal} tasks done`}><span style={{ width: `${pct}%` }} /></div>
          {board && board.total > 0 && <p className="fh-sub">{board.open} open · {board.claimed} being worked on</p>}
        </div>
      </PageHero>

      <section className="fh-steps" aria-labelledby="fh-how">
        <h2 id="fh-how" className="sr-only">How it works</h2>
        <ol>
          <li><span className="way-n">01</span><h3>Pick a task</h3><p>Choose one below. Each links to its GitHub issue, which says what done looks like.</p></li>
          <li><span className="way-n">02</span><h3>Claim it on the portal</h3><p>Sign in with GitHub. Claiming tells everyone it’s yours, so two people don’t do the same work. One at a time.</p></li>
          <li><span className="way-n">03</span><h3>Open a pull request</h3><p>Write “Fixes #” and the issue number in its description. Ask on the issue if you get stuck. That’s what it’s for.</p></li>
          <li><span className="way-n">04</span><h3>A maintainer merges it</h3><p>Once it’s merged the issue closes, the task turns to done here, and it counts on your portal profile.</p></li>
        </ol>
      </section>

      <section className="fh-board" aria-labelledby="fh-tasks">
        <div className="section-head">
          <p className="eyebrow">The tasks</p>
          <h2 id="fh-tasks">Pick one.</h2>
          {board?.stale && <p className="fine-note">GitHub isn’t answering right now, so this list may be a few minutes behind.</p>}
          {board?.claimsUnknown && <p className="fine-note">Claims can’t be shown right now, so check the issue on GitHub to see whether someone is already on it.</p>}
        </div>

        {!board ? (
          <div className="fh-empty">
            <p>The board can’t be loaded right now. The same tasks are on GitHub, labelled <code>first-hundred</code>.</p>
            <a className="btn btn-ghost" href={GITHUB_SEARCH} rel="noopener noreferrer">Browse them on GitHub</a>
          </div>
        ) : board.total === 0 ? (
          <div className="fh-empty">
            <p>The first tasks go up very soon. Get ready by signing in to the portal and linking your GitHub account.</p>
            <a className="btn" href={`${portal}/sign-in`}>Go to the portal</a>
          </div>
        ) : (
          (board.projects ?? [...new Set(board.tasks.map((t) => t.repo))].map((repo) => ({ repo, total: 0, done: 0 }))).map((p) => {
            const info = PROJECTS[p.repo];
            const tasks = board.tasks.filter((t) => t.repo === p.repo);
            return (
              <div key={p.repo} className="fh-track">
                <div className="fh-project">
                  <h3 className="fh-track-title">
                    <span>{info?.name ?? p.repo.split("/")[1]}{info?.ar && <span className="fh-ar" lang="ar" dir="rtl">{info.ar}</span>}</span>
                    <span className="fh-tally">{tasks.filter((t) => t.state === "done").length} of {tasks.length} done</span>
                  </h3>
                  {info && <p className="fh-line">{info.line} <a className="text-link" href={`https://github.com/${p.repo}`} rel="noopener noreferrer">The repository</a></p>}
                </div>
                <ul className="fh-tasks">
                  {tasks.map((t) => <Task key={`${t.repo}#${t.number}`} t={t} />)}
                </ul>
              </div>
            );
          })
        )}
      </section>

      <section className="fh-zakat" aria-labelledby="fh-zakat">
        <div>
          <p className="eyebrow">Zakat Kit</p>
          <h2 id="fh-zakat">Tell us your zakat situation.</h2>
          <p>Zakat Kit isn’t open to code contributions yet, but it can learn from real cases. Describe one: what you own, what you owe, and the school of thought you follow. We’ll check the calculator against it, and every case that holds up becomes a permanent test.</p>
          <p className="fine-note">You need a GitHub account. Leave out anything that identifies you; round figures are fine.</p>
        </div>
        <a className="btn" href={ZAKAT_SCENARIO} rel="noopener noreferrer" data-itc-event="First Hundred: zakat scenario">Suggest a scenario</a>
      </section>

      <section className="cta-band fh-note">
        <p>No prizes and no leaderboard. Just useful work, done well, for people who need it.</p>
      </section>
    </>
  );
}
