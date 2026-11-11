import Link from "next/link";
import { notFound } from "next/navigation";
import { changeStatus, deleteEntry, restoreRevision } from "@/app/actions";
import { EntryEditor } from "@/components/EntryEditor";
import { StatusChip } from "@/components/StatusChip";
import { ApiError } from "@/lib/api";
import { relationOptions } from "@/lib/relations";
import { authed, enc, loadSpace, requireUser } from "@/lib/session";
import { can, fmt, type Entry, type Revision } from "@/lib/types";

type Props = {
  params: Promise<{ space: string; collection: string; id: string }>;
  searchParams: Promise<{ saved?: string; done?: string; error?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { collection, id } = await params;
  return { title: `${decodeURIComponent(id)} · ${collection}` };
}

const SAVED: Record<string, string> = {
  held: "Saved. The live version is unchanged until a publisher publishes these changes.",
  draft: "Draft saved.",
  review: "Saved and waiting for review.",
  published: "Published.",
};

const DONE: Record<string, string> = {
  review: "Submitted for review.",
  published: "Published.",
  draft: "Returned to draft. It is no longer on the site.",
  archived: "Archived.",
  "publish-pending": "Changes published.",
  "discard-pending": "Pending changes discarded.",
  restore: "Revision restored into the form. Review it, then save or publish.",
};

export default async function EditEntry({ params, searchParams }: Props) {
  const user = await requireUser();
  const { space: sid, collection, id: rawId } = await params;
  const { space } = await loadSpace(sid);
  const def = space.collections.find((c) => c.name === collection);
  if (!def) notFound();
  const id = decodeURIComponent(rawId);
  const path = `/v1/spaces/${enc(space.id)}/collections/${enc(def.name)}/entries/${enc(id)}`;
  let entry: Entry, revisions: Revision[];
  try {
    [{ entry }, { revisions }] = await Promise.all([
      authed<{ entry: Entry }>(path),
      authed<{ revisions: Revision[] }>(`${path}/revisions?limit=15`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const publisher = can(user, "publisher");
  const { saved, done, error } = await searchParams;
  const title = String(entry.data[def.titleField] ?? entry.id);
  const live = entry.status === "published";
  const hidden = (
    <>
      <input type="hidden" name="space" value={space.id} />
      <input type="hidden" name="collection" value={def.name} />
      <input type="hidden" name="id" value={entry.id} />
    </>
  );
  const StatusButton = ({ to, children, primary }: { to: string; children: React.ReactNode; primary?: boolean }) => (
    <form action={changeStatus}>
      {hidden}
      <input type="hidden" name="to" value={to} />
      <button type="submit" className={`cms-btn${primary ? " primary" : ""}`}>{children}</button>
    </form>
  );

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker"><Link href={`/spaces/${space.id}/c/${def.name}`}>{def.label}</Link></p>
        <h1>{title}</h1>
        <p className="cms-meta">
          <StatusChip status={entry.status} pending={!!entry.pending} />
          <span className="cms-mono">{entry.id}</span>
          <span className="cms-muted">Updated {fmt(entry.updatedAt)}{entry.updatedBy ? ` by ${entry.updatedBy}` : ""}</span>
        </p>
      </header>

      {saved && <p className="cms-flash ok" role="status">{SAVED[saved] ?? "Saved."}</p>}
      {done && DONE[done] && <p className="cms-flash ok" role="status">{DONE[done]}</p>}
      {error && <p className="cms-flash bad" role="alert">{error}</p>}

      <section className="cms-workflow" aria-label="Workflow">
        {entry.pending ? (
          <>
            <p><strong>Changes are waiting for review</strong>, saved by {entry.pending.by ?? "someone"} on {fmt(entry.pending.at)}. The site still shows the live version. The form below shows the pending version.</p>
            {publisher && (
              <div className="cms-actions">
                <StatusButton to="publish-pending" primary>Publish changes</StatusButton>
                <StatusButton to="discard-pending">Discard changes</StatusButton>
              </div>
            )}
          </>
        ) : entry.status === "review" ? (
          <>
            <p><strong>In review.</strong> A publisher can publish this or return it to draft.</p>
            {publisher && (
              <div className="cms-actions">
                <StatusButton to="published" primary>Publish</StatusButton>
                <StatusButton to="draft">Return to draft</StatusButton>
              </div>
            )}
          </>
        ) : entry.status === "draft" ? (
          <>
            <p><strong>Draft.</strong> Not visible on the site.</p>
            <div className="cms-actions">
              <StatusButton to="review">Submit for review</StatusButton>
              {publisher && <StatusButton to="published" primary>Publish</StatusButton>}
            </div>
          </>
        ) : entry.status === "published" ? (
          <>
            <p><strong>Live</strong> on the site.</p>
            {publisher && (
              <div className="cms-actions">
                <StatusButton to="draft">Unpublish</StatusButton>
                <StatusButton to="archived">Archive</StatusButton>
              </div>
            )}
          </>
        ) : (
          <>
            <p><strong>Archived.</strong> Kept for the record; not visible on the site.</p>
            {publisher && <div className="cms-actions"><StatusButton to="draft">Restore as draft</StatusButton></div>}
          </>
        )}
      </section>

      <EntryEditor
        key={entry.updatedAt}
        space={space.id}
        collection={def.name}
        fields={def.fields}
        idField={def.idField}
        titleField={def.titleField}
        initial={entry.pending?.data ?? entry.data}
        originalId={entry.id}
        relationOptions={await relationOptions(space.id, space.collections, def.fields)}
        canPublish={publisher}
        isLive={live}
      />

      <section className="cms-panel">
        <h2>History</h2>
        {revisions.length ? (
          <ol className="cms-history">
            {revisions.map((r) => (
              <li key={r.at}>
                <span>{fmt(r.at)}</span>
                <span className="cms-muted">{r.author ?? "seed"} · {r.note ?? r.status}</span>
                <form action={restoreRevision}>
                  {hidden}
                  <input type="hidden" name="at" value={r.at} />
                  <button type="submit" className="cms-link">Restore{live ? " as pending" : ""}</button>
                </form>
              </li>
            ))}
          </ol>
        ) : <p className="cms-muted">No edits yet. This entry still holds its original content.</p>}
      </section>

      {publisher && !def.singleton && (
        <details className="cms-danger">
          <summary>Delete this {def.singular.toLowerCase()}</summary>
          <form action={deleteEntry} className="cms-inline-form">
            {hidden}
            <p>Deleting removes it from the site and the CMS. Revisions are kept. Consider archiving instead.</p>
            <label className="cms-label" htmlFor="confirm">Type <code>{entry.id}</code> to confirm</label>
            <input id="confirm" name="confirm" autoComplete="off" required />
            <button type="submit" className="cms-btn danger">Delete permanently</button>
          </form>
        </details>
      )}
    </div>
  );
}
