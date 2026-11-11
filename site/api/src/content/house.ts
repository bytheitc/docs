// Who this api is. The space id ties it to its content in the CMS; the ports are the ones in
// ARCHITECTURE.md's table.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "site",
  /** Shown in the CMS's space list. */
  label: "Collective",
  /** Shown as the heading inside the space. */
  title: "Collective Studio",
  port: 4000,
  webPort: 3000,
} as const;
