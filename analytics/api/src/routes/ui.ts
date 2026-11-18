// The staff pages. Signed in with a CMS account that has the "analytics" space; the session is the CMS
// token in an httpOnly cookie, checked against the CMS (cached a minute) on every page.
//
//   GET  /login  POST /login  POST /logout
//   GET  /                        every site: last 30 days and who's on it now
//   GET  /sites/:slug?range=      one site: visitors, views, pages, referrers, places, devices, events
//   GET  /sites                   every site with its snippet and domains
//   POST /sites                   add one (admins)
//   POST /sites/:slug/domains     change which hosts count for it (admins)
//
// Forms are protected by SameSite=Lax cookies plus an Origin check on every POST.
import { randomBytes } from "node:crypto";
import express, { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import type { Ctx } from "../app.js";
import type { StaffUser } from "../cms.js";
import { bars, countryName, esc, fmtCount, layout, spark, table } from "../page.js";
import { getStore } from "../store/index.js";
import { dayOf } from "../store/stats.js";
import type { Site } from "../store/types.js";

declare module "express-serve-static-core" {
  interface Request {
    staff?: StaffUser;
  }
}

const COOKIE = "analytics_session";
const RANGES: Record<string, { label: string; days: number }> = {
  today: { label: "Today", days: 1 },
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
  "12m": { label: "12 months", days: 365 },
};
const LIVE_MS = 5 * 60_000;

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

/** "site.org, https://www.site.org/" -> ["site.org"]. Hostnames only, deduplicated, at most 10. */
export function parseDomains(raw: string): string[] {
  const out = new Set<string>();
  for (const part of raw.split(/[\s,]+/)) {
    const p = part.trim().toLowerCase();
    if (!p) continue;
    let host = p;
    try { host = new URL(p.includes("://") ? p : `https://${p}`).hostname; } catch { continue; }
    host = host.replace(/^www\./, "");
    if (/^[a-z0-9.-]+$/.test(host) && (host.includes(".") || host === "localhost")) out.add(host);
  }
  return [...out].slice(0, 10);
}

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
    if (!getStore()) return res.status(503).type("html").send(layout({ title: "Unavailable", body: `<div class="notice err">Analytics has no database. Set MONGODB_URI.</div>` })), true;
    return false;
  };

  const snippet = (s: Site) => `<script defer src="${config.publicUrl}/script.js" data-site="${s.id}"></script>`;

  r.use(["/", "/login", "/logout", "/sites"], html);

  /* ---------- session ---------- */

  r.get("/login", (req, res) => {
    const next = typeof req.query.next === "string" && req.query.next.startsWith("/") && !req.query.next.startsWith("//") ? req.query.next : "/";
    const err = typeof req.query.error === "string" ? req.query.error : "";
    page(res, "Sign in", `<div style="max-width:360px;margin:8vh auto 0">
<h1>Sign in</h1><p class="mute">Use your CMS account. You need access to the Analytics space.</p>
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
    if (!user) return back("That account doesn't have access to the Analytics space.");
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

  /* ---------- overview ---------- */

  r.get("/", signedIn, async (req, res) => {
    if (noStore(res)) return;
    const store = getStore()!;
    const sites = await store.listSites();
    const today = dayOf(new Date());
    const from = dayOf(new Date(Date.now() - 29 * 864e5));
    const since = new Date(Date.now() - LIVE_MS);
    const cards = await Promise.all(sites.map(async (s) => {
      const [st, live] = await Promise.all([store.stats(s.id, from, today), store.live(s.id, since)]);
      return `<a class="card" href="/sites/${esc(s.slug)}"><div class="row" style="justify-content:space-between"><b>${esc(s.name)}</b><span class="mute live">${live} now</span></div>
<div class="nums"><span><b>${fmtCount(st.visitors)}</b> <span class="mute">visitors</span></span><span><b>${fmtCount(st.pageviews)}</b> <span class="mute">views</span></span></div>${spark(st.days)}
<p class="mute" style="margin:6px 0 0;font-size:12.5px">${esc(s.domains.join(", ") || "no domains")}</p></a>`;
    }));
    page(res, "Overview", `<div class="row" style="justify-content:space-between;margin-bottom:16px"><h1 style="margin:0">Last 30 days</h1><span class="mute">Visitors are counted per day, without cookies.</span></div>
${sites.length ? `<div class="sites">${cards.join("")}</div>` : `<div class="card"><b>No sites yet.</b> <a href="/sites">Add one</a> to get its script tag.</div>`}`, req.staff);
  });

  /* ---------- one site ---------- */

  r.get("/sites/:slug", signedIn, async (req, res) => {
    if (noStore(res)) return;
    const store = getStore()!;
    const site = await store.getSiteBySlug(String(req.params.slug));
    if (!site) return page(res, "Not found", `<div class="notice">No such site. <a href="/">Back</a></div>`, req.staff, 404);
    const key = typeof req.query.range === "string" && RANGES[req.query.range] ? req.query.range : "30d";
    const range = RANGES[key];
    const to = dayOf(new Date());
    const from = dayOf(new Date(Date.now() - (range.days - 1) * 864e5));
    const [st, live] = await Promise.all([store.stats(site.id, from, to), store.live(site.id, new Date(Date.now() - LIVE_MS))]);
    const perVisitor = st.visitors ? (st.pageviews / st.visitors).toFixed(1) : "0";
    const sources = st.top.source.filter((r) => r.key);

    page(res, site.name, `
<div class="row" style="justify-content:space-between"><div><h1>${esc(site.name)}</h1><p class="mute" style="margin:0">${esc(site.domains.join(", "))}</p></div>
<nav class="tabs" aria-label="Range">${Object.entries(RANGES).map(([k, v]) => `<a href="/sites/${esc(site.slug)}?range=${k}" class="${k === key ? "on" : ""}">${v.label}</a>`).join("")}</nav></div>
<div class="stats">
<div class="card"><span class="mute">Visitors</span><b>${fmtCount(st.visitors)}</b></div>
<div class="card"><span class="mute">Page views</span><b>${fmtCount(st.pageviews)}</b></div>
<div class="card"><span class="mute">Views per visitor</span><b>${perVisitor}</b></div>
<div class="card"><span class="mute live">On the site now</span><b>${live}</b></div>
</div>
${range.days > 1 ? `<div class="card"><h2>Visitors per day</h2>${bars(st.days)}<div class="row mute" style="justify-content:space-between;font-size:12px;margin-top:4px"><span>${esc(from)}</span><span>${esc(to)}</span></div></div>` : ""}
<div class="grid">
${table("Pages", st.top.path, { empty: "No page views in this range." })}
${table("Referrers", st.top.ref, { label: (k) => k || "Direct or unknown" })}
${sources.length ? table("Campaigns (utm_source)", sources) : ""}
${table("Countries", st.top.country, { label: countryName })}
${table("Devices", st.top.device)}
${table("Browsers", st.top.browser)}
${table("Operating systems", st.top.os)}
${table("Events", st.events, { count: "Times", empty: "No custom events. Add data-itc-event=\"name\" to a button, or call itc(\"name\")." })}
</div>
<p class="mute" style="margin-top:20px;font-size:12.5px">A visitor is counted once per day: the hash that tells visitors apart changes every day and can't be traced back. Visitors over a range are the sum of each day's.</p>`, req.staff);
  });

  /* ---------- managing sites ---------- */

  r.get("/sites", signedIn, async (req, res) => {
    if (noStore(res)) return;
    const sites = await getStore()!.listSites();
    const err = typeof req.query.error === "string" ? req.query.error : "";
    const isAdmin = req.staff!.role === "admin";
    page(res, "Sites", `<h1>Sites</h1><p class="mute">One site per web property. In an ITC web app, set <span class="mono">NEXT_PUBLIC_ANALYTICS_URL=${esc(config.publicUrl)}</span> and <span class="mono">NEXT_PUBLIC_ANALYTICS_SITE</span> to the site id at build time; anywhere else, paste the script tag.</p>
${err ? `<div class="notice err">${esc(err)}</div>` : ""}
${sites.length ? sites.map((s) => `<div class="card" style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><b>${esc(s.name)}</b><a href="/sites/${esc(s.slug)}">Dashboard →</a></div>
<p class="mute" style="margin:4px 0 8px">site id <span class="mono">${esc(s.id)}</span> · created by ${esc(s.createdBy)}</p>
<code class="snippet">${esc(snippet(s))}</code>
${isAdmin ? `<form method="post" action="/sites/${esc(s.slug)}/domains" class="row" style="margin-top:10px"><label for="d-${esc(s.slug)}" class="mute">Domains</label><input id="d-${esc(s.slug)}" type="text" name="domains" value="${esc(s.domains.join(", "))}" required><button type="submit">Save</button></form>` : `<p class="mute" style="margin:8px 0 0">Domains: ${esc(s.domains.join(", "))}</p>`}</div>`).join("") : `<div class="card mute">No sites yet.</div>`}
${isAdmin ? `<h2 style="margin-top:28px">New site</h2><form method="post" action="/sites" class="card" style="display:grid;gap:10px">
<label for="name">Name</label><input id="name" type="text" name="name" required maxlength="60" placeholder="ITC Engineering">
<label for="domains">Domains <span class="mute">(comma-separated; subdomains count too)</span></label><input id="domains" type="text" name="domains" required placeholder="engineering.bytheitc.xyz">
<div><button class="primary" type="submit">Add site</button></div></form>` : `<p class="mute">Only admins can add sites.</p>`}`, req.staff);
  });

  r.post("/sites", sameOrigin, signedIn, form, async (req, res) => {
    if (noStore(res)) return;
    if (req.staff!.role !== "admin") return void res.status(403).send("Only admins can add sites.");
    const b = (req.body ?? {}) as Record<string, string>;
    const name = String(b.name ?? "").trim().slice(0, 60);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const domains = parseDomains(String(b.domains ?? ""));
    const back = (msg: string) => res.redirect(303, `/sites?error=${encodeURIComponent(msg)}`);
    if (!slug) return back("Give the site a name with at least one letter or digit.");
    if (!domains.length) return back("Add at least one domain, like engineering.bytheitc.xyz.");
    const ok = await getStore()!.createSite({ id: randomBytes(6).toString("hex"), slug, name, domains, createdAt: new Date(), createdBy: req.staff!.email });
    if (!ok) return back(`A site called "${slug}" already exists.`);
    res.redirect(303, "/sites");
  });

  r.post("/sites/:slug/domains", sameOrigin, signedIn, form, async (req, res) => {
    if (noStore(res)) return;
    if (req.staff!.role !== "admin") return void res.status(403).send("Only admins can change domains.");
    const store = getStore()!;
    const site = await store.getSiteBySlug(String(req.params.slug));
    if (!site) return void res.status(404).send("No such site.");
    const domains = parseDomains(String((req.body as Record<string, string>)?.domains ?? ""));
    if (!domains.length) return res.redirect(303, `/sites?error=${encodeURIComponent("A site needs at least one domain.")}`);
    await store.updateDomains(site.id, domains);
    res.redirect(303, "/sites");
  });

  return r;
}
