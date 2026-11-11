// The AI house charter: five principles, why we hold them, and how each one is enforced at release.
// Seed content: editors manage the live version in the admin (collection "principles").
// Placeholder wording. Review with the collective's scholars and advisors before launch.

/** A principle's id (slug). The seed uses amanah, sidq, adl, shura and ilm; editors may add more. */
export type PrincipleId = string;

export interface Principle {
  id: PrincipleId;
  /** Transliteration, as used across the site. */
  k: string;
  arabic: string;
  /** Plain-English sense of the word. */
  sense: string;
  title: string;
  summary: string;
  reasoning: string[];
  practice: string[];
  enforcement: { gate: string; detail: string }[];
}

export const SEED_PRINCIPLES: Principle[] = [
  {
    id: "amanah",
    k: "amānah",
    arabic: "أمانة",
    sense: "trust, something held on behalf of another",
    title: "Data is a trust.",
    summary: "We collect only what's needed, keep it only as long as it's needed and never sell it.",
    reasoning: [
      "An amānah is something placed in your keeping that still belongs to someone else. People bring us questions about faith, family, health and money: the most personal questions they have. Holding that data is not ownership. It is custody, and custody comes with obligations.",
      "Most AI products treat user data as a resource to be mined. We treat it as a liability we have agreed to carry. That changes the default for every design decision: the question is never “what could we do with this?” but “do we need to hold this at all?”",
    ],
    practice: [
      "On-device inference is the default wherever a model is small enough to run there.",
      "Conversation memory is off unless a person turns it on, and turning it off deletes what was kept.",
      "No user content is used for training without separate, explicit, revocable consent.",
      "Datasets are documented with their sources, licences and retention periods before use.",
      "We do not sell, rent or share personal data with advertisers. Ever.",
    ],
    enforcement: [
      { gate: "data inventory", detail: "Every release ships with a list of what data the system touches, where it goes and how long it is kept." },
      { gate: "retention check", detail: "Automated tests confirm that deleted data is actually gone from logs, caches and backups within the stated window." },
      { gate: "privacy review", detail: "A reviewer outside the build team signs off on any change that moves data off a device." },
    ],
  },
  {
    id: "sidq",
    k: "ṣidq",
    arabic: "صدق",
    sense: "truthfulness, integrity of word",
    title: "Be truthful about limits.",
    summary: "Systems must say when they don't know. Confident fabrication is a defect, not a feature.",
    reasoning: [
      "Ṣidq is truthfulness in speech, and also the integrity that makes words trustworthy. A language model that invents a hadith reference, a page number or a scholarly position is not being helpful. It is putting false words into a domain where people act on what they read.",
      "Our systems do not issue religious rulings. Where a question calls for a qualified scholar, the honest answer is to say so, show the range of established positions where that is appropriate, and point the person back to people who carry that responsibility.",
    ],
    practice: [
      "Models are tuned to abstain, hedge or refer when evidence is thin, and evaluated on how well they do it.",
      "Every citation a retrieval system produces must resolve to a real source; unverifiable citations are suppressed, not shown.",
      "Interfaces show uncertainty plainly instead of hiding it behind fluent prose.",
      "Questions of fiqh and personal religious guidance are routed to “ask a scholar you trust,” not answered.",
    ],
    enforcement: [
      { gate: "honest-uncertainty eval", detail: "A release cannot ship if it regresses on appropriate deferral or fabricated-citation measures." },
      { gate: "citation audit", detail: "A sample of generated citations is checked by hand against the source text for every release." },
      { gate: "scholar review", detail: "Behaviour on religious questions is reviewed by qualified scholars advising the collective before release." },
    ],
  },
  {
    id: "adl",
    k: "ʿadl",
    arabic: "عدل",
    sense: "justice, balance, giving each their due",
    title: "Measure fairness.",
    summary: "Every release is evaluated across languages, dialects and communities before it ships.",
    reasoning: [
      "ʿAdl is justice in the sense of balance: giving each their due. A model that works well for one dialect of Arabic and poorly for another, or well for English speakers and poorly for converts reading in a second language, is not neutral. It quietly decides whose questions matter.",
      "Fairness that isn't measured is only a hope. We commit to measuring it, publishing the measurements, and not shipping when the gaps are larger than we have said we will accept.",
    ],
    practice: [
      "Evaluation sets include multiple Arabic dialects, classical Arabic and the languages our communities actually use.",
      "Results are reported per group, never only as a single averaged score.",
      "Known gaps are written into the model card in plain language.",
    ],
    enforcement: [
      { gate: "per-group reporting", detail: "Release reports must include results for every language and dialect group in the evaluation suite." },
      { gate: "gap threshold", detail: "Each release states its maximum acceptable gap between groups in advance; exceeding it blocks the release." },
      { gate: "public model card", detail: "Known disparities are published with the model, not discovered later by users." },
    ],
  },
  {
    id: "shura",
    k: "shūrā",
    arabic: "شورى",
    sense: "consultation, deciding together",
    title: "Decide with those affected.",
    summary: "Community review is part of the release process, not an afterthought.",
    reasoning: [
      "Shūrā is mutual consultation: decisions that affect a community are made with that community. AI systems are increasingly placed between people and their imams, teachers and caseworkers. The people on both sides of that relationship should shape how it works.",
      "Consultation after launch is just feedback. We want it before: while the design can still change, and while “no, not like this” is still a possible answer.",
    ],
    practice: [
      "Each project has a review circle that includes people from the communities it serves, not only engineers.",
      "Pilots run with partner organisations who can stop the pilot at any time.",
      "Review notes, including objections we did not resolve, are summarised in the release notes.",
    ],
    enforcement: [
      { gate: "review circle sign-off", detail: "No public release without a recorded review session with the project's community circle." },
      { gate: "partner veto", detail: "Pilot partners may halt a deployment in their organisation without needing to justify it." },
      { gate: "dissent log", detail: "Unresolved objections are recorded and published alongside the release." },
    ],
  },
  {
    id: "ilm",
    k: "ʿilm",
    arabic: "علم",
    sense: "knowledge, learning",
    title: "Publish what we learn.",
    summary: "Methods, evals and failures, all of it shared openly through ITC Research and ITC Open Source.",
    reasoning: [
      "Seeking knowledge is held in high regard in the Islamic tradition, and knowledge that is hoarded benefits no one. The questions we work on — how a model should behave around sacred text, how to measure honest uncertainty — are questions the whole field needs answered.",
      "Publishing failures matters as much as publishing successes. A negative result saves someone else months, and a documented failure mode is one fewer surprise for a community that adopts these tools.",
    ],
    practice: [
      "Evaluation suites and their scoring code are released under open licences through ITC Open Source.",
      "Methods and findings, including negative results, are written up with ITC Research.",
      "Model cards are published for every model we release, using the same template.",
    ],
    enforcement: [
      { gate: "reproducibility pack", detail: "Each published result ships with the code and configuration needed to reproduce it." },
      { gate: "postmortem rule", detail: "Any withdrawn release gets a public write-up of what went wrong." },
      { gate: "open by default", detail: "Keeping a component closed requires a written reason, such as protecting personal data." },
    ],
  },
];

/** Looks up a principle in a list; undefined if it is missing or unpublished. */
export const principleById = (list: Principle[], id: PrincipleId) => list.find((p) => p.id === id);
