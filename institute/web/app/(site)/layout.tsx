import { Masthead } from "@/components/Masthead";
import { CollectiveBar } from "@/components/CollectiveBar";

// Public site chrome. The admin (app/admin) has its own layout and does not use this.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <Masthead />
      <main id="main" tabIndex={-1}>{children}</main>
      <CollectiveBar current="institute" />
    </>
  );
}
