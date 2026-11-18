"use server";
// Staff actions. Each one re-reads the session itself: a page having rendered proves nothing.
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { clearStaffCookie, requireStaff, safeNext, setStaffCookie } from "@/lib/staff-session";

export interface FormState {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
  /** Set after a save, so the editor carries on from the new version. */
  sha?: string;
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** The api tells docs/web to refresh too, but this web may be the one instance the editor is on. */
const refresh = () => {
  revalidateTag(api.DOCS_TAG, { expire: 0 });
  revalidatePath("/admin");
};

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const result = await api.staffLogin(s(fd, "email").trim(), s(fd, "password"));
  if (!result.ok) return { error: result.message };
  await setStaffCookie(result.token, result.expiresAt);
  redirect(safeNext(s(fd, "next"), "/admin"));
}

export async function signOut() {
  await clearStaffCookie();
  redirect("/admin/sign-in");
}

export async function savePage(_: FormState, fd: FormData): Promise<FormState> {
  const slug = s(fd, "slug");
  const { token } = await requireStaff(`/admin/edit/${slug}`);
  const result = await api.savePage(token, slug, { title: s(fd, "title"), description: s(fd, "description"), markdown: s(fd, "markdown"), sha: s(fd, "sha"), message: s(fd, "message") });
  if (!result.ok) {
    if (result.status === 409) return { error: "Someone else saved this page since you opened it. Copy your text somewhere safe, reload the page, and apply your change again." };
    return { error: result.message, fields: result.errors };
  }
  refresh();
  const fresh = await api.staffPage(token, slug);
  return { message: "Saved. It's live now.", sha: fresh.ok ? fresh.page.sha : undefined };
}

export async function createPage(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff("/admin/new");
  const slug = s(fd, "slug").trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  const title = s(fd, "title").trim();
  const result = await api.createPage(token, {
    slug, title, description: s(fd, "description").trim(),
    markdown: `Start writing here.\n\n## A first section\n\nUse \`##\` headings: they become the page's contents list.\n`,
    section: s(fd, "section") || undefined,
  });
  if (!result.ok) return { error: result.message, fields: result.errors };
  refresh();
  redirect(`/admin/edit/${slug}?created=1`);
}

export async function movePage(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  const from = s(fd, "from");
  const to = s(fd, "to").trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  const result = await api.movePage(token, from, to, s(fd, "sha"));
  if (!result.ok) return { error: result.message, fields: result.errors };
  refresh();
  redirect(`/admin/edit/${to}?moved=1`);
}

export async function deletePage(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff();
  if (s(fd, "confirm").trim() !== s(fd, "slug")) return { error: "Type the page's address exactly to confirm." };
  const result = await api.deletePage(token, s(fd, "slug"), s(fd, "sha"));
  if (!result.ok) return { error: result.message };
  refresh();
  redirect("/admin?deleted=1");
}

export async function saveSidebar(_: FormState, fd: FormData): Promise<FormState> {
  const { token } = await requireStaff("/admin/sidebar");
  let nav: api.RawNav;
  try {
    nav = JSON.parse(s(fd, "nav")) as api.RawNav;
  } catch {
    return { error: "The sidebar couldn't be read. Reload and try again." };
  }
  const sha = s(fd, "sha") || null;
  const result = await api.saveNav(token, nav, sha);
  if (!result.ok) {
    if (result.status === 409) return { error: "Someone else changed the sidebar since you opened it. Reload and apply your change again." };
    return { error: result.message, fields: result.errors };
  }
  refresh();
  const fresh = await api.staffNav(token);
  return { message: "Sidebar saved.", sha: fresh.ok ? (fresh.sha ?? undefined) : undefined };
}
