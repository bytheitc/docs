import { CollectiveBar } from "@/components/CollectiveBar";

// Every portal page depends on who is signed in.
export const dynamic = "force-dynamic";

// Public chrome is rendered per page (TopBar knows the current section); the admin has its own layout.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      {children}
      <CollectiveBar current="portal" title="Islamic Tech Collective · Contributor Portal" />
    </>
  );
}
