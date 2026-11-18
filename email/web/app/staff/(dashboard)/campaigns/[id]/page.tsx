import { notFound } from "next/navigation";
import { getCampaign, getList, getTemplate } from "@/lib/email";
import { requireStaff } from "@/lib/staff-session";
import { deleteCampaignAction } from "@/app/staff/actions";
import { CampaignStatus } from "./CampaignStatus";
import { SendCampaignButton } from "./SendCampaignButton";
import { TestSendForm } from "./TestSendForm";

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, user } = await requireStaff();
  const data = await getCampaign(token, id);
  if (!data) notFound();
  const { campaign, mergeTags } = data;
  const [template, list] = await Promise.all([
    getTemplate(token, campaign.templateId),
    getList(token, campaign.listId),
  ]);

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>{campaign.name}</h1>
          <p>
            {template?.template.name ?? "Unknown template"} → {list?.list.name ?? "Unknown list"}
            {list ? ` (${list.list.contactCount} contacts)` : ""}
          </p>
        </div>
        {campaign.status === "draft" && (
          <form action={deleteCampaignAction}>
            <input type="hidden" name="id" value={campaign.id} />
            <button type="submit" className="btn danger small">Delete draft</button>
          </form>
        )}
      </div>

      <section className="panel">
        <CampaignStatus key={campaign.status} initial={campaign} />
      </section>

      {campaign.status === "draft" && mergeTags.missing.length > 0 && (
        <p className="flash bad" role="alert">
          The template uses {mergeTags.missing.map((k) => `{{${k}}}`).join(", ")}, but{" "}
          <strong>{list?.list.name ?? "this list"}</strong> has no such column, so it will be blank for every recipient.
          Add a fallback in the template, like <code>{`{{${mergeTags.missing[0]}|friend}}`}</code>, or upload a CSV with that column.
        </p>
      )}

      {campaign.status === "draft" && (
        <section className="panel">
          <h2>Test</h2>
          <p className="help" style={{ marginBottom: 12 }}>
            One copy, marked [Test], rendered with the first contact on the list's fields. Check it in a real inbox before sending.
          </p>
          <TestSendForm id={campaign.id} defaultTo={user.email} />
        </section>
      )}

      {campaign.status === "draft" && (
        <section className="panel">
          <h2>Send</h2>
          <p className="help" style={{ marginBottom: 12 }}>
            This sends to every subscribed contact on <strong>{list?.list.name}</strong>, right now, and can't be undone.
          </p>
          <SendCampaignButton id={campaign.id} canSend={user.role !== "editor"} missingFields={mergeTags.missing} />
        </section>
      )}
    </>
  );
}
