// Who this api is. The space id ties it to its content in the CMS; the ports are the ones in
// ARCHITECTURE.md's table.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "engineering",
  /** Shown in the CMS's space list. */
  label: "Engineering",
  /** Shown as the heading inside the space. */
  title: "Engineering Studio",
  port: 4002,
  webPort: 3002,
} as const;
