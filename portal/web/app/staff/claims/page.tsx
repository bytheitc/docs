import Link from "next/link";
import { releaseClaim } from "../actions";
import { cmsSpaceUrl } from "@/lib/util";
import { staff } from "@/lib/portal";
import { atLeast, requireStaff } from "@/lib/staff-session";
import type { Claim } from "@/lib/types";
import { fmtDate } from "@/lib/util";

export const metadata = { title: "Claims" };

export default async function StaffClaims() {
  const { token, user } = await requireStaff("/staff/claims");
  const result = await staff.claims(token);
  if (!result.ok) return <p className="cms-flash bad" role="alert">{result.message}</p>;

  const active = result.claims.filter((c) => c.status === "active");
  const past = result.claims.filter((c) => c.status !== "active");
  const canRelease = atLeast(user, "publisher");

  const table = (rows: Claim[], actions: boolean) => (
    <div className="cms-tablewrap">
      <table className="cms-table">
        <thead><tr><th scope="col">Issue</th><th scope="col">Claimed by</th><th scope="col">Claimed</th><th scope="col">Expires</th><th scope="col">Status</th>{actions && <th scope="col"><span className="cms-sr">Actions</span></th>}</tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="cms-mono">{c.provider}:{c.repo}#{c.issue}</td>
              <td><Link href={`/staff/contributors/${c.contributorId}`}>{c.username}</Link></td>
              <td className="cms-muted">{fmtDate(c.createdAt)}</td>
              <td className="cms-muted">{fmtDate(c.expiresAt)}</td>
              <td>
                <span className={`pa-chip ${c.status === "active" ? (c.assigned ? "ok" : "warn") : "muted"}`}>
                  {c.status}{c.status === "active" ? (c.assigned ? " · assigned" : " · assign by hand") : ""}{c.releasedBy ? ` by ${c.releasedBy}` : ""}
                </span>
              </td>
              {actions && <td><form action={releaseClaim}><input type="hidden" name="id" value={c.id} /><button type="submit" className="cms-btn">Release</button></form></td>}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={actions ? 6 : 5} className="cms-muted">None.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <p className="cms-muted">
        Claims expire after the number of days in <a href={cmsSpaceUrl("c/settings")}>Portal settings</a>. Without a GitHub
        token that can assign issues, each claim also lands in the <a href={cmsSpaceUrl("inbox")}>inbox</a> so someone can
        assign it by hand.
      </p>
      <h2 style={{ fontFamily: "var(--cms-font-display)" }}>Active</h2>
      {table(active, canRelease)}
      <h2 style={{ fontFamily: "var(--cms-font-display)" }}>Expired and released</h2>
      {table(past, false)}
    </>
  );
}
