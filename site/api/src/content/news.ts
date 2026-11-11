export const NEWS_KINDS = ["Announcement", "Notes", "Call"] as const;

export interface NewsPost {
  slug: string;
  title: string;
  kind: (typeof NEWS_KINDS)[number];
  date: string;
  summary: string;
  body: { heading?: string; text: string }[];
}

// Placeholder announcements. Replace with real posts before launch.
/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_NEWS: NewsPost[] = [
  {
    slug: "introducing-the-collective",
    title: "Introducing the Islamic Tech Collective",
    kind: "Announcement",
    date: "Date TBA",
    summary: "Why we are gathering builders, researchers and scholars under one roof, and what comes first.",
    body: [
      { text: "The Islamic Tech Collective is a home for people who believe that how we build matters as much as what we build. It is organised as five houses, AI, Engineering, the Institute, Open Source and Research, that share one set of principles and one mark." },
      { heading: "Why a collective", text: "Good work in our communities is often done alone, by people who never meet. A collective lets that work be seen, reviewed, taught and carried forward. It also gives us a place to disagree well." },
      { heading: "What comes first", text: "Over the coming months we will open membership, publish our charter for comment and announce the first Annual Majlis. Each house will share its own early plans on its own site." },
    ],
  },
  {
    slug: "one-mark-five-houses",
    title: "One mark, five houses: notes on our identity",
    kind: "Notes",
    date: "Date TBA",
    summary: "The khātam, the Arabic word-signs and why each house speaks in its own voice.",
    body: [
      { text: "Our mark is the khātam, an eight-pointed star made from two overlapping squares. It is one of the oldest figures in Islamic geometric art, and it can be drawn with nothing but a compass and a straightedge. We like that it is a construction, a set of rules followed carefully." },
      { heading: "The center changes", text: "The outer star never changes. The center does: a solid dot for the Collective, linked nodes for AI, a crosshair for Engineering, a nested star for the Institute, an open outline for Open Source and concentric rings for Research." },
      { heading: "A word for each house", text: "Each house also carries one Arabic word, always shown with its transliteration and meaning. The words are there for what they mean, not as ornament. They will be reviewed by native speakers before launch." },
    ],
  },
  {
    slug: "call-for-stewards",
    title: "A call for house stewards",
    kind: "Call",
    date: "Date TBA",
    summary: "We are looking for people to steward each house through its first year.",
    body: [
      { text: "Each house will be guided by a small group of stewards. Stewards hold the house’s priorities, welcome new members and represent the house on the collective council." },
      { heading: "What it asks", text: "A few hours a week, a willingness to work in the open and a commitment to our four principles. Prior leadership experience is welcome but not required." },
      { heading: "How to express interest", text: "Use the volunteer option on the Join page and mention which house you have in mind. We will follow up with a short conversation." },
    ],
  },
  {
    slug: "commons-sprint-proposals",
    title: "Commons Sprint: proposals for projects are open",
    kind: "Call",
    date: "Date TBA",
    summary: "Maintain something useful to the community? Propose it for the first Commons Sprint.",
    body: [
      { text: "The Open Source house is preparing the first Commons Sprint and is inviting proposals for projects to feature." },
      { heading: "What makes a good fit", text: "An open licence, a maintainer willing to pair with newcomers, and a handful of well-described issues that can be finished in a day." },
      { heading: "How to propose", text: "Write to the Open Source house through the Contact page with a link to the project and a few lines about why it matters." },
    ],
  },
];
