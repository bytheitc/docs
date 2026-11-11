import { PortalTabs } from "./PortalTabs";
import { requireUser } from "@/lib/cms/auth";

// Portal administration lives under /admin/portal. The kit's sidebar is built inside a kit file
// (app/admin/(panel)/layout.tsx) from COLLECTIONS only, so these pages get their own tab bar instead.
export default async function PortalAdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser("editor");
  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Contributor portal</p>
      </header>
      <PortalTabs />
      <div className="pa-wrap">{children}</div>
    </div>
  );
}
