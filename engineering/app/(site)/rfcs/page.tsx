import type { Metadata } from "next";
import Link from "next/link";
import { Chip, PageHead, Section } from "@/components/Sheet";
import { getRfcs, getTeams } from "@/lib/data";
import { findTeam } from "@/lib/teams";

export const metadata: Metadata = {
  title: "RFCs",
  description: "Public index of ITC engineering design decisions, with the reasoning behind each.",
};

export default async function RfcIndex() {
  const [rfcs, teams] = await Promise.all([getRfcs(), getTeams()]);
  return (
    <>
      <PageHead
        trail={[{ label: "RFCs" }]}
        sheet="Sheet 03 · Design decisions"
        title="Decisions, with the reasoning."
        lede="Every decision that crosses a team or house boundary is proposed, discussed and recorded here, including the ones we rejected or later replaced."
        block={[["Records", String(rfcs.length)], ["Process", <Link key="p" href="/handbook/rfc-process" className="u">H-03 RFC process</Link>], ["Visibility", "Public"], ["Dates", "— (placeholder)"]]}
      />
      <Section id="index" num="03.1" title="Index" note="placeholder records">
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Author team</th><th>Date</th></tr></thead>
            <tbody>
              {rfcs.map((r) => (
                <tr key={r.id}>
                  <td className="mono">RFC-{r.id}</td>
                  <td className="strong"><Link href={`/rfcs/${r.id}`} className="row-link">{r.title}</Link></td>
                  <td><Chip kind={r.status} /></td>
                  <td className="mono"><Link href={`/teams/${r.team}`} className="u">{findTeam(teams, r.team)?.name}</Link></td>
                  <td className="mono">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section id="legend" num="03.2" title="Status legend">
        <dl className="spec-dl wide">
          <div><dt><Chip kind="draft" /></dt><dd>Still being written. Feedback welcome, not expected.</dd></div>
          <div><dt><Chip kind="proposed" /></dt><dd>Open for comment during its review window.</dd></div>
          <div><dt><Chip kind="accepted" /></dt><dd>Decided. Implementation may begin.</dd></div>
          <div><dt><Chip kind="superseded" /></dt><dd>Replaced by a later RFC, which is linked.</dd></div>
          <div><dt><Chip kind="withdrawn" /></dt><dd>Not proceeding. Kept for the record.</dd></div>
        </dl>
      </Section>
    </>
  );
}
