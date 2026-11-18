// Who is asking. This house has exactly one kind of caller: staff — a CMS account with access to
// the "email" space, checked by asking cms/api to introspect the token. There is no second
// password anywhere, and no end-user session (campaigns are sent, never signed in to).
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { CmsClient } from "./cms.js";
import { HttpError, unauthorized } from "./http.js";
import { getEmailStore } from "./store/index.js";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: "editor" | "publisher" | "admin";
}

declare module "express-serve-static-core" {
  interface Request {
    staff?: StaffUser;
  }
}

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S{1,500})$/i.exec(header.trim());
  return m ? m[1] : null;
}

/** 503 unless this service's database is configured and reachable. */
export const needsDatabase: RequestHandler = (_req, _res, next) => {
  if (!getEmailStore()) return next(new HttpError(503, "unavailable", "The email database is not configured yet."));
  next();
};

/** Requires a CMS account with access to the "email" space. */
export function needsStaff(cms: CmsClient): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = bearerToken(req.header("authorization"));
      const user = token ? await cms.introspect(token) : null;
      if (!user) return next(unauthorized("Sign in with a CMS account that can open the email space."));
      req.staff = user;
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Minimum role for an action. Editors draft; publishers send. */
export function atLeast(role: "editor" | "publisher" | "admin"): RequestHandler {
  const rank = { editor: 0, publisher: 1, admin: 2 };
  return (req, _res, next) => {
    if (!req.staff) return next(unauthorized());
    if (rank[req.staff.role] < rank[role]) return next(new HttpError(403, "forbidden", `This needs the ${role} role.`));
    next();
  };
}
