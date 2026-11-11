// Site navigation tree, built on the server and passed to the client sidebar as plain data.
// The sheets are fixed here; their sub-page lists come from published content (see getNav in lib/data.ts).

export interface NavChild { href: string; code: string; label: string }
export interface NavItem { href: string; num: string; label: string; children?: NavChild[] }

export const SHEETS: NavItem[] = [
  { href: "/", num: "00", label: "Overview" },
  { href: "/platforms", num: "01", label: "Platforms" },
  { href: "/handbook", num: "02", label: "Handbook" },
  { href: "/rfcs", num: "03", label: "RFCs" },
  { href: "/blog", num: "04", label: "Blog" },
  { href: "/teams", num: "05", label: "Teams" },
  { href: "/careers", num: "06", label: "Careers" },
  { href: "/status", num: "07", label: "Status" },
];

/** Attaches sub-page lists to the sheets that have them. */
export function buildNav(children: Partial<Record<string, NavChild[]>>): NavItem[] {
  return SHEETS.map((s) => (children[s.href] ? { ...s, children: children[s.href] } : s));
}

/** Sheet numbers used in breadcrumbs / kickers. */
export const sheetNum = (href: string): string => SHEETS.find((n) => n.href === href)?.num ?? "—";
