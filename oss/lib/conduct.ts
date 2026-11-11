import type { DocSection } from "@/lib/doc";
import { CONTACT } from "@/lib/site";

const mail = (a: string) => `[${a}](mailto:${a})`;

// The ITC Open Source code of conduct (adab). Placeholder text: have it reviewed before launch.
export const SEED_CONDUCT: DocSection[] = [
  {
    id: "why",
    title: "WHY ADAB",
    blocks: [
      "**Adab** (أدب) is good conduct: the manners of a person of knowledge. In our tradition, adab came before learning. Students were taught how to sit with a teacher, how to disagree, how to ask, before they were taught the subject itself.",
      "We build in the open, with people from every background, skill level and school of thought. This document says how we treat each other while we do it. It is short on purpose. Read all of it.",
    ],
  },
  {
    id: "expected",
    title: "EXPECTED BEHAVIOUR",
    blocks: [
      {
        list: [
          "**Critique the code, never the coder.** \"This loop is O(n²)\" is review. \"Who wrote this?\" is not.",
          "**Assume good faith.** Most bad comments are tired comments. Ask before you accuse.",
          "**Make room for beginners.** Every expert here was once a first-timer. Explain the jargon, link the docs, be patient with the second question.",
          "**Disagree with evidence.** Benchmarks, sources, reproductions. Not volume, not rank.",
          "**Respect difference.** People here follow different schools, speak different languages and come from different places. Nobody has to justify their identity or practice to contribute.",
          "**Own your mistakes.** Say sorry, fix it, move on. Nobody needs a long apology.",
          "**Respect time.** Keep threads on topic. Answer the question that was asked.",
        ],
      },
    ],
  },
  {
    id: "unacceptable",
    title: "UNACCEPTABLE BEHAVIOUR",
    blocks: [
      {
        list: [
          "Harassment, insults or demeaning comments, in public or in private messages",
          "Discrimination or slurs based on ethnicity, nationality, sex, disability, age, appearance, religion, sect or school of thought",
          "Takfir, sectarian attacks, or questioning someone's faith to win an argument",
          "Unwelcome sexual attention or content",
          "Threats, intimidation, stalking, or encouraging anyone else to do these things",
          "Publishing someone's private information (doxxing) without their explicit permission",
          "Sustained disruption: derailing threads, spamming, brigading, or repeated bad-faith arguments",
          "Retaliating against anyone who reports a concern in good faith",
        ],
      },
      { note: "This list is not exhaustive. If you're wondering whether something crosses the line, it probably does. Don't do it." },
    ],
  },
  {
    id: "scope",
    title: "SCOPE",
    blocks: [
      "This code applies in every space ITC Open Source runs or represents:",
      {
        list: [
          "Repositories, issues, pull requests, discussions and wikis",
          "Chat servers, mailing lists and video calls",
          "Commons Sprints and other events, online or in person",
          "Social media, when someone is speaking for the project",
        ],
      },
      "It also applies to conduct outside these spaces when that conduct makes our spaces unsafe for someone. Maintainers are held to the same code, with a higher expectation.",
    ],
  },
  {
    id: "reporting",
    title: "REPORTING",
    blocks: [
      `If you experience or witness a breach of this code, email the conduct team at ${mail(CONTACT.conduct)}. If your report concerns someone on the conduct team, say so in the subject line and they will be excluded from handling it.`,
      {
        list: [
          "Include what happened, where (links if you have them), when, and who was involved.",
          "You don't need proof or a perfect account. Tell us what you know.",
          "You can report anonymously, but we may be limited in what we can do.",
          "Reports are confidential. We share details only with the people handling the report, and only what they need.",
        ],
      },
      "We will acknowledge your report within three working days and tell you what we decide. In an emergency or where someone is in danger, contact local emergency services first.",
    ],
  },
  {
    id: "enforcement",
    title: "ENFORCEMENT LADDER",
    blocks: [
      "The conduct team decides what happened and picks the response that fits. The ladder below is a guide, not a staircase you have to climb one step at a time. Serious breaches can go straight to the top.",
      {
        defs: [
          { k: "1 · CORRECTION", v: "A private, written note explaining what was wrong and why. A public apology may be requested." },
          { k: "2 · WARNING", v: "A formal warning with clear consequences for repeat behaviour. No interaction with the people involved for a set period." },
          { k: "3 · TEMPORARY BAN", v: "No participation in any ITC Open Source space for a set period. Maintainer rights are suspended." },
          { k: "4 · PERMANENT BAN", v: "Permanent removal from all ITC Open Source spaces. Used for sustained harassment, threats, or any action that endangers someone." },
        ],
      },
      "Anyone sanctioned can appeal once, in writing, to the conduct team within thirty days. Appeals are reviewed by members who did not handle the original report.",
    ],
  },
  {
    id: "attribution",
    title: "ATTRIBUTION",
    blocks: [
      "This code is adapted from widely used open source codes of conduct, in particular the Contributor Covenant and the community guidelines of several large open source foundations, and rewritten in our own voice around the idea of adab. Where wording overlaps, the credit belongs to those communities.",
      "Changes to this document go through the public [RFC process](/governance). Placeholder text: have it reviewed by the conduct team before launch.",
    ],
  },
];
