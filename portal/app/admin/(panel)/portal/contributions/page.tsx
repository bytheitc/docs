import Link from "next/link";
import { ContributionRows, contributorIndex } from "../ui";
import { can, requireUser } from "@/lib/cms/auth";
import { HOUSES } from "@/lib/houses";
import { PROVIDERS } from "@/lib/providers";
import { CONTRIBUTION_KINDS } from "@/lib/providers/types";
import { requirePortalStore } from "@/lib/portal/store";
import type { ReviewStatus } from "@/lib/portal/types";
import { kindLabel } from "@/lib/portal/util";

export const metadata = { title: "Contributions" };

type SP = { provider?: string; kind?: string; house?: string; review?: string; unmatched?: string };

export default async function ContributionsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("editor");
  const f = await searchParams;
  const store = requirePortalStore();
  const review = (["pending", "verified", "declined"] as const).includes(f.review as ReviewStatus) ? (f.review as ReviewStatus) : undefined;
  const [rows, index] = await Promise.all([
    store.listContributions({
      provider: review ? "self" : f.provider || undefined, kind: f.kind || undefined, house: f.house || undefined,
      reviewStatus: review, unmatchedOnly: f.unmatched === "1", includeHidden: true, limit: 500,
    }),
    contributorIndex(store),
  ]);
  const filtered = Object.values(f).some(Boolean);
  return (
    <>
      <form className="cms-filters" role="search" aria-label="Filter contributions">
        <label className="cms-sr" htmlFor="f-provider">Provider</label>
        <select id="f-provider" name="provider" defaultValue={f.provider ?? ""}>
          <option value="">All providers</option><option value="self">Self-logged</option>
          {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="cms-sr" htmlFor="f-kind">Kind</label>
        <select id="f-kind" name="kind" defaultValue={f.kind ?? ""}>
          <option value="">All kinds</option>
          {CONTRIBUTION_KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
        </select>
        <label className="cms-sr" htmlFor="f-house">House</label>
        <select id="f-house" name="house" defaultValue={f.house ?? ""}>
          <option value="">All houses</option>
          {HOUSES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <label className="cms-sr" htmlFor="f-review">Review</label>
        <select id="f-review" name="review" defaultValue={f.review ?? ""}>
          <option value="">Any review status</option><option value="pending">Self-logged: to verify</option><option value="verified">Self-logged: verified</option><option value="declined">Self-logged: declined</option>
        </select>
        <label className="cms-check"><input type="checkbox" name="unmatched" value="1" defaultChecked={f.unmatched === "1"} /> Unmatched only</label>
        <button className="cms-btn" type="submit">Filter</button>
        {filtered && <Link className="cms-link" href="/admin/portal/contributions">Clear</Link>}
      </form>
      {!can(user, "publisher") && <p className="cms-help">Verifying, declining and hiding need the publisher role.</p>}
      <ContributionRows rows={rows} canAct={can(user, "publisher")} contributors={index} />
    </>
  );
}
