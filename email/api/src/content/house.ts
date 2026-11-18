// Who this api is. The space id ties it to the CMS, purely to reuse the CMS's own staff accounts
// and role checks for /staff/* — this house has no public content collections of its own.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "email",
  /** Shown in the CMS's space list. */
  label: "Email",
  /** Shown as the heading inside the space. */
  title: "Email Studio",
  port: 4010,
  webPort: 3009,
} as const;
