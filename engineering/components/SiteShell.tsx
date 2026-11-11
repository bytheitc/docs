import { CollectiveBar } from "@/components/CollectiveBar";
import { PageIndexProvider } from "@/components/PageIndex";
import { Sidebar } from "@/components/Sidebar";
import { getNav } from "@/lib/data";

// Public docs shell: fixed sidebar, content column and the Collective bar.
// Used by the (site) layout and by the 404 page, which sits outside the route group.
// The admin (app/admin) has its own layout and does not use this.
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const nav = await getNav();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <PageIndexProvider>
        <div className="shell" id="top">
          <Sidebar nav={nav} />
          <div className="content">
            <main id="main" tabIndex={-1}>{children}</main>
            <CollectiveBar current="engineering" />
          </div>
        </div>
      </PageIndexProvider>
    </>
  );
}
