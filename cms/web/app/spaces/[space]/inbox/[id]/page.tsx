import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSubmission } from "@/app/actions";
import { ApiError } from "@/lib/api";
import { authed, enc, loadSpace, requireUser } from "@/lib/session";
import { SUBMISSION_STATUSES, fmt, type Submission } from "@/lib/types";

export const metadata = { title: "Submission" };

type Props = { params: Promise<{ space: string; id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function SubmissionPage({ params, searchParams }: Props) {
  await requireUser();
  const { space: sid, id } = await params;
  const { space } = await loadSpace(sid);
  const { saved, error } = await searchParams;
  let sub: Submission;
  try {
    ({ submission: sub } = await authed<{ submission: Submission }>(`/v1/spaces/${enc(space.id)}/inbox/${enc(id)}`));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker"><Link href={`/spaces/${space.id}/inbox`}>Inbox</Link></p>
        <h1>{space.forms[sub.form] ?? sub.form}</h1>
        <p className="cms-meta"><span className={`cms-chip i-${sub.status}`}>{sub.status}</span><span className="cms-muted">Received {fmt(sub.createdAt)}</span></p>
      </header>

      {saved && <p className="cms-flash ok" role="status">Updated.</p>}
      {error && <p className="cms-flash bad" role="alert">{error}</p>}

      <dl className="cms-dl">
        {Object.entries(sub.data).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{k === "email" ? <a href={`mailto:${v}`}>{v}</a> : v}</dd></div>
        ))}
      </dl>

      <form action={updateSubmission} className="cms-panel cms-inline-form">
        <input type="hidden" name="space" value={space.id} />
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
