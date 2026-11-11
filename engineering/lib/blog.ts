// Engineering write-ups and blameless incident reviews. Placeholder posts: no real incidents or people.
import type { DocSection } from "@/lib/content";
import type { TeamSlug } from "@/lib/teams";

export const POST_KINDS = ["write-up", "incident review"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export interface Post {
  slug: string;
  num: string;
  kind: PostKind;
  title: string;
  dek: string;
  team: TeamSlug;
  date: string; // "—" until real
  platforms: string[];
  /** Incident reviews only: a fact sheet. Values stay "—" until real. */
  facts?: [string, string][];
  sections: DocSection[];
}

export const SEED_POSTS: Post[] = [
  {
    slug: "why-boring-technology",
    num: "B-01",
    kind: "write-up",
    title: "Why we choose boring technology",
    dek: "A small collective cannot afford many novel systems. Here is how we decide where novelty is worth it.",
    team: "platform",
    date: "—",
    platforms: [],
    sections: [
      { id: "cost", title: "The cost nobody budgets", blocks: [
        { kind: "p", text: "Adopting a tool is a weekend. Running it is years: upgrades, security advisories, hiring people who know it, and teaching the people who do not. For a collective that relies partly on volunteers, that long tail matters more than the first week." },
      ] },
      { id: "tokens", title: "Spending novelty on purpose", blocks: [
        { kind: "p", text: "We treat novelty as a budget. Each team can spend a little of it, and the RFC process asks the question out loud: what does this buy for the people we serve?" },
        { kind: "list", items: ["Postgres before a new data store.", "Server-rendered pages before a client-heavy app.", "A cron job before a workflow engine."] },
      ] },
      { id: "when-not", title: "When boring is wrong", blocks: [
        { kind: "p", text: "Sometimes the boring option fails the people we serve: it leaks data, excludes a language, or needs a fast connection. Then we spend the budget, and write down why." },
      ] },
    ],
  },
  {
    slug: "incident-review-expired-certificate",
    num: "B-02",
    kind: "incident review",
    title: "Incident review: an expired certificate on staging",
    dek: "A placeholder blameless review, published as a worked example of our format.",
    team: "infrastructure",
    date: "—",
    platforms: ["manara"],
    facts: [["Severity", "SEV-3 (placeholder)"], ["Duration", "—"], ["People affected", "—"], ["Detected by", "Synthetic check"], ["Status", "Closed · actions tracked"]],
    sections: [
      { id: "summary", title: "Summary", blocks: [
        { kind: "p", text: "A certificate on a staging environment expired, and deploys to staging failed until it was renewed. Production was not affected. This review is an illustrative example; it does not describe a real event." },
      ] },
      { id: "timeline", title: "Timeline", blocks: [
        { kind: "spec", rows: [["T+—", "Synthetic check fails; alert routed to Infrastructure on-call"], ["T+—", "On-call confirms the certificate has expired"], ["T+—", "Certificate renewed manually; deploys recover"], ["T+—", "Incident closed; review scheduled"]] },
      ] },
      { id: "contributing", title: "Contributing factors", blocks: [
        { kind: "list", items: ["Staging certificates were renewed by a different mechanism from production.", "The expiry warning alert existed but had no runbook and was routed to a muted channel.", "Nothing in the deploy pipeline checked certificate validity before running."] },
        { kind: "note", label: "Blameless", text: "The person who set up staging made a reasonable choice at the time. The system let two renewal paths drift apart; that is what we fix." },
      ] },
      { id: "actions", title: "What we are changing", blocks: [
        { kind: "list", ordered: true, items: ["One renewal mechanism for every environment.", "Expiry alerts must have a runbook and an owner (now enforced by Manara).", "A pre-deploy check for certificate validity."] },
      ] },
    ],
  },
  {
    slug: "rtl-first-in-mizan",
    num: "B-03",
    kind: "write-up",
    title: "Right-to-left first: what changed when Mizan stopped mirroring",
    dek: "Moving the design system to logical properties, and what it taught us about defaults.",
    team: "product",
    date: "—",
    platforms: ["mizan"],
    sections: [
      { id: "problem", title: "The problem with mirroring", blocks: [
        { kind: "p", text: "We used to build layouts left-to-right and then mirror them for Arabic. Every mirror was a chance to miss something: a chevron pointing the wrong way, a margin on the wrong side, a progress bar filling backwards." },
      ] },
      { id: "change", title: "The change", blocks: [
        { kind: "p", text: "RFC-0004 moved Mizan to logical CSS properties. Instead of 'left', components say 'inline-start', and the browser does the rest." },
        { kind: "code", caption: "Before and after", text: "/* before */  margin-left: 16px;\n/* after  */  margin-inline-start: 16px;" },
      ] },
      { id: "lesson", title: "What we learned", blocks: [
        { kind: "p", text: "The right default removes a whole category of bugs, and it removes the feeling that Arabic is a second-class layout. We now render every component story in both directions in CI." },
      ] },
    ],
  },
  {
    slug: "incident-review-noisy-pager",
    num: "B-04",
    kind: "incident review",
    title: "Incident review: the pager that cried wolf",
    dek: "A placeholder review of alert fatigue, and why every page now needs a runbook.",
    team: "infrastructure",
    date: "—",
    platforms: ["manara"],
    facts: [["Severity", "SEV-2 (placeholder)"], ["Duration", "—"], ["People affected", "—"], ["Detected by", "User report"], ["Status", "Closed · actions tracked"]],
    sections: [
      { id: "summary", title: "Summary", blocks: [
        { kind: "p", text: "A real alert was missed because it arrived among many alerts that did not need action. A user reported the problem before on-call noticed. This review is an illustrative example; it does not describe a real event." },
      ] },
      { id: "contributing", title: "Contributing factors", blocks: [
        { kind: "list", items: ["Several alerts fired on symptoms that resolved themselves.", "Alerts had no severity, so everything looked equally urgent.", "On-call had learned, reasonably, to wait before acting."] },
      ] },
      { id: "actions", title: "What we are changing", blocks: [
        { kind: "list", ordered: true, items: ["Every alert declares a severity, an owner and a runbook, or it cannot page.", "Alerts that fire without action are reviewed weekly and removed or fixed.", "On-call handover now includes a short note on alert noise."] },
      ] },
    ],
  },
];

