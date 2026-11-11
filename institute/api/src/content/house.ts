// Who this api is. The space id ties it to its content in the CMS; the ports are the ones in
// ARCHITECTURE.md's table.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "institute",
  /** Shown in the CMS's space list. */
  label: "Institute",
  /** Shown as the heading inside the space. */
  title: "Institute Studio",
  port: 4003,
  webPort: 3003,
} as const;
