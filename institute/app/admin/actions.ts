"use server";
// Server actions for the native admin. Identical in every app.
// Every action re-checks the signed-in user and their role; the UI hiding a button is never the guard.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MIN_PASSWORD, can, currentUser, endSession, hashPassword, newId, requireUser, setupTokenRequired,
  setupTokenValid, startSession, verifyPassword,
} from "@/lib/cms/auth";
import { findCollection } from "@/lib/cms/collections";
import { ensureSeeded } from "@/lib/cms/content";
import { requireStorage } from "@/lib/cms/storage";
import {
  DuplicateIdError, ROLES, SUBMISSION_STATUSES, type Entry, type Role, type Status, type SubmissionStatus, type User,
} from "@/lib/cms/types";
import { validateEntry, type Errors } from "@/lib/cms/validate";

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Errors;
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function audit(actor: User | null, action: string, target?: string, detail?: string) {
  await requireStorage().addAudit({ at: new Date(), actor: actor?.email ?? null, action, target, detail });
}

/** Public pages read published content; refresh them all after any content change. */
const refreshSite = () => revalidatePath("/", "layout");

/* ------------------------------------------------------------------ */
/* Sign-in                                                            */
/* ------------------------------------------------------------------ */

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = s(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const store = requireStorage();
  const user = await store.getUserByEmail(email);
  // Same message and similar work whether or not the account exists.
  const ok = user && !user.disabled ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
  if (!ok || !user) {
    await audit(null, "login.failed", email);
    return { message: "That email and password don't match an active account." };
  }
  await startSession(user.id);
  await audit(user, "login");
  redirect("/admin");
}

export async function logout() {
  const user = await currentUser().catch(() => null);
  await endSession();
  if (user) await audit(user, "logout");
  redirect("/admin/login");
}

/** Creates the first admin account. Only works while there are no users at all. */
export async function setup(_: FormState, fd: FormData): Promise<FormState> {
  const store = requireStorage();
  if ((await store.countUsers()) > 0) return { message: "Setup is already complete. Sign in instead." };
  if (setupTokenRequired() && !setupTokenValid(s(fd, "token"))) return { message: "The setup token is not correct." };
  const name = s(fd, "name"), email = s(fd, "email").toLowerCase(), password = String(fd.get("password") ?? "");
  const errors: Errors = {};
  if (!name) errors.name = "Your name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (Object.keys(errors).length) return { errors };
  const user: User = { id: newId(), email, name, role: "admin", passwordHash: await hashPassword(password), createdAt: new Date() };
  await store.createUser(user);
  await startSession(user.id);
  await audit(user, "setup.first-admin");
  redirect("/admin");
}

/* ------------------------------------------------------------------ */
/* Entries                                                            */
/* ------------------------------------------------------------------ */

type Intent = "save" | "submit" | "publish";

/**
 * Create or update an entry.
 *   save    keep as draft (or hold as pending changes if the entry is live)
 *   submit  ask a publisher to review
 *   publish make it live (publishers only)
 */
export async function saveEntry(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("editor");
  const def = findCollection(s(fd, "collection"));
  if (!def) return { message: "Unknown content type." };
  const originalId = s(fd, "originalId") || null;
  const intent = (s(fd, "intent") || "save") as Intent;
  if (intent === "publish" && !can(user, "publisher")) return { message: "Only publishers can publish." };

  let raw: unknown;
  try { raw = JSON.parse(String(fd.get("payload") ?? "{}")); } catch { return { message: "The form data could not be read." }; }
  const { data, id, errors } = validateEntry(def, raw);
  if (Object.keys(errors).length) return { errors, message: "Please fix the highlighted fields." };

  const store = requireStorage();
  await ensureSeeded(def);
  const now = new Date();

  try {
    if (!originalId) {
      if (def.singleton && (await store.countEntries(def.name)) > 0) return { message: `${def.singular} already exists.` };
      const status: Status = intent === "publish" ? "published" : intent === "submit" ? "review" : "draft";
      const entry: Entry = {
        collection: def.name, id, status, position: (await store.maxPosition(def.name)) + 1, data,
        createdAt: now, updatedAt: now, updatedBy: user.email, pending: null,
      };
      await store.createEntry(entry);
      await store.addRevision({ collection: def.name, entryId: id, status, data, author: user.email, at: now, note: "created" });
      await audit(user, `entry.create.${status}`, `${def.name}/${id}`);
      if (status === "published") refreshSite();
      redirect(`/admin/c/${def.name}/${id}?saved=1`);
    }

    const existing = await store.getEntry(def.name, originalId);
    if (!existing) return { message: "This entry no longer exists." };
    const renaming = id !== originalId;

    if (existing.status === "published" && !(intent === "publish")) {
      // Live entry: hold the edit as pending changes. The public site keeps showing the published version.
      if (renaming) return { errors: { [def.idField]: "A live entry's id can only be changed by a publisher, when publishing." } };
      await store.updateEntry(def.name, originalId, { pending: { data, by: user.email, at: now }, updatedBy: user.email });
      await store.addRevision({ collection: def.name, entryId: id, status: "review", data, author: user.email, at: now, note: intent === "submit" ? "changes submitted for review" : "changes saved as pending" });
      await audit(user, "entry.pending", `${def.name}/${id}`);
      return { ok: true, message: "Saved. The live version is unchanged until a publisher publishes these changes." };
    }

    const status: Status = intent === "publish" ? "published" : intent === "submit" ? "review" : existing.status === "review" ? "review" : "draft";
    await store.updateEntry(def.name, originalId, { data, status, pending: null, updatedBy: user.email, newId: renaming ? id : undefined });
    await store.addRevision({ collection: def.name, entryId: id, status, data, author: user.email, at: now, note: intent });
    await audit(user, `entry.${intent}`, `${def.name}/${id}`, renaming ? `renamed from ${originalId}` : undefined);
    if (status === "published" || existing.status === "published") refreshSite();
    if (renaming) redirect(`/admin/c/${def.name}/${id}?saved=1`);
    return { ok: true, message: status === "published" ? "Published." : status === "review" ? "Saved and waiting for review." : "Draft saved." };
  } catch (e) {
    if (e instanceof DuplicateIdError) return { errors: { [def.idField]: "That id is already used by another entry." } };
    throw e;
  }
}

async function loadEntry(collection: string, id: string) {
  const def = findCollection(collection);
  if (!def) throw new Error("Unknown content type.");
  const entry = await requireStorage().getEntry(def.name, id);
  if (!entry) throw new Error("Entry not found.");
  return { def, entry };
}

/** Status changes from the entry page's workflow bar. */
export async function changeStatus(fd: FormData) {
  const user = await requireUser("editor");
  const { def, entry } = await loadEntry(s(fd, "collection"), s(fd, "id"));
  const to = s(fd, "to") as Status | "publish-pending" | "discard-pending";
  const store = requireStorage();
  const now = new Date();

  if (to === "review") {
    if (entry.status === "published") throw new Error("Use “Submit changes” on a live entry.");
    await store.updateEntry(def.name, entry.id, { status: "review", updatedBy: user.email });
  } else {
    if (!can(user, "publisher")) throw new Error("Only publishers can do that.");
    if (to === "publish-pending") {
      if (!entry.pending) throw new Error("There are no pending changes.");
      await store.updateEntry(def.name, entry.id, { data: entry.pending.data, pending: null, status: "published", updatedBy: user.email });
      await store.addRevision({ collection: def.name, entryId: entry.id, status: "published", data: entry.pending.data, author: user.email, at: now, note: "pending changes published" });
    } else if (to === "discard-pending") {
      await store.updateEntry(def.name, entry.id, { pending: null, updatedBy: user.email });
    } else if (to === "published" || to === "draft" || to === "archived") {
      await store.updateEntry(def.name, entry.id, { status: to, updatedBy: user.email });
      await store.addRevision({ collection: def.name, entryId: entry.id, status: to, data: entry.data, author: user.email, at: now, note: `status → ${to}` });
    } else {
      throw new Error("Unknown status.");
    }
    refreshSite();
  }
  await audit(user, `entry.status.${to}`, `${def.name}/${entry.id}`);
  revalidatePath(`/admin/c/${def.name}/${entry.id}`);
}

export async function deleteEntry(fd: FormData) {
  const user = await requireUser("publisher");
  const { def, entry } = await loadEntry(s(fd, "collection"), s(fd, "id"));
  if (s(fd, "confirm") !== entry.id) throw new Error("Type the entry's id to confirm deletion.");
  await requireStorage().deleteEntry(def.name, entry.id);
  await audit(user, "entry.delete", `${def.name}/${entry.id}`);
  refreshSite();
  redirect(`/admin/c/${def.name}?deleted=1`);
}

/** Moves an entry one place up or down in its collection's public order. */
export async function moveEntry(fd: FormData) {
  const user = await requireUser("publisher");
  const def = findCollection(s(fd, "collection"));
  if (!def) throw new Error("Unknown content type.");
  const store = requireStorage();
  const list = await store.listEntries(def.name);
  const i = list.findIndex((e) => e.id === s(fd, "id"));
  const j = s(fd, "dir") === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  // Re-number the whole list so positions stay dense even after deletions.
  const ordered = [...list];
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  await Promise.all(ordered.map((e, k) => (e.position === k ? null : store.updateEntry(def.name, e.id, { position: k }))));
  await audit(user, "entry.move", `${def.name}/${list[i].id}`, s(fd, "dir"));
  refreshSite();
  revalidatePath(`/admin/c/${def.name}`);
}

/** Loads an old revision into the entry as a draft (or as pending changes, if live). */
export async function restoreRevision(fd: FormData) {
  const user = await requireUser("editor");
  const { def, entry } = await loadEntry(s(fd, "collection"), s(fd, "id"));
  const at = new Date(s(fd, "at"));
  const rev = (await requireStorage().listRevisions(def.name, entry.id, 100)).find((r) => r.at.getTime() === at.getTime());
  if (!rev) throw new Error("Revision not found.");
  const store = requireStorage();
  if (entry.status === "published") {
    await store.updateEntry(def.name, entry.id, { pending: { data: rev.data, by: user.email, at: new Date() }, updatedBy: user.email });
  } else {
    await store.updateEntry(def.name, entry.id, { data: rev.data, updatedBy: user.email });
  }
  await store.addRevision({ collection: def.name, entryId: entry.id, status: entry.status, data: rev.data, author: user.email, at: new Date(), note: `restored from ${rev.at.toISOString()}` });
  await audit(user, "entry.restore", `${def.name}/${entry.id}`, rev.at.toISOString());
  revalidatePath(`/admin/c/${def.name}/${entry.id}`);
}

/* ------------------------------------------------------------------ */
/* Inbox                                                              */
/* ------------------------------------------------------------------ */

export async function updateSubmission(fd: FormData) {
  const user = await requireUser("editor");
  const id = s(fd, "id");
  const status = s(fd, "status") as SubmissionStatus;
  if (!SUBMISSION_STATUSES.includes(status)) throw new Error("Unknown status.");
  await requireStorage().updateSubmission(id, { status, note: s(fd, "note") || undefined });
  await audit(user, `inbox.${status}`, id);
  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/inbox/${id}`);
}

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */

export async function createUser(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireUser("admin");
  const name = s(fd, "name"), email = s(fd, "email").toLowerCase(), role = s(fd, "role") as Role;
  const password = String(fd.get("password") ?? "");
  const errors: Errors = {};
  if (!name) errors.name = "Name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (!ROLES.includes(role)) errors.role = "Choose a role.";
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters. Share it privately; they can change it after signing in.`;
  const store = requireStorage();
  if (!errors.email && (await store.getUserByEmail(email))) errors.email = "Someone already has that email.";
  if (Object.keys(errors).length) return { errors };
  await store.createUser({ id: newId(), email, name, role, passwordHash: await hashPassword(password), createdAt: new Date() });
  await audit(admin, "user.create", email, role);
  revalidatePath("/admin/users");
  return { ok: true, message: `${name} can now sign in.` };
}

export async function updateUser(fd: FormData) {
  const admin = await requireUser("admin");
  const id = s(fd, "id");
  const store = requireStorage();
  const target = await store.getUserById(id);
  if (!target) throw new Error("User not found.");
  const role = s(fd, "role") as Role;
  const disabled = s(fd, "disabled") === "true";
  if (target.id === admin.id && (role !== "admin" || disabled)) throw new Error("You can't remove your own admin access.");
  if (!ROLES.includes(role)) throw new Error("Unknown role.");
  await store.updateUser(id, { role, disabled });
  if (disabled) await store.deleteUserSessions(id);
  await audit(admin, "user.update", target.email, `${role}${disabled ? ", disabled" : ""}`);
  revalidatePath("/admin/users");
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("editor");
  const current = String(fd.get("current") ?? ""), next = String(fd.get("next") ?? "");
  if (!(await verifyPassword(current, user.passwordHash))) return { errors: { current: "Your current password is not correct." } };
  if (next.length < MIN_PASSWORD) return { errors: { next: `Use at least ${MIN_PASSWORD} characters.` } };
  const store = requireStorage();
  await store.updateUser(user.id, { passwordHash: await hashPassword(next) });
  await store.deleteUserSessions(user.id); // sign out everywhere else…
  await startSession(user.id); // …but keep this browser signed in
  await audit(user, "user.password");
  return { ok: true, message: "Password changed. Other sessions were signed out." };
}
