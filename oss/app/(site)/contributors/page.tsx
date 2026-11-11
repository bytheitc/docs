import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/Prose";
import { PageHead } from "@/components/PageHead";
import { getContributionKinds, getContributors } from "@/lib/data";
import { PORTAL_URL } from "@/lib/houses";
import { getPortalWall } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Contributors",
  description: "The hall of contributors to ITC Open Source, and how your name gets on it.",
};

const EMPTY_SLOTS = 12;

const EXAMPLE = `handle   your-github-handle
name     Your Name            (optional)
kinds    code, docs
repos    mizan-ui`;

export default async function ContributorsPage() {
  const [CONTRIBUTORS, CONTRIBUTION_KINDS, portalWall] = await Promise.all([getContributors(), getContributionKinds(), getPortalWall()]);
  const empty = CONTRIBUTORS.length === 0;
  return (
    <>
      <PageHead
        crumbs={[{ href: "/contributors", label: "CONTRIBUTORS" }]}
        kicker={empty ? "[0] NAMES · THE WALL IS EMPTY" : `[${CONTRIBUTORS.length}] NAMES`}
        title={<>THE WALL.<br /><span className="hl">YOUR NAME HERE.</span></>}
        lede={<p>Everyone who has built the commons, in the order they arrived. No names are made up. The wall fills one merged contribution at a time.</p>}
      />

      <section className="block">
        <h2 className="block-title"><span>HALL OF CONTRIBUTORS</span><small>{empty ? "waiting for the first one" : "thank you"}</small></h2>
        <ul className="wall">
          {CONTRIBUTORS.map((c) => (
            <li key={c.handle} className="wall-card">
              <b>@{c.handle}</b>
              {c.name && <span>{c.name}</span>}
              <small>{c.kinds.join(" · ")} — {c.repos.join(", ")}</small>
            </li>
          ))}
          {Array.from({ length: Math.max(0, EMPTY_SLOTS - CONTRIBUTORS.length) }, (_, i) => (
            <li key={`slot-${i}`} className="wall-card wall-slot" aria-hidden={i > 0 ? true : undefined}>
              <span className="slot-n">#{String(CONTRIBUTORS.length + i + 1).padStart(3, "0")}</span>
              <b>YOUR NAME HERE</b>
              <small>open slot</small>
            </li>
          ))}
        </ul>
        <div className="wall-cta">
          <p>{empty ? "Nobody's on the wall yet. Be first." : "There's always room for one more."}</p>
          <Link href="/contribute" className="btn">MAKE YOUR FIRST PR →</Link>
        </div>
      </section>

      <section className="block">
        <h2 className="block-title"><span>ON THE CONTRIBUTOR PORTAL</span><small>{portalWall ? `[${portalWall.length}] opted in` : "portal unreachable"}</small></h2>
        {portalWall && portalWall.length > 0 ? (
          <ul className="wall">
            {portalWall.map((p) => (
              <li key={p.handle} className="wall-card">
                <a href={p.profileUrl}><b>@{p.handle}</b></a>
                <span>{p.name}</span>
                <small>joined {p.joined}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="wall-note">{portalWall ? "Nobody has opted in on the portal yet." : "The contributor portal couldn't be reached just now."}</p>
        )}
        <div className="wall-cta">
          <p>Connect GitHub (or GitLab, Codeberg, Hugging Face…) on the portal, then switch on “show me on the wall”. Listed alphabetically. No rankings, ever.</p>
          <a href={`${PORTAL_URL}/contributors`} className="btn">OPEN THE PORTAL WALL →</a>
        </div>
      </section>

      <section className="block">
        <h2 className="block-title"><span>WHAT COUNTS</span><small>more than code</small></h2>
        <ul className="kinds">
          {CONTRIBUTION_KINDS.map((k) => (
            <li key={k.kind}><b>{k.label}</b><p>{k.body}</p></li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h2 className="block-title"><span>HOW NAMES GET ADDED</span><small>by pull request, like everything else</small></h2>
        <div className="doc-body doc-body-solo">
          <section className="doc-sec">
            <ol className="prose-steps">
              <li>Your contribution is merged, or a maintainer records a non-code contribution (review, triage, translation, design, sprint mentoring).</li>
              <li>The merging maintainer adds your entry to the wall, or you ask for it in your PR and link your contribution.</li>
              <li>You choose what&apos;s shown: GitHub handle is required, display name is optional. Want to stay off the wall? Say so and you stay off.</li>
              <li>A maintainer publishes the entry. You&apos;re on the wall.</li>
            </ol>
            <CodeBlock code={EXAMPLE} lang="text" title="the entry" />
          </section>
        </div>
      </section>
    </>
  );
}
