// The suggestions page: what the Collective should build for the Muslim community, asked of the
// people who would use it. This is the page's own copy; the suggestions themselves arrive as form
// submissions and are read in the Studio's inbox.

export interface SuggestPrompt {
  title: string;
  body: string;
}

export interface SuggestStep {
  title: string;
  body: string;
}

export interface SuggestPage {
  id: string;
  headline: string;
  intro: string;
  /** Questions that help someone describe a need rather than a feature. */
  prompts: SuggestPrompt[];
  /** What happens to a suggestion after it is sent. */
  steps: SuggestStep[];
  /** The kinds of need the form offers. */
  areas: string[];
  /** What the Collective will not take on, said plainly. */
  outOfScope: string[];
  /** Shown under the form. */
  privacy: string;
}

// Placeholder copy, written to be read and argued with before the page goes live.
export const SEED_SUGGEST: SuggestPage = {
  id: "suggest",
  headline: "Tell us what to build",
  intro:
    "We would rather build the thing a community actually needs than the thing a committee imagined. If you have watched a masjid, a school, a charity or a family struggle with something software could carry, describe it here. You do not need a solution, a specification or any technical knowledge. The problem is the useful part.",
  prompts: [
    {
      title: "Who is struggling, and with what?",
      body: "Name the people, not the feature. “Our madrasah secretary re-types the same register four times a week” tells us far more than “we need a database”.",
    },
    {
      title: "What happens today?",
      body: "Describe the workaround: the spreadsheet, the group chat, the paper form, the volunteer who holds it all in their head. The workaround usually contains the real requirement.",
    },
    {
      title: "What would change if it worked?",
      body: "Who gets time back, who stops being excluded, what becomes possible that isn't now.",
    },
    {
      title: "Does something already exist?",
      body: "If you have tried a tool and abandoned it, tell us which and why. Knowing what failed saves us repeating it.",
    },
  ],
  steps: [
    { title: "We read every one", body: "A person reads each suggestion. Nothing is scored by a machine and nothing is discarded unread." },
    { title: "We look for the pattern", body: "Suggestions are grouped by the need underneath them. Five people describing the same problem differently is the strongest signal we get." },
    { title: "We write it up in the open", body: "A need we decide to take on becomes a public brief on the RFPs page, so anyone can build it — not only us." },
    { title: "We tell you either way", body: "If you leave an email address, you hear what happened to your suggestion, including when the answer is no." },
  ],
  areas: [
    "Masjid and community administration",
    "Education and madrasah",
    "Charity, zakat and giving",
    "Qur'an, hadith and Islamic text",
    "Scholarship and research tools",
    "Language, translation and literacy",
    "Accessibility and disability",
    "Family, marriage and inheritance",
    "Something else entirely",
  ],
  outOfScope: [
    "Anything that profiles Muslims, or that collects data about belief or practice beyond what the person using it has asked for.",
    "Tools that issue religious rulings without a qualified scholar answerable for them.",
    "Work whose main purpose is advertising, lending at interest, or gambling.",
    "A rebuild of something that already exists and works, unless the existing thing is closed in a way that traps its users.",
  ],
  privacy:
    "We keep what you send so a person can read it and reply. We do not pass it to anyone outside the Collective, and we do not use it for advertising. Leaving an email address is optional; without one we simply cannot write back.",
};
