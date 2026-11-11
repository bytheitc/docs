import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Section } from "@/components/Sheet";
import { getPlatforms, getTeams } from "@/lib/data";
import { platformsOwnedBy } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "Teams",
  description: "The five engineering teams of the Islamic Tech Collective and how to reach them.",
};

export default async function TeamsIndex() {
  const [teams, platforms] = await Promise.all([getTeams(), getPlatforms()]);
  return (
    <>
      <PageHead
        trail={[{ label: "Teams" }]}
        sheet="Sheet 05 · Teams"
        title="Five teams, one standard."
        lede="Every platform and every handbook chapter has an owning team. This is who they are and how to reach them."
      />
      <Section id="directory" num="05.1" title="Directory">
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>Code</th><th>Team</th><th>Scope</th><th>Owns</th><th>Reach</th></tr></thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.slug}>
                  <td><span className="team-code mono">{t.code}</span></td>
                  <td className="strong"><Link href={`/teams/${t.slug}`} className="row-link">{t.name}</Link></td>
                  <td>{t.summary}</td>
                  <td className="mono">{platformsOwnedBy(platforms, t.slug).map((p) => p.name).join(", ") || "—"}</td>
                  <td className="mono">{t.reach[0]?.value ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
