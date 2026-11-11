import Link from "next/link";
import { requireUser } from "@/lib/cms/auth";
import { requirePortalStore } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/util";

export const metadata = { title: "Contributors" };

export default async function ContributorsAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser("editor");
  const { q } = await searchParams;
  const needle = (q ?? "").trim().toLowerCase();
  const all = await requirePortalStore().listContributors();
  const rows = all.filter((c) => !needle || c.handle.includes(needle) || c.displayName.toLowerCase().includes(needle));
  return (
    <>
      <form className="cms-filters" role="search">
        <label className="cms-sr" htmlFor="q">Search contributors</label>
        <input id="q" name="q" type="search" placeholder="Search by name or handle" defaultValue={q} />
        <button className="cms-btn" type="submit">Search</button>
      </form>
      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead><tr><th scope="col">Name</th><th scope="col">Handle</th><th scope="col">Joined</th><th scope="col">Profile</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link className="cms-rowlink" href={`/admin/portal/contributors/${c.id}`}>{c.displayName}</Link></td>
                <td className="cms-mono">{c.handle}</td>
                <td className="cms-muted">{fmtDate(c.createdAt)}</td>
                <td>{c.profile.public ? <span className="pa-chip ok">public{c.profile.onWall ? " · wall" : ""}</span> : <span className="pa-chip muted">private</span>}</td>
                <td>{c.disabled ? <span className="pa-chip bad">disabled</span> : <span className="pa-chip ok">active</span>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="cms-muted">{needle ? "Nothing matches." : "No contributors yet."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
