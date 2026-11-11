import type { Metadata } from "next";
import { Doc } from "@/components/Prose";
import { PageHead } from "@/components/PageHead";
import { notFound } from "next/navigation";
import { getDoc } from "@/lib/data";

export const metadata: Metadata = {
  title: "Governance",
  description: "How ITC Open Source makes decisions: roles, RFCs, becoming a maintainer, and licensing policy (OSI-approved only, no CLA).",
};

export default async function GovernancePage() {
  const sections = await getDoc("governance");
  if (!sections) notFound();
  return (
    <>
      <PageHead
        crumbs={[{ href: "/governance", label: "GOVERNANCE" }]}
        kicker="DRAFT · NOT YET RATIFIED"
        title={<>OWNED BY NO ONE.<br /><span className="hl">RUN IN PUBLIC.</span></>}
        lede={<p>Who decides, how, and how you get a say. Public RFCs, open roadmaps, OSI-approved licences only, and no CLA. Ever.</p>}
        arabic={{ word: "مشاع", translit: "mashāʿ", sense: "the commons: held by all, owned by none" }}
      />
      <Doc sections={sections} tocLabel="THE RULES" />
    </>
  );
}
