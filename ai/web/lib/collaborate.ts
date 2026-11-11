// Seed content: editors manage the live version in the admin (collections "calls" and "collaborate").
// Open calls for collaborators. Placeholder: replace with real calls and contacts before launch.

/** A call's id (slug), e.g. researcher. */
export type RoleId = string;

export interface Call {
  id: RoleId;
  title: string;
  lede: string;
  youd: string[];
  bring: string[];
}

/** Settings for the interest form on /collaborate. */
export interface CollaborateSettings {
  id: "collaborate";
  /** The "areas of interest" checkboxes. */
  interests: string[];
}
