import { DashNav } from "@/components/portal/DashNav";
import { TopBar } from "@/components/portal/TopBar";
import { requireContributor } from "@/lib/session";

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireContributor();
  return (
    <>
      <TopBar current="dashboard" />
      <div className="dash">
        <DashNav />
        <main id="main" className="dash-main">{children}</main>
      </div>
    </>
  );
}
