import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Doc } from "@/components/Prose";
import { PageHead } from "@/components/PageHead";
import { getDoc } from "@/lib/data";
import { house } from "@/lib/houses";

export const metadata: Metadata = {
  title: "The idea",
  description:
    "Why ITC Health exists, what it is trying to build, and the commitments it intends to be held to. An argument, not a roadmap.",
};

export default async function IdeaPage() {
  const sections = await getDoc("idea");
  // The api falls back to its own seed content, so this only happens when the api is unreachable.
  if (!sections) notFound();
  const self = house("health");

  return (
    <>
      <PageHead
        kicker="The idea"
        title={<>What this house is for.</>}
        lede={
          <p>
            An argument rather than a roadmap. There are no programmes, partners or dates here yet,
            because there are none to report — when there are, they will appear with dates attached.
          </p>
        }
        arabic={{ word: self.arabic, translit: self.transliteration, sense: self.sense }}
      />
      <div className="wrap">
        <Doc sections={sections} tocLabel="On this page" />
      </div>
    </>
  );
}
