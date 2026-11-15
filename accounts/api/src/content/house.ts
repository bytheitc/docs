// Who this api is. The space id ties it to its content in the CMS; the ports are the ones in
// ARCHITECTURE.md's table.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "accounts",
  /** Shown in the CMS's space list. */
  label: "Accounts",
  /** Shown as the heading inside the space. */
  title: "Accounts Studio",
  port: 4009,
  webPort: 3008,
} as const;
