// Engineering handbook chapters. Placeholder copy: review with each owning team before launch.
import type { DocSection } from "./content.js";
import type { TeamSlug } from "./teams.js";

export interface Chapter {
  slug: string;
  num: string;
  title: string;
  summary: string;
  owner: TeamSlug;
  revision: string;
  sections: DocSection[];
}

export const SEED_CHAPTERS: Chapter[] = [
  {
    slug: "practices",
    num: "H-01",
    title: "Engineering practices",
    summary: "The six working rules every ITC engineer and volunteer is held to, and why we keep them.",
    owner: "developer-experience",
    revision: "rev. 0.1 · draft",
    sections: [
      {
        id: "write-it-down",
        title: "Write it down first",
        blocks: [
          { kind: "p", text: "Any change that crosses a team boundary starts as a short RFC. Writing forces the hard questions early, and the record outlives the people who made the decision. The next engineer should be able to find out why, not only what." },
          { kind: "list", items: ["Small, reversible changes inside one team do not need an RFC.", "If you are unsure, write a one-paragraph note and ask. That note is often the RFC.", "Decisions are recorded in the RFC index, including the ones we rejected."] },
        ],
      },
      {
        id: "boring-by-default",
        title: "Boring by default",
        blocks: [
          { kind: "p", text: "We choose proven technology and spend novelty only where it buys something real for the people we serve. A new database, language or framework needs an RFC that names what it costs to run for years, not only what it costs to adopt." },
          { kind: "note", label: "Rule of thumb", text: "Each team gets very few 'innovation tokens'. Spend them on the problem, not the plumbing." },
        ],
      },
      {
        id: "accessible-or-unfinished",
        title: "Accessible or unfinished",
        blocks: [
          { kind: "p", text: "Keyboard, screen reader, right-to-left and low-bandwidth support are acceptance criteria, not polish. Work that fails them is not done, however good it looks. The full standard is in the accessibility chapter." },
        ],
      },
      {
        id: "privacy-review",
        title: "Privacy review before launch",
        blocks: [
          { kind: "p", text: "Every new data flow is reviewed against the amānah standard before it ships: collect less, keep less, explain everything. The review is a conversation with Security, not a gate at the end." },
        ],
      },
      {
        id: "ownership",
        title: "Every service has an owner",
        blocks: [
          { kind: "p", text: "A service reaches production only with a named owning team, a runbook and an on-call rotation. Ownership is listed in the platform registry and checked by Manara at deploy time." },
          { kind: "spec", rows: [["Owner", "A team, never an individual"], ["Runbook", "Linked from every alert"], ["On-call", "A rotation with at least two people"], ["Retirement", "A plan, written before launch"]] },
        ],
      },
      {
        id: "blameless",
        title: "Blameless, always",
        blocks: [
          { kind: "p", text: "Incidents produce learning, not scapegoats. We ask how the system made the mistake easy, and we fix the system. Incident reviews are shared across all houses so one team's lesson becomes everyone's." },
        ],
      },
    ],
  },
  {
    slug: "code-review",
    num: "H-02",
    title: "Code review",
    summary: "How we review changes: what authors owe reviewers, what reviewers owe authors, and how fast.",
    owner: "developer-experience",
    revision: "rev. 0.1 · draft",
    sections: [
      {
        id: "purpose",
        title: "Why we review",
        blocks: [
          { kind: "p", text: "Review exists to share knowledge and catch what one person misses. It is not a status ritual. Every change to a production system is read by at least one other engineer before it merges." },
        ],
      },
      {
        id: "authors",
        title: "For authors",
        blocks: [
          { kind: "list", items: ["Keep changes small enough to review in one sitting.", "Explain the why in the description. Link the RFC or issue.", "Say how you tested it, including keyboard and RTL for interface changes.", "Mark what you are unsure about. Reviewers will look there first."] },
        ],
      },
      {
        id: "reviewers",
        title: "For reviewers",
        blocks: [
          { kind: "list", items: ["Respond within one working day, even if only to say when you will review.", "Label comments: blocking, suggestion, question or nit.", "Review the code, not the person. Ask before you assert.", "Approve when it is better than what is there, not when it is how you would have written it."] },
          { kind: "code", caption: "Comment labels", text: "blocking:   must change before merge\nsuggestion: worth considering, author decides\nquestion:   I want to understand\nnit:        style only, never blocks" },
        ],
      },
      {
        id: "volunteers",
        title: "Reviewing volunteer contributions",
        blocks: [
          { kind: "p", text: "Volunteers give us their evenings. Thank them, review promptly, and when a change is not right, explain what would make it right. If we cannot accept a contribution, we say so early and kindly." },
        ],
      },
    ],
  },
  {
    slug: "rfc-process",
    num: "H-03",
    title: "RFC process",
    summary: "How a design decision is proposed, discussed, decided and recorded in the public RFC index.",
    owner: "platform",
    revision: "rev. 0.1 · draft",
    sections: [
      {
        id: "when",
        title: "When to write one",
        blocks: [
          { kind: "list", items: ["The change affects more than one team or house.", "It introduces a new dependency, language or data store.", "It creates a new flow of personal data.", "It is hard to reverse once shipped."] },
        ],
      },
      {
        id: "lifecycle",
        title: "Lifecycle",
        blocks: [
          { kind: "spec", rows: [["draft", "Author is still writing; feedback welcome but not expected"], ["proposed", "Open for comment for a fixed review window"], ["accepted", "Decision made; implementation may begin"], ["withdrawn", "Author or reviewers decided not to proceed"], ["superseded", "Replaced by a later RFC, which is linked"]] },
        ],
      },
      {
        id: "template",
        title: "The template",
        blocks: [
          { kind: "p", text: "Every RFC uses the same five sections, so readers know where to look. Keep it short; an RFC that runs past a few pages is usually two RFCs." },
          { kind: "code", caption: "rfcs/0000-template.md", text: "# RFC-0000: Title\n\n## Summary       one paragraph\n## Motivation    the problem, and who has it\n## Design        the proposal, in enough detail to build\n## Alternatives  what else we considered, and why not\n## Decision      filled in when the review closes" },
        ],
      },
      {
        id: "deciding",
        title: "How decisions are made",
        blocks: [
          { kind: "p", text: "The owning team decides, after the review window closes and objections have been answered in writing. We aim for consent, not unanimity: the question is whether anyone has a reasoned objection, not whether everyone is delighted." },
        ],
      },
    ],
  },
  {
    slug: "on-call-and-incidents",
    num: "H-04",
    title: "On-call & incidents",
    summary: "How on-call works, how we declare and run incidents, and how we learn from them.",
    owner: "infrastructure",
    revision: "rev. 0.1 · draft",
    sections: [
      {
        id: "on-call",
        title: "On-call",
        blocks: [
          { kind: "p", text: "Every production service has a rotation of at least two people. On-call is paid or compensated with time off for staff; volunteers are never placed on a pager rotation." },
          { kind: "list", items: ["Handover at the start of each shift, written down.", "Pages must be actionable. A page you could ignore is a bug to fix.", "If you are paged at night, you start late the next day."] },
        ],
      },
      {
        id: "severity",
        title: "Severity levels",
        blocks: [
          { kind: "spec", rows: [["SEV-1", "People cannot use a core service, or data may be exposed"], ["SEV-2", "A core service is degraded for many people"], ["SEV-3", "A non-core feature is broken or degraded"], ["SEV-4", "Cosmetic or internal-only"]] },
        ],
      },
      {
        id: "running",
        title: "Running an incident",
        blocks: [
          { kind: "list", ordered: true, items: ["Declare it. Anyone can, and nobody is blamed for declaring too early.", "Name an incident lead and a scribe.", "Mitigate first. Root cause can wait; people cannot.", "Communicate on a fixed cadence, even when there is no news.", "Close it, and schedule the review."] },
        ],
      },
      {
        id: "runbooks",
        title: "Runbooks",
        blocks: [
          { kind: "p", text: "Every alert links to a runbook. A runbook says what the alert means, how to confirm it, how to mitigate it and who to escalate to. Runbooks live next to the service code and are reviewed like code." },
          { kind: "note", label: "Placeholder", text: "Runbook paths on platform pages (e.g. runbooks/qibla) point to an internal repository that is not public." },
        ],
      },
      {
        id: "reviews",
        title: "Blameless reviews",
        blocks: [
          { kind: "p", text: "SEV-1 and SEV-2 incidents get a written review within two weeks. Reviews describe what happened, what made it possible and what we will change. They never name a person as the cause. Selected reviews are published on the blog." },
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    num: "H-05",
    title: "Accessibility standard",
    summary: "The minimum bar for every ITC interface, and how we test against it.",
    owner: "product",
    revision: "rev. 0.1 · draft",
    sections: [
      {
        id: "baseline",
        title: "Baseline",
        blocks: [
          { kind: "p", text: "Every ITC property targets WCAG 2.2 AA as a floor, not a goal. Mizan components are built to meet it by default; custom interface work must meet it before review." },
        ],
      },
      {
        id: "checklist",
        title: "Checklist",
        blocks: [
          { kind: "list", items: ["Every action reachable and operable by keyboard alone, with a visible focus indicator.", "Meaningful structure: headings in order, landmarks, labelled controls.", "Text contrast meets AA; information is never carried by color alone.", "Layouts work in right-to-left and at 200% zoom without horizontal scrolling.", "Motion respects reduced-motion preferences.", "Core content works on slow connections and without JavaScript where practical."] },
        ],
      },
      {
        id: "arabic",
        title: "Arabic and bilingual content",
        blocks: [
          { kind: "p", text: "Arabic text is marked with lang=\"ar\" and dir where needed, so screen readers pronounce it correctly. Wherever Arabic appears, a transliteration or translation sits nearby, as the brand rules require." },
        ],
      },
      {
        id: "testing",
        title: "Testing",
        blocks: [
          { kind: "list", items: ["Automated checks in CI catch the obvious failures.", "Manual keyboard and screen-reader passes before release.", "Periodic audits with disabled users, compensated for their time."] },
        ],
      },
    ],
  },
  {
    slug: "privacy-review",
    num: "H-06",
    title: "Privacy review: the amānah standard",
    summary: "Data people give us is a trust (amānah). This is how we review every new data flow before launch.",
    owner: "security",
    revision: "rev. 0.1 · draft",
    sections: [
      {
        id: "amanah",
        title: "Why amānah",
        blocks: [
          { kind: "p", text: "Amānah (أمانة) means a trust: something placed in your care that you must return intact. We treat personal data the same way. It is not ours; we hold it on someone's behalf, for a purpose they agreed to, for as long as that purpose lasts." },
        ],
      },
      {
        id: "principles",
        title: "The three rules",
        blocks: [
          { kind: "spec", rows: [["Collect less", "Every field must name the purpose it serves. No purpose, no field."], ["Keep less", "Every record has a retention period, enforced by the store (Khazana), not by memory."], ["Explain everything", "People can see what we hold, why, and when it will be deleted."]] },
        ],
      },
      {
        id: "process",
        title: "The review",
        blocks: [
          { kind: "list", ordered: true, items: ["Describe the data flow: what is collected, where it goes, who can read it.", "Name the purpose and the retention period for each field.", "Security reviews with you, usually in one session.", "Changes are agreed in writing and linked from the RFC.", "The review is revisited when the flow changes."] },
        ],
      },
      {
        id: "red-lines",
        title: "Red lines",
        blocks: [
          { kind: "list", items: ["No selling or sharing personal data for advertising.", "No third-party trackers on ITC properties.", "No production personal data on laptops or in seed data.", "No collection of sensitive categories without an accepted RFC and explicit consent."] },
        ],
      },
    ],
  },
  {
    slug: "security-basics",
    num: "H-07",
    title: "Security basics",
    summary: "The habits every engineer and volunteer keeps, from day one.",
    owner: "security",
    revision: "rev. 0.1 · draft",
    sections: [
      {
        id: "accounts",
        title: "Accounts and devices",
        blocks: [
          { kind: "list", items: ["Hardware keys or passkeys for every work account.", "Full-disk encryption and automatic updates on any device used for ITC work.", "Separate work and personal browser profiles."] },
        ],
      },
      {
        id: "secrets",
        title: "Secrets",
        blocks: [
          { kind: "p", text: "Secrets never go in source control, chat or tickets. Use the secrets manager; Bayt injects local secrets for development. If a secret leaks, rotate it first and report it second; nobody is blamed for reporting." },
        ],
      },
      {
        id: "dependencies",
        title: "Dependencies",
        blocks: [
          { kind: "list", items: ["Pin versions and review dependency updates like code.", "Prefer fewer, well-maintained dependencies.", "Automated advisories are triaged within the owning team's working week."] },
        ],
      },
      {
        id: "reporting",
        title: "Reporting a vulnerability",
        blocks: [
          { kind: "p", text: "Found something? Email security@example.org. We acknowledge reports promptly, keep the reporter informed, and credit them if they wish." },
          { kind: "note", label: "Placeholder", text: "A full coordinated-disclosure policy and PGP key will be published before launch." },
        ],
      },
    ],
  },
];

