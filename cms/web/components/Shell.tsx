// The page frame: themed root, sidebar (brand, navigation, the signed-in user) and main column.
// `theme` is a space id (house theme) or "itc" (the neutral CMS theme in the Collective's palette).
import Link from "next/link";
import { logout } from "@/app/actions";
import { AdminNav, type NavLink } from "@/components/AdminNav";
import { Khatam, variantFor } from "@/components/Khatam";
import type { User } from "@/lib/types";

export function Themed({ theme, children }: { theme: string; children: React.ReactNode }) {
  return <div className="cms" data-space={theme}>{children}</div>;
}

export function Shell({ theme, brand, brandHref, links, user, children }: {
  theme: string;
  brand: string;
  brandHref: string;
  links: NavLink[];
  user: User;
  children: React.ReactNode;
}) {
  return (
    <Themed theme={theme}>
      <div className="cms-shell">
        <a href="#cms-main" className="cms-skip">Skip to content</a>
        <aside className="cms-side">
          <Link href={brandHref} className="cms-brand">
            <Khatam variant={variantFor(theme)} className="cms-mark" strokeWidth={5} accent="var(--cms-mark-accent, var(--cms-accent))" />
            <span>{brand}</span>
          </Link>
          <AdminNav links={links} label={brand} />
          <div className="cms-me">
            <p className="cms-me-name">{user.name}</p>
            <p className="cms-me-role">{user.role}</p>
            <div className="cms-me-links">
              <Link href="/account">Account</Link>
              {theme !== "itc" && <Link href="/">All spaces</Link>}
              <form action={logout}><button type="submit" className="cms-link">Sign out</button></form>
            </div>
          </div>
        </aside>
        <main id="cms-main" className="cms-main" tabIndex={-1}>{children}</main>
      </div>
    </Themed>
  );
}
