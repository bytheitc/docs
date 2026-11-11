import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { AdminNav } from "@/components/cms/AdminNav";
import { Khatam } from "@/components/Khatam";
import { can, currentUser } from "@/lib/cms/auth";
import { ADMIN_LINKS, COLLECTIONS } from "@/lib/cms/collections";
import { CMS_CONFIG } from "@/lib/cms/config";
import { getStorage } from "@/lib/cms/storage";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const store = getStorage();
  if (!store) redirect("/admin/login");
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/admin/login");
  const unread = await store.countSubmissions({ status: "new" });

  const links = [
    { href: "/admin", label: "Overview" },
    ...COLLECTIONS.map((c) => ({ href: `/admin/c/${c.name}`, label: c.label })),
    ...ADMIN_LINKS.filter((l) => can(user, l.role ?? "editor")).map((l) => ({ href: l.href, label: l.label })),
    { href: "/admin/inbox", label: "Inbox", badge: unread || undefined },
    ...(can(user, "admin") ? [{ href: "/admin/users", label: "Accounts" }, { href: "/admin/audit", label: "Audit log" }] : []),
  ];

  return (
    <div className="cms-shell">
      <a href="#cms-main" className="cms-skip">Skip to content</a>
      <aside className="cms-side">
        <Link href="/admin" className="cms-brand">
          <Khatam variant={CMS_CONFIG.house} className="cms-mark" strokeWidth={5} accent="var(--cms-accent)" />
          <span>{CMS_CONFIG.title}</span>
        </Link>
        <AdminNav links={links} />
        <div className="cms-me">
          <p className="cms-me-name">{user.name}</p>
          <p className="cms-me-role">{user.role}</p>
          <div className="cms-me-links">
            <Link href="/admin/account">Account</Link>
            <Link href="/" target="_blank">View site ↗</Link>
            <form action={logout}><button type="submit" className="cms-link">Sign out</button></form>
          </div>
        </div>
      </aside>
      <main id="cms-main" className="cms-main" tabIndex={-1}>{children}</main>
    </div>
  );
}
