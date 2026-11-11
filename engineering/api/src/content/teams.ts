// Engineering teams. Placeholder: no real people, rotations or addresses beyond example.org.

/** A team's slug. Teams are edited in the admin, so this is any string (seed teams: platform, infrastructure, security, product, developer-experience). */
export type TeamSlug = string;

export interface Team {
  slug: TeamSlug;
  code: string;
  name: string;
  summary: string;
  mission: string;
  scope: string[];
  notScope: string[];
  reach: { channel: string; value: string; href?: string; note: string }[];
  rhythm: { name: string; detail: string }[];
}

export const SEED_TEAMS: Team[] = [
  {
    slug: "platform",
    code: "PLT",
    name: "Platform",
    summary: "Identity, APIs and the shared services every house depends on.",
    mission: "Give every house a small set of shared services that are correct, documented and boring to depend on, so no house has to rebuild sign-in or service-to-service auth.",
    scope: [
      "Identity, sessions and access control across all ITC properties",
      "Service-to-service authentication and the internal API gateway",
      "Shared API conventions: versioning, pagination, error shapes",
      "Platform deprecation policy and migration support",
    ],
    notScope: ["Per-house product features", "Front-end components (see Product)", "Compute and networking (see Infrastructure)"],
    reach: [
      { channel: "Email", value: "platform@example.org", href: "mailto:platform@example.org", note: "Questions, requests, intake for new integrations" },
      { channel: "Chat", value: "#eng-platform", note: "Day-to-day questions; answered in working hours" },
      { channel: "Intake", value: "Platform request form", note: "Placeholder: link to internal tracker" },
      { channel: "Pager", value: "Via Manara on-call", note: "Production incidents only" },
    ],
    rhythm: [
      { name: "Office hours", detail: "Weekly, open to any house. Bring an integration question or a design to review." },
      { name: "Planning", detail: "Six-week cycles, with a published plan at the start of each." },
    ],
  },
  {
    slug: "infrastructure",
    code: "INF",
    name: "Infrastructure",
    summary: "Compute, networks, reliability and cost.",
    mission: "Run the ground floor: compute, networks and the deploy path, with reliability you can predict and costs you can explain to the people who fund the work.",
    scope: [
      "Clusters, networking, DNS and certificates",
      "The Manara deploy pipeline and observability stack",
      "Backups, restore drills and disaster recovery",
      "Capacity planning and cost reporting to each house",
    ],
    notScope: ["Application code inside services", "Data retention policy (see Security)"],
    reach: [
      { channel: "Email", value: "infra@example.org", href: "mailto:infra@example.org", note: "Capacity requests, cost questions" },
      { channel: "Chat", value: "#eng-infra", note: "Deploy and environment questions" },
      { channel: "Pager", value: "Via Manara on-call", note: "Production incidents only" },
    ],
    rhythm: [
      { name: "Change review", detail: "Infrastructure changes are reviewed in a short weekly session before rollout." },
      { name: "Restore drill", detail: "Backups are restored on a schedule; untested backups are treated as missing." },
    ],
  },
  {
    slug: "security",
    code: "SEC",
    name: "Security",
    summary: "Threat modeling, reviews and incident response.",
    mission: "Keep the trust people place in ITC. We help teams design securely from the start and run the amānah privacy review before any new data flow ships.",
    scope: [
      "Threat modeling and design-time security review",
      "The amānah privacy review for new data flows",
      "Khazana encrypted storage and key management",
      "Security incident response and coordinated disclosure",
    ],
    notScope: ["Owning every fix (owning teams fix; we help)", "Policing: we review, advise and unblock"],
    reach: [
      { channel: "Email", value: "security@example.org", href: "mailto:security@example.org", note: "Reviews, questions, and vulnerability reports" },
      { channel: "Chat", value: "#eng-security", note: "Non-sensitive questions only" },
      { channel: "Disclosure", value: "security@example.org", href: "mailto:security@example.org", note: "Placeholder: a PGP key and policy page will be published here" },
    ],
    rhythm: [
      { name: "Review queue", detail: "Privacy and security reviews are triaged twice a week." },
      { name: "Tabletop", detail: "Incident tabletop exercises with each team, on rotation." },
    ],
  },
  {
    slug: "product",
    code: "PRD",
    name: "Product",
    summary: "Interfaces, design system and front-end craft.",
    mission: "Make ITC interfaces that work for everyone: keyboard, screen reader, right-to-left, low bandwidth, and old devices. Mizan is how we make that the default.",
    scope: [
      "Mizan design system: tokens, components and patterns",
      "Accessibility standard and audits",
      "Front-end architecture guidance for every house",
      "Bilingual (LTR/RTL) layout and typography",
    ],
    notScope: ["Each house's visual identity (houses own their voice)", "Back-end services"],
    reach: [
      { channel: "Email", value: "product-eng@example.org", href: "mailto:product-eng@example.org", note: "Design system requests and audits" },
      { channel: "Chat", value: "#eng-mizan", note: "Component questions and contributions" },
    ],
    rhythm: [
      { name: "Design crit", detail: "A weekly open critique of interface work from any house." },
      { name: "Audit cycle", detail: "Accessibility audits on rotation across the properties." },
    ],
  },
  {
    slug: "developer-experience",
    code: "DVX",
    name: "Developer Experience",
    summary: "Tooling, docs and making the right thing the easy thing.",
    mission: "Shorten the path from 'I want to help' to 'my change is running'. If a practice is right but tedious, we automate it until it is the easy default.",
    scope: [
      "Bayt local development environment",
      "CI templates, linters and code generators",
      "This handbook and the internal docs site",
      "Onboarding for staff and volunteers",
    ],
    notScope: ["Production infrastructure (see Infrastructure)", "Per-service build configuration beyond templates"],
    reach: [
      { channel: "Email", value: "devex@example.org", href: "mailto:devex@example.org", note: "Tooling requests and docs fixes" },
      { channel: "Chat", value: "#eng-devex", note: "'It doesn't build on my machine' starts here" },
    ],
    rhythm: [
      { name: "Friction log", detail: "A shared log of papercuts; the top items are picked up each cycle." },
      { name: "Onboarding review", detail: "Every new joiner's first week is reviewed to improve the next one." },
    ],
  },
];

export const findTeam = (teams: Team[], slug: string): Team | undefined => teams.find((t) => t.slug === slug);
