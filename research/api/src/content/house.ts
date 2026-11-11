// Who this api is. The space id ties it to its content in the CMS; the ports are the ones in
// ARCHITECTURE.md's table.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "research",
  /** Shown in the CMS's space list. */
  label: "Research",
  /** Shown as the heading inside the space. */
  title: "Research Studio",
  port: 4005,
  webPort: 3005,
} as const;
