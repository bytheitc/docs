// Page-level content for the Join, Support, Contact and Press pages.
import type { HouseId } from "./houses.js";

/* ---------------- Join ---------------- */

export interface Way { title: string; body: string; gives: string; link?: { label: string; href: string } }
export interface JoinPage { id: string; ways: Way[] }

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_JOIN: JoinPage = {
  id: "join",
  ways: [
    { title: "Member", body: "Take part in a house, come to gatherings and have a voice at the Members’ Assembly. Membership is open to anyone who shares the work and the principles.", gives: "Your time and your attention." },
    { title: "Volunteer", body: "Help run a gathering, mentor at the Commons Sprint, host a Builders’ Iftar or steward a house. Small, well-defined commitments are welcome.", gives: "A few hours, on a schedule you choose." },
    { title: "Partner", body: "Organisations can co-host events, place fellows, share a dataset or bring a project into the commons. Partnerships are agreed in writing and in the open.", gives: "Collaboration that fits our principles." },
    { title: "Donor", body: "Support keeps gatherings free, maintainers paid and research published openly. Every gift is accounted for.", gives: "Financial support.", link: { href: "/donate", label: "How support is used →" } },
  ],
};

/* ---------------- Support / giving ---------------- */

export interface TitledText { title: string; body: string }
export interface GivingPage {
  id: string;
  uses: TitledText[];
  options: TitledText[];
  email: string;
  /** Shown under the giving button. */
  note: string;
  /** "A note on zakat and tax status". */
  notice: string[];
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_GIVING: GivingPage = {
  id: "giving",
  uses: [
    { title: "Gatherings", body: "Keeping the Majlis, the Sprint and the Reading Circle free to attend, with travel help for those who need it." },
    { title: "Maintainers", body: "Paying the people who keep shared code healthy, so the commons doesn’t depend on unpaid evenings." },
    { title: "Fellowships", body: "Stipends for Institute fellows and mentored placements across the houses." },
    { title: "Open research", body: "Publishing papers and datasets openly, without paywalls." },
    { title: "Shared infrastructure", body: "Hosting, security and the tools every house relies on." },
  ],
  options: [
    { title: "One-time gift", body: "A single contribution to the general fund, shared across the houses." },
    { title: "Monthly support", body: "A steady gift that lets us plan ahead and commit to people." },
    { title: "Sponsor a gathering", body: "Underwrite a Builders’ Iftar, a Sprint hub or a Reading Circle season." },
    { title: "In-kind", body: "Compute, cloud credits, venue space or professional services, agreed in writing." },
  ],
  email: "giving@example.org",
  note: "Online giving is not open yet. Until it is, write to giving@example.org and we will reply personally.",
  notice: [
    "We are seeking scholarly guidance on whether, and how, gifts to the Collective may count as zakat. Until that guidance is published, please give as general charity (ṣadaqa) and do not designate gifts as zakat.",
    "The Collective’s legal and tax status is still being established. We will publish it here before accepting gifts online.",
  ],
};

/* ---------------- Contact ---------------- */

export interface ContactPage {
  id: string;
  channels: { label: string; email: string }[];
  /** Options in the contact form's "Who is this for?" menu. */
  topics: string[];
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_CONTACT: ContactPage = {
  id: "contact",
  channels: [
    { label: "The Collective", email: "hello@example.org" },
    { label: "Press", email: "press@example.org" },
    { label: "Giving", email: "giving@example.org" },
  ],
  topics: ["The Collective", "AI", "Engineering", "Institute", "Open Source", "Research", "Press", "Support & giving"],
};

/* ---------------- Press ---------------- */

export interface PressPage {
  id: string;
  email: string;
  centers: { house: HouseId; text: string }[];
  donts: string[];
  guidelines: string;
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_PRESS: PressPage = {
  id: "press",
  email: "press@example.org",
  centers: [
    { house: "site", text: "Solid dot: the one center everything turns around" },
    { house: "ai", text: "Four linked nodes: a network that thinks" },
    { house: "engineering", text: "Crosshair: precision, measurement" },
    { house: "institute", text: "Nested star: centers inside a center" },
    { house: "oss", text: "Outline broken at the top: open, with room to enter" },
    { house: "research", text: "Concentric rings: inquiry spreading outward" },
  ],
  donts: [
    "Change, stretch or rotate the outer star.",
    "Invent new centers or mix two houses’ centers.",
    "Use the Arabic word-signs without their transliteration or meaning nearby.",
  ],
  guidelines: "The full guidelines cover the mark’s construction, each house’s layout and voice, and the shared Collective bar. A public edition is being prepared.",
};
