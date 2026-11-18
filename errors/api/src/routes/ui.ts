// The staff pages. Signed in with a CMS account that has the "errors" space; the session is the CMS
// token in an httpOnly cookie, checked against the CMS (cached a minute) on every page.
//
//   GET  /login  POST /login  POST /logout
//   GET  /                      issues, filtered by project, status and text
//   GET  /issues/:id            one issue: counts, 30-day chart, latest (or ?event=) stack trace
//   POST /issues/:id/status     resolve, ignore, reopen
//   GET  /projects              every project and its DSN
//   POST /projects              create one (admins)
//
// Forms are protected by SameSite=Lax cookies plus an Origin check on every POST.
import { randomBytes, randomInt } from "node:crypto";
import express, { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import type { Ctx } from "../app.js";
import type { StaffUser } from "../cms.js";
import { ago, bars, esc, fmtCount, layout } from "../page.js";
import { getStore } from "../store/index.js";
import type { IssueStatus, Project } from "../store/types.js";

declare module "express-serve-static-core" {
  interface Request {
    staff?: StaffUser;
  }
}

const COOKIE = "errors_session";
const STATUSES: (IssueStatus | "all")[] = ["unresolved", "resolved", "ignored", "all"];

function cookie(req: Request, name: string): string | undefined {
  for (const part of (req.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

const html: RequestHandler = (_req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
};

export function uiRoutes(ctx: Ctx): Router {
  const r = Router();
  const { cms, config } = ctx;
  const selfOrigin = new URL(config.publicUrl).origin;
  const form = express.urlencoded({ extended: false, limit: "16kb" });

  const sameOrigin: RequestHandler = (req, res, next) => {
    const origin = req.get("origin");
    if (origin && origin !== selfOrigin && origin !== `${req.protocol}://${req.get("host")}`) return void res.status(403).send("Cross-site form posts are not accepted.");
    next();
  };

  const signedIn: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    const user = await cms.introspect(cookie(req, COOKIE) ?? "");
    if (!user) return res.redirect(303, `/login?next=${encodeURIComponent(req.originalUrl)}`);
    req.staff = user;
    next();
  };

  const page = (res: Response, title: string, body: string, user?: StaffUser | null, status = 200) =>
    res.status(status).type("html").send(layout({ title, user, body }));

  const noStore = (res: Response) => {
    if (!getStore()) return res.status(503).type("html").send(layout({ title: "Unavailable", body: `<div class="notice err">The error tracker has no database. Set MONGODB_URI.</div>` })), true;
    return false;
  };

  r.use(["/", "/login", "/logout", "/issues", "/projects"], html);

  /* ---------- session ---------- */

  r.get("/login", (req, res) => {
    const next = typeof req.query.next === "string" && req.query.next.startsWith("/") && !req.query.next.startsWith("//") ? req.query.next : "/";
    const err = typeof req.query.error === "string" ? req.query.error : "";
    page(res, "Sign in", `<div style="max-width:360px;margin:8vh auto 0">
<h1>Sign in</h1><p class="mute">Use your CMS account. You need access to the Errors space.</p>
${err ? `<div class="notice err">${esc(err)}</div>` : ""}
<form method="post" action="/login" class="card" style="display:grid;gap:10px">
<input type="hidden" name="next" value="${esc(next)}">
<label for="email">Email</label><input id="email" type="email" name="email" autocomplete="username" required>
<label for="password">Password</label><input id="password" type="password" name="password" autocomplete="current-password" required>
<button class="primary" type="submit">Sign in</button></form></div>`);
  });

  r.post("/login", sameOrigin, form, async (req, res) => {
    const b = (req.body ?? {}) as Record<string, string>;
    const next = typeof b.next === "string" && b.next.startsWith("/") && !b.next.startsWith("//") ? b.next : "/";
    const back = (msg: string) => res.redirect(303, `/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(msg)}`);
    if (!b.email || !b.password) return back("Enter your email and password.");
    const result = await cms.login(String(b.email).slice(0, 200), String(b.password).slice(0, 200));
    if ("error" in result) return back(result.error);
    const user = await cms.introspect(result.token);
    if (!user) return back("That account doesn't have access to the Errors space.");
    const maxAge = Math.max(60, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000));
    res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(result.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.production ? "; Secure" : ""}`);
    res.redirect(303, next);
  });

  r.post("/logout", sameOrigin, (req, res) => {
    const token = cookie(req, COOKIE);
    if (token) cms.forget(token);
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.production ? "; Secure" : ""}`);
    res.redirect(303, "/login");
  });

  /* ---------- issues ---------- */

  r.get("/", signedIn, async (req, res) => {
    if (noStore(res)) return;
    const store = getStore()!;
    const projects = await store.listProjects();
    const status = STATUSES.includes(req.query.status as IssueStatus) ? (req.query.status as IssueStatus | "all") : "unresolved";
    const project = typeof req.query.project === "string" ? projects.find((p) => p.slug === req.query.project) : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    const issues = await store.listIssues({ status, projectId: project?.id, search: q || undefined, limit: 200 });
    const byId = new Map(projects.map((p) => [p.id, p]));
    const link = (o: { status?: string; project?: string }) => {
      const sp = new URLSearchParams();
      const s = o.status ?? status; const p = o.project ?? project?.slug ?? "";
      if (s !== "unresolved") sp.set("status", s);
      if (p) sp.set("project", p);
      if (q) sp.set("q", q);
      const str = sp.toString();
      return `/${str ? `?${str}` : ""}`;
    };

    const empty = !projects.length
      ? `<div class="card"><b>No projects yet.</b> <a href="/projects">Create one</a> to get a DSN, then set it as ERROR_DSN on a service.</div>`
      : `<div class="card mute">No ${status === "all" ? "" : `${status} `}issues${project ? ` in ${esc(project.name)}` : ""}${q ? ` matching “${esc(q)}”` : ""}.</div>`;

    page(res, "Issues", `
<div class="row" style="justify-content:space-between;margin-bottom:14px"><h1 style="margin:0">Issues</h1>
<form method="get" action="/" class="row">${status !== "unresolved" ? `<input type="hidden" name="status" value="${esc(status)}">` : ""}${project ? `<input type="hidden" name="project" value="${esc(project.slug)}">` : ""}
<label class="mute" for="q">Search</label><input id="q" type="search" name="q" value="${esc(q)}" placeholder="Title or location"><button type="submit">Search</button></form></div>
<nav class="tabs" aria-label="Status">${STATUSES.map((s) => `<a href="${link({ status: s })}" class="${s === status ? "on" : ""}">${s[0].toUpperCase()}${s.slice(1)}</a>`).join("")}</nav>
<nav class="tabs" aria-label="Project"><a href="${link({ project: "" })}" class="${!project ? "on" : ""}">All projects</a>${projects.map((p) => `<a href="${link({ project: p.slug })}" class="${p.id === project?.id ? "on" : ""}">${esc(p.name)}</a>`).join("")}</nav>
${issues.length ? `<div class="scroll"><table><thead><tr><th>Issue</th><th>Project</th><th class="num">Events</th><th class="num">Last seen</th><th class="num">First seen</th></tr></thead><tbody>
${issues.map((i) => `<tr><td><span class="lvl ${esc(i.level)}" aria-label="${esc(i.level)}"></span><a class="issue-title" href="/issues/${esc(i.id)}">${esc(i.title)}</a>${i.culprit ? `<span class="culprit">${esc(i.culprit)}</span>` : ""}</td>
<td>${esc(byId.get(i.projectId)?.name ?? "?")}</td><td class="num">${fmtCount(i.count)}</td><td class="num">${ago(i.lastSeen)}</td><td class="num mute">${ago(i.firstSeen)}</td></tr>`).join("")}
</tbody></table></div>` : empty}`, req.staff);
  });

  r.get("/issues/:id", signedIn, async (req, res) => {
    if (noStore(res)) return;
    const store = getStore()!;
    const issue = await store.getIssue(String(req.params.id));
    if (!issue) return page(res, "Not found", `<div class="notice">No such issue. <a href="/">Back to issues</a></div>`, req.staff, 404);
    const [project, days, recent] = await Promise.all([store.getProject(issue.projectId), store.dailyCounts(issue.id, 30), store.listEvents(issue.id, 20)]);
    const wanted = typeof req.query.event === "string" ? await store.getEvent(issue.id, req.query.event) : null;
    const ev = wanted ?? recent[0] ?? null;

    const actions = (["resolved", "ignored", "unresolved"] as IssueStatus[]).filter((s) => s !== issue.status).map((s) =>
      `<form class="inline" method="post" action="/issues/${esc(issue.id)}/status"><input type="hidden" name="status" value="${s}"><button type="submit"${s === "resolved" ? ' class="primary"' : ""}>${s === "resolved" ? "Resolve" : s === "ignored" ? "Ignore" : "Reopen"}</button></form>`).join(" ");

    const exceptions = ev?.exceptions ?? [];
    const stack = exceptions.length ? [...exceptions].reverse().map((x) => {
      const frames = [...(x.stacktrace?.frames ?? [])].reverse(); // newest call first, like a stack
      return `<div class="card" style="padding:12px 16px;margin-bottom:10px"><b class="mono">${esc(x.type ?? "Error")}</b> <span>${esc(x.value ?? "")}</span></div>
<div class="frames">${frames.length ? frames.map((f) => `<div class="frame ${f.in_app === false ? "lib" : ""}"><span class="fn">${esc(f.function ?? "<anonymous>")}</span> <span class="mute">in</span> ${esc(f.module ?? f.filename ?? f.abs_path ?? "?")}${f.lineno ? `<span class="mute">:${f.lineno}${f.colno ? `:${f.colno}` : ""}</span>` : ""}${f.context_line ? `<pre>${esc(f.context_line)}</pre>` : ""}</div>`).join("") : `<div class="frame mute">No stack trace was sent.</div>`}</div>`;
    }).join("") : ev?.message ? `<div class="card mono">${esc(ev.message)}</div>` : `<div class="card mute">No event is kept for this issue any more (retention is ${config.retentionDays} days).</div>`;

    const kv = (rows: [string, unknown][]) => {
      const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== "");
      return shown.length ? `<dl class="kv">${shown.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : `<span class="mute">None.</span>`;
    };

    page(res, issue.title, `
<p class="mute" style="margin:0 0 6px"><a href="/?project=${esc(project?.slug ?? "")}">${esc(project?.name ?? "?")}</a> · <span class="pill ${esc(issue.status)}">${esc(issue.status)}</span>${issue.resolvedBy ? ` <span class="mute">by ${esc(issue.resolvedBy)} ${ago(issue.resolvedAt)}</span>` : ""}</p>
<h1>${esc(issue.title)}</h1>${issue.culprit ? `<p class="mono mute" style="margin:0 0 14px">${esc(issue.culprit)}</p>` : ""}
<div class="row" style="margin-bottom:18px">${actions}</div>
<div class="stats"><div class="card"><span class="mute">Events</span><b>${fmtCount(issue.count)}</b></div><div class="card"><span class="mute">First seen</span><b>${ago(issue.firstSeen)}</b></div><div class="card"><span class="mute">Last seen</span><b>${ago(issue.lastSeen)}</b></div><div class="card"><span class="mute">Environments</span><b style="font-size:14px">${esc(issue.environments.join(", ") || "—")}</b></div></div>
<h2>Last 30 days</h2><div class="card">${bars(days)}</div>
<h2>${wanted ? "Event" : "Latest event"}${ev ? ` <span class="mono" style="text-transform:none;letter-spacing:0">${esc(ev.id.slice(0, 12))} · ${ago(ev.receivedAt)}</span>` : ""}</h2>
${stack}
${ev ? `<h2>Context</h2><div class="card">${kv([["release", ev.release], ["environment", ev.environment], ["server", ev.serverName], ["level", ev.level], ["platform", ev.platform], ["sdk", ev.sdk], ["request", ev.request ? `${ev.request.method ?? ""} ${ev.request.url ?? ""}` : undefined], ...Object.entries(ev.tags).map(([k, v]) => [`tag: ${k}`, v] as [string, unknown]), ...Object.entries(ev.request?.headers ?? {}).map(([k, v]) => [`header: ${k}`, v] as [string, unknown])])}</div>` : ""}
${recent.length > 1 ? `<h2>Recent events</h2><div class="scroll"><table><tbody>${recent.map((e) => `<tr><td class="mono"><a href="/issues/${esc(issue.id)}?event=${esc(e.id)}">${esc(e.id.slice(0, 12))}</a></td><td>${esc(e.release ?? "")}</td><td>${esc(e.environment ?? "")}</td><td class="num">${ago(e.receivedAt)}</td></tr>`).join("")}</tbody></table></div>` : ""}
<h2>Releases</h2><p class="mono">${esc(issue.releases.join(", ") || "None reported.")}</p>`, req.staff);
  });

  r.post("/issues/:id/status", sameOrigin, signedIn, form, async (req, res) => {
    if (noStore(res)) return;
    const s = String((req.body as Record<string, string>)?.status ?? "");
    if (s !== "resolved" && s !== "ignored" && s !== "unresolved") return void res.status(400).send("Unknown status.");
    const done = await getStore()!.setIssueStatus(String(req.params.id), s, req.staff!.email);
    if (!done) return void res.status(404).send("No such issue.");
    res.redirect(303, `/issues/${encodeURIComponent(done.id)}`);
  });

  /* ---------- projects ---------- */

  const dsnOf = (p: Project) => {
    const u = new URL(config.publicUrl);
    return `${u.protocol}//${p.publicKey}@${u.host}${u.pathname.replace(/\/$/, "")}/${p.id}`;
  };

  r.get("/projects", signedIn, async (req, res) => {
    if (noStore(res)) return;
    const projects = await getStore()!.listProjects();
    const err = typeof req.query.error === "string" ? req.query.error : "";
    const isAdmin = req.staff!.role === "admin";
    page(res, "Projects", `<h1>Projects</h1><p class="mute">One project per service. Set its DSN as <span class="mono">ERROR_DSN</span> (with <span class="mono">ERROR_REPORTING=glitchtip</span>) on that service. Any Sentry or GlitchTip SDK accepts it too.</p>
${err ? `<div class="notice err">${esc(err)}</div>` : ""}
${projects.length ? projects.map((p) => `<div class="card" style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><b>${esc(p.name)}</b><a href="/?project=${esc(p.slug)}">Issues →</a></div><p class="mute" style="margin:4px 0 8px">${esc(p.slug)} · created by ${esc(p.createdBy)} ${ago(p.createdAt)}</p><code class="dsn">${esc(dsnOf(p))}</code></div>`).join("") : `<div class="card mute">No projects yet.</div>`}
${isAdmin ? `<h2>New project</h2><form method="post" action="/projects" class="card row">
<label for="name">Name</label><input id="name" type="text" name="name" required maxlength="60" placeholder="site-api">
<button class="primary" type="submit">Create</button></form>` : `<p class="mute">Only admins can create projects.</p>`}`, req.staff);
  });

  r.post("/projects", sameOrigin, signedIn, form, async (req, res) => {
    if (noStore(res)) return;
    if (req.staff!.role !== "admin") return void res.status(403).send("Only admins can create projects.");
    const name = String((req.body as Record<string, string>)?.name ?? "").trim().slice(0, 60);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return res.redirect(303, `/projects?error=${encodeURIComponent("Give the project a name with at least one letter or digit.")}`);
    // Numeric ids: Sentry SDKs refuse a DSN whose project id isn't a number.
    const ok = await getStore()!.createProject({ id: String(randomInt(100_000, 999_999_999)), slug, name, publicKey: randomBytes(16).toString("hex"), createdAt: new Date(), createdBy: req.staff!.email });
    if (!ok) return res.redirect(303, `/projects?error=${encodeURIComponent(`A project called "${slug}" already exists.`)}`);
    res.redirect(303, "/projects");
  });

  return r;
}
