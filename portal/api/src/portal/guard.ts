// Who is asking. Two kinds of caller, never mixed:
//
//   contributor  a person signed in on portal/web, identified by the bearer session token the web
//                forwards from its own httpOnly cookie
//   staff        a CMS account with access to the "portal" space, checked by asking cms/api to
//                introspect the token (ARCHITECTURE.md: the staff tools reuse the CMS sign-in)
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { CmsClient } from "../cms.js";
import { HttpError, unauthorized } from "../http.js";
import { bearerToken, contributorForToken } from "./session.js";
import { getPortalStore } from "./store.js";
import type { Contributor } from "./types.js";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: "editor" | "publisher" | "admin";
}

declare module "express-serve-static-core" {
  interface Request {
    contributor?: Contributor;
    /** The raw session token, so sign-out can delete exactly this session. */
    sessionToken?: string;
    staff?: StaffUser;
  }
}

/** 503 unless the portal's database is configured and reachable. */
export const needsDatabase: RequestHandler = (_req, _res, next) => {
  if (!getPortalStore()) return next(new HttpError(503, "unavailable", "The portal's database is not configured yet."));
  next();
};

/** Requires a signed-in contributor. */
export function needsContributor(): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = bearerToken(req.header("authorization"));
      const me = await contributorForToken(token);
      if (!me || !token) return next(unauthorized("Sign in first."));
      req.contributor = me;
      req.sessionToken = token;
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Requires a CMS account with access to this space. */
export function needsStaff(cms: CmsClient): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = bearerToken(req.header("authorization"));
      const user = token ? await cms.introspect(token) : null;
      if (!user) return next(unauthorized("Sign in with a CMS account that can open the portal space."));
      req.staff = user;
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Minimum role for an action. Editors read; publishers and admins decide. */
export function atLeast(role: "editor" | "publisher" | "admin"): RequestHandler {
  const rank = { editor: 0, publisher: 1, admin: 2 };
  return (req, _res, next) => {
    if (!req.staff) return next(unauthorized());
    if (rank[req.staff.role] < rank[role]) return next(new HttpError(403, "forbidden", `This needs the ${role} role.`));
    next();
  };
}
