// Shared platforms registry. Placeholder: interfaces, roadmaps and runbooks are illustrative.
import type { TeamSlug } from "@/lib/teams";

export const PLATFORM_STATUSES = ["stable", "beta", "design"] as const;
export type PlatformStatus = (typeof PLATFORM_STATUSES)[number];
export const PHASES = ["done", "now", "next", "later"] as const;
export type Phase = (typeof PHASES)[number];

export interface Platform {
  slug: string;
  id: string;
  name: string;
  arabic: string;
  transliteration: string;
  gloss: string;
  purpose: string;
  summary: string;
  owner: TeamSlug;
  status: PlatformStatus;
  principles: string[];
  interfaces: { name: string; kind: string; surface: string; note: string }[];
  dependencies: { name: string; ref?: string; kind: "platform" | "external"; note: string }[];
  roadmap: { phase: Phase; title: string; note: string }[];
  runbook: { path: string; covers: string[] };
}

export const SEED_PLATFORMS: Platform[] = [
  {
    slug: "qibla",
    id: "P-01",
    name: "Qibla",
    arabic: "قبلة",
    transliteration: "qibla",
    gloss: "direction, orientation",
    purpose: "Identity & access for every ITC service: one account, minimal data",
    summary: "Qibla points every request in the right direction. It is the single sign-in and access layer for all ITC properties, designed to hold as little personal data as the job allows.",
    owner: "platform",
    status: "beta",
    principles: [
      "One account across the houses, never a profile that follows people around",
      "Collect an identifier and a credential; everything else is opt-in and per-house",
      "Passkeys first, passwords supported, SMS never required",
    ],
    interfaces: [
      { name: "OIDC provider", kind: "Protocol", surface: "/.well-known/openid-configuration", note: "Standard discovery; houses integrate with any compliant client" },
      { name: "Session API", kind: "HTTP", surface: "GET /v1/session", note: "Placeholder: returns the minimal session claims" },
      { name: "Access check", kind: "HTTP", surface: "POST /v1/authorize", note: "Placeholder: policy decision for a subject, action, resource" },
      { name: "Account events", kind: "Event stream", surface: "qibla.account.*", note: "Placeholder: created, deleted, consent-changed" },
    ],
    dependencies: [
      { name: "Khazana", ref: "khazana", kind: "platform", note: "Credential and key material storage" },
      { name: "Manara", ref: "manara", kind: "platform", note: "Deploys, metrics, alerting" },
      { name: "Postgres", kind: "external", note: "Account and session records" },
    ],
    roadmap: [
      { phase: "done", title: "OIDC sign-in for the Collective site", note: "First integration; pattern for the rest" },
      { phase: "now", title: "Passkey enrolment and recovery", note: "Recovery without a phone number" },
      { phase: "next", title: "Roll out to all five houses", note: "One house per cycle, with a migration guide" },
      { phase: "later", title: "Self-serve data export and account deletion", note: "Pending privacy review" },
    ],
    runbook: { path: "runbooks/qibla", covers: ["Sign-in failure triage", "Key rotation", "Session revocation"] },
  },
  {
    slug: "manara",
    id: "P-02",
    name: "Manara",
    arabic: "منارة",
    transliteration: "manāra",
    gloss: "lighthouse, a place of light",
    purpose: "Shared deploy pipeline, observability and on-call tooling",
    summary: "Manara is the lighthouse: it ships every service to production and keeps a light on it afterwards. Deploys, logs, metrics, traces, alerting and the on-call rota all live here.",
    owner: "infrastructure",
    status: "stable",
    principles: [
      "Every deploy is reversible in one step",
      "Alerts page a human only when a human must act",
      "Telemetry is scrubbed of personal data at the edge, not later",
    ],
    interfaces: [
      { name: "Deploy pipeline", kind: "CI template", surface: "manara/deploy@v1", note: "Placeholder: build, test, canary, promote" },
      { name: "Telemetry", kind: "OpenTelemetry", surface: "OTLP endpoint", note: "Logs, metrics and traces through one collector" },
      { name: "Alert routing", kind: "Config", surface: "alerts.yaml per service", note: "Placeholder: severity, owner, runbook link required" },
      { name: "Status feed", kind: "HTTP", surface: "GET /v1/status", note: "Placeholder: feeds the public status page" },
    ],
    dependencies: [
      { name: "Qibla", ref: "qibla", kind: "platform", note: "Operator sign-in" },
      { name: "Kubernetes", kind: "external", note: "Runtime target" },
      { name: "OpenTelemetry", kind: "external", note: "Collector and SDKs" },
    ],
    roadmap: [
      { phase: "done", title: "Canary deploys by default", note: "Promotion gated on health checks" },
      { phase: "now", title: "Runbook link required on every alert", note: "No runbook, no page" },
      { phase: "next", title: "Public status feed", note: "Backs the /status page with real data" },
      { phase: "later", title: "Cost per service, reported per house", note: "Shared with Infrastructure" },
    ],
    runbook: { path: "runbooks/manara", covers: ["Failed deploy rollback", "Collector backpressure", "Paging misroutes"] },
  },
  {
    slug: "khazana",
    id: "P-03",
    name: "Khazana",
    arabic: "خزانة",
    transliteration: "khazāna",
    gloss: "treasury, a safekeeping",
    purpose: "Encrypted storage with per-record consent and retention policies",
    summary: "Khazana is where entrusted data is kept. Every record is encrypted, carries the consent it was given under, and expires when its retention period ends, without anyone having to remember.",
    owner: "security",
    status: "design",
    principles: [
      "Encrypted at rest with per-tenant keys; plaintext never leaves the service boundary unasked",
      "Retention is a property of the record, enforced by the store",
      "Consent travels with the data and is checked on read",
    ],
    interfaces: [
      { name: "Record API", kind: "HTTP", surface: "PUT / GET /v1/records/{id}", note: "Placeholder: write requires a purpose and retention" },
      { name: "Key service", kind: "gRPC", surface: "khazana.keys.v1", note: "Placeholder: envelope encryption, rotation" },
      { name: "Retention sweeper", kind: "Job", surface: "—", note: "Placeholder: deletes expired records, emits receipts" },
    ],
    dependencies: [
      { name: "Qibla", ref: "qibla", kind: "platform", note: "Caller identity and consent records" },
      { name: "Manara", ref: "manara", kind: "platform", note: "Deploys and audit logging" },
      { name: "Object storage", kind: "external", note: "Encrypted blobs" },
    ],
    roadmap: [
      { phase: "now", title: "Design RFC and threat model", note: "See RFC-0003" },
      { phase: "next", title: "Prototype with one house's form data", note: "Behind a feature flag" },
      { phase: "later", title: "Customer-visible retention receipts", note: "People can see when their data was deleted" },
    ],
    runbook: { path: "runbooks/khazana", covers: ["Draft: key compromise", "Draft: restore from backup"] },
  },
  {
    slug: "mizan",
    id: "P-04",
    name: "Mizan",
    arabic: "ميزان",
    transliteration: "mīzān",
    gloss: "balance, a measure",
    purpose: "Design system and component library used by all five houses",
    summary: "Mizan is the measure every interface is held to. It provides tokens, accessible components and bilingual layout primitives, while each house keeps its own typeface and voice.",
    owner: "product",
    status: "beta",
    principles: [
      "Accessible by construction: components ship with keyboard and screen-reader behaviour",
      "Direction-agnostic: logical properties only, RTL tested on every change",
      "Shared bones, house-specific skin: tokens are themeable per house",
    ],
    interfaces: [
      { name: "Tokens", kind: "Package", surface: "@itc/mizan-tokens", note: "Placeholder: color roots, spacing, type scales" },
      { name: "Components", kind: "Package", surface: "@itc/mizan-react", note: "Placeholder: React components" },
      { name: "Khatam", kind: "Component", surface: "<Khatam variant />", note: "The mark; the outer star never changes" },
      { name: "Docs", kind: "Site", surface: "—", note: "Placeholder: component docs and usage guidance" },
    ],
    dependencies: [
      { name: "Bayt", ref: "bayt", kind: "platform", note: "Local preview and visual tests" },
      { name: "React", kind: "external", note: "Component runtime" },
    ],
    roadmap: [
      { phase: "done", title: "Shared tokens from the master palette", note: "Ink, parchment, emerald, gold, lapis, saffron …" },
      { phase: "now", title: "Form components with full RTL support", note: "Inputs, selects, validation messages" },
      { phase: "next", title: "Automated accessibility checks in CI", note: "Blocks merge on regressions" },
      { phase: "later", title: "Low-bandwidth variants", note: "No-JS fallbacks for core components" },
    ],
    runbook: { path: "runbooks/mizan", covers: ["Release and rollback of packages", "Breaking change process"] },
  },
  {
    slug: "bayt",
    id: "P-05",
    name: "Bayt",
    arabic: "بيت",
    transliteration: "bayt",
    gloss: "house, home",
    purpose: "Local dev environment: clone, one command, running",
    summary: "Bayt is home base. Clone any ITC repository, run one command, and get a working environment with seeded data that contains no real people.",
    owner: "developer-experience",
    status: "stable",
    principles: [
      "One command from clone to running",
      "Seed data is synthetic; production data never touches a laptop",
      "Works offline once set up, and on modest hardware",
    ],
    interfaces: [
      { name: "CLI", kind: "Command", surface: "bayt up", note: "Placeholder: start services for the current repo" },
      { name: "Service manifest", kind: "Config", surface: "bayt.toml", note: "Placeholder: services, ports, seeds" },
      { name: "Seed packs", kind: "Data", surface: "bayt seed <pack>", note: "Placeholder: synthetic fixtures" },
    ],
    dependencies: [
      { name: "Container runtime", kind: "external", note: "Any OCI-compatible runtime" },
      { name: "Qibla", ref: "qibla", kind: "platform", note: "Local identity stub" },
    ],
    roadmap: [
      { phase: "done", title: "One-command start for web apps", note: "Next.js and Node services" },
      { phase: "now", title: "Seed packs for every platform", note: "Synthetic, documented, versioned" },
      { phase: "next", title: "Volunteer quick-start mode", note: "No accounts needed to make a first contribution" },
    ],
    runbook: { path: "runbooks/bayt", covers: ["Clean reinstall", "Port conflicts", "Seed pack drift"] },
  },
];

export const findPlatform = (platforms: Platform[], slug: string): Platform | undefined => platforms.find((p) => p.slug === slug);
export const platformsOwnedBy = (platforms: Platform[], team: TeamSlug): Platform[] => platforms.filter((p) => p.owner === team);
