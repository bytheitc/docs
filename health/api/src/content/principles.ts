// What this house holds itself to. Short on purpose: a principle that needs a paragraph is a
// policy, and policies belong on the idea page where they can carry their reasoning.
export interface Principle {
  id: string;
  title: string;
  body: string;
}

export const SEED_PRINCIPLES: Principle[] = [
  {
    id: "least-data",
    title: "The least data that works",
    body: "We collect what the tool needs to function and nothing we merely find interesting. What we hold, and why, is written down where the person holding it can read it.",
  },
  {
    id: "never-for-sale",
    title: "Health data is never for sale",
    body: "Not in aggregate, not de-identified, not as a research partnership that is a sale in other words. There is no price, so there is no negotiation.",
  },
  {
    id: "works-offline",
    title: "Offline is the normal case",
    body: "The connection is the thing that fails. Anything that stops working when the network does was built for somewhere else.",
  },
  {
    id: "clinician-accountable",
    title: "A clinician is accountable",
    body: "Nothing reaches a patient without a qualified clinician answerable for it. Software advises; it does not practise medicine.",
  },
  {
    id: "evidence-or-silence",
    title: "Evidence, or say nothing",
    body: "Every clinical claim carries what it rests on, including when that is thin. Where we do not know, we say that instead.",
  },
];
