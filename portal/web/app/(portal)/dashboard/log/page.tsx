import { ContributionItem } from "@/components/portal/ContributionItem";
import { LogForm } from "@/components/portal/Forms";
import { OPEN_HOUSES } from "@/lib/houses";
import { getDashboard } from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";
import { kindLabel, SELF_KINDS } from "@/lib/util";

export const metadata = { title: "Log work" };

export default async function LogPage() {
  const me = await requireContributor("/dashboard/log");
  const mine = ((await getDashboard((await sessionToken())!))?.contributions ?? []).filter((c) => c.provider === "self");
  return (
    <>
      <header className="dash-head">
        <h1>Log work no platform tracks</h1>
        <p>Writing, design, teaching, reviews, translation outside Crowdin. Add a link and a short description; a steward confirms it.</p>
      </header>
      <section className="panel" aria-labelledby="new-h">
        <h2 id="new-h">New entry</h2>
        <LogForm houses={OPEN_HOUSES.map((h) => ({ id: h.id, name: h.name }))} kinds={SELF_KINDS.map((k) => ({ id: k, label: kindLabel(k) }))} />
      </section>
      <section className="panel" aria-labelledby="past-h">
        <h2 id="past-h">Your entries</h2>
        {mine.length ? <ul className="clist">{mine.map((c) => <ContributionItem key={c.id} c={c} showDescription />)}</ul> : <p className="empty">You haven’t logged anything yet.</p>}
      </section>
    </>
  );
}
