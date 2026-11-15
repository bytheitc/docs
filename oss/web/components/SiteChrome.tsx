import { CollectiveBar } from "@/components/CollectiveBar";
import { SiteHeader } from "@/components/SiteHeader";
import { getSettings } from "@/lib/data";
import { currentAccount } from "@/lib/session";

// Public site chrome, shared by app/(site)/layout.tsx and app/not-found.tsx. The admin does not use it.
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [{ githubOrgUrl }, me] = await Promise.all([getSettings(), currentAccount()]);
  return (
    <>
      <a className="skip" href="#main">SKIP TO CONTENT</a>
      <SiteHeader githubUrl={githubOrgUrl} accountName={me?.preferred_username ?? me?.name ?? null} />
      <main id="main">{children}</main>
      <CollectiveBar current="oss" title="PART OF THE ISLAMIC TECH COLLECTIVE" />
    </>
  );
}
