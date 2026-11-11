import type { Metadata } from "next";
import "./staff.css";
import "./theme.css";
import { StaffTabs } from "./StaffTabs";
import { signOutStaff } from "./actions";
import { currentStaff } from "@/lib/staff-session";

export const metadata: Metadata = {
  title: { default: "Portal tools", template: "%s · Portal tools" },
  robots: { index: false, follow: false },
};

// These pages show private, changing data, so they are rendered per request.
export const dynamic = "force-dynamic";

/**
 * The portal's staff tools. They sign in with the same CMS account editors use: portal/api asks
 * cms/api to check the token and that the account may open the "portal" space, so there is no second
 * set of credentials anywhere. The sign-in page is inside this layout but needs no session.
 */
export default async function StaffRoot({ children }: { children: React.ReactNode }) {
  const user = await currentStaff();
  return (
    <div className="cms">
      <div className="cms-page">
        <header className="cms-head">
          <p className="cms-kicker">Contributor portal · tools</p>
          {user && (
            <form action={signOutStaff} className="cms-head-row">
              <span className="cms-muted">{user.name || user.email} · {user.role}</span>
              <button type="submit" className="cms-btn">Sign out</button>
            </form>
          )}
        </header>
        {user && <StaffTabs />}
        <div className="pa-wrap">{children}</div>
      </div>
    </div>
  );
}
