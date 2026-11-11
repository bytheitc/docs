import Link from "next/link";
import { requireUser } from "@/lib/cms/auth";
import { ensureSeeded } from "@/lib/cms/content";
import { getCollection } from "@/lib/cms/collections";
import { requireStorage } from "@/lib/cms/storage";
import { StatusChip } from "@/components/cms/StatusChip";
import type { MilestoneDef } from "@/lib/portal/seed";

export const metadata = { title: "Recognition" };

export default async function RecognitionAdmin() {
  await requireUser("editor");
  const def = getCollection("milestones");
  await ensureSeeded(def);
  const entries = await requireStorage().listEntries("milestones");
  return (
    <>
      <div className="cms-head-row">
        <p className="cms-muted">Milestones are private: each contributor sees only their own. There are no points and nothing is ranked. Only published milestones are shown to contributors.</p>
        <Link href="/admin/c/milestones/new" className="cms-btn primary">New milestone</Link>
      </div>
      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead><tr><th scope="col">Milestone</th><th scope="col">Reached when</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {entries.map((e) => {
              const m = e.data as unknown as MilestoneDef;
              return (
                <tr key={e.id}>
                  <td><Link className="cms-rowlink" href={`/admin/c/milestones/${e.id}`}>{m.title}</Link><div className="pa-desc">{m.description}</div></td>
                  <td>{m.rule}{m.rule === "kind" ? ` (${m.kind ?? "?"})` : ""} ≥ {m.threshold}</td>
                  <td><StatusChip status={e.status} pending={!!e.pending} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
