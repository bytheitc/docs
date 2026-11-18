import { notFound } from "next/navigation";
import { getTemplate } from "@/lib/email";
import { requireStaff } from "@/lib/staff-session";
import { deleteTemplateAction } from "@/app/staff/actions";
import { TemplateEditor } from "./TemplateEditor";

export default async function TemplateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = await requireStaff();
  const data = await getTemplate(token, id);
  if (!data) notFound();

  return (
    <>
      <div className="dash-head">
        <div><h1>{data.template.name}</h1></div>
        <form action={deleteTemplateAction}>
          <input type="hidden" name="id" value={data.template.id} />
          <button type="submit" className="btn danger small">Delete template</button>
        </form>
      </div>
      <TemplateEditor template={data.template} />
    </>
  );
}
