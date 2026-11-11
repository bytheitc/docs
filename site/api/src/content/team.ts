import type { HouseId } from "./houses.js";

export interface Role {
  title: string;
  /** Empty until the person has agreed to be listed; pages then show TBA_NAME. */
  name?: string;
  house?: HouseId;
  remit: string;
}

export interface Team {
  id: string;
  leadership: Role[];
  stewards: Role[];
  councils: Role[];
}

export const TBA_NAME = "Name to be announced";

const LEADERSHIP: Role[] = [
  { title: "Convener of the Collective", house: "site", remit: "Holds the shared vision, chairs the collective council and keeps the five houses in conversation." },
  { title: "Director of Operations", remit: "Finance, legal, events and the quiet work that keeps everything else possible." },
  { title: "Community Lead", remit: "Membership, volunteers, chapters and the welcome every newcomer receives." },
];

const STEWARDS: Role[] = [
  { title: "Steward, AI", house: "ai", remit: "Sets the priorities of the AI house and its standards for responsible release." },
  { title: "Steward, Engineering", house: "engineering", remit: "Owns shared infrastructure, engineering practice and review." },
  { title: "Steward, Institute", house: "institute", remit: "Guides the fellowships, the centers and the house’s teaching." },
  { title: "Steward, Open Source", house: "oss", remit: "Keeps the commons healthy: maintainers, licences and the sprint." },
  { title: "Steward, Research", house: "research", remit: "Holds the research agenda and the bar for what we publish." },
];

const COUNCILS: Role[] = [
  { title: "Collective Council", remit: "The convener and the five house stewards. Meets monthly and decides by shūrā." },
  { title: "Scholarly Advisors", remit: "Scholars who advise on questions of ethics and Islamic law that the work raises." },
  { title: "Members’ Assembly", remit: "Every member, gathered at the Annual Majlis to review the year and propose the next." },
];

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_TEAM: Team = { id: "team", leadership: LEADERSHIP, stewards: STEWARDS, councils: COUNCILS };
