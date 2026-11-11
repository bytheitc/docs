import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { getSettings, getSprints } from "@/lib/data";
import type { Sprint } from "@/lib/sprints";

export const metadata: Metadata = {
  title: "Commons Sprints",
  description: "Commons Sprints: short, focused weeks of building in the open. Upcoming and past sprints.",
};

function SprintCard({ s }: { s: Sprint }) {
  return (
    <li className="sprint">
      <Link href={`/sprints/${s.slug}`} className="sprint-link">
        <span className="sprint-code">{s.code} · {s.status === "upcoming" ? "UPCOMING" : "PAST"}</span>
        <span className="sprint-title">{s.title}</span>
        <span className="sprint-theme">{s.theme}</span>
        <span className="repo-meta">
          <span>DATES: {s.dates}</span>
          <span>{s.format}</span>
          <span className="gfi">{s.repos.map((r) => `itc/${r}`).join(" · ")}</span>
        </span>
      </Link>
    </li>
  );
}

export default async function SprintsPage() {
  const [SPRINTS, { contact: CONTACT }] = await Promise.all([getSprints(), getSettings()]);
  const upcoming = SPRINTS.filter((s) => s.status === "upcoming");
  const past = SPRINTS.filter((s) => s.status === "past");
  return (
    <>
      <PageHead
        crumbs={[{ href: "/sprints", label: "SPRINTS" }]}
        kicker="COMMONS SPRINTS · DATES TBA"
        title={<>ONE THEME.<br />ONE WEEK.<br /><span className="hl">SHIP IT.</span></>}
        lede={<p>A Commons Sprint is a short, focused push on one theme, with maintainers on call and first-timers paired with a reviewer. Online first, recorded for every time zone. Free, always.</p>}
      />
      <section className="block">
        <h2 className="block-title"><span>UPCOMING</span><small>[{upcoming.length}] · dates TBA</small></h2>
        <ul className="sprints">{upcoming.map((s) => <SprintCard key={s.slug} s={s} />)}</ul>
      </section>
      <section className="block">
        <h2 className="block-title"><span>PAST</span><small>[{past.length}] · write-ups pending</small></h2>
        <ul className="sprints">{past.map((s) => <SprintCard key={s.slug} s={s} />)}</ul>
      </section>
      <section className="cta-strip">
        <p>WANT TO RUN A SPRINT ON YOUR REPO?</p>
        <a href={`mailto:${CONTACT.sprints}`} className="btn">{CONTACT.sprints.toUpperCase()} →</a>
      </section>
    </>
  );
}
