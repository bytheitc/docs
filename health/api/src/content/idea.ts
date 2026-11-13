// The /idea page: what this house is for, written so it can be read by someone who has never
// heard of the Collective.
//
// Seed content. It is what the house serves until an editor changes it in the Studio, and it is a
// first draft of an argument rather than a settled plan — the programmes, partners and dates that
// would make it a plan do not exist yet, so none are claimed here.
import type { DocSection } from "./doc.js";

export const SEED_IDEA: DocSection[] = [
  {
    id: "why",
    title: "Why a health house",
    blocks: [
      "Health technology is built, overwhelmingly, for the places that can pay for it. The result is tooling that assumes a fast connection, a single language, a particular body, and a patient comfortable handing over everything about themselves in exchange for care. Most of the world does not live there.",
      "ITC Health exists because the gap is not mainly a research gap. The science is largely published and the models are largely available. What is missing is software that takes the constraints of an under-resourced clinic as its starting point rather than as an edge case, and that treats the person in front of it as someone owed dignity rather than as a source of data.",
      {
        note: "ʿāfiya (عافية) is not quite “health”. It is soundness — of body, of mind, of circumstance — and relief from affliction. It is asked for daily, for oneself and for others. That is the word this house is named for, and it sets a wider brief than disease.",
        tone: "mint",
      },
    ],
  },
  {
    id: "vision",
    title: "What we are trying to build",
    blocks: [
      "Software for the parts of care that are unglamorous and load-bearing: getting a record from one clinic to another, knowing which medicines are actually in stock, helping a health worker who is the only one for forty kilometres decide what to do next. These are not research problems. They are engineering problems nobody has been paid enough to solve well.",
      {
        list: [
          "Tools that work offline first, because the connection is the thing that fails.",
          "Records that belong to the person they describe, and travel with them.",
          "Clinical software in the languages people actually speak at home.",
          "Open formats, so a clinic is never held hostage by the system it adopted.",
          "Care pathways that make room for fasting, for modesty, and for the end of life as people actually wish to meet it.",
        ],
      },
      "The last of those is the one most easily dismissed as soft. It is not. A diabetes plan that cannot account for Ramadan is a plan that will be abandoned in the ninth month, and a service that cannot offer a woman a female clinician is a service some women will simply not use. These are adherence problems with a clinical cost, and they are fixable in software.",
    ],
  },
  {
    id: "commitments",
    title: "What we commit to",
    blocks: [
      "Health data is the most intimate record most people ever generate, and the hardest to take back once it has moved. The defaults matter more here than anywhere else in the Collective.",
      {
        steps: [
          "Collect the least that makes the tool work, and say plainly what that is.",
          "Never sell, broker or trade health data. Not in aggregate, not de-identified, and not as a research partnership that is a sale in other words.",
          "Publish findings about a population only in a form that cannot be walked back to a person.",
          "Treat consent as a real choice, which means the tool has to still work for someone who declines.",
          "Carry the evidence with every clinical claim, or remove the claim. “It seemed to help” is not a claim.",
        ],
      },
      {
        note: "None of this is novel. It is the ordinary standard, written down because health technology routinely fails to meet it, and because writing it down is what makes it checkable.",
      },
    ],
  },
  {
    id: "how",
    title: "How this house works",
    blocks: [
      "In the open, like the rest of the Collective. Code under OSI-approved licences in [ITC Open Source](https://github.com/bytheitc/oss). Method and evidence through ITC Research, including the studies that did not work. Clinical judgement from practising clinicians, not from engineers reading papers.",
      "Nothing here reaches a patient without a qualified clinician accountable for it. That is a hard line, and the one most likely to slow us down. It stays.",
    ],
  },
  {
    id: "where",
    title: "Where this is up to",
    blocks: [
      "At the beginning. This page is an argument, not a roadmap: there are no programmes to announce, no partners to name and no results to report. When there are, they will appear here with dates attached, and this section will say what changed.",
      "If you build health software, practise medicine, or have had to use a system like this as a patient and found it wanting — that last experience is the one we have least of and need most.",
    ],
  },
];
