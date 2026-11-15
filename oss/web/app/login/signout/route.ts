// No revocation call: the access token this clears was never asked for offline_access, so it
// simply expires within the hour on its own. Clearing the cookie is enough to sign out here.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
