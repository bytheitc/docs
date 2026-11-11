// The Institute's masthead navigation: split symmetrically around the centered mark.
export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LEFT: NavLink[] = [
  { href: "/centers", label: "Centers" },
  { href: "/fellowships", label: "Fellowships" },
  { href: "/people", label: "People" },
];

export const NAV_RIGHT: NavLink[] = [
  { href: "/calendar", label: "The Year" },
  { href: "/proceedings", label: "Proceedings" },
  { href: "/propose", label: "Propose" },
];

export const INSTITUTE_EMAIL = "institute@example.org";
