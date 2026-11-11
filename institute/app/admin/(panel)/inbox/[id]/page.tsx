import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSubmission } from "@/app/admin/actions";
import { requireUser } from "@/lib/cms/auth";
import { FORMS } from "@/lib/cms/collections";
import { requireStorage } from "@/lib/cms/storage";
import { SUBMISSION_STATUSES } from "@/lib/cms/types";

export const metadata = { title: "Submission" };

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const sub = await requireStorage().getSubmission((await params).id);
  if (!sub) notFound();

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker"><Link href="/admin/inbox">Inbox</Link></p>
        <h1>{FORMS[sub.form] ?? sub.form}</h1>
        <p className="cms-meta"><span className={`cms-chip i-${sub.status}`}>{sub.status}</span><span className="cms-muted">Received {sub.createdAt.toLocaleString("en-GB")}</span></p>
      </header>

      <dl className="cms-dl">
        {Object.entries(sub.data).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{k === "email" ? <a href={`mailto:${v}`}>{v}</a> : v}</dd></div>
        ))}
      </dl>

      <form action={updateSubmission} className="cms-panel cms-inline-form">
        <input type="hidden" name="id" value={sub.id} />
        <div className="cms-field">
          <label className="cms-label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={sub.status}>
            {SUBMISSION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label className="cms-label" htmlFor="note">Internal note</label>
          <textarea id="note" name="note" rows={3} defaultValue={sub.note ?? ""} />
        </div>
        <button type="submit" className="cms-btn primary">Update</button>
      </form>
    </div>
  );
}
