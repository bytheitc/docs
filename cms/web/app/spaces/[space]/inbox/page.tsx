import Link from "next/link";
import { authed, enc, loadSpace, requireUser } from "@/lib/session";
import { SUBMISSION_STATUSES, fmt, type Submission, type SubmissionStatus } from "@/lib/types";

export const metadata = { title: "Inbox" };

type Props = { params: Promise<{ space: string }>; searchParams: Promise<{ status?: string; form?: string }> };

export default async function Inbox({ params, searchParams }: Props) {
  await requireUser();
  const { space: sid } = await params;
  const { space } = await loadSpace(sid);
  const { status, form } = await searchParams;
  const st = SUBMISSION_STATUSES.includes(status as SubmissionStatus) ? (status as SubmissionStatus) : undefined;
  const qs = new URLSearchParams({ ...(st ? { status: st } : {}), ...(form ? { form } : {}) }).toString();
  const { submissions } = await authed<{ submissions: Submission[] }>(`/v1/spaces/${enc(space.id)}/inbox${qs ? `?${qs}` : ""}`);
  const forms = Object.entries(space.forms);
  const base = `/spaces/${space.id}/inbox`;

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Inbox</p>
        <h1>Form submissions</h1>
        <p className="cms-muted">What people send through the site&rsquo;s forms. Treat it as held in trust: share only with those who need it.</p>
      </header>

      <form className="cms-filters">
        <label className="cms-sr" htmlFor="st">Status</label>
        <select id="st" name="status" defaultValue={st ?? ""}>
          <option value="">All statuses</option>
          {SUBMISSION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {forms.length > 0 && (
          <>
            <label className="cms-sr" htmlFor="fm">Form</label>
            <select id="fm" name="form" defaultValue={form ?? ""}>
              <option value="">All forms</option>
              {forms.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </>
        )}
        <button type="submit" className="cms-btn">Filter</button>
      </form>

      {submissions.length ? (
        <div className="cms-tablewrap">
          <table className="cms-table">
            <thead><tr><th scope="col">Received</th><th scope="col">Form</th><th scope="col">From</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`${base}/${s.id}`} className="cms-rowlink">{fmt(s.createdAt)}</Link></td>
                  <td>{space.forms[s.form] ?? s.form}</td>
                  <td><Link href={`${base}/${s.id}`}>{s.data.name || s.data.email || "Open"}</Link></td>
                  <td><span className={`cms-chip i-${s.status}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cms-muted">{forms.length ? "Nothing here." : "This space has no public forms yet, so nothing arrives here."}</p>
      )}
    </div>
  );
}
