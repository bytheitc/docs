import type { Metadata } from "next";
import Link from "next/link";
import { PageIndex } from "@/components/PageIndex";
import { Chip, PageHead, Section } from "@/components/Sheet";
import { ApplyForm } from "@/components/ApplyForm";
import { roleCode } from "@/lib/careers";
import { getCareersPage, getRoles, getTeams } from "@/lib/data";
import { house } from "@/lib/houses";
import { findTeam } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Careers",
  description: "Open engineering roles at the Islamic Tech Collective, including volunteer roles, and how hiring works.",
};

const SECTIONS = [
  { id: "roles", num: "06.1", label: "Open roles" },
  { id: "hiring", num: "06.2", label: "How hiring works" },
  { id: "volunteering", num: "06.3", label: "Volunteering" },
  { id: "apply", num: "06.4", label: "Apply" },
];

export default async function Careers() {
  const [roles, teams, page] = await Promise.all([getRoles(), getTeams(), getCareersPage()]);
  return (
    <>
      <PageIndex sections={SECTIONS} />
      <PageHead
        trail={[{ label: "Careers" }]}
        sheet="Sheet 06 · Careers"
        title="Engineers who care how things are made."
        lede="Full-time, part-time and volunteer roles across every team. All roles are remote-friendly. The list below is placeholder; real openings will be posted here."
        block={[["Roles listed", String(roles.length)], ["Volunteer", String(roles.filter((r) => r.type === "Volunteer").length)], ["Location", "Remote"], ["Contact", page.email]]}
      />

      <Section id="roles" num="06.1" title="Open roles" note="placeholder list">
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>ID</th><th>Role</th><th>Team</th><th>Type</th><th>Location</th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{roleCode(r.id)}</td>
                  <td><span className="strong">{r.title}</span><br /><span className="muted">{r.summary}</span></td>
                  <td className="mono"><Link href={`/teams/${r.team}`} className="u">{findTeam(teams, r.team)?.code}</Link></td>
                  <td><Chip kind={r.type === "Volunteer" ? "volunteer" : "open"}>{r.type}</Chip></td>
                  <td className="mono">{r.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="hiring" num="06.2" title="How hiring works">
        <ol className="steps">
          {page.hiring.map((s, i) => (
            <li key={s.title}>
              <span className="mono step-n">06.2.{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="after muted">We publish the salary band with every paid role. We do not ask for unpaid take-home projects longer than a few hours.</p>
      </Section>

      <Section id="volunteering" num="06.3" title="Volunteering">
        <ol className="steps three">
          {page.volunteering.map((s, i) => (
            <li key={s.title}>
              <span className="mono step-n">06.3.{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="apply" num="06.4" title="Apply" className="join">
        <div className="join-box">
          <div>
            <h3>Tell us what you would build.</h3>
            <p>Use the form below, or email us and mention the role ID in your subject line. If nothing fits, write anyway.</p>
          </div>
          <div className="join-actions">
            <a className="btn" href={`mailto:${page.email}`}>{page.email} →</a>
            <a className="btn ghost" href={house("oss").url}>Contribute in the open →</a>
          </div>
        </div>
        <ApplyForm email={page.email} roles={roles.map((r) => ({ id: r.id, label: `${roleCode(r.id)} · ${r.title}` }))} />
      </Section>
    </>
  );
}
