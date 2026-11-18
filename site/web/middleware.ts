import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isVisible } from "@/lib/visibility";

// The allow-list lives in lib/visibility.ts, shared with app/sitemap.ts.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isVisible(pathname)) return;
  // No real page answers to this path, so Next's own app/not-found.tsx renders — the same 404
  // a visitor would get for a typo'd URL, not a special "coming soon" state to maintain.
  return NextResponse.rewrite(new URL("/__hidden__", req.url));
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
