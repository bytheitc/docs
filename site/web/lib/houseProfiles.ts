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
export const profile = (list: HouseProfile[], id: MemberHouseId): HouseProfile | undefined => list.find((p) => p.id === id);
