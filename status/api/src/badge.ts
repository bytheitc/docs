// The badge: an SVG anyone can drop into a README or a footer with an <img> tag.
//
// Drawn by hand rather than with a font metric library, so the width is estimated from the text.
// It is the most-copied artefact a status page produces, so it has no dependencies and no fetch.
import { esc } from "./util.js";
import type { State } from "./types.js";

const COLOUR: Record<State, string> = {
  up: "#15803d",
  degraded: "#b45309",
  down: "#b91c1c",
  unknown: "#6b7280",
};

const TEXT: Record<State, string> = {
  up: "operational",
  degraded: "degraded",
  down: "down",
  unknown: "unknown",
};

/** DejaVu Sans at 11px averages a shade over 6px a character; close enough for a badge. */
const width = (s: string) => Math.ceil(s.length * 6.2) + 20;

export function renderBadge(label: string, state: State): string {
  const right = TEXT[state];
  const lw = width(label);
  const rw = width(right);
  const total = lw + rw;
  const colour = COLOUR[state];
  const a11y = `${label}: ${right}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${esc(a11y)}">
  <title>${esc(a11y)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#44484e"/>
    <rect x="${lw}" width="${rw}" height="20" fill="${colour}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11">
    <text x="${lw / 2}" y="15" fill="#010101" fill-opacity=".3">${esc(label)}</text>
    <text x="${lw / 2}" y="14">${esc(label)}</text>
    <text x="${lw + rw / 2}" y="15" fill="#010101" fill-opacity=".3">${esc(right)}</text>
    <text x="${lw + rw / 2}" y="14">${esc(right)}</text>
  </g>
</svg>`;
}

/**
 * The embeddable widget: one script tag that writes a small live banner into the host page.
 *
 * It reads only the public JSON, touches nothing else on the page, and writes through textContent
 * rather than innerHTML — this runs on somebody else's site, so it behaves like a guest.
 */
export function renderEmbedScript(publicUrl: string): string {
  return `/* ${publicUrl} — status widget. Public data only; no cookies, no tracking. */
(function () {
  "use strict";
  var COLOURS = { up: "#15803d", degraded: "#b45309", down: "#b91c1c", unknown: "#6b7280" };
  var scripts = document.currentScript ? [document.currentScript] : [];
  if (!scripts.length) return;
  var el = scripts[0];
  var tenant = el.getAttribute("data-tenant");
  if (!tenant) return;
  var mount = document.createElement("div");
  mount.setAttribute("role", "status");
  mount.style.cssText = "display:inline-flex;align-items:center;gap:8px;font:14px/1.4 ui-sans-serif,system-ui,sans-serif";
  var dot = document.createElement("span");
  dot.style.cssText = "width:9px;height:9px;border-radius:50%;background:" + COLOURS.unknown + ";flex:none";
  var text = document.createElement("a");
  text.href = ${JSON.stringify(publicUrl)} + "/?t=" + encodeURIComponent(tenant);
  text.style.cssText = "color:inherit;text-decoration:none";
  text.textContent = "Checking status\\u2026";
  mount.appendChild(dot);
  mount.appendChild(text);
  el.parentNode.insertBefore(mount, el);

  fetch(${JSON.stringify(publicUrl)} + "/v1/status/" + encodeURIComponent(tenant), { credentials: "omit" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) throw new Error("unavailable");
      dot.style.background = COLOURS[d.overall] || COLOURS.unknown;
      text.textContent = d.summary;
      text.href = d.pageUrl || text.href;
    })
    .catch(function () { text.textContent = "Status unavailable"; });
})();`;
}
