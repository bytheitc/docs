import type { Metadata } from "next";
import Link from "next/link";
import { Chip, PageHead, Section } from "@/components/Sheet";
import { getPlatforms, getStatusSheet, getTeams } from "@/lib/data";
import { statusChip } from "@/lib/status";
import { findTeam } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Status",
  description: "System status for ITC platforms. Placeholder: no live monitoring is connected yet.",
};

export default async function Status() {
  const [platforms, teams, sheet] = await Promise.all([getPlatforms(), getTeams(), getStatusSheet()]);
  const reading = (slug: string) => sheet.readings.find((r) => r.platform === slug);
  return (
    <>
      <PageHead
        trail={[{ label: "Status" }]}
        sheet="Sheet 07 · System status"
        title="Status sheet."
        lede={sheet.feed === "not connected"
          ? "Current state of each shared platform. This page is a placeholder: it is not connected to monitoring, so every reading below is unknown."
          : "Current state of each shared platform. Platforms without a reading show “no data”."}
        block={[["Feed", sheet.feed], ["Source", <Link key="m" href="/platforms/manara" className="u">Manara status feed</Link>], ["Last checked", sheet.lastChecked || "—"], ["Open incidents", sheet.openIncidents || "—"]]}
      />
      {sheet.banner && <div className="banner mono" role="note">{sheet.banner}</div>}
      <Section id="platforms" num="07.1" title="Platforms">
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>ID</th><th>Platform</th><th>Owner</th><th>Current</th><th>Uptime (90d)</th><th>Last incident</th></tr></thead>
            <tbody>
              {platforms.map((p) => {
                const r = reading(p.slug);
                const current = r?.current ?? "no data";
                return (
                <tr key={p.slug}>
                  <td className="mono">{p.id}</td>
                  <td className="strong"><Link href={`/platforms/${p.slug}`} className="row-link">{p.name}</Link></td>
                  <td className="mono">{findTeam(teams, p.owner)?.code}</td>
                  <td><Chip kind={statusChip(current)}>{current}</Chip></td>
                  <td className="mono">{r?.uptime || "—"}</td>
                  <td className="mono">{r?.lastIncident || "—"}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
      <Section id="incidents" num="07.2" title="Incident history">
        {sheet.incidents.length > 0 ? (
          <div className="table-wrap">
            <table className="spec">
              <thead><tr><th>Date</th><th>Incident</th><th>Severity</th><th>Summary</th></tr></thead>
              <tbody>
                {sheet.incidents.map((x, k) => (
                  <tr key={`${x.date}-${k}`}>
                    <td className="mono">{x.date}</td>
                    <td className="strong">{x.href ? <Link href={x.href} className="row-link">{x.title}</Link> : x.title}</td>
                    <td className="mono">{x.severity || "—"}</td>
                    <td>{x.summary || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No incident feed connected. Published reviews are on the <Link href="/blog#incident-reviews" className="u">blog</Link>.</p>
        )}
      </Section>
      <Section id="report" num="07.3" title="Report a problem">
        <dl className="spec-dl wide">
          <div><dt className="mono">Something broken</dt><dd><a href="mailto:engineering@example.org" className="u">engineering@example.org</a></dd></div>
          <div><dt className="mono">Security issue</dt><dd><a href="mailto:security@example.org" className="u">security@example.org</a> · see <Link href="/handbook/security-basics#reporting" className="u">H-07</Link></dd></div>
          <div><dt className="mono">Severity levels</dt><dd><Link href="/handbook/on-call-and-incidents#severity" className="u">H-04 · Severity</Link></dd></div>
        </dl>
      </Section>
    </>
  );
}
