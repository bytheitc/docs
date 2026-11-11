import { CollectiveBar } from "@/components/CollectiveBar";
import { SiteHeader } from "@/components/SiteHeader";
import { getSettings } from "@/lib/data";

// Public site chrome, shared by app/(site)/layout.tsx and app/not-found.tsx. The admin does not use it.
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const { githubOrgUrl } = await getSettings();
  return (
    <>
      <a className="skip" href="#main">SKIP TO CONTENT</a>
      <SiteHeader githubUrl={githubOrgUrl} />
      <main id="main">{children}</main>
      <CollectiveBar current="oss" title="PART OF THE ISLAMIC TECH COLLECTIVE" />
    </>
  );
}
