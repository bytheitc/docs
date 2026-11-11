import type { HouseId } from "@/lib/houses";

// Editorial descriptions of the five houses. Names, Arabic and URLs live in lib/houses.ts (shared constant).
export type MemberHouseId = Exclude<HouseId, "site">;
export const MEMBER_HOUSE_IDS: MemberHouseId[] = ["ai", "engineering", "institute", "oss", "research"];

export interface HouseProfile {
  id: MemberHouseId;
  label: string;
  title: string;
  desc: string;
  focus: string[];
  collaborates: { with: MemberHouseId; how: string }[];
  email: string;
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_HOUSE_PROFILES: HouseProfile[] = [
  {
    id: "ai",
    label: "AI at ITC",
    title: "Intelligence, with intention.",
    desc: "Models, evaluations and tools built on clear principles: privacy first, honest about limits, accountable to the people they serve.",
    focus: ["Evaluations and model cards written for non-specialists", "Privacy-preserving tools", "Guidance on responsible use"],
    collaborates: [
      { with: "research", how: "turns open questions into evaluations, and findings into safer defaults" },
      { with: "engineering", how: "ships models inside products that are built to last" },
    ],
    email: "ai@example.org",
  },
  {
    id: "engineering",
    label: "Engineering",
    title: "Build it right. Then build it to last.",
    desc: "The platforms, practices and craft behind everything ITC ships.",
    focus: ["Shared infrastructure for every house", "Engineering standards and review", "Security and reliability practice"],
    collaborates: [
      { with: "oss", how: "upstreams what it builds so the commons can maintain it" },
      { with: "ai", how: "provides the platform that AI work runs on" },
    ],
    email: "engineering@example.org",
  },
  {
    id: "institute",
    label: "The Institute",
    title: "A home for the centers.",
    desc: "Fellowships, scholarship and long-horizon centers of study.",
    focus: ["Fellowships for builders and scholars", "Centers of long-horizon study", "Teaching and curricula"],
    collaborates: [
      { with: "research", how: "co-hosts the Reading Circle and pairs fellows with research projects" },
      { with: "oss", how: "trains new maintainers through mentored placements" },
    ],
    email: "institute@example.org",
  },
  {
    id: "oss",
    label: "Open Source",
    title: "FORK IT. FIX IT. SHIP IT.",
    desc: "Code held in common, maintained in the open.",
    focus: ["Stewarding ITC’s open projects", "The Commons Sprint", "Contributor onboarding"],
    collaborates: [
      { with: "engineering", how: "keeps shared libraries healthy and well-reviewed" },
      { with: "institute", how: "hosts mentees on real projects" },
    ],
    email: "oss@example.org",
  },
  {
    id: "research",
    label: "Research",
    title: "Careful questions, published in the open.",
    desc: "Papers, datasets and working notes from across the collective.",
    focus: ["Open papers and datasets", "Working notes from every house", "Methods review"],
    collaborates: [
      { with: "ai", how: "studies how systems behave in the hands of real communities" },
      { with: "institute", how: "brings classical scholarship into conversation with current work" },
    ],
    email: "research@example.org",
  },
];

export const profile = (list: HouseProfile[], id: MemberHouseId): HouseProfile | undefined => list.find((p) => p.id === id);
