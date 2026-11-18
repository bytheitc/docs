export interface NavLink { href: string; label: string }

// Soft launch: only /, /about, /join, /privacy and /terms are public right now (see
// middleware.ts). Everything else is commented out rather than removed — uncomment a line to
// bring it back into the nav the moment its page comes back.
export const PRIMARY_NAV: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/products", label: "Products" },
  { href: "/first-hundred", label: "First Hundred" },
  // { href: "/houses", label: "Houses" },
  // { href: "/events", label: "Gatherings" },
  // { href: "/news", label: "News" },
  // { href: "/rfps", label: "Build with us" },
  // { href: "/donate", label: "Support" },
];

// Site map shown in the footer above the Collective bar.
export const FOOTER_NAV: { heading: string; links: NavLink[] }[] = [
  {
    heading: "The Collective",
    links: [
      { href: "/about", label: "About" },
      { href: "/about#principles", label: "Principles" },
      // { href: "/team", label: "Team" },
      // { href: "/houses", label: "The five houses" },
    ],
  },
  {
    heading: "Take part",
    links: [
      { href: "/join", label: "Join" },
      { href: "/first-hundred", label: "The First Hundred" },
      { href: "/products", label: "Products" },
      // { href: "/events", label: "Gatherings" },
      // { href: "/rfps", label: "Requests for proposals" },
      // { href: "/suggest", label: "Tell us what to build" },
      // { href: "/donate", label: "Support the work" },
      // { href: "/mobile", label: "The app" },
      // { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Read",
    links: [
      // { href: "/news", label: "News" },
      // { href: "/newsletter", label: "Newsletter" },
      // { href: "/press", label: "Press & brand kit" },
      // { href: "/brand", label: "The logo" },
      // { href: "/faq", label: "Questions" },
    ],
  },
  { heading: "Policies", links: [{ href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }] },
];
