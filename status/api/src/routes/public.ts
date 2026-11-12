// Everything a visitor can reach. No authentication, and nothing here reads a private field
// directly: the public shape is built by projection.ts and this module only serves it.
import { Router, type Request } from "express";
import type { Config } from "../config.js";
import { renderBadge, renderEmbedScript } from "../badge.js";
import { cachedTenant, lastKnown, remember, rememberTenant } from "../live.js";
import { renderPage } from "../page.js";
import { project } from "../projection.js";
import { getStore } from "../store/index.js";
import type { PublicStatus, Tenant } from "../types.js";
import { daysBack, esc, normaliseHost } from "../util.js";

const DEFAULT_DAYS = 90;
const MAX_DAYS = 90;

const days = (req: Request): number => {
  const n = Number(req.query.days);
  return Number.isFinite(n) && n >= 7 && n <= MAX_DAYS ? Math.floor(n) : DEFAULT_DAYS;
};

export function publicRoutes(config: Config, subscriptions = false): Router {
  const r = Router();

  /** Resolve the tenant from the Host header, falling back to ?t= and then ROOT_TENANT. */
  async function resolve(req: Request): Promise<Tenant | null> {
    const host = normaliseHost(req.headers.host ?? "");
    const store = getStore();
    const asked = String(req.query.t ?? req.params.tenant ?? "").trim();

    if (store) {
      try {
        const byHost = host ? await store.getTenantByHost(host) : null;
        if (byHost) {
          rememberTenant(byHost);
          return byHost;
        }
        const found = asked ? await store.getTenant(asked) : config.rootTenant ? await store.getTenant(config.rootTenant) : null;
        if (found) rememberTenant(found);
        return found;
      } catch (e) {
        // Fall through to what we remember: a database that cannot answer must not turn a real
        // status page into "no status page here".
        console.error(`[status] could not resolve a tenant for ${host || "?"}: ${(e as Error).message}`);
      }
    }
    return (host ? cachedTenant(host) : null) ?? (asked ? cachedTenant(asked) : null) ?? (config.rootTenant ? cachedTenant(config.rootTenant) : null);
  }

  /**
   * The same lookup for the routes addressed by tenant id. It needs its own fallback: the feed and
   * the badge are what other people's pages embed, so they must not start throwing 500s into
   * somebody else's footer because this service lost its database.
   */
  async function byId(id: string): Promise<Tenant | null> {
    const store = getStore();
    if (store) {
      try {
        const t = await store.getTenant(id);
        if (t) rememberTenant(t);
        return t;
      } catch (e) {
        console.error(`[status] could not look up ${id}: ${(e as Error).message}`);
      }
    }
    return cachedTenant(id);
  }

  /**
   * Build the public view, or fall back to the last one we held. Both paths return something a
   * page can render; the difference is the `stale` flag, which the page shows the reader.
   */
  async function statusFor(tenant: Tenant, window: number): Promise<PublicStatus> {
    const store = getStore();
    if (!store) return lastKnown(tenant.id) ?? empty(tenant);
    try {
      const since = daysBack(window)[0];
      const [services, latest, buckets, incidents] = await Promise.all([
        store.listServices(tenant.id),
        store.latestResults(tenant.id),
        store.buckets(tenant.id, since),
        store.listIncidents(tenant.id, { limit: 30 }),
      ]);
      const status = { ...project({ tenant, services, latest, buckets, incidents, days: window }), subscriptions };
      remember(tenant.id, status);
      return status;
    } catch (e) {
      console.error(`[status] could not build the view for ${tenant.id}: ${(e as Error).message}`);
      return lastKnown(tenant.id) ?? { ...empty(tenant), overall: "unknown", summary: "Status is temporarily unavailable.", stale: true };
    }
  }

  const empty = (tenant: Tenant): PublicStatus => ({
    tenant: { id: tenant.id, name: tenant.name, brand: tenant.brand },
    overall: "unknown",
    summary: "No services are being monitored yet.",
    services: [],
    incidents: [],
    updatedAt: new Date().toISOString(),
    subscriptions,
  });

  const notFoundPage = (res: import("express").Response) =>
    res.status(404).type("html").send(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No status page here</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbfbfa;color:#16181d;font:16px/1.5 ui-sans-serif,system-ui,sans-serif}@media(prefers-color-scheme:dark){body{background:#0f1115;color:#e8eaed}}</style></head><body><main><h1>No status page here</h1><p>This address isn&rsquo;t attached to a status page.</p></main></body></html>`,
    );

  /* ---------------- the page ---------------- */

  for (const path of ["/", "/s/:tenant"]) {
    r.get(path, async (req, res) => {
      const tenant = await resolve(req);
      if (!tenant || tenant.disabled) return notFoundPage(res);
      const window = days(req);
      const status = await statusFor(tenant, window);
      // Short, and revalidated: an outage should show up quickly, but a thundering crowd checking
      // the page during one must not become part of the incident.
      res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
      res.type("html").send(renderPage({ status, publicUrl: config.publicUrl, days: window }));
    });
  }

  /* ---------------- machine readable ---------------- */

  r.get("/v1/status/:tenant", async (req, res) => {
    const tenant = await byId(String(req.params.tenant));
    if (!tenant || tenant.disabled) return res.status(404).json({ error: { code: "not_found", message: "No such status page." } });
    const status = await statusFor(tenant, days(req));
    // Public by definition, so it may be read from any origin: that is what makes it embeddable.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
    res.json({ ...status, pageUrl: `${config.publicUrl}/s/${tenant.id}` });
  });

  r.get("/v1/status/:tenant/badge.svg", async (req, res) => {
    const tenant = await byId(String(req.params.tenant));
    const label = String(req.query.label ?? "status").slice(0, 40);
    const state = tenant && !tenant.disabled ? (await statusFor(tenant, 7)).overall : "unknown";
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.type("image/svg+xml").send(renderBadge(label, state));
  });

  r.get("/embed.js", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("application/javascript").send(renderEmbedScript(config.publicUrl));
  });

  /* ---------------- how to integrate ---------------- */

  r.get("/embed", async (req, res) => {
    const tenant = await resolve(req);
    const id = tenant?.id ?? "your-tenant";
    const base = config.publicUrl;
    const snippet = `<script src="${base}/embed.js" data-tenant="${id}" defer></script>`;
    const badge = `<img src="${base}/v1/status/${id}/badge.svg" alt="Service status">`;
    const block = (code: string) => `<pre><code>${esc(code)}</code></pre>`;
    res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Embed the status</title>
<style>body{margin:0;background:#fbfbfa;color:#16181d;font:16px/1.6 ui-sans-serif,system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:40px 16px 80px}h1{font-size:24px}h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#5b6472;margin-top:34px}
pre{background:#161a21;color:#e8eaed;padding:14px 16px;border-radius:10px;overflow-x:auto;font-size:13.5px}
p{color:#39414e}@media(prefers-color-scheme:dark){body{background:#0f1115;color:#e8eaed}p{color:#9aa4b2}}</style></head>
<body><main>
<h1>Put this status on your own site</h1>
<p>Everything below serves public data only. No key, no cookies, nothing to configure.</p>
<h2>A live banner</h2>${block(snippet)}
<p>Writes a coloured dot and the current summary where you put the tag. If the status service can&rsquo;t be reached it says so rather than disappearing.</p>
<h2>A badge for a README</h2>${block(badge)}
<h2>The JSON behind both</h2>${block(`GET ${base}/v1/status/${id}`)}
<p>Served with <code>Access-Control-Allow-Origin: *</code>, so you can read it from anywhere.</p>
</main></body></html>`);
  });

  return r;
}
