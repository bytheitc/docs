import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { CmsClient, type StaffUser } from "../src/cms.js";
import { loadConfig } from "../src/config.js";
import { Docs, EditError, headingsOf, parsePage, serializePage, slugify } from "../src/pages.js";
import { blobSha, ConflictError, FsSource, GithubSource } from "../src/source.js";

const author = { name: "Aisha", email: "aisha@example.org" };

async function folder(files: Record<string, string>) {
  const dir = await mkdtemp(path.join(tmpdir(), "itc-docs-"));
  for (const [p, c] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, p)), { recursive: true });
    await writeFile(path.join(dir, p), c);
  }
  return dir;
}

const NAV = JSON.stringify({ sections: [{ title: "Start here", pages: ["index", "contributing"] }, { title: "Products", pages: ["products/hifz"] }] });
const page = (title: string, body = "Some words.") => serializePage({ title, description: `About ${title}.`, markdown: body });

/* ---------------- the page format ---------------- */

test("a page's header and body survive a round trip, including a colon in the title", () => {
  const raw = serializePage({ title: "Zakat: the basics", description: "What counts", markdown: "## One\n\nText\n" });
  const p = parsePage("zakat", raw);
  assert.equal(p.title, "Zakat: the basics");
  assert.equal(p.description, "What counts");
  assert.equal(p.markdown, "## One\n\nText\n");
});

test("a page with no header takes its title from its first heading", () => {
  assert.equal(parsePage("x", "# Hello there\n\nBody").title, "Hello there");
});

test("headings get stable, unique ids and ignore code blocks", () => {
  const h = headingsOf("## Setup\n\n```sh\n## not a heading\n```\n\n### Setup\n\n## Sign in with ITC");
  assert.deepEqual(h.map((x) => x.id), ["setup", "setup-1", "sign-in-with-itc"]);
  assert.equal(slugify("Zakat on gold & silver"), "zakat-on-gold-silver");
});

/* ---------------- the docs model on local files ---------------- */

test("the sidebar lists existing pages in order, and prev/next follow it", async () => {
  const dir = await folder({ "nav.json": NAV, "index.md": page("Welcome"), "contributing.md": page("Contributing"), "products/hifz.md": page("Hifz Trail"), "draft.md": page("Draft") });
  const docs = new Docs(new FsSource(dir, true), 0);
  const nav = await docs.nav();
  assert.deepEqual(nav.sections.map((s) => s.pages.map((p) => p.slug)), [["index", "contributing"], ["products/hifz"]]);
  const c = await docs.page("contributing");
  assert.equal(c?.prev?.slug, "index");
  assert.equal(c?.next?.slug, "products/hifz");
  const d = await docs.page("draft");
  assert.equal(d?.page.section, null, "an unlisted page still has its address");
});

test("saving with a stale version is refused instead of overwriting someone else's edit", async () => {
  const dir = await folder({ "nav.json": NAV, "index.md": page("Welcome") });
  const docs = new Docs(new FsSource(dir, true), 0);
  const { page: p } = (await docs.page("index"))!;
  await docs.save("index", { title: "Welcome", description: "", markdown: "First edit.", sha: p.sha }, author);
  await assert.rejects(docs.save("index", { title: "Welcome", description: "", markdown: "Second edit.", sha: p.sha }, author), ConflictError);
  assert.match(await readFile(path.join(dir, "index.md"), "utf8"), /First edit\./);
});

test("creating a page lists it in the chosen section; moving and deleting keep the sidebar right", async () => {
  const dir = await folder({ "nav.json": NAV, "index.md": page("Welcome"), "contributing.md": page("Contributing") });
  const docs = new Docs(new FsSource(dir, true), 0);
  await docs.create({ slug: "products/zakat", title: "Zakat Kit", description: "", markdown: "Hello", section: "Products" }, author);
  assert.deepEqual((await docs.rawNav()).nav.sections[1].pages, ["products/hifz", "products/zakat"]);
  await assert.rejects(docs.create({ slug: "products/zakat", title: "Again", description: "", markdown: "" }, author), (e: unknown) => e instanceof EditError && e.status === 409);
  await assert.rejects(docs.create({ slug: "Bad Slug", title: "x", description: "", markdown: "" }, author), (e: unknown) => e instanceof EditError && e.status === 400);

  const z = (await docs.page("products/zakat"))!.page;
  await docs.move("products/zakat", "products/zakat-kit", z.sha, author);
  assert.equal(await docs.page("products/zakat"), null);
  assert.ok((await docs.rawNav()).nav.sections[1].pages.includes("products/zakat-kit"));

  const c = (await docs.page("contributing"))!.page;
  await docs.remove("contributing", c.sha, author);
  assert.deepEqual((await docs.rawNav()).nav.sections[0].pages, ["index"]);
  await assert.rejects(docs.remove("index", (await docs.page("index"))!.page.sha, author), (e: unknown) => e instanceof EditError && e.status === 400);
});

test("the sidebar can't point at a page that doesn't exist", async () => {
  const dir = await folder({ "nav.json": NAV, "index.md": page("Welcome") });
  const docs = new Docs(new FsSource(dir, true), 0);
  const { sha } = await docs.rawNav();
  await assert.rejects(docs.saveNav({ sections: [{ title: "Start", pages: ["index", "missing"] }] }, sha, author), (e: unknown) => e instanceof EditError && Boolean(e.fields));
});

test("a read-only source refuses edits with a clear reason", async () => {
  const dir = await folder({ "index.md": page("Welcome") });
  const docs = new Docs(new FsSource(dir, false), 0);
  const p = (await docs.page("index"))!.page;
  await assert.rejects(docs.save("index", { title: "W", description: "", markdown: "x", sha: p.sha }, author), (e: unknown) => e instanceof EditError && e.status === 503);
});

/* ---------------- GitHub ---------------- */

test("a GitHub save is one commit authored by the staff member, on top of the current head", async () => {
  const content = page("Welcome");
  const sha = blobSha(content);
  const calls: { method: string; url: string; body?: Record<string, unknown> }[] = [];
  const fake = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });
    const u = String(url).replace("https://api.github.com/repos/bytheitc/docs", "");
    const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
    if (u === "/git/ref/heads/main") return json({ object: { sha: "c1" } });
    if (u === "/git/commits/c1") return json({ tree: { sha: "t1" } });
    if (u.startsWith("/git/trees/t1")) return json({ tree: [{ path: "content/index.md", type: "blob", sha }, { path: "README.md", type: "blob", sha: "zz" }] });
    if (u === `/git/blobs/${sha}`) return json({ content: Buffer.from(content).toString("base64"), encoding: "base64" });
    if (u === "/git/trees" && method === "POST") return json({ sha: "t2" }, 201);
    if (u === "/git/commits" && method === "POST") return json({ sha: "c2" }, 201);
    if (u === "/git/refs/heads/main" && method === "PATCH") return json({ object: { sha: "c2" } });
    return json({ message: "unexpected" }, 500);
  }) as typeof fetch;
  const docs = new Docs(new GithubSource({ repo: "bytheitc/docs", branch: "main", dir: "content", token: "t", fetchImpl: fake }), 60_000);
  const before = (await docs.all()).map((p) => p.slug);
  assert.deepEqual(before, ["index"], "only the content folder is read");
  const { revision } = await docs.save("index", { title: "Welcome", description: "", markdown: "New text", sha }, author);
  assert.equal(revision, "c2");
  const commit = calls.find((c) => c.url.endsWith("/git/commits") && c.method === "POST")!;
  assert.deepEqual(commit.body?.parents, ["c1"]);
  assert.equal((commit.body?.author as { email: string }).email, "aisha@example.org");
  const ref = calls.find((c) => c.method === "PATCH")!;
  assert.equal(ref.body?.force, false, "never forced: a moved branch is a conflict, not an overwrite");
});

/* ---------------- over HTTP ---------------- */

class FakeCms extends CmsClient {
  constructor(private readonly users: Record<string, StaffUser>) {
    super(loadConfig({ NODE_ENV: "test" } as NodeJS.ProcessEnv));
  }
  override async introspect(token: string) {
    return this.users[token] ?? null;
  }
}

async function serve(dir: string) {
  const config = loadConfig({ NODE_ENV: "test", API_LOG: "off", REGISTER_SCHEMA: "off", DOCS_CONTENT_DIR: dir } as NodeJS.ProcessEnv);
  const cms = new FakeCms({
    ed: { id: "1", email: "ed@example.org", name: "Ed", role: "editor" },
    pub: { id: "2", email: "pub@example.org", name: "Pub", role: "publisher" },
  });
  const docs = new Docs(new FsSource(dir, true), 0);
  const server = createApp({ config, cms, docs }).listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (method: string, p: string, token?: string, body?: unknown) => {
    const res = await fetch(base + p, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: (await res.json()) as Record<string, any> };
  };
  return { call, close: () => server.close() };
}

test("readers get pages and search; editors save; only publishers delete", async () => {
  const dir = await folder({ "nav.json": NAV, "index.md": page("Welcome", "## Start\n\nHello"), "contributing.md": page("Contributing") });
  const s = await serve(dir);
  try {
    assert.equal((await s.call("GET", "/nav")).body.sections.length, 1);
    const home = await s.call("GET", "/pages/index");
    assert.equal(home.body.page.title, "Welcome");
    assert.equal(home.body.headings[0].id, "start");
    assert.equal((await s.call("GET", "/pages/nope")).status, 404);
    assert.ok((await s.call("GET", "/search-index")).body.entries.some((e: { slug: string }) => e.slug === "contributing"));

    assert.equal((await s.call("GET", "/staff/pages")).status, 401);
    const { page: p } = (await s.call("GET", "/staff/pages/contributing", "ed")).body;
    const saved = await s.call("PUT", "/staff/pages/contributing", "ed", { title: "Contributing", description: "", markdown: "Updated", sha: p.sha });
    assert.equal(saved.status, 200);
    const stale = await s.call("PUT", "/staff/pages/contributing", "ed", { title: "Contributing", description: "", markdown: "Again", sha: p.sha });
    assert.equal(stale.status, 409);

    const fresh = (await s.call("GET", "/staff/pages/contributing", "ed")).body.page;
    assert.equal((await s.call("DELETE", `/staff/pages/contributing?sha=${fresh.sha}`, "ed")).status, 403);
    assert.equal((await s.call("DELETE", `/staff/pages/contributing?sha=${fresh.sha}`, "pub")).status, 200);
    assert.equal((await s.call("GET", "/pages/contributing")).status, 404);
  } finally {
    s.close();
  }
});
