import Link from "next/link";
import { notFound } from "next/navigation";
import { changeStatus, deleteEntry, restoreRevision } from "@/app/admin/actions";
import { EntryEditor } from "@/components/cms/EntryEditor";
import { StatusChip } from "@/components/cms/StatusChip";
import { can, requireUser } from "@/lib/cms/auth";
import { findCollection } from "@/lib/cms/collections";
import { ensureSeeded } from "@/lib/cms/content";
import { relationOptions } from "@/lib/cms/relations";
import { requireStorage } from "@/lib/cms/storage";

type Props = { params: Promise<{ collection: string; id: string }>; searchParams: Promise<{ saved?: string }> };

export async function generateMetadata({ params }: Props) {
  const { collection, id } = await params;
  const def = findCollection(collection);
  return { title: def ? `${id} · ${def.label}` : "Not found" };
}

function StatusButton({ collection, id, to, children, primary }: { collection: string; id: string; to: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <form action={changeStatus}>
      <input type="hidden" name="collection" value={collection} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <button type="submit" className={`cms-btn${primary ? " primary" : ""}`}>{children}</button>
    </form>
  );
}

export default async function EditEntry({ params, searchParams }: Props) {
  const user = await requireUser();
  const { collection, id } = await params;
  const def = findCollection(collection);
  if (!def) notFound();
  await ensureSeeded(def);
  const store = requireStorage();
  const entry = await store.getEntry(def.name, decodeURIComponent(id));
  if (!entry) notFound();
  const revisions = await store.listRevisions(def.name, entry.id, 15);
  const publisher = can(user, "publisher");
  const { saved } = await searchParams;
  const title = String(entry.data[def.titleField] ?? entry.id);
  const live = entry.status === "published";

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker"><Link href={`/admin/c/${def.name}`}>{def.label}</Link></p>
        <h1>{title}</h1>
        <p className="cms-meta">
          <StatusChip status={entry.status} pending={!!entry.pending} />
          <span className="cms-mono">{entry.id}</span>
          <span className="cms-muted">Updated {entry.updatedAt.toLocaleString("en-GB")}{entry.updatedBy ? ` by ${entry.updatedBy}` : ""}</span>
        </p>
      </header>

      {saved && <p className="cms-flash ok" role="status">Saved.</p>}

      <section className="cms-workflow" aria-label="Workflow">
        {entry.pending ? (
          <>
            <p><strong>Changes are waiting for review</strong>, saved by {entry.pending.by ?? "someone"} on {entry.pending.at.toLocaleString("en-GB")}. The site still shows the live version. The form below shows the pending version.</p>
            {publisher && (
              <div className="cms-actions">
                <StatusButton collection={def.name} id={entry.id} to="publish-pending" primary>Publish changes</StatusButton>
                <StatusButton collection={def.name} id={entry.id} to="discard-pending">Discard changes</StatusButton>
              </div>
            )}
          </>
        ) : entry.status === "review" ? (
          <>
            <p><strong>In review.</strong> A publisher can publish this or return it to draft.</p>
            {publisher && (
              <div className="cms-actions">
                <StatusButton collection={def.name} id={entry.id} to="published" primary>Publish</StatusButton>
                <StatusButton collection={def.name} id={entry.id} to="draft">Return to draft</StatusButton>
              </div>
            )}
          </>
        ) : entry.status === "draft" ? (
          <>
            <p><strong>Draft.</strong> Not visible on the site.</p>
            <div className="cms-actions">
              <StatusButton collection={def.name} id={entry.id} to="review">Submit for review</StatusButton>
              {publisher && <StatusButton collection={def.name} id={entry.id} to="published" primary>Publish</StatusButton>}
            </div>
          </>
        ) : entry.status === "published" ? (
          <>
            <p><strong>Live</strong> on the site.</p>
            {publisher && (
              <div className="cms-actions">
                <StatusButton collection={def.name} id={entry.id} to="draft">Unpublish</StatusButton>
                <StatusButton collection={def.name} id={entry.id} to="archived">Archive</StatusButton>
              </div>
            )}
          </>
        ) : (
          <>
            <p><strong>Archived.</strong> Kept for the record; not visible on the site.</p>
            {publisher && <div className="cms-actions"><StatusButton collection={def.name} id={entry.id} to="draft">Restore as draft</StatusButton></div>}
          </>
        )}
      </section>

      <EntryEditor
        key={`${entry.updatedAt.getTime()}`}
        collection={def.name}
        fields={def.fields}
        idField={def.idField}
        titleField={def.titleField}
        initial={entry.pending?.data ?? entry.data}
        originalId={entry.id}
        relationOptions={await relationOptions(def.fields)}
        canPublish={publisher}
        isLive={live}
      />

      <section className="cms-panel">
        <h2>History</h2>
        {revisions.length ? (
          <ol className="cms-history">
            {revisions.map((r) => (
              <li key={r.at.toISOString()}>
                <span>{r.at.toLocaleString("en-GB")}</span>
                <span className="cms-muted">{r.author ?? "seed"} · {r.note ?? r.status}</span>
                <form action={restoreRevision}>
                  <input type="hidden" name="collection" value={def.name} />
                  <input type="hidden" name="id" value={entry.id} />
                  <input type="hidden" name="at" value={r.at.toISOString()} />
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
            <input type="hidden" name="collection" value={def.name} />
            <input type="hidden" name="id" value={entry.id} />
            <p>Deleting removes it from the site and the admin. Revisions are kept. Consider archiving instead.</p>
            <label className="cms-label" htmlFor="confirm">Type <code>{entry.id}</code> to confirm</label>
            <input id="confirm" name="confirm" autoComplete="off" required />
            <button type="submit" className="cms-btn danger">Delete permanently</button>
          </form>
        </details>
      )}
    </div>
  );
}
