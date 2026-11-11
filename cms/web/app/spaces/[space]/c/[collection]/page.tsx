import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { moveEntry } from "@/app/actions";
import { StatusChip } from "@/components/StatusChip";
import { authed, enc, loadSpace, requireUser } from "@/lib/session";
import { STATUSES, can, fmtDate, type Entry } from "@/lib/types";

type Props = { params: Promise<{ space: string; collection: string }>; searchParams: Promise<{ status?: string; q?: string; deleted?: string; error?: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: (await params).collection };
}

const show = (v: unknown): string =>
  Array.isArray(v) ? v.join(", ") : v == null ? "" : typeof v === "object" ? "…" : String(v);

export default async function CollectionList({ params, searchParams }: Props) {
  const user = await requireUser();
  const { space: sid, collection } = await params;
  const { space } = await loadSpace(sid);
  const def = space.collections.find((c) => c.name === collection);
  if (!def) notFound();
  const { status, q, deleted, error } = await searchParams;
  const { entries: all } = await authed<{ entries: Entry[] }>(`/v1/spaces/${enc(space.id)}/collections/${enc(def.name)}/entries`);
  const base = `/spaces/${space.id}/c/${def.name}`;

  if (def.singleton) redirect(all[0] ? `${base}/${all[0].id}` : `${base}/new`);

  const needle = (q ?? "").trim().toLowerCase();
  const rows = all.filter(
    (e) =>
      (!status || e.status === status || (status === "pending" && e.pending)) &&
      (!needle || JSON.stringify(e.data).toLowerCase().includes(needle)),
  );
  const filtered = !!status || !!needle;
  const canMove = can(user, "publisher") && !filtered;

  return (
    <div className="cms-page">
      <header className="cms-head cms-head-row">
        <div>
          <p className="cms-kicker">Content</p>
          <h1>{def.label}</h1>
          {def.description && <p className="cms-muted">{def.description}</p>}
        </div>
        <Link href={`${base}/new`} className="cms-btn primary">New {def.singular.toLowerCase()}</Link>
      </header>

      {deleted && <p className="cms-flash ok" role="status">Deleted.</p>}
      {error && <p className="cms-flash bad" role="alert">{error}</p>}

      <form className="cms-filters" role="search">
        <label className="cms-sr" htmlFor="q">Search</label>
        <input id="q" name="q" type="search" placeholder={`Search ${def.label.toLowerCase()}`} defaultValue={q} />
        <label className="cms-sr" htmlFor="st">Status</label>
        <select id="st" name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="pending">has pending changes</option>
        </select>
        <button type="submit" className="cms-btn">Filter</button>
        {filtered && <Link href={base} className="cms-link">Clear</Link>}
      </form>

      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead>
            <tr>
              {canMove && <th scope="col" className="cms-col-order"><span className="cms-sr">Order</span></th>}
              <th scope="col">{def.fields.find((f) => f.name === def.titleField)?.label ?? "Title"}</th>
              <th scope="col">Id</th>
              {(def.columns ?? []).map((c) => <th key={c} scope="col">{def.fields.find((f) => f.name === c)?.label ?? c}</th>)}
              <th scope="col">Status</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={e.id}>
                {canMove && (
                  <td className="cms-col-order">
                    <form action={moveEntry} className="cms-move">
                      <input type="hidden" name="space" value={space.id} />
                      <input type="hidden" name="collection" value={def.name} />
                      <input type="hidden" name="id" value={e.id} />
                      <button name="dir" value="up" disabled={i === 0} aria-label={`Move ${e.id} up`}>↑</button>
                      <button name="dir" value="down" disabled={i === rows.length - 1} aria-label={`Move ${e.id} down`}>↓</button>
                    </form>
                  </td>
                )}
                <td><Link href={`${base}/${e.id}`} className="cms-rowlink">{show(e.data[def.titleField]) || e.id}</Link></td>
                <td className="cms-mono">{e.id}</td>
                {(def.columns ?? []).map((c) => <td key={c}>{show(e.data[c])}</td>)}
                <td><StatusChip status={e.status} pending={!!e.pending} /></td>
                <td className="cms-muted">{fmtDate(e.updatedAt)}{e.updatedBy ? ` · ${e.updatedBy}` : ""}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6 + (def.columns?.length ?? 0)} className="cms-muted">{filtered ? "Nothing matches." : "Nothing here yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {canMove && <p className="cms-help">The order here is the order on the public site.</p>}
    </div>
  );
}
