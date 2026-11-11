import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, SectionHead } from "@/components/Heads";
import { ProposalForm } from "@/components/ProposalForm";
import { roman } from "@/lib/roman";

export const metadata: Metadata = {
  title: "Propose a Center",
  description: "Guidelines for proposing a new center at the Institute, and a form to begin.",
};

const CRITERIA = [
  { title: "An enduring question", body: "A center holds a question that will still matter in a generation, not a project that will be finished in a year." },
  { title: "Rooted in the tradition", body: "The question can be read in conversation with the Islamic sciences, and the center would seek out scholars who can help." },
  { title: "Distinct from the existing rooms", body: "It asks something none of the current centers already holds, or holds it in a way they cannot." },
  { title: "Kept by people", body: "There are at least a few people willing to keep it: to read, convene and carry its first year." },
  { title: "Open to the collective", body: "Its seminars, outputs and invitations would be open to the whole collective, and its work published openly." },
];

const PROCESS = [
  { season: "Any season", title: "Write", body: "Send a proposal using the form below. A short one is welcome; it can grow." },
  { season: "Within the term", title: "Conversation", body: "An officer of the Institute writes back to talk through the question and who might keep it." },
  { season: "Spring", title: "Hearing", body: "Mature proposals are heard at the colloquium, where the directors of the existing centers respond." },
  { season: "Autumn", title: "Opening", body: "If accepted, the new center presents its first agenda at convocation." },
];

export default function ProposePage() {
  return (
    <>
      <PageHead
        id="propose-head"
        arch={{ arabic: "اقتراح", translit: "iqtirāḥ", sense: "proposal" }}
        kicker="Propose a Center"
        title={<>Have a question <em>worth a center?</em></>}
        lede="The house is meant to grow. Any member of the collective may propose a new room, and every proposal is read with care."
      />

      <section className="block">
        <SectionHead numeral="I" kicker="What makes a center" title="Five marks of a room." />
        <ol className="questions">
          {CRITERIA.map((c, k) => (
            <li key={c.title}>
              <span className="q-num">{roman(k + 1)}</span>
              <p><strong>{c.title}.</strong> {c.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="year band">
        <SectionHead numeral="II" kicker="The process" title="How a proposal is heard." />
        <ol className="seasons">
          {PROCESS.map((p) => (
            <li key={p.title}>
              <span className="season">{p.season}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block form-sec" id="form">
        <SectionHead numeral="III" kicker="The proposal" title={<em>Begin here.</em>} />
        <p className="intro">
          Write plainly; there is no required length. If you are unsure whether your question fits, read the{" "}
          <Link href="/centers">existing centers</Link> first, and propose anyway.
        </p>
        <ProposalForm />
      </section>
    </>
  );
}
