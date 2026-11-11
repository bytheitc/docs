import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Section } from "@/components/Sheet";
import { getChapters, getTeams } from "@/lib/data";
import { findTeam } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Handbook",
  description: "The ITC engineering handbook: practices, code review, RFCs, on-call, accessibility, privacy and security.",
};

export default async function HandbookIndex() {
  const [chapters, teams] = await Promise.all([getChapters(), getTeams()]);
  return (
    <>
      <PageHead
        trail={[{ label: "Handbook" }]}
        sheet="Sheet 02 · Engineering handbook"
        title="How we work, written down."
        lede="The handbook is the standard every ITC engineer and volunteer is held to. Each chapter has an owning team and changes through the RFC process, like any other design decision."
        block={[["Chapters", String(chapters.length)], ["Applies to", "All five houses"], ["Changes via", <Link key="r" href="/handbook/rfc-process" className="u">H-03 RFC process</Link>], ["Revision", "rev. 0.1 · draft"]]}
      />
      <Section id="contents" num="02.0" title="Contents">
        <ol className="toc">
          {chapters.map((c) => (
            <li key={c.slug}>
              <Link href={`/handbook/${c.slug}`}>
                <span className="mono toc-num">{c.num}</span>
                <span className="toc-body">
                  <span className="toc-title">{c.title}</span>
                  <span className="toc-sum">{c.summary}</span>
                </span>
                <span className="mono toc-meta">{findTeam(teams, c.owner)?.code} · {c.sections.length} §</span>
              </Link>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
