# Analytics

The collective's own web analytics, at `analytics.bytheitc.xyz`. It tells us whether people arrive,
where from, and what they do, without cookies, without storing anyone's address, and without a
consent banner's worth of tracking.

```
analytics/api   Express · 4012 · its own MongoDB   tracker script, collection, staff dashboards
```

Like `errors/` and `status/`, there is no `analytics/web`: the dashboards are server-rendered HTML
with no client JavaScript.

## What it counts, and what it never keeps

- **Page views**, including client-side navigation (Next.js `pushState`), by path only. Query
  strings and fragments are dropped before anything is stored.
- **Visitors**, counted per day. A visitor is `sha256(daily salt, site, IP, user agent)`. The salt is
  random, shared by every instance, and deletes itself two days later, after which nobody, us
  included, can recompute a hash or link one day's visitor to the next. Visitors over a range are
  the sum of each day's.
- **Referrer host** (not the full URL), `utm_source`, **country** from the host's geo header
  (`x-vercel-ip-country` or `cf-ipcountry`, nothing looked up), **device** by viewport width,
  **browser** and **OS**.
- **Custom events**: `data-itc-event="Apply: started"` on anything clickable, or `itc("signup")`
  from code. Names only, with no properties, so nothing personal can be attached to one.
- **Not counted:** bots and previews, other people's sites copying the tag (each site lists its
  domains), localhost, and anyone whose browser sends Do Not Track or Global Privacy Control.
  `localStorage.itc_ignore = "1"` stops counting one browser, for staff.

Page views expire after `RETENTION_DAYS` (400 by default, so this year can be compared with last).

## Setting it up

1. Deploy `analytics/api` with `MONGODB_URI`, `PUBLIC_URL`, `CMS_API_URL`, `CMS_SPACE_KEY`. Behind a
   proxy, make sure Express sees the visitor's address (`TRUST_PROXY=on`; automatic on Vercel),
   or everyone is counted as one visitor.
2. Give the staff who should see numbers access to the **Analytics** space in the CMS.
3. Add one site per web property, at `/sites` (admins) or from the command line:
   `npm run site -- "ITC Engineering" engineering.bytheitc.xyz`, which prints the two variables.
4. On each web (site, ai, engineering, health, institute, oss, research, portal) set, in the
   **build** environment:
   `NEXT_PUBLIC_ANALYTICS_URL=https://analytics.bytheitc.xyz` and `NEXT_PUBLIC_ANALYTICS_SITE=<site id>`.
   The layout then loads the script and the CSP allows that one origin. With either unset, no
   script loads.
5. Anywhere else, paste the tag from `/sites`:
   `<script defer src="https://analytics.bytheitc.xyz/script.js" data-site="<site id>"></script>`.

The privacy notice should say this in a sentence: anonymous, cookieless page counts; no personal
data; IP addresses are never stored.
