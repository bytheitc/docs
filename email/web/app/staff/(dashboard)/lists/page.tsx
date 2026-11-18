import Link from "next/link";
import { listLists } from "@/lib/email";
import { requireStaff } from "@/lib/staff-session";
import { fmtDate } from "@/lib/util";
import { NewListForm } from "./NewListForm";

export const metadata = { title: "Lists" };

export default async function ListsPage() {
  const { token } = await requireStaff();
  const lists = (await listLists(token))?.lists ?? [];
  return (
    <>
      <div className="dash-head">
        <div>
          <h1>Lists</h1>
          <p>Upload a CSV of recipients, with any columns you like as merge-tag fields.</p>
        </div>
      </div>

      <section className="panel">
        <h2>New list</h2>
        <NewListForm />
      </section>

      <section className="panel">
        <h2>All lists</h2>
        {lists.length === 0 ? (
          <p className="empty">No lists yet.</p>
        ) : (
          <ul className="clist">
            {lists.map((l) => (
              <li key={l.id}>
                <span className="c-title"><Link href={`/staff/lists/${l.id}`}>{l.name}</Link></span>
                <span className="chip muted">{l.contactCount} contact{l.contactCount === 1 ? "" : "s"}</span>
                <span className="c-meta">
                  {l.fieldNames.length ? <span>Fields: {l.fieldNames.join(", ")}</span> : <span>No extra fields yet</span>}
                  <span>Updated {fmtDate(l.updatedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
