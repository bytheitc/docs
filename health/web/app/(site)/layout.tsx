import { CollectiveBar } from "@/components/CollectiveBar";
import { Masthead } from "@/components/Masthead";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Masthead />
      <main id="main">{children}</main>
      <CollectiveBar current="health" />
    </>
  );
}
