// Requests for proposals: work the Collective wants built, put out for anyone to bid on.
// An RFP is a public, written brief — what is needed, who it serves, what "done" looks like and what
// is on offer — so that a small studio or a lone developer can answer it on the same footing.
import type { HouseId } from "./houses.js";

export const RFP_STATUSES = ["Open", "Reviewing", "Awarded", "Closed"] as const;
export type RfpStatus = (typeof RFP_STATUSES)[number];

export interface RfpSection {
  heading: string;
  body: string[];
}

export interface Rfp {
  slug: string;
  title: string;
  /** The house that will steward the work. */
  house: HouseId;
  status: RfpStatus;
  /** Free text, e.g. "£15,000–£25,000" or "To be agreed". Never a hidden number. */
  budget: string;
  /** Free text, e.g. "28 February 2027" or "Rolling". */
  closes: string;
  /** Expected length of the engagement. */
  duration: string;
  summary: string;
  /** Who is underserved today, and what changes for them. */
  need: string[];
  /** What a proposal must cover. */
  scope: string[];
  /** What the Collective will judge proposals against, in order. */
  criteria: string[];
  /** Non-negotiables: licence, data handling, accessibility, scholarly review. */
  conditions: string[];
  sections?: RfpSection[];
}

// Placeholder briefs. Budgets, dates and scope are illustrative and not yet agreed; nothing here is
// an offer. They exist so the page is real enough to review before the first RFP goes out.
export const SEED_RFPS: Rfp[] = [
  {
    slug: "masjid-operations",
    title: "An operations system any masjid can run",
    house: "engineering",
    status: "Open",
    budget: "To be agreed",
    closes: "Rolling",
    duration: "Six to nine months",
    summary:
      "Prayer times, classes, bookings, donations and volunteers in one place, self-hostable by a mosque with no technical staff.",
    need: [
      "Most mosques run on a spreadsheet, a WhatsApp group and one exhausted volunteer. The software that exists is usually rented per month, keeps the congregation's data on someone else's server, and stops working the day the subscription lapses.",
      "A masjid should be able to run its own affairs on its own terms: install it, own the data, and hand it to the next volunteer without a handover crisis.",
    ],
    scope: [
      "Prayer times from a configurable calculation method, with a mosque's own adjustments and a printable monthly timetable.",
      "Classes and events: registration, waiting lists, attendance, and a public page per class.",
      "Facility bookings for halls and rooms, with conflicts made obvious.",
      "Donations, including one-off and standing gifts, with receipts and an export the treasurer can hand an accountant.",
      "Volunteers: roles, rotas and reminders.",
      "An installation a non-technical trustee can complete in an afternoon, and a documented path to move the data elsewhere.",
    ],
    criteria: [
      "Evidence you have worked with mosques, or a credible plan to do so before you design anything.",
      "Simplicity under real conditions: an older trustee on an old phone is the test, not a demo.",
      "A clear data model and a migration story, so a mosque is never trapped.",
      "Accessibility and multilingual support treated as requirements, not extras.",
      "Value for money across the whole life of the system, not just the build.",
    ],
    conditions: [
      "Released under an OSI-approved licence, in a public repository from the first commit.",
      "No tracking of congregants, and no third-party analytics.",
      "WCAG 2.2 AA, verified with real assistive technology.",
      "Arabic and Urdu interface support from the start, with right-to-left handled properly.",
    ],
    sections: [
      {
        heading: "How to propose",
        body: [
          "Send a written proposal of no more than eight pages: who you are, how you would approach the work, what you would deliver in the first eight weeks, your rate or price, and two references.",
          "We do not ask for free design work, speculative prototypes or unpaid pitches. If we shortlist you, we pay for a paid discovery before any build begins.",
        ],
      },
    ],
  },
  {
    slug: "zakat-calculator",
    title: "A zakat calculator that shows its reasoning",
    house: "institute",
    status: "Open",
    budget: "To be agreed",
    closes: "Rolling",
    duration: "Three to five months",
    summary:
      "A calculator that handles modern assets, states which school's position it is following, and shows the ruling behind every line.",
    need: [
      "Zakat calculators tend to produce a number and no reasoning. They rarely say which madhhab they follow, and they struggle with pensions, shares, crypto, business stock and debt.",
      "Someone paying zakat should be able to see why each figure is what it is, and take the working to a scholar they trust.",
    ],
    scope: [
      "Asset categories covering cash, gold and silver, shares, pensions, business stock, receivables, crypto and property held for sale.",
      "Debts and liabilities, handled according to the position selected rather than a single hard-coded rule.",
      "A switch between recognised positions, with the difference in outcome made visible rather than hidden.",
      "A printable statement showing every input, the ruling applied and the source for it.",
      "Everything computed in the browser: no figure about anyone's wealth reaches a server.",
    ],
    criteria: [
      "A working relationship with qualified scholars, named in the proposal, who will review the rulings.",
      "Clarity about what the tool does not decide, and where a person must ask.",
      "Correctness you can demonstrate: a test suite built from worked examples.",
      "Restraint in the interface. This is a serious obligation, not a product funnel.",
    ],
    conditions: [
      "Every ruling carries a citation, reviewed by the Institute before publication.",
      "No calculation leaves the device, and no figures are logged.",
      "Released under an OSI-approved licence.",
      "The tool never recommends a recipient, a charity or a payment service.",
    ],
  },
  {
    slug: "manuscript-ocr",
    title: "Open OCR for Arabic-script manuscripts",
    house: "research",
    status: "Reviewing",
    budget: "To be agreed",
    closes: "Closed to new proposals",
    duration: "Nine to twelve months",
    summary:
      "A model and a toolchain for turning scanned Arabic, Persian and Ottoman manuscripts into searchable, correctable text.",
    need: [
      "Libraries have digitised enormous quantities of Arabic-script manuscripts as images. Images cannot be searched, quoted or cited at the line.",
      "The commercial engines that handle these scripts well are closed, expensive and cannot be audited by the scholars who depend on them.",
    ],
    scope: [
      "A recognition model for naskh, nastaʿlīq and at least one chancery hand, with reported accuracy per hand.",
      "A correction interface in which a scholar can fix a line and have the correction feed back into training.",
      "Layout handling for marginalia, commentary frames and interlinear glosses.",
      "Export to a standard the digital-humanities community already uses.",
      "Training data and weights published openly, with provenance for every source.",
    ],
    criteria: [
      "Published work on Arabic-script recognition, or an equivalent demonstrable track record.",
      "A realistic account of what the model will get wrong, and how a scholar will know.",
      "Agreements already in place, or clearly obtainable, with the holding libraries.",
    ],
    conditions: [
      "Model weights and training data released openly, with every source's permissions documented.",
      "No manuscript is used without the holding institution's written consent.",
      "Accuracy reported honestly per hand and per script, including the cases where it fails.",
    ],
  },
];
