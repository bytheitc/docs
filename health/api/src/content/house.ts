// Who this api is. The space id ties it to its content in the CMS; the ports are the ones in
// ARCHITECTURE.md's table.
//
// Note on the name: every api in the collective also answers GET /health as its own liveness
// probe. That is a different thing at a different level — this house's id, and that endpoint's
// path — and nothing resolves one against the other. It is only worth knowing when reading logs.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "health",
  /** Shown in the CMS's space list. */
  label: "Health",
  /** Shown as the heading inside the space. */
  title: "Health Studio",
  port: 4007,
  webPort: 3007,
} as const;
