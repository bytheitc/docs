import { SiteChrome } from "@/components/SiteChrome";

// Public site chrome. The admin (app/admin) has its own layout and does not use this.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
