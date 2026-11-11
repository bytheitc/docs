import { SiteShell } from "@/components/SiteShell";

// Public site chrome. The admin (app/admin) has its own layout and does not use this.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
