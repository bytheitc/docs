import { staffNav, staffPages } from "@/lib/api";
import { canPublish, requireStaff } from "@/lib/staff-session";
import { NavEditor } from "./NavEditor";

export const metadata = { title: "Sidebar" };

export default async function SidebarPage() {
  const { token, user } = await requireStaff("/admin/sidebar");
  const [nav, pages] = await Promise.all([staffNav(token), staffPages(token)]);
  if (!nav.ok || !pages.ok) return <p className="flash bad">{!nav.ok ? nav.message : !pages.ok ? pages.message : ""}</p>;
  return (
    <>
      <div className="admin-head"><div><h1>Sidebar</h1><p>Sections and the order of pages in them. A page left out keeps its address but isn&apos;t listed.</p></div></div>
      {!canPublish(user) && <p className="flash info">Reordering the sidebar needs the publisher role. You can look, but not save.</p>}
      <NavEditor initial={nav.nav} sha={nav.sha} titles={Object.fromEntries(pages.pages.map((p) => [p.slug, p.title]))} canSave={canPublish(user)} />
    </>
  );
}
