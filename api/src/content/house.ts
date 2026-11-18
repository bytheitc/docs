// Who this api is. The space id ties it to the CMS purely to reuse the CMS's own staff accounts and
// role checks for /staff/*: the docs themselves are Markdown files in the bytheitc/docs repository.
export const HOUSE = {
  /** Space id in the CMS. Also the house id used across the collective. */
  space: "docs",
  /** Shown in the CMS's space list. */
  label: "Docs",
  /** Shown as the heading inside the space. */
  title: "Docs",
  port: 4013,
  webPort: 3011,
} as const;
