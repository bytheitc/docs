import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { getNav } from "@/lib/api";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const sections = await getNav();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <div className="shell">
        <Sidebar sections={sections} />
        {children}
      </div>
    </>
  );
}
