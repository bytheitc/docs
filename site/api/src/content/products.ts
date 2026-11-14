// Shown on /products, one page each. Built by the Collective's people, not every one of them
// under this house specifically — this is the public shop window, not an ownership record.
export const PRODUCT_STATUSES = ["Live", "Coming soon"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  status: ProductStatus;
  /** One or two sentences, shown on the /products card. */
  summary: string;
  /** Paragraphs, shown on the product's own page. */
  body: string[];
  features: string[];
  /** Source or download — doubles as "access" until there's a hosted app. */
  repoUrl?: string;
  /** A hosted version, if one exists. */
  liveUrl?: string;
}

export const SEED_PRODUCTS: Product[] = [
  {
    slug: "hifza",
    name: "Hifza",
    tagline: "A Qur'an memorisation and revision tracker that runs entirely on your own device.",
    status: "Live",
    summary: "Tracks what you've memorised and tells you what to recite today, with a revision schedule built for hifz rather than borrowed from flashcard apps.",
    body: [
      "Hifza tracks memorised portions of the Qur'an and schedules revision the way hifz actually works: three grades (solid, shaky, lost), a lapse drops a portion back to a one-day interval, and the day's queue comes back in Qur'anic order rather than most-overdue-first.",
      "It also supports teaching a halaqah: a register of students, each with their own trail, graded by the teacher, plus an honest progress count out of all 6,236 ayahs that can never exceed 100%.",
      "Everything runs on the device. There is no account, no server, and nothing leaves your phone unless you choose to export a backup.",
    ],
    features: [
      "Three-grade revision schedule, in Qur'anic order",
      "A trouble-spot ranking, not just a lapse count",
      "Teaching mode: a register for a halaqah",
      "Works fully offline; nothing leaves the device",
    ],
    repoUrl: "https://github.com/bytheitc/hifz",
  },
  {
    slug: "zakat",
    name: "Zakat",
    tagline: "A zakat calculator and allowance planner for students — honest about what it is not.",
    status: "Live",
    summary: "Works out zakat on wealth and on fitr, and splits a monthly allowance so sadaqah and savings come out before the month eats them.",
    body: [
      "Zakat Kit answers the question most students never ask: enter what you hold and owe, pick the gold or silver nisab, enter today's metal price, and see the amount with the full working shown.",
      "It also plans a monthly allowance, splitting sadaqah and savings out of the surplus at the same time as fixed costs, rather than from whatever happens to be left at the end of the month.",
      "It is a calculator, not a ruling: where scholars differ (gold or silver nisab, lunar or solar year, zakat al-fitr in food or money) it shows both and names the difference rather than choosing for you. Nothing is stored and nothing is sent anywhere.",
    ],
    features: [
      "Zakat on wealth, with the full working shown",
      "Zakat al-Fitr, priced at your local staple",
      "A monthly plan that takes sadaqah and savings out first",
      "Multiple accounts and statements, parsed on your device",
    ],
    repoUrl: "https://github.com/bytheitc/zakat",
  },
  {
    slug: "marwa",
    name: "Marwa",
    tagline: "A games manager for live, hosted quizzes — like Kahoot.",
    status: "Coming soon",
    summary: "Run a live quiz for a room or a halaqah: host from one screen, everyone joins from their own phone, and the scores update as they play.",
    body: [
      "Marwa is a games manager for live, hosted sessions: a host runs a quiz from one screen, players join from their own phones, and everyone sees the score update as the round plays out.",
      "It isn't released yet. This page will carry a real link the day it is.",
    ],
    features: [
      "Host a live quiz from one screen",
      "Players join from their own phone, no app install",
      "Live scoring as the round plays out",
    ],
  },
];
