import Link from "next/link";
import { notFound } from "next/navigation";
import { pageHistory, staffPage } from "@/lib/api";
import { canPublish, requireStaff } from "@/lib/staff-session";
import { Editor } from "./Editor";
import { DangerZone } from "./DangerZone";

export const metadata = { title: "Editing" };

type Props = { params: Promise<{ slug: string[] }>; searchParams: Promise<{ created?: string; moved?: string }> };

export default async function EditPage({ params, searchParams }: Props) {
  const slug = (await params).slug.map(decodeURIComponent).join("/");
  const { token, user } = await requireStaff(`/admin/edit/${slug}`);
  const [found, history] = await Promise.all([staffPage(token, slug), pageHistory(token, slug)]);
  if (!found.ok) {
    if (found.status === 404) notFound();
    return <p className="flash bad">{found.message}</p>;
  }
  const page = found.page;
  const sp = await searchParams;
  const href = slug === "index" ? "/" : `/${slug}`;
  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow"><Link href="/admin">All pages</Link>{page.section ? ` · ${page.section}` : " · Not in the sidebar"}</p>
          <h1>{page.title}</h1>
          <p><Link href={href} target="_blank">{href}</Link></p>
        </div>
      </div>
      {sp.created && <p className="flash ok">Page created. Write it, then save.</p>}
      {sp.moved && <p className="flash ok">Moved. Links to the old address now show “not found”, so update any that point here.</p>}
      <Editor
        page={{ slug, title: page.title, description: page.description, markdown: page.markdown, sha: page.sha }}
        side={
          <>
            <div className="card">
              <h3>History</h3>
              {history.ok && history.revisions.length > 0 ? (
                <ul className="history">
                  {history.revisions.slice(0, 8).map((r) => (
                    <li key={r.sha}>
                      {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer"><b>{r.message}</b></a> : <b>{r.message}</b>}
                      <span>{r.author} · {new Date(r.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13.5 }}>{history.ok ? "History is kept in the repository once the docs are saved to GitHub." : history.message}</p>
              )}
            </div>
            {canPublish(user) && slug !== "index" && <DangerZone slug={slug} sha={page.sha} />}
          </>
        }
      />
    </>
  );
}
