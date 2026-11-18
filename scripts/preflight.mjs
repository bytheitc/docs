#!/usr/bin/env node
// Launch preflight. Two modes, both exit non-zero when something must be fixed.
//
//   node scripts/preflight.mjs --static
//     Repo checks, no network. Runs in CI on every push.
//       · every public page is in its app's sitemap
//       · every env var a package reads is documented in its .env.example
//       · no .env file or credential-bearing connection string is tracked by git
//       · placeholder content left in seed files (a warning here; --launch makes it an error)
//
//   node scripts/preflight.mjs --live [--launch]
//     Checks a deployed stack. Web addresses come from the same NEXT_PUBLIC_ITC_*_URL variables the
//     deployments use; api addresses from PREFLIGHT_API_URLS (comma-separated base URLs).
//       · each api answers GET /health with 200
//       · each web serves its security headers, robots.txt and sitemap.xml
//       · no page links to localhost (a NEXT_PUBLIC_* var missing at build time)
//       · no placeholder text on any page listed in a sitemap
//
//   --launch   treat placeholder content as an error (use this for the go/no-go run)
//   --json     machine-readable output
//
// Zero dependencies on purpose: it has to run anywhere Node 22 does, before anything is installed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const LAUNCH = args.has("--launch");
const JSON_OUT = args.has("--json");
if (!args.has("--static") && !args.has("--live")) {
  console.error("usage: node scripts/preflight.mjs --static | --live [--launch] [--json]");
  process.exit(2);
}

const results = [];
const report = (level, check, where, message) => results.push({ level, check, where, message });
const fail = (...a) => report("fail", ...a);
const warn = (...a) => report("warn", ...a);
const pass = (...a) => report("pass", ...a);

const rel = (p) => path.relative(ROOT, p);
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);

// Placeholder markers. Matched case-sensitively where case carries meaning (TBA, TBD).
const PLACEHOLDER = [
  /\blorem ipsum\b/i,
  /\bTBA\b/,
  /\bTBD\b/,
  /\bplaceholder (content|text|gatherings|announcements)\b/i,
  /\bReplace with real\b/i,
  /\bnot yet (set|published)\b/i,
  /\billustrative\b/i,
  /\bexample\.(com|org)\b/i,
];

/* ------------------------------------------------------------------ */
/* Static checks                                                      */
/* ------------------------------------------------------------------ */

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
}
// Untracked-but-not-ignored files count too: they are what the next commit will carry.
function candidateFiles() {
  const untracked = execFileSync("git", ["ls-files", "-z", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
  return [...new Set([...trackedFiles(), ...untracked])];
}

function packages() {
  return candidateFiles()
    .filter((f) => /^[^/]+\/[^/]+\/package\.json$/.test(f) || /^[^/]+\/package\.json$/.test(f))
    .map((f) => path.dirname(f))
    .filter((d) => d !== "." && exists(path.join(ROOT, d, "package-lock.json")));
}

function walk(dir, pred, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, out);
    else if (pred(p)) out.push(p);
  }
  return out;
}

// 1. Sitemap coverage: every static page in a web app that has a sitemap.ts is listed in it.
function checkSitemaps() {
  for (const pkg of packages().filter((p) => p.endsWith("/web"))) {
    const app = path.join(ROOT, pkg, "app");
    const sm = path.join(app, "sitemap.ts");
    if (!exists(sm)) continue;
    const src = read(sm);
    const listed = new Set(JSON.parse(src.match(/const STATIC = (\[[\s\S]*?\]);/)?.[1] ?? "[]"));
    const robots = exists(path.join(app, "robots.ts")) ? read(path.join(app, "robots.ts")) : "";
    const disallow = JSON.parse(robots.match(/disallow: (\[[^\]]*\])/)?.[1] ?? "[]");
    const blocked = (u) => disallow.some((d) => u === d.replace(/\/$/, "") || u.startsWith(d.endsWith("/") ? d : d + "/"));
    const missing = [];
    for (const page of walk(app, (p) => p.endsWith("/page.tsx"))) {
      const segs = path.relative(app, path.dirname(page)).split(path.sep).filter(Boolean);
      if (segs.some((s) => s === "api" || s.startsWith("_") || /^\[.+\]$/.test(s))) continue;
      const url = "/" + segs.filter((s) => !/^\(.*\)$/.test(s)).join("/");
      const key = url === "/" ? "" : url;
      if (blocked(url) || listed.has(key)) continue;
      missing.push(url);
    }
    if (missing.length) fail("sitemap", `${pkg}/app/sitemap.ts`, `pages missing from STATIC: ${missing.join(", ")}`);
    else pass("sitemap", `${pkg}/app/sitemap.ts`, `${listed.size} static routes covered`);
  }
}

// 2. Env documentation: every process.env.X a package reads appears in its .env.example.
// Set by the platform or the toolchain, never by whoever fills in an env file.
const ENV_IGNORE = new Set(["NODE_ENV", "PORT", "CI", "NEXT_RUNTIME", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_REGION", "VERCEL_GIT_COMMIT_SHA", "AWS_LAMBDA_FUNCTION_NAME", "TZ", "HOME", "PATH", "DEBUG", "npm_package_version"]);
function checkEnv() {
  for (const pkg of packages()) {
    const dir = path.join(ROOT, pkg);
    const srcs = walk(dir, (p) => /\.(ts|tsx|mjs|js)$/.test(p) && !/\.test\.|\/test\/|next-env\.d\.ts|\.config\./.test(p));
    const used = new Map();
    for (const f of srcs) {
      for (const m of read(f).matchAll(/process\.env\.([A-Z][A-Z0-9_]*)|process\.env\[["']([A-Z][A-Z0-9_]*)["']\]|\benv\.([A-Z][A-Z0-9_]{2,})\b/g)) {
        const k = m[1] || m[2] || m[3];
        if (!ENV_IGNORE.has(k) && !k.startsWith("TEST_") && !k.startsWith("EXPO_PUBLIC_DEV")) used.set(k, rel(f));
      }
    }
    if (!used.size) continue;
    const ex = path.join(dir, ".env.example");
    if (!exists(ex)) { fail("env", pkg, `reads ${used.size} env vars but has no .env.example`); continue; }
    const documented = new Set([...read(ex).matchAll(/^\s*#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));
    const missing = [...used.keys()].filter((k) => !documented.has(k)).sort();
    if (missing.length) fail("env", `${pkg}/.env.example`, `undocumented: ${missing.map((k) => `${k} (${used.get(k)})`).join(", ")}`);
    else pass("env", `${pkg}/.env.example`, `${used.size} vars documented`);
  }
}

// 3. Secrets: no env files and no credential-bearing connection strings in what git will carry.
function checkSecrets() {
  const files = candidateFiles();
  const envFiles = files.filter((f) => /(^|\/)\.env(\.[^/]*)?$/.test(f) && !f.endsWith(".env.example"));
  for (const f of envFiles) fail("secrets", f, "env file is tracked or about to be; add it to .gitignore and rotate what it held");
  const CRED = /\b(mongodb(\+srv)?|postgres(ql)?|mysql|redis|amqp):\/\/([^:@\s/"'`]+):([^@\s/"'`]+)@([^\s/"'`]+)/g;
  const SAFE_USER = /^(user|username|USER|\$\{?[A-Z_]+\}?|<[^>]+>)$/;
  const SAFE_HOST = /example\.|localhost|127\.0\.0\.1|cluster\.mongodb\.net$/;
  let hits = 0;
  for (const f of files) {
    if (/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|lock)$|package-lock\.json$/.test(f)) continue;
    const p = path.join(ROOT, f);
    if (!exists(p) || fs.statSync(p).size > 2_000_000) continue;
    for (const m of read(p).matchAll(CRED)) {
      // groups: 1 scheme, 2 "+srv", 3 "ql", 4 user, 5 password, 6 host
      const user = m[4], host = m[6];
      if (SAFE_USER.test(user) || SAFE_HOST.test(host)) continue;
      hits++;
      fail("secrets", f, `connection string with an embedded password (${m[1]}://${user}:***@${host})`);
    }
  }
  if (!envFiles.length && !hits) pass("secrets", "repo", "no env files or embedded credentials in tracked files");
}

// 4. Placeholder content in seeds and hard-coded page copy.
function checkPlaceholders() {
  const roots = packages().flatMap((p) => [path.join(ROOT, p, "src", "content"), path.join(ROOT, p, "lib"), path.join(ROOT, p, "app")]);
  let n = 0;
  for (const r of roots) {
    for (const f of walk(r, (p) => /\.(ts|tsx|md|mdx|json)$/.test(p))) {
      const lines = read(f).split("\n");
      lines.forEach((line, i) => {
        if (/placeholder=|::placeholder|placeholder:/.test(line)) return; // form-field hint text, not content
        const hit = PLACEHOLDER.find((re) => re.test(line));
        if (!hit) return;
        n++;
        (LAUNCH ? fail : warn)("content", `${rel(f)}:${i + 1}`, line.trim().slice(0, 140));
      });
    }
  }
  if (!n) pass("content", "seeds", "no placeholder markers in seed content");
}

/* ------------------------------------------------------------------ */
/* Live checks                                                        */
/* ------------------------------------------------------------------ */

const TIMEOUT = 10_000;
async function get(url, init = {}) {
  return fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT), headers: { "user-agent": "itc-preflight" }, ...init });
}

async function checkLive() {
  const webs = Object.entries(process.env)
    .filter(([k, v]) => /^NEXT_PUBLIC_ITC_[A-Z]+_URL$/.test(k) && v)
    .map(([k, v]) => ({ name: k.replace(/^NEXT_PUBLIC_ITC_|_URL$/g, "").toLowerCase(), url: v.replace(/\/+$/, "") }));
  const apis = (process.env.PREFLIGHT_API_URLS ?? "").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  if (!webs.length) fail("live", "env", "no NEXT_PUBLIC_ITC_*_URL variables set; nothing to check");
  if (!apis.length) warn("live", "env", "PREFLIGHT_API_URLS is empty; api health not checked");

  for (const api of apis) {
    try {
      const res = await get(`${api}/health`);
      const body = await res.text();
      if (res.status === 200) pass("health", api, body.slice(0, 120));
      else fail("health", api, `GET /health → ${res.status} ${body.slice(0, 120)}`);
    } catch (e) {
      fail("health", api, `unreachable: ${e.message}`);
    }
  }

  for (const w of webs) {
    let home;
    try {
      home = await get(w.url + "/");
    } catch (e) {
      fail("web", w.url, `unreachable: ${e.message}`);
      continue;
    }
    if (!w.url.startsWith("https://")) fail("web", w.url, "not served over https");
    const h = home.headers;
    const need = { "content-security-policy": /frame-ancestors 'none'/, "strict-transport-security": /max-age=\d{7,}/, "x-content-type-options": /nosniff/, "referrer-policy": /./ };
    const missing = Object.entries(need).filter(([k, re]) => !re.test(h.get(k) ?? "")).map(([k]) => k);
    if (missing.length) fail("headers", w.url, `missing or weak: ${missing.join(", ")}`);
    else pass("headers", w.url, "security headers present");
    if (h.get("x-powered-by")) warn("headers", w.url, `x-powered-by: ${h.get("x-powered-by")}`);

    const robots = await get(w.url + "/robots.txt").then((r) => (r.ok ? r.text() : "")).catch(() => "");
    if (!robots) fail("robots", w.url, "no robots.txt");
    else if (/localhost/.test(robots)) fail("robots", w.url, "robots.txt points at localhost: NEXT_PUBLIC_ITC_*_URL was not set at build time");
    else pass("robots", w.url, "robots.txt ok");

    const smRes = await get(w.url + "/sitemap.xml").catch(() => null);
    if (!smRes?.ok) {
      if (/Disallow: \/\s*$/m.test(robots)) pass("sitemap", w.url, "no sitemap (private app)");
      else fail("sitemap", w.url, "no sitemap.xml");
      continue;
    }
    const xml = await smRes.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (locs.some((l) => /localhost/.test(l))) fail("sitemap", w.url, "sitemap lists localhost URLs: NEXT_PUBLIC_ITC_*_URL was not set at build time");
    else pass("sitemap", w.url, `${locs.length} URLs`);

    for (const loc of locs.slice(0, 200)) {
      try {
        const res = await get(loc);
        if (res.status !== 200) { fail("page", loc, `HTTP ${res.status} (listed in the sitemap)`); continue; }
        const html = await res.text();
        if (/https?:\/\/localhost[:/]/.test(html)) fail("page", loc, "links to localhost: a NEXT_PUBLIC_* variable was missing at build time");
        const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
        const hit = PLACEHOLDER.find((re) => re.test(text));
        if (hit) (LAUNCH ? fail : warn)("content", loc, `placeholder text: "${text.match(hit)[0]}"`);
      } catch (e) {
        fail("page", loc, `unreachable: ${e.message}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ */

if (args.has("--static")) {
  checkSitemaps();
  checkEnv();
  checkSecrets();
  checkPlaceholders();
}
if (args.has("--live")) await checkLive();

const fails = results.filter((r) => r.level === "fail");
const warns = results.filter((r) => r.level === "warn");
if (JSON_OUT) {
  console.log(JSON.stringify({ ok: !fails.length, results }, null, 2));
} else {
  const icon = { pass: "✓", warn: "!", fail: "✗" };
  let lastCheck = "";
  for (const r of results) {
    if (r.check !== lastCheck) { console.log(`\n${r.check}`); lastCheck = r.check; }
    if (r.level === "pass" && results.some((x) => x.check === r.check && x.level !== "pass")) continue;
    console.log(`  ${icon[r.level]} ${r.where}  ${r.message}`);
  }
  console.log(`\n${fails.length} to fix, ${warns.length} warnings${LAUNCH ? " (launch mode)" : ""}`);
}
process.exit(fails.length ? 1 : 0);
