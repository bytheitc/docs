"use server";
// Server actions. Each one forwards to cms/api with the user's session; cms/api checks role and space access
// on every call, so nothing here is the guard (and nothing in the browser is either).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { authed, clearToken, enc, getToken, setToken } from "@/lib/session";
import type { Entry, User } from "@/lib/types";

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Turns an api error into form state; anything unexpected is rethrown. A 401 means the session ended,
 *  except while signing in (`signingIn`), where it means the credentials were wrong. */
function toState(e: unknown, signingIn = false): FormState {
  if (e instanceof ApiError) {
    if (e.status === 401 && !signingIn) redirect("/login");
    return { message: e.message, errors: e.fields };
  }
  throw e;
}

/** Where to send the user after a workflow action, with a one-line message. */
const back = (path: string, params: Record<string, string>) => `${path}?${new URLSearchParams(params).toString()}`;

/* ------------------------------------------------------------------ */
/* Sign-in                                                            */
/* ------------------------------------------------------------------ */

type AuthResult = { token: string; expiresAt: string; user: User };

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  let res: AuthResult;
  try {
    res = await api<AuthResult>("/v1/auth/login", { method: "POST", body: { email: s(fd, "email"), password: String(fd.get("password") ?? "") } });
  } catch (e) {
    return toState(e, true);
  }
  await setToken(res.token, res.expiresAt);
  redirect("/");
}

export async function setup(_: FormState, fd: FormData): Promise<FormState> {
  let res: AuthResult;
  try {
    res = await api<AuthResult>("/v1/auth/setup", {
      method: "POST",
      body: { token: s(fd, "token"), name: s(fd, "name"), email: s(fd, "email"), password: String(fd.get("password") ?? "") },
    });
  } catch (e) {
    return toState(e, true);
  }
  await setToken(res.token, res.expiresAt);
  redirect("/");
}

export async function logout() {
  const token = await getToken();
  if (token) await api("/v1/auth/logout", { method: "POST", token }).catch(() => {});
  await clearToken();
  redirect("/login");
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const res = await authed<AuthResult>("/v1/auth/password", { method: "POST", body: { current: String(fd.get("current") ?? ""), next: String(fd.get("next") ?? "") } });
    await setToken(res.token, res.expiresAt);
    return { ok: true, message: "Password changed. Other sessions were signed out." };
  } catch (e) {
    return toState(e);
  }
}

/* ------------------------------------------------------------------ */
/* Entries                                                            */
/* ------------------------------------------------------------------ */

const entriesPath = (space: string, collection: string) => `/v1/spaces/${enc(space)}/collections/${enc(collection)}/entries`;
const entryPage = (space: string, collection: string, id: string) => `/spaces/${enc(space)}/c/${enc(collection)}/${enc(id)}`;

/** Create or update an entry. intent: save (draft, or pending if live) | submit (for review) | publish. */
export async function saveEntry(_: FormState, fd: FormData): Promise<FormState> {
  const space = s(fd, "space"), collection = s(fd, "collection"), originalId = s(fd, "originalId");
  const intent = s(fd, "intent") || "save";
  let data: unknown;
  try { data = JSON.parse(String(fd.get("payload") ?? "{}")); } catch { return { message: "The form data could not be read." }; }

  let res: { entry: Entry; message: string; held?: boolean };
  try {
    res = originalId
      ? await authed(`${entriesPath(space, collection)}/${enc(originalId)}`, { method: "PUT", body: { data, intent } })
      : await authed(entriesPath(space, collection), { method: "POST", body: { data, intent } });
  } catch (e) {
    const st = toState(e);
    return st.errors ? { ...st, message: "Please fix the highlighted fields." } : st;
  }
  // Reload the entry page so the workflow bar, history and form all show the saved state.
  redirect(back(entryPage(space, collection, res.entry.id), { saved: res.held ? "held" : res.entry.status }));
}

/** Status changes from the workflow bar. */
export async function changeStatus(fd: FormData) {
  const space = s(fd, "space"), collection = s(fd, "collection"), id = s(fd, "id"), to = s(fd, "to");
  const page = entryPage(space, collection, id);
  let flash: Record<string, string> = { done: to };
  try {
    await authed(`${entriesPath(space, collection)}/${enc(id)}/status`, { method: "POST", body: { to } });
  } catch (e) {
    flash = { error: toState(e).message ?? "That didn't work." };
  }
  redirect(back(page, flash));
}

export async function deleteEntry(fd: FormData) {
  const space = s(fd, "space"), collection = s(fd, "collection"), id = s(fd, "id");
  try {
    await authed(`${entriesPath(space, collection)}/${enc(id)}`, { method: "DELETE", body: { confirm: s(fd, "confirm") } });
  } catch (e) {
    redirect(back(entryPage(space, collection, id), { error: toState(e).message ?? "That didn't work." }));
  }
  redirect(back(`/spaces/${enc(space)}/c/${enc(collection)}`, { deleted: "1" }));
}

export async function moveEntry(fd: FormData) {
  const space = s(fd, "space"), collection = s(fd, "collection"), id = s(fd, "id");
  const list = `/spaces/${enc(space)}/c/${enc(collection)}`;
  try {
    await authed(`${entriesPath(space, collection)}/${enc(id)}/move`, { method: "POST", body: { dir: s(fd, "dir") } });
  } catch (e) {
    redirect(back(list, { error: toState(e).message ?? "That didn't work." }));
  }
  revalidatePath(list);
}

/** Loads an old revision into the entry as a draft (or as pending changes, if live). */
export async function restoreRevision(fd: FormData) {
  const space = s(fd, "space"), collection = s(fd, "collection"), id = s(fd, "id");
  let flash: Record<string, string> = { done: "restore" };
  try {
    await authed(`${entriesPath(space, collection)}/${enc(id)}/restore`, { method: "POST", body: { at: s(fd, "at") } });
  } catch (e) {
    flash = { error: toState(e).message ?? "That didn't work." };
  }
  redirect(back(entryPage(space, collection, id), flash));
}

/* ------------------------------------------------------------------ */
/* Inbox                                                              */
/* ------------------------------------------------------------------ */

export async function updateSubmission(fd: FormData) {
  const space = s(fd, "space"), id = s(fd, "id");
  const page = `/spaces/${enc(space)}/inbox/${enc(id)}`;
  let flash: Record<string, string> = { saved: "1" };
  try {
    await authed(`/v1/spaces/${enc(space)}/inbox/${enc(id)}`, { method: "PATCH", body: { status: s(fd, "status"), note: s(fd, "note") } });
  } catch (e) {
    flash = { error: toState(e).message ?? "That didn't work." };
  }
  redirect(back(page, flash));
}

/* ------------------------------------------------------------------ */
/* Accounts (admins)                                                  */
/* ------------------------------------------------------------------ */

const readSpaces = (fd: FormData): "*" | string[] => (fd.get("allSpaces") ? "*" : fd.getAll("space").map(String));

export async function createUser(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user } = await authed<{ user: User }>("/v1/users", {
      method: "POST",
      body: { name: s(fd, "name"), email: s(fd, "email"), role: s(fd, "role"), spaces: readSpaces(fd), password: String(fd.get("password") ?? "") },
    });
    revalidatePath("/accounts");
    return { ok: true, message: `${user.name} can now sign in.` };
  } catch (e) {
    return toState(e);
  }
}

export async function updateUser(fd: FormData) {
  const id = s(fd, "id");
  let flash: Record<string, string> = { saved: s(fd, "name") || "1" };
  try {
    await authed(`/v1/users/${enc(id)}`, {
      method: "PATCH",
      body: { role: s(fd, "role"), disabled: s(fd, "disabled") === "true", spaces: readSpaces(fd) },
    });
  } catch (e) {
    flash = { error: toState(e).message ?? "That didn't work." };
  }
  redirect(back("/accounts", flash));
}
