// Admin-only: accounts and the audit log.
//   GET   /v1/users          { users }
//   POST  /v1/users          { name, email, role, spaces, password } → 201 { user }
//   PATCH /v1/users/:id      { name?, role?, spaces?, disabled?, password? } → { user }
//   GET   /v1/audit          ?space=&limit=  → { events }
import { Router } from "express";
import { MAX_PASSWORD, MIN_PASSWORD, hashPassword, newId, publicUser, requireRole, userAuth } from "../auth.js";
import { badRequest, body, conflict, forbidden, invalid, notFound, str } from "../http.js";
import type { Ctx } from "../app.js";
import { EMAIL } from "./auth.js";
import { DuplicateEmailError, ROLES, type Role, type SpaceAccess, type User } from "../types.js";
import { SPACE_PATTERN } from "../validate.js";

function readSpaces(v: unknown, errors: Record<string, string>): SpaceAccess {
  if (v === "*") return "*";
  if (Array.isArray(v) && v.every((s) => typeof s === "string" && SPACE_PATTERN.test(s))) return [...new Set(v as string[])].slice(0, 50);
  errors.spaces = 'spaces must be "*" or a list of space ids.';
  return [];
}

export function adminRoutes({ store }: Ctx): Router {
  const r = Router();
  const auth = userAuth(store);
  r.use(["/v1/users", "/v1/audit"], auth, (req, _res, next) => { requireRole(req, "admin"); next(); });

  const audit = (actor: User, action: string, target?: string, detail?: string) =>
    store.addAudit({ at: new Date(), space: null, actor: actor.email, action, target, detail });
  const describe = (role: Role, spaces: SpaceAccess) => `${role}, ${spaces === "*" || role === "admin" ? "all spaces" : spaces.length ? spaces.join(" ") : "no spaces"}`;

  r.get("/v1/users", async (_req, res) => {
    res.json({ users: (await store.listUsers()).map(publicUser) });
  });

  r.post("/v1/users", async (req, res) => {
    const admin = req.user!;
    const b = body(req);
    const name = str(b, "name", { max: 120 }), email = str(b, "email", { max: 200 }).toLowerCase();
    const password = str(b, "password", { trim: false, max: MAX_PASSWORD });
    const errors: Record<string, string> = {};
    const role = b.role as Role;
    if (!name) errors.name = "Name is required.";
    if (!EMAIL.test(email)) errors.email = "Enter a valid email address.";
    if (!ROLES.includes(role)) errors.role = "Choose a role.";
    let spaces = readSpaces(b.spaces ?? [], errors);
    if (role === "admin") spaces = "*";
    if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters. Share it privately; they can change it after signing in.`;
    if (!errors.email && (await store.getUserByEmail(email))) errors.email = "Someone already has that email.";
    if (Object.keys(errors).length) throw invalid(errors);
    const user: User = { id: newId(), email, name, role, spaces, passwordHash: await hashPassword(password), createdAt: new Date() };
    try {
      await store.createUser(user);
    } catch (e) {
      if (e instanceof DuplicateEmailError) throw conflict("Someone already has that email.", { email: "Someone already has that email." });
      throw e;
    }
    await audit(admin, "user.create", email, describe(role, spaces));
    res.status(201).json({ user: publicUser(user) });
  });

  r.patch("/v1/users/:id", async (req, res) => {
    const admin = req.user!;
    const target = await store.getUserById(req.params.id as string);
    if (!target) throw notFound("No such account.");
    const b = body(req);
    const errors: Record<string, string> = {};
    const patch: Partial<User> = {};
    if (b.name !== undefined) { const n = str(b, "name", { max: 120 }); if (n) patch.name = n; else errors.name = "Name can't be empty."; }
    if (b.role !== undefined) { if (ROLES.includes(b.role as Role)) patch.role = b.role as Role; else errors.role = "Unknown role."; }
    if (b.spaces !== undefined) patch.spaces = readSpaces(b.spaces, errors);
    if (b.disabled !== undefined) { if (typeof b.disabled === "boolean") patch.disabled = b.disabled; else errors.disabled = "disabled must be true or false."; }
    let password: string | null = null;
    if (b.password !== undefined) {
      password = str(b, "password", { trim: false, max: MAX_PASSWORD });
      if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    if (Object.keys(errors).length) throw invalid(errors);
    if (!Object.keys(patch).length && password === null) throw badRequest("Nothing to change.");
    if (target.id === admin.id && ((patch.role && patch.role !== "admin") || patch.disabled)) throw forbidden("You can't remove your own admin access.");

    const role = patch.role ?? target.role;
    if (role === "admin") patch.spaces = "*";
    if (password !== null) patch.passwordHash = await hashPassword(password);
    await store.updateUser(target.id, patch);
    if (patch.disabled || password !== null) await store.deleteUserSessions(target.id);
    const updated = (await store.getUserById(target.id))!;
    const detail = [describe(updated.role, updated.spaces), updated.disabled ? "disabled" : "active", password !== null ? "password reset" : ""].filter(Boolean).join(", ");
    await audit(admin, "user.update", target.email, detail);
    res.json({ user: publicUser(updated) });
  });

  r.get("/v1/audit", async (req, res) => {
    const space = typeof req.query.space === "string" && req.query.space ? req.query.space : undefined;
    const limit = Math.min(Number(req.query.limit) || 300, 1000);
    res.json({ events: await store.listAudit({ space, limit }) });
  });

  return r;
}
