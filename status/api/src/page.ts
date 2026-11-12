// The status page, rendered as a string.
//
// No framework and no build step, on purpose. This page's whole job is to be up when other things
// are not, so it has the fewest moving parts that will do: one request, one HTML document, no
// client-side fetch, and nothing that fails if JavaScript does. It also has to render when the
// database is unreachable, which rules out anything that needs data to draw its own shell.
import type { PublicStatus, PublicIncident, PublicService, State } from "./types.js";
import { esc, safeColour } from "./util.js";

const LABEL: Record<State, string> = {
  up: "Operational",
  degraded: "Degraded",
  down: "Down",
  unknown: "No data",
};

// Colour is never the only signal: each state also has a word and a distinct bar shape, so the page
// works in greyscale, for colour-blind readers, and when a screen reader is doing the reading.
const TONE: Record<State, string> = { up: "ok", degraded: "warn", down: "bad", unknown: "idle" };

const BANNER: Record<State, string> = {
  up: "All systems operational",
  degraded: "Some systems degraded",
  down: "Some systems down",
  unknown: "Status unknown",
};

const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function bars(s: PublicService): string {
  const cells = s.history
    .map((h) => {
      const title = h.uptime === null ? `${fmtDay(h.day)}: no data` : `${fmtDay(h.day)}: ${h.uptime}% of checks passed`;
      return `<span class="bar ${TONE[h.state]}" title="${esc(title)}"><span class="sr">${esc(title)}</span></span>`;
    })
    .join("");
  const days = s.history.length;
  return `<div class="bars" role="img" aria-label="${esc(`${s.name}: the last ${days} days`)}">${cells}</div>`;
}

function serviceRow(s: PublicService): string {
  const ms = s.responseMs === null ? "" : `<span class="ms">${s.responseMs} ms</span>`;
  return `<li class="svc">
    <div class="svc-head">
      <div>
        <h3>${esc(s.name)}</h3>
        ${s.description ? `<p>${esc(s.description)}</p>` : ""}
      </div>
      <div class="svc-state">${ms}<span class="pill ${TONE[s.state]}">${esc(LABEL[s.state])}</span></div>
    </div>
    ${bars(s)}
  </li>`;
}

function incidentBlock(i: PublicIncident): string {
  const updates = i.updates
    .slice()
    .reverse()
    .map(
      (u) => `<li><span class="u-status">${esc(u.status)}</span>
        <time datetime="${esc(u.at)}">${esc(fmtTime(u.at))}</time>
        <p>${esc(u.body)}</p></li>`,
    )
    .join("");
  const tone = i.scheduled ? "idle" : i.status === "resolved" ? "ok" : i.impact === "critical" || i.impact === "major" ? "bad" : "warn";
  return `<article class="incident">
    <header>
      <span class="pill ${tone}">${esc(i.scheduled ? "maintenance" : i.impact)}</span>
      <h3>${esc(i.title)}</h3>
      <p class="meta">
        ${esc(i.status)} · started ${esc(fmtTime(i.startedAt))}${i.resolvedAt ? ` · resolved ${esc(fmtTime(i.resolvedAt))}` : ""}
        ${i.services.length ? ` · ${esc(i.services.join(", "))}` : ""}
      </p>
    </header>
    ${updates ? `<ol class="updates">${updates}</ol>` : ""}
  </article>`;
}

export interface PageOpts {
  status: PublicStatus;
  /** This service's public address, for the JSON link and the embed snippet. */
  publicUrl: string;
  days: number;
}

export function renderPage({ status, publicUrl, days }: PageOpts): string {
  const accent = safeColour(status.tenant.brand.accent);
  const open = status.incidents.filter((i) => i.status !== "resolved");
  const past = status.incidents.filter((i) => i.status === "resolved").slice(0, 10);

  const groups = new Map<string, PublicService[]>();
  for (const s of status.services) {
    const g = s.group || "Services";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  const groupHtml = [...groups.entries()]
    .map(
      ([name, list]) => `<section class="group">
        ${groups.size > 1 ? `<h2>${esc(name)}</h2>` : ""}
        <ul class="svcs">${list.map(serviceRow).join("")}</ul>
      </section>`,
    )
    .join("");

  const logo = status.tenant.brand.logoUrl
    ? `<img src="${esc(status.tenant.brand.logoUrl)}" alt="" width="32" height="32">`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(status.tenant.name)} status — ${esc(BANNER[status.overall])}</title>
<meta name="description" content="${esc(status.summary)}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${esc(status.tenant.name)} status">
<meta property="og:description" content="${esc(status.summary)}">
<meta name="theme-color" content="${esc(accent)}">
<style>
  :root {
    --accent: ${accent};
    --bg: #fbfbfa; --card: #fff; --ink: #16181d; --soft: #5b6472; --line: #e5e7eb;
    --ok: #15803d; --warn: #b45309; --bad: #b91c1c; --idle: #cbd5e1;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1115; --card: #161a21; --ink: #e8eaed; --soft: #9aa4b2; --line: #272d38;
      --ok: #4ade80; --warn: #fbbf24; --bad: #f87171; --idle: #374151;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 860px; margin: 0 auto; padding: 32px 16px 72px; }
  header.top { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
  header.top h1 { font-size: 19px; margin: 0; font-weight: 650; }
  header.top a { color: inherit; text-decoration: none; display: flex; align-items: center; gap: 10px; }
  .banner {
    display: flex; align-items: center; gap: 14px; padding: 20px 22px; border-radius: 14px;
    background: var(--card); border: 1px solid var(--line); border-left: 5px solid var(--tone); margin-bottom: 10px;
  }
  .banner.ok { --tone: var(--ok); } .banner.warn { --tone: var(--warn); }
  .banner.bad { --tone: var(--bad); } .banner.idle { --tone: var(--idle); }
  .banner h2 { margin: 0; font-size: 21px; font-weight: 650; }
  .banner p { margin: 3px 0 0; color: var(--soft); font-size: 15px; }
  .dot { width: 13px; height: 13px; border-radius: 50%; background: var(--tone); flex: none; }
  .checked { color: var(--soft); font-size: 13px; margin: 0 0 26px; }
  .group { margin-bottom: 26px; }
  .group h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .07em; color: var(--soft); margin: 0 0 10px; }
  .svcs { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .svc { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 15px 17px; }
  .svc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .svc h3 { margin: 0; font-size: 16px; font-weight: 600; }
  .svc p { margin: 2px 0 0; color: var(--soft); font-size: 14px; }
  .svc-state { display: flex; align-items: center; gap: 10px; flex: none; }
  .ms { color: var(--soft); font-size: 13px; font-variant-numeric: tabular-nums; }
  .pill { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; border: 1px solid currentColor; white-space: nowrap; }
  .pill.ok { color: var(--ok); } .pill.warn { color: var(--warn); }
  .pill.bad { color: var(--bad); } .pill.idle { color: var(--soft); }
  .bars { display: flex; gap: 2px; margin-top: 13px; height: 30px; align-items: flex-end; }
  .bar { flex: 1 1 0; min-width: 2px; border-radius: 2px; background: var(--idle); }
  /* Height carries the same information as colour, so the bars read without it. */
  .bar.ok { background: var(--ok); height: 100%; }
  .bar.warn { background: var(--warn); height: 66%; }
  .bar.bad { background: var(--bad); height: 40%; }
  .bar.idle { height: 22%; }
  .incident { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; margin-bottom: 10px; }
  .incident header { display: grid; gap: 5px; }
  .incident h3 { margin: 0; font-size: 17px; }
  .incident .meta { margin: 0; color: var(--soft); font-size: 13px; }
  .incident .pill { justify-self: start; }
  .updates { list-style: none; margin: 14px 0 0; padding: 0 0 0 16px; border-left: 2px solid var(--line); display: grid; gap: 14px; }
  .updates .u-status { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--accent); }
  .updates time { color: var(--soft); font-size: 13px; margin-left: 8px; }
  .updates p { margin: 4px 0 0; }
  h2.section { font-size: 13px; text-transform: uppercase; letter-spacing: .07em; color: var(--soft); margin: 30px 0 10px; }
  footer { margin-top: 44px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--soft); font-size: 13px; display: flex; flex-wrap: wrap; gap: 8px 18px; }
  footer a { color: var(--accent); }
  .stale { background: var(--card); border: 1px solid var(--warn); color: var(--warn); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; font-size: 14px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  @media (max-width: 560px) {
    .svc-head { flex-direction: column; gap: 8px; }
    .svc-state { align-self: flex-start; }
  }
</style>
</head>
<body>
<main class="wrap">
  <header class="top">
    ${status.tenant.brand.supportUrl ? `<a href="${esc(status.tenant.brand.supportUrl)}">${logo}<h1>${esc(status.tenant.name)}</h1></a>` : `${logo}<h1>${esc(status.tenant.name)}</h1>`}
  </header>

  ${status.stale ? `<p class="stale">This page is showing the last known state. The status service can't reach its own database, so these readings may be out of date.</p>` : ""}

  <div class="banner ${TONE[status.overall]}">
    <span class="dot"></span>
    <div>
      <h2>${esc(BANNER[status.overall])}</h2>
      <p>${esc(status.summary)}</p>
    </div>
  </div>
  <p class="checked">Checked ${esc(fmtTime(status.updatedAt))} UTC${status.tenant.brand.tagline ? ` · ${esc(status.tenant.brand.tagline)}` : ""}</p>

  ${open.length ? `<h2 class="section">Open</h2>${open.map(incidentBlock).join("")}` : ""}

  ${status.services.length ? groupHtml : `<p class="checked">No services are being monitored yet.</p>`}

  ${past.length ? `<h2 class="section">Past incidents</h2>${past.map(incidentBlock).join("")}` : ""}

  <footer>
    <span>Last ${days} days</span>
    <a href="${esc(publicUrl)}/v1/status/${esc(status.tenant.id)}">JSON</a>
    <a href="${esc(publicUrl)}/v1/status/${esc(status.tenant.id)}/badge.svg">Badge</a>
    <a href="${esc(publicUrl)}/embed">Embed this</a>
  </footer>
</main>
</body>
</html>`;
}
