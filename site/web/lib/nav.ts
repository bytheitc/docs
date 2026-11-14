export interface NavLink { href: string; label: string }

// Primary navigation shown in the header.
export const PRIMARY_NAV: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/houses", label: "Houses" },
  { href: "/events", label: "Gatherings" },
  { href: "/news", label: "News" },
  { href: "/rfps", label: "Build with us" },
  { href: "/donate", label: "Support" },
];

// Site map shown in the footer above the Collective bar.
export const FOOTER_NAV: { heading: string; links: NavLink[] }[] = [
  { heading: "The Collective", links: [{ href: "/about", label: "About" }, { href: "/about#principles", label: "Principles" }, { href: "/team", label: "Team" }, { href: "/houses", label: "The five houses" }] },
  { heading: "Take part", links: [{ href: "/join", label: "Join" }, { href: "/events", label: "Gatherings" }, { href: "/rfps", label: "Requests for proposals" }, { href: "/suggest", label: "Tell us what to build" }, { href: "/donate", label: "Support the work" }, { href: "/mobile", label: "The app" }, { href: "/contact", label: "Contact" }] },
  { heading: "Read", links: [{ href: "/news", label: "News" }, { href: "/newsletter", label: "Newsletter" }, { href: "/press", label: "Press & brand kit" }, { href: "/brand", label: "The logo" }, { href: "/faq", label: "Questions" }] },
  { heading: "Policies", links: [{ href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }] },
];
