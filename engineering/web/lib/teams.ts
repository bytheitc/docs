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

export const findTeam = (teams: Team[], slug: string): Team | undefined => teams.find((t) => t.slug === slug);
