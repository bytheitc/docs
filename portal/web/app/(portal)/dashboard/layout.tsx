import { DashNav } from "@/components/portal/DashNav";
import { TopBar } from "@/components/portal/TopBar";
import { getMaintainerHome } from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireContributor();
  // Most contributors maintain nothing, so the link only appears for those who do.
  const home = await getMaintainerHome((await sessionToken())!);
  const maintainer = Boolean(home?.maintainerships.some((m) => !m.endedAt) || home?.invitations.length);
  return (
    <>
      <TopBar current="dashboard" />
      <div className="dash">
        <DashNav maintainer={maintainer} />
        <main id="main" className="dash-main">{children}</main>
      </div>
    </>
  );
}
