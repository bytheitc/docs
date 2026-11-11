// Public design decisions. Placeholder RFCs: illustrative of format and tone only.
import type { Block } from "./content.js";
import type { TeamSlug } from "./teams.js";

export const RFC_STATUSES = ["draft", "proposed", "accepted", "superseded", "withdrawn"] as const;
export type RfcStatus = (typeof RFC_STATUSES)[number];

export interface Rfc {
  id: string; // "0001"
  title: string;
  status: RfcStatus;
  team: TeamSlug;
  date: string; // "—" until real
  platforms: string[]; // platform slugs
  summary: string;
  motivation: Block[];
  design: Block[];
  alternatives: Block[];
  decision: Block[];
  supersededBy?: string;
}

export const SEED_RFCS: Rfc[] = [
  {
    id: "0001",
    title: "Use RFCs for cross-team decisions",
    status: "accepted",
    team: "developer-experience",
    date: "—",
    platforms: [],
    summary: "Adopt a lightweight, public RFC process for decisions that cross team or house boundaries.",
    motivation: [
      { kind: "p", text: "Decisions were being made in calls and chat threads. Months later, nobody could find out why something was built the way it was, and new joiners repeated old debates." },
    ],
    design: [
      { kind: "p", text: "A short written proposal with five fixed sections, a fixed review window and a recorded decision. RFCs are published in a public index so the other houses and the wider community can follow along." },
      { kind: "list", items: ["Five sections: summary, motivation, design, alternatives, decision.", "Statuses: draft, proposed, accepted, withdrawn, superseded.", "The owning team decides after objections are answered in writing."] },
    ],
    alternatives: [
      { kind: "p", text: "Architecture review board: rejected as too slow and too centralised for a collective of independent houses. Decision logs in each repo: rejected because cross-team decisions have no single repo." },
    ],
    decision: [
      { kind: "p", text: "Accepted. The process is documented in handbook chapter H-03." },
    ],
  },
  {
    id: "0002",
    title: "Qibla: passkeys first, no SMS",
    status: "accepted",
    team: "platform",
    date: "—",
    platforms: ["qibla"],
    summary: "Qibla offers passkeys as the primary sign-in method, keeps passwords as a fallback, and never requires a phone number.",
    motivation: [
      { kind: "p", text: "Phone numbers are sensitive identifiers that link people across services, and SMS codes are weak against interception. Many people we serve share devices or change numbers often." },
    ],
    design: [
      { kind: "list", items: ["Passkey enrolment offered at sign-up and on every password sign-in.", "Password plus authenticator app as the fallback path.", "Account recovery through pre-generated recovery codes and a verified email, not SMS."] },
    ],
    alternatives: [
      { kind: "p", text: "SMS one-time codes: rejected on privacy and security grounds. Email magic links only: kept as an option for low-risk properties, but not as the primary method." },
    ],
    decision: [
      { kind: "p", text: "Accepted, with an open question on recovery for people who lose all devices. Tracked as a follow-up RFC." },
    ],
  },
  {
    id: "0003",
    title: "Khazana: retention as a property of the record",
    status: "proposed",
    team: "security",
    date: "—",
    platforms: ["khazana"],
    summary: "Every record written to Khazana must declare its purpose and retention period; the store deletes it when that period ends.",
    motivation: [
      { kind: "p", text: "Retention policies written in documents are not enforced by anything. Data outlives its purpose because deleting it is someone's chore, and chores get forgotten." },
    ],
    design: [
      { kind: "p", text: "The write API rejects records without a purpose and a retention period. A sweeper deletes expired records and emits a deletion receipt that the record's subject can see." },
      { kind: "code", caption: "Illustrative request shape (placeholder)", text: "PUT /v1/records/{id}\n{\n  \"purpose\":   \"event-registration\",\n  \"retention\": \"P90D\",\n  \"consent\":   \"<consent-ref>\",\n  \"payload\":   \"<encrypted>\"\n}" },
    ],
    alternatives: [
      { kind: "p", text: "Per-table TTLs in each service's own database: simpler, but leaves consent and receipts to every team to reinvent." },
    ],
    decision: [
      { kind: "p", text: "Pending. Review window open." },
    ],
  },
  {
    id: "0004",
    title: "Mizan: logical CSS properties only",
    status: "accepted",
    team: "product",
    date: "—",
    platforms: ["mizan"],
    summary: "Mizan components use logical properties (inline-start, block-end) instead of left/right so that right-to-left layouts work without overrides.",
    motivation: [
      { kind: "p", text: "Every house publishes in Arabic as well as English. Mirroring layouts by hand produced a long tail of small bugs." },
    ],
    design: [
      { kind: "list", items: ["Lint rule rejects physical direction properties in Mizan.", "Icons that imply direction are mirrored with a single utility.", "Every component story renders in both directions in CI."] },
    ],
    alternatives: [
      { kind: "p", text: "Generating an RTL stylesheet at build time: works, but hides the problem and doubles the CSS shipped." },
    ],
    decision: [
      { kind: "p", text: "Accepted." },
    ],
  },
  {
    id: "0005",
    title: "Manara: one log pipeline per service",
    status: "superseded",
    team: "infrastructure",
    date: "—",
    platforms: ["manara"],
    summary: "Each service ships logs through its own pipeline configuration.",
    motivation: [
      { kind: "p", text: "Early services had very different logging needs, and a single pipeline seemed too rigid." },
    ],
    design: [
      { kind: "p", text: "Per-service collectors with service-owned configuration." },
    ],
    alternatives: [
      { kind: "p", text: "A single shared collector. Rejected at the time; adopted later." },
    ],
    decision: [
      { kind: "p", text: "Superseded by RFC-0006. Per-service pipelines made consistent personal-data scrubbing impossible to guarantee." },
    ],
    supersededBy: "0006",
  },
  {
    id: "0006",
    title: "Manara: scrub personal data at the collector",
    status: "draft",
    team: "infrastructure",
    date: "—",
    platforms: ["manara"],
    summary: "Route all telemetry through one shared collector that removes personal data before anything is stored.",
    motivation: [
      { kind: "p", text: "Personal data in logs is the most common way private information leaks into places it should not be. Scrubbing must happen once, centrally, and be tested." },
    ],
    design: [
      { kind: "list", items: ["A shared OpenTelemetry collector for every service.", "Scrubbing rules maintained with Security and tested against synthetic fixtures.", "Services may add fields to an allow-list, never remove scrubbing."] },
    ],
    alternatives: [
      { kind: "p", text: "Keep per-service pipelines (RFC-0005) and audit them: rejected as unenforceable." },
    ],
    decision: [
      { kind: "p", text: "Not yet proposed." },
    ],
  },
];

