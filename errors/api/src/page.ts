// HTML for the staff pages: server-rendered, no client JavaScript, no framework. An error tracker is
// opened when things are going wrong, so it has as few parts of its own to break as possible.
export const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function ago(d: Date | string | undefined, now = Date.now()): string {
  if (!d) return "never";
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const fmtCount = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n.toLocaleString("en-US"));

/** A 30-day bar chart, inline SVG, every bar on one scale. */
export function bars(days: { day: string; count: number }[], w = 360, h = 48): string {
  const max = Math.max(1, ...days.map((d) => d.count));
  const bw = w / days.length;
  const rects = days.map((d, i) => {
    const bh = d.count ? Math.max(2, (d.count / max) * (h - 4)) : 1;
    return `<rect x="${(i * bw + 1).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" class="${d.count ? "bar" : "bar0"}"><title>${esc(d.day)}: ${d.count}</title></rect>`;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Events per day, last ${days.length} days, peak ${max}">${rects}</svg>`;
}

// The Islamic Tech Collective's mark (the nūn), paths copied unchanged from brand/itc-mark.svg.
const ITC_MARK = `<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49.25" fill="#fff" stroke="rgb(0 0 0 / .12)" stroke-width="1.5"/><g fill="#000"><circle cx="49.5354" cy="22.4987" r="5.4022"/> <path d="M70.391 32.474C70.604 32.88 71.242 34.022 71.667 34.912C72.092 35.801 72.538 36.819 72.943 37.812C73.347 38.805 73.755 39.88 74.096 40.87C74.436 41.86 74.693 42.664 74.987 43.753C75.281 44.842 75.639 46.382 75.861 47.405C76.082 48.429 76.191 49.011 76.315 49.895C76.439 50.779 76.548 51.806 76.603 52.708C76.659 53.611 76.672 54.447 76.647 55.312C76.622 56.177 76.561 57.013 76.455 57.898C76.348 58.783 76.182 59.773 76.009 60.624C75.836 61.474 75.652 62.214 75.415 63C75.178 63.786 74.904 64.563 74.585 65.342C74.266 66.121 73.889 66.927 73.502 67.674C73.114 68.421 72.694 69.157 72.261 69.824C71.829 70.49 71.411 71.063 70.907 71.676C70.403 72.289 69.851 72.902 69.238 73.502C68.625 74.102 67.897 74.747 67.229 75.275C66.56 75.804 65.944 76.232 65.228 76.673C64.512 77.114 63.746 77.534 62.93 77.922C62.115 78.311 61.173 78.7 60.335 79.006C59.498 79.312 58.747 79.542 57.907 79.757C57.067 79.973 56.196 80.152 55.294 80.299C54.393 80.446 53.474 80.558 52.499 80.64C51.523 80.721 50.481 80.773 49.441 80.788C48.401 80.803 47.318 80.788 46.261 80.727C45.204 80.666 44.13 80.564 43.098 80.421C42.066 80.278 41.055 80.092 40.066 79.871C39.078 79.649 38.105 79.397 37.166 79.093C36.227 78.789 35.261 78.415 34.431 78.045C33.601 77.675 32.947 77.333 32.186 76.874C31.424 76.415 30.542 75.82 29.862 75.293C29.182 74.766 28.576 74.179 28.106 73.711C27.636 73.244 27.375 72.912 27.04 72.488C26.705 72.064 26.405 71.651 26.096 71.169C25.788 70.687 25.45 70.103 25.188 69.596C24.926 69.09 24.72 68.625 24.524 68.129C24.327 67.632 24.164 67.159 24.008 66.617C23.853 66.075 23.707 65.494 23.589 64.879C23.471 64.263 23.369 63.546 23.301 62.922C23.232 62.297 23.199 61.745 23.178 61.131C23.158 60.516 23.154 59.9 23.178 59.235C23.203 58.569 23.254 57.862 23.327 57.138C23.4 56.414 23.49 55.663 23.615 54.893C23.74 54.122 23.905 53.292 24.078 52.516C24.252 51.74 24.457 50.933 24.655 50.236C24.853 49.538 25.031 49.011 25.266 48.331C25.502 47.651 25.754 46.952 26.07 46.156C26.386 45.359 26.98 43.986 27.162 43.552L35.82 46.628C35.561 47.376 34.657 49.892 34.265 51.118C33.874 52.344 33.664 53.128 33.47 53.984C33.277 54.84 33.183 55.412 33.103 56.255C33.023 57.099 32.968 58.188 32.99 59.042C33.012 59.897 33.15 60.815 33.234 61.384C33.319 61.953 33.393 62.11 33.496 62.459C33.6 62.807 33.726 63.159 33.855 63.472C33.983 63.785 34.105 64.044 34.265 64.337C34.425 64.63 34.605 64.925 34.816 65.228C35.027 65.531 35.277 65.859 35.532 66.154C35.787 66.45 35.944 66.654 36.345 67.002C36.745 67.35 37.359 67.869 37.935 68.242C38.51 68.615 39.126 68.945 39.796 69.238C40.465 69.531 41.161 69.777 41.954 69.998C42.746 70.22 43.64 70.423 44.548 70.566C45.457 70.709 46.428 70.806 47.405 70.854C48.382 70.902 49.436 70.897 50.411 70.854C51.385 70.812 52.366 70.725 53.25 70.601C54.134 70.477 54.962 70.307 55.714 70.112C56.465 69.917 57.078 69.708 57.758 69.43C58.438 69.152 59.181 68.79 59.794 68.443C60.407 68.097 60.93 67.744 61.436 67.351C61.943 66.958 62.365 66.587 62.834 66.084C63.303 65.582 63.84 64.927 64.25 64.337C64.659 63.747 64.995 63.157 65.289 62.546C65.583 61.934 65.803 61.358 66.014 60.667C66.225 59.977 66.423 59.146 66.556 58.405C66.689 57.664 66.77 56.959 66.809 56.221C66.849 55.482 66.844 54.789 66.792 53.975C66.739 53.161 66.639 52.258 66.495 51.337C66.351 50.415 66.142 49.384 65.927 48.445C65.711 47.506 65.487 46.639 65.202 45.702C64.916 44.764 64.595 43.823 64.215 42.818C63.835 41.814 63.388 40.732 62.922 39.673C62.456 38.615 61.669 37.001 61.419 36.467L70.391 32.474Z"/></g></svg>`;

const CSS = `
:root{--bg:#F6F5F2;--panel:#FFFFFF;--line:#E3E1DB;--fg:#1D1C1A;--mute:#6E6B64;--accent:#C2410C;--ok:#15803D;--warn:#B45309;--crit:#B91C1C;--code:#F1EFEA;color-scheme:light;
--sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#131312;--panel:#1B1B19;--line:#2C2B28;--fg:#ECEAE4;--mute:#97948C;--accent:#FB923C;--ok:#4ADE80;--warn:#FBBF24;--crit:#F87171;--code:#22211F;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 var(--sans)}
a{color:inherit}a:hover{color:var(--accent)}
header.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px max(16px,env(safe-area-inset-left));border-bottom:1px solid var(--line);background:var(--panel)}
header.top .brand{font-weight:700;letter-spacing:-.01em;text-decoration:none;display:inline-flex;align-items:center;gap:8px}header.top .brand .mark{width:26px;height:26px;flex:none}header.top .brand span{color:var(--accent)}
header.top nav{display:flex;gap:16px;align-items:center;font-size:13px;color:var(--mute)}
main{max-width:1100px;margin:0 auto;padding:24px max(16px,env(safe-area-inset-left)) 64px}
h1{font-size:22px;line-height:1.25;margin:0 0 6px;letter-spacing:-.01em;word-break:break-word}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin:28px 0 10px}
.mute{color:var(--mute)}.mono{font-family:var(--mono);font-size:12.5px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 14px}.tabs a{padding:5px 10px;border-radius:6px;text-decoration:none;color:var(--mute);font-size:13px}.tabs a.on{background:var(--fg);color:var(--bg)}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);font-weight:600}
tr:last-child td{border-bottom:0}td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.issue-title{font-weight:600;text-decoration:none;word-break:break-word}.culprit{display:block;color:var(--mute);font-family:var(--mono);font-size:12px;margin-top:2px;word-break:break-all}
.lvl{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;background:var(--crit)}.lvl.warning{background:var(--warn)}.lvl.info,.lvl.debug{background:var(--mute)}
.pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);color:var(--mute)}
.pill.unresolved{color:var(--crit);border-color:currentColor}.pill.resolved{color:var(--ok);border-color:currentColor}
form.inline{display:inline}button,.btn{font:inherit;font-size:13px;padding:6px 12px;border-radius:6px;border:1px solid var(--line);background:var(--panel);color:var(--fg);cursor:pointer;text-decoration:none}
button.primary{background:var(--fg);color:var(--bg);border-color:var(--fg)}button:hover,.btn:hover{border-color:var(--mute)}
input[type=text],input[type=email],input[type=password],input[type=search]{font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--fg);min-width:0}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.stats div b{display:block;font-size:20px;font-variant-numeric:tabular-nums}
.bar{fill:var(--accent)}.bar0{fill:var(--line)}
.frames{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)}
.frame{padding:8px 12px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:12.5px;overflow-x:auto}.frame:last-child{border-bottom:0}
.frame.lib{color:var(--mute);background:var(--code)}.frame .fn{font-weight:600}.frame pre{margin:6px 0 0;white-space:pre-wrap}
dl.kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:0}dl.kv dt{color:var(--mute)}dl.kv dd{margin:0;font-family:var(--mono);font-size:12.5px;word-break:break-all}
.notice{padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:var(--panel);margin-bottom:16px}.notice.err{border-color:var(--crit);color:var(--crit)}
.dsn{display:block;padding:8px 10px;background:var(--code);border-radius:6px;font-family:var(--mono);font-size:12.5px;word-break:break-all;user-select:all}
.scroll{overflow-x:auto}
`;

export function layout(opts: { title: string; user?: { name: string; email: string } | null; body: string }): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(opts.title)} · Errors</title><meta name="robots" content="noindex,nofollow"><style>${CSS}</style></head><body>
<header class="top"><a class="brand" href="/">${ITC_MARK}ITC <span>Errors</span></a>${opts.user ? `<nav><a href="/">Issues</a><a href="/projects">Projects</a><span>${esc(opts.user.name || opts.user.email)}</span><form class="inline" method="post" action="/logout"><button type="submit">Sign out</button></form></nav>` : ""}</header>
<main>${opts.body}</main></body></html>`;
}
