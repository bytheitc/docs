import { requireStaff } from "@/lib/staff-session";
import { TopBar } from "@/components/TopBar";
import { DashNav } from "./DashNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireStaff(); // redirects to /staff/sign-in if not signed in
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <TopBar />
      <div className="dash">
        <DashNav />
        <main id="main" className="dash-main">{children}</main>
      </div>
    </>
  );
}
