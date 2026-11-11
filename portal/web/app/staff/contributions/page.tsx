import Link from "next/link";
import { ContributionRows, contributorIndex } from "../ui";
import { HOUSES } from "@/lib/houses";
import { getProviders, staff } from "@/lib/portal";
import { CONTRIBUTION_KINDS } from "@/lib/provider-types";
import { atLeast, requireStaff } from "@/lib/staff-session";
import { kindLabel } from "@/lib/util";

export const metadata = { title: "Contributions" };

type SP = { provider?: string; kind?: string; house?: string; review?: string; unmatched?: string };

export default async function StaffContributions({ searchParams }: { searchParams: Promise<SP> }) {
  const { token, user } = await requireStaff("/staff/contributions");
  const f = await searchParams;
  const review = (["pending", "verified", "declined"] as const).find((r) => r === f.review);

  const query: Record<string, string> = {};
  // A review filter only makes sense for self-logged work, so it fixes the provider too.
  if (review) { query.review = review; query.provider = "self"; }
  else if (f.provider) query.provider = f.provider;
  if (f.kind) query.kind = f.kind;
  if (f.house) query.house = f.house;
  if (f.unmatched === "1") query.unmatched = "1";

  const [result, people, { providers }] = await Promise.all([
    staff.contributions(token, query),
    staff.contributors(token),
    getProviders(),
  ]);
  if (!result.ok) return <p className="cms-flash bad" role="alert">{result.message}</p>;
  const index = contributorIndex(people.ok ? people.contributors : []);
  const filtered = Object.values(f).some(Boolean);

  return (
    <>
      <form className="cms-filters" role="search" aria-label="Filter contributions">
        <label className="cms-sr" htmlFor="f-provider">Provider</label>
        <select id="f-provider" name="provider" defaultValue={f.provider ?? ""}>
          <option value="">All providers</option><option value="self">Self-logged</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
        {filtered && <Link className="cms-link" href="/staff/contributions">Clear</Link>}
      </form>
      {!atLeast(user, "publisher") && <p className="cms-help">Verifying, declining and hiding need the publisher role.</p>}
      <ContributionRows rows={result.contributions} canAct={atLeast(user, "publisher")} contributors={index} />
    </>
  );
}
