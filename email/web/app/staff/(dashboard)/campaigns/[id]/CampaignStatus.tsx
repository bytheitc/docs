"use client";
import { useEffect, useState } from "react";
import { getCampaignStatusAction } from "@/app/staff/actions";
import type { Campaign } from "@/lib/email";

const STATUS_CHIP: Record<string, string> = { draft: "muted", sending: "warn", sent: "ok", failed: "bad" };

export function CampaignStatus({ initial }: { initial: Campaign }) {
  const [campaign, setCampaign] = useState(initial);

  useEffect(() => {
    if (campaign.status !== "sending") return;
    const t = setInterval(async () => {
      const fresh = await getCampaignStatusAction(campaign.id);
      if (fresh) setCampaign(fresh);
    }, 2000);
    return () => clearInterval(t);
  }, [campaign.status, campaign.id]);

  return (
    <>
      <h2>
        Status <span className={`chip ${STATUS_CHIP[campaign.status] ?? "muted"}`} style={{ marginLeft: 8 }}>{campaign.status}</span>
      </h2>
      <div className="stat-row">
        <div className="stat"><strong>{campaign.stats.total}</strong><span>Total</span></div>
        <div className="stat"><strong>{campaign.stats.sent}</strong><span>Sent</span></div>
        <div className="stat"><strong>{campaign.stats.failed}</strong><span>Failed</span></div>
        <div className="stat"><strong>{campaign.stats.skipped}</strong><span>Skipped</span></div>
      </div>
    </>
  );
}
