import type { Metadata } from "next";
import { Doc } from "@/components/Prose";
import { PageHead } from "@/components/PageHead";
import { notFound } from "next/navigation";
import { getDoc } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contribute",
  description: "The first-timer's guide to ITC Open Source: setup, finding an issue, branching, commits, pull requests, review and what happens after merge.",
};

export default async function ContributePage() {
  const sections = await getDoc("contribute");
  if (!sections) notFound();
  return (
    <>
      <PageHead
        crumbs={[{ href: "/contribute", label: "CONTRIBUTE" }]}
        kicker="FIRST-TIMER'S GUIDE · 7 STEPS"
        title={<>YOUR FIRST PR.<br /><span className="hl">START HERE.</span></>}
        lede={<p>Everything from <code>git clone</code> to your name on the wall. No gatekeeping, no secret handshake. If a step here is wrong or unclear, that&apos;s your first issue.</p>}
      />
      <Doc sections={sections} tocLabel="THE GUIDE" />
    </>
  );
}
