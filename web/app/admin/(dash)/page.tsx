import Link from "next/link";
import { staffPages, staffStatus } from "@/lib/api";
import { requireStaff } from "@/lib/staff-session";

export const metadata = { title: "Edit the docs" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { token } = await requireStaff();
  const [pages, status] = await Promise.all([staffPages(token), staffStatus(token)]);
  const list = pages.ok ? pages.pages : [];
  const groups = new Map<string, typeof list>();
  for (const p of list) {
    const k = p.section ?? "Not in the sidebar";
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === "Not in the sidebar" ? 1 : b === "Not in the sidebar" ? -1 : 0));
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Edit the docs</h1>
          <p>{list.length} pages. Every save is a commit, under your name.</p>
        </div>
        <Link href="/admin/new" className="btn">New page</Link>
      </div>
      {(await searchParams).deleted && <p className="flash ok">Page deleted.</p>}
      {status.ok && (
        <p className="status">
          <span><span className={`dot${status.writable ? "" : " off"}`} />{status.writable ? "Saving to" : "Read-only:"} <code>{status.where}</code></span>
          {!status.writable && <span>Set DOCS_GITHUB_TOKEN on docs/api to allow edits.</span>}
        </p>
      )}
      {!pages.ok && <p className="flash bad">{pages.message}</p>}
      <div className="page-groups">
        {ordered.map(([section, ps]) => (
          <section key={section} className="page-group">
            <h2>{section}</h2>
            <ul className="page-list">
              {ps.map((p) => (
                <li key={p.slug}>
                  <Link href={`/admin/edit/${p.slug}`}>
                    <b>{p.title} <code>/{p.slug === "index" ? "" : p.slug}</code></b>
                    <span>{p.description || "No description yet."}</span>
                    <em>{p.words.toLocaleString("en-GB")} words</em>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
