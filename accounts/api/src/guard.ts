// Who is asking. Two kinds of caller, never mixed:
//
//   account   an ITC account, identified by the bearer session token accounts/web forwards from
//             its own httpOnly cookie
//   staff     a CMS account with access to the "accounts" space, checked by asking cms/api to
//             introspect the token — the same sign-in reviewing a partner's app, so there is no
//             second password anywhere
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Ctx } from "./app.js";
import type { CmsClient } from "./cms.js";
import { HttpError, unauthorized } from "./http.js";
import { accountForToken, bearerToken } from "./session.js";
import { getAccountsStore } from "./store/index.js";
import type { Account } from "./store/types.js";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: "editor" | "publisher" | "admin";
}

declare module "express-serve-static-core" {
  interface Request {
    account?: Account;
    /** The raw session token, so sign-out can delete exactly this session. */
    sessionToken?: string;
    staff?: StaffUser;
  }
}

/** 503 unless this service's database is configured and reachable. */
export const needsDatabase: RequestHandler = (_req, _res, next) => {
  if (!getAccountsStore()) return next(new HttpError(503, "unavailable", "The accounts database is not configured yet."));
  next();
};

/** Requires a signed-in ITC account whose portal contributor isn't disabled. */
export function needsAccount(ctx: Ctx): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = bearerToken(req.header("authorization"));
      const me = await accountForToken(ctx, token);
      if (!me || !token) return next(unauthorized("Sign in first."));
      req.account = me;
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
      if (!user) return next(unauthorized("Sign in with a CMS account that can open the accounts space."));
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
