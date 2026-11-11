import type { Metadata } from "next";
import Link from "next/link";
import { PageIndex } from "@/components/PageIndex";
import { Chip, PageHead, Section } from "@/components/Sheet";
import { getPlatforms, getTeams } from "@/lib/data";
import { findTeam } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Platforms",
  description: "The shared platforms every ITC house runs on: identity, deploys, encrypted storage, design system and local dev.",
};

const SECTIONS = [
  { id: "registry", num: "01.1", label: "Registry" },
  { id: "sheets", num: "01.2", label: "Spec sheets" },
  { id: "legend", num: "01.3", label: "Status legend" },
];

export default async function PlatformsIndex() {
  const [platforms, teams] = await Promise.all([getPlatforms(), getTeams()]);
  const owners = new Set(platforms.map((p) => p.owner)).size;
  return (
    <>
      <PageIndex sections={SECTIONS} />
      <PageHead
        trail={[{ label: "Platforms" }]}
        sheet="Sheet 01 · Platform registry"
        title="Shared ground for five houses."
        lede="Five platforms, each with an owning team, a runbook and a roadmap. Build on these instead of rebuilding sign-in, storage and deploys in every house."
        block={[["Platforms", String(platforms.length)], ["Owners", `${owners} team${owners === 1 ? "" : "s"}`], ["Registry", "placeholder"], ["Revision", "rev. 0.2"]]}
      />

      <Section id="registry" num="01.1" title="Registry" note="placeholder registry">
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>ID</th><th>Name</th><th>Purpose</th><th>Owner</th><th>Status</th></tr></thead>
            <tbody>
              {platforms.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.id}</td>
                  <td className="strong"><Link href={`/platforms/${p.slug}`} className="row-link">{p.name}</Link></td>
                  <td>{p.purpose}</td>
                  <td className="mono"><Link href={`/teams/${p.owner}`} className="u">{findTeam(teams, p.owner)?.name}</Link></td>
                  <td><Chip kind={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="sheets" num="01.2" title="Spec sheets">
        <div className="sheet-grid">
          {platforms.map((p) => (
            <Link key={p.slug} href={`/platforms/${p.slug}`} className="sheet-card">
              <div className="sc-top">
                <span className="mono sc-id">{p.id}</span>
                <Chip kind={p.status} />
              </div>
              <h3>{p.name}</h3>
              <p className="sc-word"><span className="ar" lang="ar">{p.arabic}</span> <span className="mono">{p.transliteration}</span> · {p.gloss}</p>
              <p>{p.summary}</p>
              <span className="more mono">Open sheet →</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="legend" num="01.3" title="Status legend">
        <dl className="spec-dl wide">
          <div><dt><Chip kind="stable" /></dt><dd>In production; breaking changes follow the deprecation policy.</dd></div>
          <div><dt><Chip kind="beta" /></dt><dd>In use by at least one house; interfaces may still change with notice.</dd></div>
          <div><dt><Chip kind="design" /></dt><dd>Being designed in the open through an RFC; not yet available.</dd></div>
        </dl>
      </Section>
    </>
  );
}
