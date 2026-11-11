import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Section } from "@/components/Sheet";
import { getPosts, getTeams } from "@/lib/data";
import { findTeam } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Blog",
  description: "Engineering write-ups and blameless incident reviews from ITC Engineering.",
};

export default async function BlogIndex() {
  const [posts, teams] = await Promise.all([getPosts(), getTeams()]);
  const writeups = posts.filter((p) => p.kind === "write-up");
  const reviews = posts.filter((p) => p.kind === "incident review");
  return (
    <>
      <PageHead
        trail={[{ label: "Blog" }]}
        sheet="Sheet 04 · Field notes"
        title="Write-ups and incident reviews."
        lede="What we built, what broke, and what we changed. Incident reviews are blameless: we fix systems, not people."
        block={[["Write-ups", String(writeups.length)], ["Incident reviews", String(reviews.length)], ["Format", <Link key="f" href="/handbook/on-call-and-incidents#reviews" className="u">H-04 Reviews</Link>], ["Dates", "— (placeholder)"]]}
      />
      {[{ id: "write-ups", num: "04.1", title: "Write-ups", list: writeups }, { id: "incident-reviews", num: "04.2", title: "Incident reviews", list: reviews }].map((g) => (
        <Section key={g.id} id={g.id} num={g.num} title={g.title} note="placeholder posts">
          <ol className="post-list">
            {g.list.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`}>
                  <span className="mono pl-num">{p.num}</span>
                  <span className="pl-body">
                    <span className="pl-kind mono">{p.kind} · {findTeam(teams, p.team)?.name}</span>
                    <span className="pl-title">{p.title}</span>
                    <span className="pl-dek">{p.dek}</span>
                  </span>
                  <span className="mono pl-date">{p.date}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      ))}
    </>
  );
}
