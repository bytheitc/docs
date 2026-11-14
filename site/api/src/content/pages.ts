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
  email: "giving@bytheitc.xyz",
  note: "Online giving is not open yet. Until it is, write to giving@bytheitc.xyz and we will reply personally.",
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
    { label: "The Collective", email: "hello@bytheitc.xyz" },
    { label: "Press", email: "press@bytheitc.xyz" },
    { label: "Giving", email: "giving@bytheitc.xyz" },
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
  email: "press@bytheitc.xyz",
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

/* ---------------- Mobile app ---------------- */

export interface MobileFeature { title: string; body: string }
export interface MobilePage {
  id: string;
  /** The hero. */
  lede: string;
  features: MobileFeature[];
  /** What the app deliberately does not do, and where to go instead. */
  notYet: string[];
  /** Store links. Empty means "not published yet", and the page says so rather than inventing a link. */
  appStoreUrl: string;
  playStoreUrl: string;
  /** Shown while the stores are empty. */
  betaNote: string;
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_MOBILE: MobilePage = {
  id: "mobile",
  lede:
    "The contributor portal, on your phone. Sign in with the accounts you already use, see the work recorded in your name, hold an issue while you work on it, and decide exactly how much of yourself is public.",
  features: [
    {
      title: "Your profile, and what is public",
      body:
        "Nothing about you is public unless you say so. One switch governs the lot, and each thing below it — your houses, your linked accounts, your contributions, your place on the contributors wall — is yours to turn on or off from the phone in your hand.",
    },
    {
      title: "The work recorded in your name",
      body:
        "Everything the portal has matched to your linked accounts, with what a steward has verified and what is still pending. Work that happened somewhere the portal cannot see — a talk, a translation, a design review — you can log yourself.",
    },
    {
      title: "Claim an issue before you start",
      body:
        "Claiming tells everyone else you are on it, and holds it for a set number of days so two people do not spend the same weekend on the same bug. The app shows what you hold and when it runs out.",
    },
    {
      title: "Decisions waiting on you",
      body:
        "If you maintain a repository, invitations and nominations that need your judgement are on the home screen. The governance record itself stays in the open, on the web, where it belongs.",
    },
    {
      title: "Your data, in your hands",
      body:
        "Take a copy of everything held about you, or delete your account outright. The portal treats what it holds as amāna — a trust — and a trust you cannot withdraw is not a trust at all.",
    },
  ],
  notYet: [
    "Reviewing or merging code. The app shows what has been recorded, not a code review tool.",
    "Casting a governance vote or objecting to a nomination. Those are decided in the open, on the web, with the full record beside them.",
    "Anything a steward does. Staff tools stay on the web.",
  ],
  appStoreUrl: "",
  playStoreUrl: "",
  betaNote:
    "The app is not in the stores yet. It is built and working; what remains is the developer accounts and the review process. If you want to try it before then, write to us and we will add you to the test build.",
};
