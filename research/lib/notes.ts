// Placeholder working notes. Essays are drafts in the house voice; replace or revise before launch.
import type { Group } from "@/lib/publications";

export interface NoteSection {
  heading?: string;
  paragraphs: string[];
}

export interface Note {
  slug: string;
  title: string;
  dek: string;
  group: Group | "Editorial";
  /** ISO date (YYYY-MM-DD). */
  date: string;
  readingMinutes: number;
  sections: NoteSection[];
  /** Publication ids this note discusses. */
  related?: string[];
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_NOTES: Note[] = [
  {
    slug: "what-the-isnad-can-teach",
    title: "What the isnād can, and cannot, teach a retrieval system",
    dek: "A chain of transmission is a promise about who said what to whom. Software can keep part of that promise, and should be honest about the rest.",
    group: "Language & Text",
    date: "2026-10-14",
    readingMinutes: 8,
    related: ["itc-r-002", "itc-r-003"],
    sections: [
      { paragraphs: [
        "When a system answers a question and attaches a citation, it is making a claim of a particular kind. It is not only saying that something is true; it is saying where the reader can go to see that it is true. The usefulness of the citation depends entirely on whether that second claim holds.",
        "The scholars who developed the hadith sciences understood this better than most. A report was never accepted on the strength of its content alone. It came with an isnād: a chain naming each person who transmitted it, back to its origin. The chain was not decoration. It was the object of study, examined link by link for continuity, reliability and plausibility.",
      ]},
      { heading: "What carries over", paragraphs: [
        "Three features of the isnād carry over to retrieval systems with little strain. First, every link is named. A generated sentence should point to the passage it drew on, that passage to the edition it was taken from, and the edition to its volume and page. Second, links are inspected individually. A chain is only as strong as its weakest connection, and a reader should be able to find that connection without reconstructing the whole pipeline. Third, the chain is kept separate from the report. One can doubt a chain while still finding a report plausible, and the reverse.",
        "In practice this means storing provenance as structured data, not as a footnote added after generation. Our working paper sets out one such structure. Its aim is modest: to make it cheap for a reader to check, and expensive for a system to bluff.",
      ]},
      { heading: "What does not", paragraphs: [
        "Other features do not carry over, and pretending they do would be a disservice to both traditions. The classical critics assessed the character and memory of narrators. A retrieval component has neither. Its failures are of a different kind: it retrieves a passage that is near the topic but not on it; it paraphrases until the meaning shifts; it cites an edition it was never given.",
        "Nor does a well-formed chain make a statement true. The hadith sciences distinguished carefully between the soundness of a chain and the acceptability of its content, and the same distinction applies here. A system can cite perfectly and still mislead by selection, emphasis or omission.",
      ]},
      { heading: "A modest standard", paragraphs: [
        "We propose a standard that is easy to state and harder to meet: no claim without a chain, no chain without a page, and no page that the reader cannot open. Where a system cannot meet it, it should say so in plain words rather than produce something that looks like a citation.",
        "This is a working note. We expect to be corrected on the details, by readers of the classical literature and by engineers alike, and we would rather be corrected now.",
      ]},
    ],
  },
  {
    slug: "deferring-well",
    title: "Deferring well: notes on “I don’t know”",
    dek: "A system that never declines to answer is overconfident. A system that always declines is useless. The interesting work is in between.",
    group: "Trust & Evaluation",
    date: "2026-09-02",
    readingMinutes: 7,
    related: ["itc-r-001"],
    sections: [
      { paragraphs: [
        "There is a long tradition of scholars saying lā adrī, I do not know, and of that saying being counted to their credit. It is a sign that the person knows where the edge of their knowledge lies, and respects the questioner enough to say so.",
        "Language models are not built with that instinct. They are trained to continue text plausibly, and a plausible continuation of a question is an answer. Teaching them to stop, and to say why they are stopping, is one of the more important things evaluation can encourage.",
      ]},
      { heading: "Two ways to fail", paragraphs: [
        "A system can fail by answering when it should defer: giving a confident ruling on a question that depends on circumstances only a qualified person could weigh. It can also fail by deferring when it should answer: refusing a simple factual question out of excessive caution, and sending a person away with nothing.",
        "Benchmarks that report a single score tend to hide the trade between these. A system can improve its headline number by deferring more, or by deferring less, depending on how the score is built. We therefore report the two separately, and we annotate each question with what a careful answer would contain, so that a partial answer that defers at the right point can be recognised as good.",
      ]},
      { heading: "How a deferral is phrased", paragraphs: [
        "Deferring well is not only a matter of when. A refusal that gives no reason, or that sounds like a policy notice, teaches the reader nothing and invites them to look for a less careful source. A good deferral says what is settled, says where opinions legitimately differ, and says who could help.",
        "We are still working out how to score phrasing without turning evaluation into a matter of taste. For now we use a short rubric, published with the protocol, and we welcome criticism of it.",
      ]},
    ],
  },
  {
    slug: "why-we-publish-negative-results",
    title: "Why we publish what did not work",
    dek: "An archive of only successes is a misleading archive. Notes on our policy for negative and null results.",
    group: "Editorial",
    date: "2026-07-21",
    readingMinutes: 5,
    sections: [
      { paragraphs: [
        "Most of what a research group tries does not work. An approach turns out to be slower than the baseline; a measurement turns out to be confounded; a question turns out to be the wrong one. In most fields almost none of this is published, and the record that remains suggests that research is a sequence of successes.",
        "That record wastes other people's time. It sends them down paths that someone has already walked and found closed. It also distorts the evidence, because the published successes include some that were lucky, and the unpublished failures would have shown it.",
      ]},
      { heading: "What we commit to", paragraphs: [
        "ITC Research commits to writing up work that did not reach its aim, at the same standard of care as work that did. A negative result gets a working note at least, with the method, what was expected, what was found, and what we think it means. Where we preregistered a study, the write-up says so and reports against the plan.",
        "We do not promise that every abandoned idea gets a paper. Some ideas are abandoned in an afternoon. The test we apply is whether someone else might reasonably try the same thing and benefit from knowing what happened to us.",
      ]},
      { heading: "A note on tone", paragraphs: [
        "Negative results are not confessions. They should be written plainly, without apology and without spin. The aim is to leave the next person better informed, which is the same aim as any other publication.",
      ]},
    ],
  },
  {
    slug: "twilight-that-never-ends",
    title: "Twilight that never ends: on edge cases",
    dek: "At high latitudes in summer, some prayer times are undefined. How software behaves there says a great deal about how it was designed.",
    group: "Systems",
    date: "2026-05-30",
    readingMinutes: 6,
    related: ["itc-r-008"],
    sections: [
      { paragraphs: [
        "Several prayer times are defined by the depression of the sun below the horizon. In much of the world those angles are reached every day, and the calculation is a matter of astronomy. Far enough from the equator, in summer, the sun never descends far enough, and the definition simply does not produce a time.",
        "Communities living there have long had to decide what to do, and scholars have offered several reasonable conventions. Software, meanwhile, has to do something, and what it does is frequently undocumented.",
      ]},
      { heading: "Silent choices", paragraphs: [
        "The problem is rarely that a library chooses a convention. Some choice is unavoidable. The problem is that the choice is silent. A user sees a time on a screen with no indication that, on this date and at this place, the time was produced by a fallback rule rather than by the definition they assume.",
        "Our report recommends two things. The convention in force should be named on screen whenever it differs from the ordinary calculation. And the user, or their community, should be able to choose among the recognised conventions rather than inherit whichever one a developer happened to implement.",
      ]},
      { heading: "Edge cases as design", paragraphs: [
        "It is tempting to treat cases like this as rare and therefore minor. We think the opposite is closer to true. The edges are where a system's assumptions become visible, and where the people relying on it have the least margin to notice an error. Designing for the edge first is usually a good way to get the middle right as well.",
      ]},
    ],
  },
];


export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d} ${months[m - 1]} ${y}`;
}
