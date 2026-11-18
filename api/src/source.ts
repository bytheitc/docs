// Where the pages live. Two implementations behind one interface:
//
//   github  the bytheitc/docs repository. Reads the tree and blobs; every edit is one commit, made
//           through the git data api so a rename or a page plus the sidebar change land together.
//   fs      the content/ folder beside this api. For development, and read-only in production.
//
// Both identify a file's version the way git does, by its blob sha, so "someone else changed this
// page since you opened it" is the same check whichever source is in use.
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface FileVersion {
  content: string;
  sha: string;
}

/** A change to one file: new content, or null to delete it. */
export interface Change {
  path: string;
  content: string | null;
  /** The sha the editor started from; null when the file must not exist yet. */
  expectedSha: string | null;
}

export interface Author {
  name: string;
  email: string;
}

export interface Revision {
  sha: string;
  message: string;
  author: string;
  date: string;
  url?: string;
}

export class ConflictError extends Error {
  constructor(public readonly path: string, message = `${path} was changed by someone else since you opened it.`) {
    super(message);
  }
}

export interface DocsSource {
  readonly kind: "github" | "fs";
  readonly writable: boolean;
  /** A short description for /health and the editor, e.g. "bytheitc/docs@main/content". */
  readonly where: string;
  /** Every .md and .json file under the content folder, keyed by path relative to it. */
  snapshot(): Promise<Map<string, FileVersion>>;
  /** Applies all the changes as one commit, or none of them. Throws ConflictError on a stale sha. */
  commit(changes: Change[], message: string, author: Author): Promise<{ revision: string }>;
  /** The commits that touched one file, newest first. */
  history(file: string, limit?: number): Promise<Revision[]>;
}

/** The sha git gives a blob with this content. */
export const blobSha = (content: string): string => {
  const buf = Buffer.from(content, "utf8");
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
};

const wanted = (p: string) => /\.(md|json)$/.test(p) && !p.split("/").some((part) => part.startsWith("."));

/* ------------------------------------------------------------------ */
/* Local files                                                        */
/* ------------------------------------------------------------------ */

export class FsSource implements DocsSource {
  readonly kind = "fs" as const;
  constructor(private readonly dir: string, readonly writable: boolean) {}

  get where() {
    return this.dir;
  }

  async snapshot(): Promise<Map<string, FileVersion>> {
    const out = new Map<string, FileVersion>();
    const walk = async (rel: string): Promise<void> => {
      let entries: import("node:fs").Dirent[];
      try {
        entries = await fs.readdir(path.join(this.dir, rel), { withFileTypes: true });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
        throw e;
      }
      for (const e of entries) {
        const p = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(p);
        else if (wanted(p)) {
          const content = await fs.readFile(path.join(this.dir, p), "utf8");
          out.set(p, { content, sha: blobSha(content) });
        }
      }
    };
    await walk("");
    return out;
  }

  async commit(changes: Change[], _message: string, _author: Author): Promise<{ revision: string }> {
    if (!this.writable) throw new Error("This docs source is read-only.");
    const now = await this.snapshot();
    for (const c of changes) {
      if ((now.get(c.path)?.sha ?? null) !== c.expectedSha) throw new ConflictError(c.path);
    }
    for (const c of changes) {
      const file = path.join(this.dir, c.path);
      if (!file.startsWith(this.dir + path.sep)) throw new Error("Path outside the content folder.");
      if (c.content === null) await fs.rm(file, { force: true });
      else {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, c.content, "utf8");
      }
    }
    return { revision: `local-${Date.now()}` };
  }

  async history(): Promise<Revision[]> {
    return []; // Local files have no history of their own; the repository does.
  }
}

/* ------------------------------------------------------------------ */
/* GitHub                                                             */
/* ------------------------------------------------------------------ */

interface GithubOpts {
  repo: string;
  branch: string;
  dir: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export class GithubSource implements DocsSource {
  readonly kind = "github" as const;
  readonly writable: boolean;
  private readonly fetchImpl: typeof fetch;
  /** Blob contents by sha. A blob never changes, so this only grows by what was edited. */
  private readonly blobs = new Map<string, string>();

  constructor(private readonly opts: GithubOpts) {
    this.writable = Boolean(opts.token);
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  get where() {
    return `${this.opts.repo}@${this.opts.branch}/${this.opts.dir}`;
  }

  private full(p: string) {
    return this.opts.dir ? `${this.opts.dir}/${p}` : p;
  }

  private async gh<T>(method: string, apiPath: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await this.fetchImpl(`https://api.github.com/repos/${this.opts.repo}${apiPath}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "itc-docs",
        ...(this.opts.token ? { authorization: `Bearer ${this.opts.token}` } : {}),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    const data = (text ? JSON.parse(text) : {}) as T;
    return { status: res.status, data };
  }

  private async ok<T>(method: string, apiPath: string, body?: unknown): Promise<T> {
    const { status, data } = await this.gh<T & { message?: string }>(method, apiPath, body);
    if (status >= 400) throw new Error(`GitHub ${method} ${apiPath.split("?")[0]} answered HTTP ${status}: ${(data as { message?: string }).message ?? ""}`);
    return data;
  }

  private async headCommit(): Promise<{ commit: string; tree: string }> {
    const ref = await this.ok<{ object: { sha: string } }>("GET", `/git/ref/heads/${encodeURIComponent(this.opts.branch)}`);
    const c = await this.ok<{ tree: { sha: string } }>("GET", `/git/commits/${ref.object.sha}`);
    return { commit: ref.object.sha, tree: c.tree.sha };
  }

  async snapshot(): Promise<Map<string, FileVersion>> {
    const { tree } = await this.headCommit();
    const t = await this.ok<{ tree: { path: string; type: string; sha: string }[]; truncated?: boolean }>("GET", `/git/trees/${tree}?recursive=1`);
    const prefix = this.opts.dir ? `${this.opts.dir}/` : "";
    const files = t.tree.filter((e) => e.type === "blob" && e.path.startsWith(prefix) && wanted(e.path.slice(prefix.length)));
    const out = new Map<string, FileVersion>();
    await Promise.all(files.map(async (e) => {
      let content = this.blobs.get(e.sha);
      if (content === undefined) {
        const b = await this.ok<{ content: string; encoding: string }>("GET", `/git/blobs/${e.sha}`);
        content = Buffer.from(b.content, b.encoding === "base64" ? "base64" : "utf8").toString("utf8");
        this.blobs.set(e.sha, content);
      }
      out.set(e.path.slice(prefix.length), { content, sha: e.sha });
    }));
    return out;
  }

  async commit(changes: Change[], message: string, author: Author): Promise<{ revision: string }> {
    if (!this.writable) throw new Error("No DOCS_GITHUB_TOKEN: the docs are read-only.");
    const head = await this.headCommit();
    const current = await this.snapshot();
    for (const c of changes) {
      if ((current.get(c.path)?.sha ?? null) !== c.expectedSha) throw new ConflictError(c.path);
    }
    const tree = await this.ok<{ sha: string }>("POST", "/git/trees", {
      base_tree: head.tree,
      tree: changes.map((c) => c.content === null
        ? { path: this.full(c.path), mode: "100644", type: "blob", sha: null }
        : { path: this.full(c.path), mode: "100644", type: "blob", content: c.content }),
    });
    const date = new Date().toISOString();
    const commit = await this.ok<{ sha: string }>("POST", "/git/commits", {
      message,
      tree: tree.sha,
      parents: [head.commit],
      // The staff member is the author; the token's owner is the committer.
      author: { name: author.name, email: author.email, date },
    });
    // Not forced: if the branch moved since head was read, this fails rather than discarding that work.
    const { status, data } = await this.gh<{ message?: string }>("PATCH", `/git/refs/heads/${encodeURIComponent(this.opts.branch)}`, { sha: commit.sha, force: false });
    if (status === 422 || status === 409) throw new ConflictError(changes[0]?.path ?? "", "The docs changed while saving. Reload and try again.");
    if (status >= 400) throw new Error(`GitHub refused the update (HTTP ${status}: ${data.message ?? ""}).`);
    for (const c of changes) if (c.content !== null) this.blobs.set(blobSha(c.content), c.content);
    return { revision: commit.sha };
  }

  async history(file: string, limit = 20): Promise<Revision[]> {
    const list = await this.ok<{ sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } }[]>(
      "GET", `/commits?sha=${encodeURIComponent(this.opts.branch)}&path=${encodeURIComponent(this.full(file))}&per_page=${limit}`,
    );
    return list.map((c) => ({ sha: c.sha, message: c.commit.message.split("\n")[0], author: c.commit.author.name, date: c.commit.author.date, url: c.html_url }));
  }
}
