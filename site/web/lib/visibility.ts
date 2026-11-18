// Soft launch: only these are public for now. Everything else still exists — this is the one
// place to flip to bring a page back, not a deletion. Add a path here to re-open it.
// opengraph-image/twitter-image are metadata routes with no extension in their URL, so they
// need to be listed here explicitly or a link-unfurl on any page fetches a 404 instead.
// Read by middleware.ts (what answers) and app/sitemap.ts (what search engines are told about).
export const VISIBLE = ["/", "/about", "/join", "/privacy", "/terms", "/products", "/first-hundred", "/opengraph-image", "/twitter-image"];

export const isVisible = (pathname: string): boolean =>
  VISIBLE.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));
