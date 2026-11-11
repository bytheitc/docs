import type { Metadata } from "next";
import { Doc } from "@/components/Prose";
import { PageHead } from "@/components/PageHead";
import { notFound } from "next/navigation";
import { getDoc, getSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Code of conduct (adab)",
  description: "The ITC Open Source code of conduct: expected behaviour, unacceptable behaviour, scope, reporting and enforcement.",
};

export default async function ConductPage() {
  const sections = await getDoc("code-of-conduct");
  if (!sections) notFound();
  const { contact: CONTACT } = await getSettings();
  return (
    <>
      <PageHead
        crumbs={[{ href: "/code-of-conduct", label: "ADAB" }]}
        kicker="CODE OF CONDUCT · APPLIES EVERYWHERE"
        title={<>ADAB IS<br /><span className="hl">NOT OPTIONAL.</span></>}
        lede={<p>Critique the code, never the coder. Assume good faith. Make room for beginners. Report a concern: <a href={`mailto:${CONTACT.conduct}`}>{CONTACT.conduct}</a></p>}
        arabic={{ word: "أدب", translit: "adab", sense: "good conduct, the manners of a person of knowledge" }}
      />
      <Doc sections={sections} tocLabel="THE CODE" />
    </>
  );
}
