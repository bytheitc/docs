import { notFound } from "next/navigation";
import { getList } from "@/lib/email";
import { requireStaff } from "@/lib/staff-session";
import { deleteListAction } from "@/app/staff/actions";
import { UploadCsvForm } from "./UploadCsvForm";

export default async function ListDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = await requireStaff();
  const data = await getList(token, id);
  if (!data) notFound();
  const { list, contacts, total } = data;

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>{list.name}</h1>
          <p>{total} contact{total === 1 ? "" : "s"}{list.fieldNames.length ? ` · fields: ${list.fieldNames.join(", ")}` : ""}</p>
        </div>
        <form action={deleteListAction}>
          <input type="hidden" name="id" value={list.id} />
          <button type="submit" className="btn danger small">Delete list</button>
        </form>
      </div>

      <section className="panel">
        <h2>Upload a CSV</h2>
        <p className="help">Needs an "email" column. Every other column becomes a merge-tag field, e.g. a "first_name" column gives you {"{{first_name}}"} in a template.</p>
        <UploadCsvForm listId={list.id} />
      </section>

      <section className="panel">
        <h2>Contacts {total > contacts.length ? `(first ${contacts.length} of ${total})` : ""}</h2>
        {contacts.length === 0 ? (
          <p className="empty">No contacts yet — upload a CSV above.</p>
        ) : (
          <table className="simple">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                {list.fieldNames.map((f) => <th key={f}>{f}</th>)}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>{c.email}</td>
                  <td><span className={`chip ${c.status === "subscribed" ? "ok" : "muted"}`}>{c.status}</span></td>
                  {list.fieldNames.map((f) => <td key={f}>{c.fields[f] ?? ""}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
