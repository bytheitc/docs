import { ContributionItem } from "@/components/portal/ContributionItem";
import { OPEN_HOUSES } from "@/lib/houses";
import { getDashboard } from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";
import { kindLabel, providerName } from "@/lib/util";

export const metadata = { title: "Your contributions" };

export default async function Contributions({ searchParams }: { searchParams: Promise<{ house?: string; provider?: string; kind?: string }> }) {
  const me = await requireContributor("/dashboard/contributions");
  const f = await searchParams;
  // The api already leaves out hidden work and unverified self-logs.
  const all = (await getDashboard((await sessionToken())!))?.contributions ?? [];
  const providers = [...new Set(all.map((c) => c.provider))];
  const kinds = [...new Set(all.map((c) => c.kind))];
  const rows = all.filter((c) => (!f.house || c.house === f.house) && (!f.provider || c.provider === f.provider) && (!f.kind || c.kind === f.kind));
  const filtered = !!(f.house || f.provider || f.kind);

  return (
    <>
      <header className="dash-head">
        <h1>Your contributions</h1>
        <p>Everything that counts towards your work. Self-logged entries appear once a steward has verified them.</p>
      </header>
      <form className="panel filters" role="search" aria-label="Filter contributions">
        <div className="field">
          <label htmlFor="f-house">House</label>
          <select id="f-house" name="house" defaultValue={f.house ?? ""}>
            <option value="">All houses</option>
            {OPEN_HOUSES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-provider">Platform</label>
          <select id="f-provider" name="provider" defaultValue={f.provider ?? ""}>
            <option value="">All platforms</option>
            {providers.map((p) => <option key={p} value={p}>{p === "self" ? "Self-logged" : providerName(p)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-kind">Kind</label>
          <select id="f-kind" name="kind" defaultValue={f.kind ?? ""}>
            <option value="">All kinds</option>
            {kinds.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
          </select>
        </div>
        <button type="submit" className="btn">Filter</button>
        {filtered && <a href="/dashboard/contributions" className="linkbtn">Clear</a>}
      </form>
      <section className="panel" aria-label="Results">
        <p className="help" role="status">{rows.length} shown</p>
        {rows.length ? <ul className="clist">{rows.map((c) => <ContributionItem key={c.id} c={c} />)}</ul> : <p className="empty">{filtered ? "Nothing matches these filters." : "No contributions yet."}</p>}
      </section>
    </>
  );
}
