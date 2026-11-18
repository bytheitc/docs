import Link from "next/link";
import { Header } from "@/components/Header";
import { requireStaff } from "@/lib/staff-session";
import { signOut } from "../actions";

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStaff();
  return (
    <>
      <Header withMenu={false} />
      <div className="admin">
        <nav className="status" aria-label="Editor">
          <Link href="/admin">All pages</Link>
          <Link href="/admin/new">New page</Link>
          <Link href="/admin/sidebar">Sidebar</Link>
          <span style={{ flex: 1 }} />
          <span>{user.name || user.email} · {user.role}</span>
          <form action={signOut}><button type="submit" className="btn ghost small">Sign out</button></form>
        </nav>
        {children}
      </div>
    </>
  );
}
