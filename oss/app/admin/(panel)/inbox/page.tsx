import Link from "next/link";
import { requireUser } from "@/lib/cms/auth";
import { FORMS } from "@/lib/cms/collections";
import { requireStorage } from "@/lib/cms/storage";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/cms/types";

export const metadata = { title: "Inbox" };

type Props = { searchParams: Promise<{ status?: string; form?: string }> };

export default async function Inbox({ searchParams }: Props) {
  await requireUser();
  const { status, form } = await searchParams;
  const st = SUBMISSION_STATUSES.includes(status as SubmissionStatus) ? (status as SubmissionStatus) : undefined;
  const subs = await requireStorage().listSubmissions({ status: st, form: form || undefined });
  const forms = Object.entries(FORMS);

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

      {subs.length ? (
        <div className="cms-tablewrap">
          <table className="cms-table">
            <thead><tr><th scope="col">Received</th><th scope="col">Form</th><th scope="col">From</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/admin/inbox/${s.id}`} className="cms-rowlink">{s.createdAt.toLocaleString("en-GB")}</Link></td>
                  <td>{FORMS[s.form] ?? s.form}</td>
                  <td><Link href={`/admin/inbox/${s.id}`}>{s.data.name || s.data.email || "Open"}</Link></td>
                  <td><span className={`cms-chip i-${s.status}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cms-muted">{forms.length ? "Nothing here." : "This site has no public forms yet, so nothing arrives here."}</p>
      )}
    </div>
  );
}
