import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CollectiveBar } from "@/components/CollectiveBar";

// Public site chrome. The admin (app/admin) has its own layout and does not use this.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <CollectiveBar current="site" title="Islamic Tech Collective" />
    </>
  );
}
