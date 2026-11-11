import type { DocSection } from "@/lib/doc";
import { CONTACT } from "@/lib/site";

// How ITC Open Source makes decisions. Placeholder: ratify through the RFC process before launch.
export const SEED_GOVERNANCE: DocSection[] = [
  {
    id: "principles",
    title: "PRINCIPLES",
    blocks: [
      "The code is a **mashāʿ**, a commons. No single person, company or house owns it. Governance exists to keep it that way: to make decisions in public, write them down, and make sure anyone who does the work can earn a say.",
      {
        list: [
          "**Public by default.** Decisions happen in issues, RFCs and recorded meetings, not in DMs.",
          "**Shura before decision.** Consult the people affected before deciding for them.",
          "**Whoever does the work, decides the detail.** Maintainers decide inside their repo. Cross-repo changes go through RFCs.",
          "**Write it down.** If it isn't written down, it wasn't decided.",
        ],
      },
    ],
  },
  {
    id: "roles",
    title: "ROLES",
    blocks: [
      {
        defs: [
          { k: "CONTRIBUTOR", v: "Anyone with a merged PR, or a meaningful contribution to docs, design, translation or triage. Listed on the contributors wall." },
          { k: "REVIEWER", v: "A contributor trusted to review PRs in a repo. Reviews count toward merge, but can't merge alone." },
          { k: "MAINTAINER", v: "Can merge, cut releases and triage in one or more repos. Responsible for the health of the repo and for responding to contributors." },
          { k: "STEERING GROUP", v: "Up to five maintainers from across the houses. Owns cross-repo decisions, the RFC process, licensing and the code of conduct. Seats TBA." },
          { k: "CONDUCT TEAM", v: "Handles code of conduct reports. Independent of the steering group on individual cases. Members TBA." },
        ],
      },
    ],
  },
  {
    id: "decisions",
    title: "HOW DECISIONS ARE MADE",
    blocks: [
      "Most decisions are small and get made in a PR. The bigger the blast radius, the more process:",
      {
        defs: [
          { k: "IN A REPO", v: "Lazy consensus. A maintainer approves and merges; anyone can object in the PR. Objections get answered before merge." },
          { k: "BREAKING CHANGE", v: "Needs approval from two maintainers of that repo and a note in the changelog with a migration path." },
          { k: "ACROSS REPOS", v: "Needs an RFC. Shared tooling, new repos, archiving repos, and anything that changes how contributors work." },
          { k: "POLICY", v: "Licensing, governance and the code of conduct. RFC plus a steering group vote with a two-thirds majority." },
        ],
      },
      "When consensus fails, the steering group votes by simple majority, records the reasoning, and the decision can be revisited by a new RFC after ninety days.",
    ],
  },
  {
    id: "rfcs",
    title: "RFCS",
    blocks: [
      "An RFC (request for comments) is a short design document, proposed as a pull request to the `rfcs` repo. Anyone can write one. You don't need to be a maintainer.",
      {
        lang: "text",
        title: "rfcs/0000-your-title.md",
        code: "# RFC: <title>\n\n## Summary      one paragraph\n## Motivation   what problem, for whom\n## Design       what changes, in enough detail to build it\n## Drawbacks    what it costs, who it hurts\n## Alternatives what else we considered, including doing nothing\n## Open questions",
      },
      {
        steps: [
          "**Draft.** Open the PR. Post a link in the community chat.",
          "**Comment period.** At least fourteen days. The author answers every substantive comment.",
          "**Final call.** A steering member announces a final seven-day call with a proposed outcome: accept, reject or postpone.",
          "**Decision.** Recorded in the RFC, merged (accepted) or closed (rejected), with reasons either way.",
          "**Build it.** Accepted RFCs get a tracking issue. The author is not obliged to build it, but is first in line.",
        ],
      },
    ],
  },
  {
    id: "maintainers",
    title: "BECOMING A MAINTAINER",
    blocks: [
      "There is no application form and no quota. Maintainers are nominated for work already done.",
      {
        steps: [
          "Contribute steadily to a repo: PRs, reviews, answering issues. Quality and care matter more than volume.",
          "An existing maintainer invites you to be a **reviewer**. Review PRs for a while.",
          "A maintainer nominates you in a public issue in that repo, linking to your work.",
          "Existing maintainers of the repo have seven days to object. No objection means you're in.",
          "You get merge rights, a walkthrough of release process, and your name in the repo's MAINTAINERS file.",
        ],
      },
      "Maintainers who are inactive for six months are moved to **emeritus** with thanks. Coming back is one message away. Maintainer rights can also be removed by the steering group for breaches of the code of conduct.",
    ],
  },
  {
    id: "licensing",
    title: "LICENSING POLICY",
    blocks: [
      {
        list: [
          "**OSI-approved licences only.** New repos default to MIT for libraries and Apache-2.0 where patent grants matter. Anything else needs an RFC.",
          "**No CLA.** Contributors keep their copyright. Inbound = outbound: you license your contribution under the repo's licence by submitting it.",
          "**No relicensing without consent.** Changing a repo's licence requires agreement from its contributors, recorded in the RFC.",
          "**No source-available bait.** No \"open core\", no licences that restrict field of use, no time-delayed open source.",
          "**Dependencies** must be under licences compatible with the repo's own. CI checks this.",
          "**Data and docs** default to CC BY 4.0 unless the source requires otherwise.",
        ],
      },
      `Licensing questions: ${"[" + CONTACT.maintainers + "](mailto:" + CONTACT.maintainers + ")"}.`,
    ],
  },
  {
    id: "changes",
    title: "CHANGING THIS DOCUMENT",
    blocks: [
      "This page is governed by itself: changes go through an RFC and a two-thirds steering group vote. The current text is a placeholder draft and has not been ratified.",
    ],
  },
];
