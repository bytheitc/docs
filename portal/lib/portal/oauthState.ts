// The OAuth `state` and PKCE verifier live in a short-lived httpOnly cookie scoped to /auth.
import { timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const STATE_COOKIE = "itc_portal_oauth";

export interface OAuthPending { s: string; v: string; p: string; n: string }

export function setPending(res: NextResponse, p: OAuthPending) {
  res.cookies.set(STATE_COOKIE, Buffer.from(JSON.stringify(p)).toString("base64url"), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/auth", maxAge: 600,
  });
}

export function readPending(raw: string | undefined): OAuthPending | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthPending;
    return typeof p.s === "string" && typeof p.v === "string" && typeof p.p === "string" && typeof p.n === "string" ? p : null;
  } catch {
    return null;
  }
}

export function clearPending(res: NextResponse) {
  res.cookies.set(STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/auth", maxAge: 0 });
}

export function sameState(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && x.length >= 16 && timingSafeEqual(x, y);
}
