import type { HouseId } from "@/lib/houses";

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
