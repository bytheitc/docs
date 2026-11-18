import Link from "next/link";
import { listTemplates } from "@/lib/email";
import { requireStaff } from "@/lib/staff-session";
import { fmtDate } from "@/lib/util";
import { NewTemplateForm } from "./NewTemplateForm";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { token } = await requireStaff();
  const templates = (await listTemplates(token))?.templates ?? [];
  return (
    <>
      <div className="dash-head">
        <div>
          <h1>Templates</h1>
          <p>Write in Markdown. {"{{field}}"} pulls from a contact's CSV columns; a bare [Label](url) line becomes a button.</p>
        </div>
      </div>

      <section className="panel">
        <h2>New template</h2>
        <NewTemplateForm />
      </section>

      <section className="panel">
        <h2>All templates</h2>
        {templates.length === 0 ? (
          <p className="empty">No templates yet.</p>
        ) : (
          <ul className="clist">
            {templates.map((t) => (
              <li key={t.id}>
                <span className="c-title"><Link href={`/staff/templates/${t.id}`}>{t.name}</Link></span>
                <span className="muted">{fmtDate(t.updatedAt)}</span>
                <span className="c-meta">{t.subject}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
