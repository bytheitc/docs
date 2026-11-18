// Who is asking. Readers need nothing. Staff are CMS accounts with access to the "docs" space,
// checked by asking cms/api to introspect the token, so there is no second password anywhere.
//   editor     edits and creates pages
//   publisher  also moves and deletes pages, and reorders the sidebar
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { CmsClient, StaffUser } from "./cms.js";
import { HttpError, unauthorized } from "./http.js";

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

export function needsStaff(cms: CmsClient): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = bearerToken(req.header("authorization"));
      const user = token ? await cms.introspect(token) : null;
      if (!user) return next(unauthorized("Sign in with a CMS account that can open the docs space."));
      req.staff = user;
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function atLeast(role: StaffUser["role"]): RequestHandler {
  const rank = { editor: 0, publisher: 1, admin: 2 };
  return (req, _res, next) => {
    if (!req.staff) return next(unauthorized());
    if (rank[req.staff.role] < rank[role]) return next(new HttpError(403, "forbidden", `This needs the ${role} role.`));
    next();
  };
}
