import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Soft launch: only these are public for now. Everything else still exists — this is the one
// place to flip to bring a page back, not a deletion. Add a path here to re-open it.
// opengraph-image/twitter-image are metadata routes with no extension in their URL, so they
// need to be listed here explicitly or a link-unfurl on any page fetches a 404 instead.
const VISIBLE = ["/", "/about", "/join", "/privacy", "/terms", "/products", "/opengraph-image", "/twitter-image"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const visible = VISIBLE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (visible) return;
  // No real page answers to this path, so Next's own app/not-found.tsx renders — the same 404
  // a visitor would get for a typo'd URL, not a special "coming soon" state to maintain.
  return NextResponse.rewrite(new URL("/__hidden__", req.url));
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
