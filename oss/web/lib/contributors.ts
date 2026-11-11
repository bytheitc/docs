// Seed content for the contributors wall (editable in the admin: Contributors, Contribution kinds).
// Intentionally empty: names are added by maintainers for real contributions, never invented.
export interface Contributor {
  handle: string; // GitHub handle, without the @ (stored lowercase: handles are case-insensitive)
  name?: string;
  kinds: string[]; // contribution kind ids, e.g. "code", "docs"
  repos: string[]; // repo slugs
}

export interface ContributionKindInfo {
  kind: string;
  label: string;
  body: string;
}
