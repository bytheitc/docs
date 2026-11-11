// The four principles of the Collective. Used on the home page (short form) and /about (in depth).
export interface Principle {
  slug: string;
  ar: string;
  name: string;
  en: string;
  root: string;
  body: string;
  long: string[];
  practice: string[];
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_PRINCIPLES: Principle[] = [
  {
    slug: "amanah",
    ar: "أمانة",
    name: "Amānah",
    en: "Trust",
    root: "From the root ʾ-m-n: safety, faithfulness, the thing entrusted.",
    body: "Data, code and attention are held in trust. We collect less, explain more and leave people better off than we found them.",
    long: [
      "An amānah is something placed in your care that is not yours. Everything we touch fits that description: a person’s data, a maintainer’s evenings, a community’s attention, a funder’s confidence.",
      "Holding something in trust changes the default. We start from the least we need, we say plainly what we keep and why, and we hand things back when the purpose is served.",
    ],
    practice: [
      "Collect the minimum. If a feature needs more data, it has to say why in writing.",
      "Plain-language notices before fine print.",
      "Funds, credentials and decisions are recorded so they can be accounted for.",
    ],
  },
  {
    slug: "ihsan",
    ar: "إحسان",
    name: "Iḥsān",
    en: "Excellence",
    root: "From the root ḥ-s-n: beauty, goodness, doing a thing well.",
    body: "Doing the work beautifully, as if it is being seen, because it is. Craft is a form of respect.",
    long: [
      "Iḥsān joins the beautiful and the good. It asks for work done well even where no one will check: the error message, the migration script, the footnote, the accessible label.",
      "We treat craft as a courtesy to the people who will use, maintain and inherit what we make.",
    ],
    practice: [
      "Accessibility and documentation are part of “done”, not extras.",
      "Review is generous and specific. We critique work, never people.",
      "We would rather ship less and ship it whole.",
    ],
  },
  {
    slug: "shura",
    ar: "شورى",
    name: "Shūrā",
    en: "Consultation",
    root: "From the root sh-w-r: to seek counsel, to deliberate together.",
    body: "Decisions are made with the people they affect. We design in the open and change our minds when shown better.",
    long: [
      "Shūrā is mutual consultation: deciding with, not for. Across five houses it is also how we stay one collective rather than five neighbours.",
      "We write proposals down, invite the people they touch, and record what was decided and why. Being persuaded is a strength, not a loss.",
    ],
    practice: [
      "Significant decisions start as a written proposal with a comment period.",
      "Every house has a voice on the collective council.",
      "Reasons are published alongside outcomes.",
    ],
  },
  {
    slug: "ilm",
    ar: "علم",
    name: "ʿIlm",
    en: "Knowledge",
    root: "From the root ʿ-l-m: to know, to mark, to be a sign.",
    body: "Learning is shared, not hoarded. What we discover, we publish. What we build, we teach.",
    long: [
      "ʿIlm is knowledge that carries responsibility. Our tradition treats teaching as a continuing charity, so the default for what we learn is to pass it on.",
      "That means open licences where we can, clear write-ups when we can’t, and room for beginners at every table.",
    ],
    practice: [
      "Research and code are published openly unless there is a stated reason not to.",
      "Every project keeps a path in for first-time contributors.",
      "We cite our sources, classical and contemporary alike.",
    ],
  },
];
