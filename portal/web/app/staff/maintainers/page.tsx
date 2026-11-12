import { unseatMaintainer } from "../actions";
import { SeatForm } from "./SeatForm";
import { staff } from "@/lib/portal";
import { atLeast, requireStaff } from "@/lib/staff-session";
import { fmtDate } from "@/lib/util";

export const metadata = { title: "Maintainers" };

/**
 * The governance page has maintainers nominate each other, which needs someone to already be one.
 * This page is only for that beginning, and for the steering seats; the path itself runs between
 * maintainers at /maintainers, where this tool cannot reach.
 */
export default async function StaffMaintainers() {
  const { token, user } = await requireStaff("/staff/maintainers");
  const result = await staff.maintainers(token);
  if (!result.ok) return <p className="cms-flash bad" role="alert">{result.message}</p>;

  const who = (id: string) => result.people[id]?.handle ?? id;
  const live = result.maintainerships.filter((m) => !m.endedAt);
  const past = result.maintainerships.filter((m) => m.endedAt);
  const open = result.nominations.filter((n) => n.status === "open");

  return (
    <>
      <p className="cms-muted">
        Maintainers are nominated by other maintainers, for work already done, and a nomination carries
        unless someone objects within seven days. That happens between them, not here. This page only
        seats the first maintainer of a repository, and the steering group.
      </p>

      <section className="cms-panel">
        <h2>In force</h2>
        <div className="cms-tablewrap">
          <table className="cms-table">
            <thead><tr><th scope="col">Person</th><th scope="col">Repository</th><th scope="col">Role</th><th scope="col">Since</th>{atLeast(user, "admin") && <th scope="col"><span className="cms-sr">Actions</span></th>}</tr></thead>
            <tbody>
              {live.map((m) => (
                <tr key={m.id}>
                  <td className="cms-mono">{who(m.contributorId)}</td>
                  <td>{m.repo === "*" ? <span className="cms-muted">collective-wide</span> : m.repo}</td>
                  <td><span className={`pa-chip ${m.role === "steering" ? "ok" : "muted"}`}>{m.role}</span></td>
                  <td className="cms-muted">{fmtDate(m.since)}{m.by ? ` · by ${who(m.by)}` : " · seated here"}</td>
                  {atLeast(user, "admin") && (
                    <td>
                      <form action={unseatMaintainer} className="pa-inline">
                        <input type="hidden" name="id" value={m.id} />
                        <label className="cms-sr" htmlFor={`note-${m.id}`}>Reason</label>
                        <input id={`note-${m.id}`} name="note" type="text" placeholder="Reason" maxLength={500} />
                        <button className="cms-btn" type="submit">Unseat</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {!live.length && <tr><td colSpan={atLeast(user, "admin") ? 5 : 4} className="cms-muted">Nobody is seated yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {open.length > 0 && (
        <section className="cms-panel">
          <h2>Nominations under way</h2>
          <p className="cms-muted">Read-only here. These settle by silence or by an objection from a maintainer of that repository.</p>
          <ul className="cms-list">
            {open.map((n) => (
              <li key={n.id}>
                <strong>{who(n.candidateId)}</strong> for <span className="cms-mono">{n.repo}</span>{" "}
                <span className="cms-muted">· by {who(n.nominatedBy)} · carries {fmtDate(n.closesAt)} · <a href={n.issueUrl} rel="noopener noreferrer" target="_blank">the issue</a></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {atLeast(user, "admin") && (
        <section className="cms-panel">
          <h2>Seat someone</h2>
          <SeatForm />
        </section>
      )}

      {past.length > 0 && (
        <section className="cms-panel">
          <h2>Past</h2>
          <ul className="cms-list">
            {past.map((m) => (
              <li key={m.id}>
                <strong>{who(m.contributorId)}</strong> · <span className="cms-mono">{m.repo}</span>{" "}
                <span className="cms-muted">· {m.endedReason} · {fmtDate(m.since)}–{fmtDate(m.endedAt!)}{m.endedNote ? ` · ${m.endedNote}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
