import Link from "next/link";
import { listCampaigns, listLists, listTemplates } from "@/lib/email";
import { requireStaff } from "@/lib/staff-session";
import { fmtDateTime } from "@/lib/util";
import { NewCampaignForm } from "./NewCampaignForm";

export const metadata = { title: "Campaigns" };

const STATUS_CHIP: Record<string, string> = { draft: "muted", sending: "warn", sent: "ok", failed: "bad" };

export default async function CampaignsPage() {
  const { token } = await requireStaff();
  const [campaigns, templates, lists] = await Promise.all([
    listCampaigns(token).then((r) => r?.campaigns ?? []),
    listTemplates(token).then((r) => r?.templates ?? []),
    listLists(token).then((r) => r?.lists ?? []),
  ]);

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>Campaigns</h1>
          <p>A template sent to a list. Sending is the one action that can't be undone.</p>
        </div>
      </div>

      <section className="panel">
        <h2>New campaign</h2>
        {templates.length === 0 || lists.length === 0 ? (
          <p className="empty">You need at least one template and one list first.</p>
        ) : (
          <NewCampaignForm templates={templates} lists={lists} />
        )}
      </section>

      <section className="panel">
        <h2>All campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="empty">No campaigns yet.</p>
        ) : (
          <ul className="clist">
            {campaigns.map((c) => (
              <li key={c.id}>
                <span className="c-title"><Link href={`/staff/campaigns/${c.id}`}>{c.name}</Link></span>
                <span className={`chip ${STATUS_CHIP[c.status] ?? "muted"}`}>{c.status}</span>
                <span className="c-meta">
                  {c.status !== "draft" && <span>{c.stats.sent} sent, {c.stats.failed} failed, {c.stats.skipped} skipped</span>}
                  <span>Created {fmtDateTime(c.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
