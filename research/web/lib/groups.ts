// Placeholder research groups. Replace agendas and roles with the real programme before launch.
import type { HouseId } from "@/lib/houses";
import { GROUP_NAMES, groupSlug, type Group } from "@/lib/publications";

export interface Role {
  role: string;
  /** Always "Name to be announced" in this build: no real or invented people. */
  name: string;
  note?: string;
}

export interface ResearchGroup {
  slug: string;
  name: Group;
  focus: string;
  agenda: string[];
  questions: string[];
  collaborators: { house: HouseId; how: string }[];
  roles: Role[];
}

/** The group record for a group name. Falls back to a minimal record if an editor removed the group. */
export const groupByName = (groups: ResearchGroup[], name: Group): ResearchGroup =>
  groups.find((g) => g.name === name) ?? { slug: groupSlug(name), name, focus: "", agenda: [], questions: [], collaborators: [], roles: [] };

/** Research-wide roles that sit outside any single group. */
export interface Office {
  id: "office";
  roles: Role[];
}
