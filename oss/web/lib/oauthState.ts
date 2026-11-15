// The "Sign in with ITC" `state` and PKCE verifier, in a short-lived httpOnly cookie scoped to
// /login — the same shape accounts/web itself uses for its own federated handshake.
import { timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const STATE_COOKIE = "itc_oss_login";

export interface OAuthPending { s: string; v: string }

export function setPending(res: NextResponse, p: OAuthPending) {
  res.cookies.set(STATE_COOKIE, Buffer.from(JSON.stringify(p)).toString("base64url"), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/login", maxAge: 600,
  });
}

export function readPending(raw: string | undefined): OAuthPending | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthPending;
    return typeof p.s === "string" && typeof p.v === "string" ? p : null;
  } catch {
    return null;
  }
}

export function clearPending(res: NextResponse) {
  res.cookies.set(STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/login", maxAge: 0 });
}

export function sameState(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && x.length >= 16 && timingSafeEqual(x, y);
}
