import { Lattice } from "@/components/Lattice";
import { SiteHeader } from "@/components/SiteHeader";
import { CollectiveBar } from "@/components/CollectiveBar";

// Public site chrome. The admin (app/admin) has its own layout and does not use this.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip">skip to content</a>
      <Lattice />
      <SiteHeader />
      <main id="main">{children}</main>
      <CollectiveBar current="ai" />
    </>
  );
}
