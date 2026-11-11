import { getMilestones } from "@/lib/data";
import { requireStaff } from "@/lib/staff-session";
import { cmsSpaceUrl } from "@/lib/util";

export const metadata = { title: "Recognition" };

/**
 * Milestones are edited in the Studio like any other content; this page is the portal's view of them,
 * so a steward can see what contributors are working towards without leaving the tools.
 */
export default async function StaffRecognition() {
  await requireStaff("/staff/recognition");
  const milestones = await getMilestones();

  return (
    <>
      <div className="cms-head-row">
        <p className="cms-muted">
          Milestones are private: each contributor sees only their own. There are no points and nothing is ranked.
          Only published milestones reach contributors.
        </p>
        <a href={cmsSpaceUrl("c/milestones")} className="cms-btn primary">Edit in the Studio</a>
      </div>
      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead><tr><th scope="col">Milestone</th><th scope="col">Reached when</th></tr></thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.id}>
                <td><span className="cms-rowlink">{m.title}</span><div className="pa-desc">{m.description}</div></td>
                <td>{m.rule}{m.rule === "kind" ? ` (${m.kind ?? "?"})` : ""} ≥ {m.threshold}</td>
              </tr>
            ))}
            {!milestones.length && <tr><td colSpan={2} className="cms-muted">No published milestones yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
