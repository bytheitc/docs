// Who this api is. The space id ties it to its content in the CMS; the ports are the ones in
// ARCHITECTURE.md's table.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "portal",
  /** Shown in the CMS's space list. */
  label: "Contributor portal",
  /** Shown as the heading inside the space. */
  title: "Portal Studio",
  port: 4006,
  webPort: 3006,
} as const;
