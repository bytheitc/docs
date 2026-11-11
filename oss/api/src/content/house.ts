// Who this api is. The space id ties it to its content in the CMS; the ports are the ones in
// ARCHITECTURE.md's table.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "oss",
  /** Shown in the CMS's space list. */
  label: "Open Source",
  /** Shown as the heading inside the space. */
  title: "Open Source Studio",
  port: 4004,
  webPort: 3004,
} as const;
