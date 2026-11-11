// User sessions.
//   GET  /v1/auth/status     { setupNeeded, setupTokenRequired }  (public: lets the sign-in page choose a form)
//   POST /v1/auth/setup      first admin  → { token, user }
//   POST /v1/auth/login      { email, password } → { token, user }
//   POST /v1/auth/logout     ends this session
//   GET  /v1/auth/me         { user }
//   POST /v1/auth/password   { current, next } → { token, user }  (other sessions are ended)
import { Router, type Request } from "express";
import {
  MAX_PASSWORD, MIN_PASSWORD, hashPassword, newId, publicUser, setupTokenRequired, setupTokenValid, startSession,
  userAuth, verifyPassword,
} from "../auth.js";
import { body, conflict, forbidden, invalid, rateLimit, str, unauthorized } from "../http.js";
import type { Ctx } from "../app.js";
import { DuplicateEmailError, type User } from "../types.js";

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function authRoutes({ config, store }: Ctx): Router {
  const r = Router();
  const audit = (actor: string | null, action: string, target?: string, detail?: string) =>
    store.addAudit({ at: new Date(), space: null, actor, action, target, detail });

  const emailOf = (req: Request) => {
    const e = (req.body as Record<string, unknown> | undefined)?.email;
    return typeof e === "string" ? e.trim().toLowerCase().slice(0, 200) : "";
  };
  // Per client address and email, so one person's typos can't lock out everyone behind the same web server;
  // plus a looser cap per client address.
  const perEmail = rateLimit({ name: "login", ...config.loginLimit, key: (req) => `${req.ip}|${emailOf(req)}` });
  const perClient = rateLimit({ name: "login-ip", max: config.loginLimit.max * 10, windowMs: config.loginLimit.windowMs, key: (req) => req.ip ?? "" });
  const setupLimit = rateLimit({ name: "setup", ...config.loginLimit, key: (req) => req.ip ?? "" });

  r.get("/v1/auth/status", async (_req, res) => {
    res.json({ setupNeeded: (await store.countUsers()) === 0, setupTokenRequired: setupTokenRequired(config) });
  });

  r.post("/v1/auth/setup", setupLimit, async (req, res) => {
    const b = body(req);
    if ((await store.countUsers()) > 0) throw conflict("Setup is already complete. Sign in instead.");
    if (setupTokenRequired(config) && !setupTokenValid(config, str(b, "token", { max: 500 }))) {
      await audit(null, "setup.failed", undefined, "wrong setup token");
      throw forbidden("The setup token is not correct.");
    }
    const name = str(b, "name", { max: 120 }), email = str(b, "email", { max: 200 }).toLowerCase();
    const password = str(b, "password", { trim: false, max: MAX_PASSWORD });
    const errors: Record<string, string> = {};
    if (!name) errors.name = "Your name is required.";
    if (!EMAIL.test(email)) errors.email = "Enter a valid email address.";
    if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (Object.keys(errors).length) throw invalid(errors);
    const user: User = { id: newId(), email, name, role: "admin", spaces: "*", passwordHash: await hashPassword(password), createdAt: new Date() };
    try {
      await store.createUser(user);
    } catch (e) {
      if (e instanceof DuplicateEmailError) throw conflict("Setup is already complete. Sign in instead.");
      throw e;
    }
    const { token, expiresAt } = await startSession(store, user.id);
    await audit(email, "setup.first-admin");
    res.status(201).json({ token, expiresAt, user: publicUser(user) });
  });

  r.post("/v1/auth/login", perClient, perEmail, async (req, res) => {
    const b = body(req);
    const email = str(b, "email", { max: 200 }).toLowerCase();
    const password = str(b, "password", { trim: false, max: MAX_PASSWORD });
    const user = email ? await store.getUserByEmail(email) : null;
    // Same message and similar work whether or not the account exists.
    const ok = user && !user.disabled ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
    if (!ok || !user) {
      await audit(null, "login.failed", email || undefined);
      throw unauthorized("That email and password don't match an active account.");
    }
    const { token, expiresAt } = await startSession(store, user.id);
    await audit(user.email, "login");
    res.json({ token, expiresAt, user: publicUser(user) });
  });

  const auth = userAuth(store);

  r.post("/v1/auth/logout", auth, async (req, res) => {
    await store.deleteSession(req.sessionHash!);
    await audit(req.user!.email, "logout");
    res.status(204).end();
  });

  r.get("/v1/auth/me", auth, (req, res) => {
    res.json({ user: publicUser(req.user!) });
  });

  r.post("/v1/auth/password", auth, async (req, res) => {
    const b = body(req);
    const user = req.user!;
    const current = str(b, "current", { trim: false, max: MAX_PASSWORD });
    const next = str(b, "next", { trim: false, max: MAX_PASSWORD });
    if (!(await verifyPassword(current, user.passwordHash))) throw invalid({ current: "Your current password is not correct." });
    if (next.length < MIN_PASSWORD) throw invalid({ next: `Use at least ${MIN_PASSWORD} characters.` });
    await store.updateUser(user.id, { passwordHash: await hashPassword(next) });
    await store.deleteUserSessions(user.id); // sign out everywhere…
    const { token, expiresAt } = await startSession(store, user.id); // …except here
    await audit(user.email, "user.password");
    res.json({ token, expiresAt, user: publicUser(user) });
  });

  return r;
}
