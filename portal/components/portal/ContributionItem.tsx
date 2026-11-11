// One contribution row. Titles are plain text from providers; React escapes them, nothing is rendered as HTML.
import { providerName } from "@/lib/providers";
import type { Contribution } from "@/lib/portal/types";
import { fmtDate, houseName, httpUrl, kindLabel } from "@/lib/portal/util";

const STATE: Record<string, [string, string]> = {
  merged: ["Merged", "ok"], open: ["Open", "warn"], closed: ["Closed", "muted"], published: ["Published", "ok"], approved: ["Approved", "ok"],
};
const REVIEW: Record<string, [string, string]> = { pending: ["Awaiting a steward", "warn"], verified: ["Verified", "ok"], declined: ["Declined", "bad"] };

export function ContributionItem({ c, showDescription = false }: { c: Contribution; showDescription?: boolean }) {
  const url = c.url ? httpUrl(c.url) : null;
  const [label, tone] = c.provider === "self" ? REVIEW[c.review?.status ?? "pending"] : STATE[c.state] ?? [c.state, "muted"];
  return (
    <li>
      <span className="c-title">{url ? <a href={url} rel="noopener noreferrer" target="_blank">{c.title}</a> : c.title}</span>
      <span className={`chip ${tone}`}>{label}</span>
      <span className="c-meta">
        <span>{kindLabel(c.kind)}</span>
        <span aria-hidden="true">·</span>
        <span>{houseName(c.house)}</span>
        <span aria-hidden="true">·</span>
        <span>{c.provider === "self" ? "Self-logged" : providerName(c.provider)}</span>
        {c.repo && <><span aria-hidden="true">·</span><span>{c.repo}</span></>}
        <span aria-hidden="true">·</span>
        <time dateTime={new Date(c.occurredAt).toISOString()}>{fmtDate(c.occurredAt)}</time>
      </span>
      {showDescription && c.description && <span className="c-desc">{c.description}</span>}
      {showDescription && c.review?.status === "declined" && c.review.note && <span className="c-desc muted">Steward’s note: {c.review.note}</span>}
    </li>
  );
}
