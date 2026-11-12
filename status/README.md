# Status

Status pages for one or many domains. One deployment serves `status.itc.org`, `status.example.com`
and anyone else's, resolving the tenant from the `Host` header.

It runs the checks, keeps the history, writes the page, and hands out a JSON feed, an SVG badge and
an embeddable banner so the same reading can appear on other people's sites.

```
status/api   Express · 4008 · its own MongoDB   the checks, the history, the page, the feed
```

There is no `status/web`, and that is deliberate — see **Why it is shaped like this**.

## Why it is shaped like this

A status page is read at exactly the moment other things are failing. Three decisions follow from
that, and they are the reason this is not simply another house:

**1. It must not share fate with what it watches.** Its database is its own
(`MONGODB_URI` → `itc_status`), it reads no CMS, and it depends on nothing it monitors. A status
page that dies in the outage it exists to explain is worse than no status page at all — people
conclude the company has gone dark. Put it on separate hosting from everything else, and prefer a
separate cluster over a separate database on the same one.

**2. It has as few moving parts as will do.** The page is server-rendered HTML with no framework,
no build step and no client-side fetch. It renders without JavaScript. The badge is hand-drawn SVG.
Fewer dependencies means fewer things that can be broken at the worst possible time.

**3. It keeps answering when its own database fails.** The last good view of each tenant is held in
memory, along with which tenant each hostname belongs to. If Mongo becomes unreachable, the page,
the feed and the badge all still render from that copy, and the page tells the reader the readings
may be out of date. Only a cold process with nothing remembered gives up, and then it says so
plainly rather than showing a comforting green.

## The projection boundary

A `Service` holds both the private detail needed to probe it — the URL, which may carry a token,
and headers, which may carry a bearer — and the public detail shown on the page. **Everything a
visitor sees is built by `src/projection.ts`, field by field.** Nothing is spread from a stored
object, because a spread is how a check URL ends up on a public page the first time someone adds a
field upstream.

This matters here more than it might elsewhere. ITC's own `/health` endpoints report the CMS URL,
the database name and the full list of content collections. That is fine as an internal probe and
a free map of the system if published. The status service reads the rich internal health and
publishes only: name, description, group, state, a rounded response time, and daily history.

`test/projection.test.ts` asserts this directly, with fixtures whose check URL and headers contain
strings that must never appear in the output.

## Checks

A check is an HTTP request with three outcomes rather than two, because "down" and "slow" are
different things to the person reading:

| | |
|---|---|
| `url`, `method`, `headers` | the request. Private. |
| `expectStatus` | which statuses count as up. Default `[200]`. |
| `timeoutMs` | no answer within this is **down**. Default 10s. |
| `degradedMs` | an answer slower than this is **degraded**, not down. `0` switches it off. |
| `assert` | a dotted path and the value it must equal. |

`assert` is what turns a ping into a real check. An api whose database has gone can still answer
`200 OK`, so ITC's own services are checked with `{ "path": "ok", "equals": true }` against their
`/health`, which is false when the database is unreachable.

A probe older than ten minutes reads as **unknown**, not as still up: stale data must not look like
good news.

## Running it

```bash
cp .env.example .env.local   # then set MONGODB_URI
npm install
npm run dev
```

Create the first tenant. `SETUP_TOKEN` must be set for this, and should be unset afterwards — while
it is set, anyone who knows it can add a tenant to the deployment.

```bash
curl -X POST localhost:4008/v1/admin/tenants \
  -H "authorization: Bearer $SETUP_TOKEN" -H "content-type: application/json" \
  -d '{"id":"itc","name":"Islamic Tech Collective","hosts":["status.itc.org"],"accent":"#0f766e"}'
```

The response carries the tenant's admin token **once**; only a SHA-256 digest is stored. Everything
below uses it as a bearer, and it is scoped to that tenant: a tenant's admin can never read or
change another tenant's services, which is what makes one deployment safe to share between domains.

```bash
curl -X POST localhost:4008/v1/admin/services \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"name":"Contributor Portal","description":"Accounts, contributions and issue claims.",
       "group":"Houses",
       "check":{"url":"https://portal-api.internal/health","assert":{"path":"ok","equals":true}}}'
```

In development every request arrives as `localhost`, which matches no tenant's hosts. Set
`ROOT_TENANT=itc` to serve one by default, and leave it empty in production so an unknown host gets
a plain 404 rather than somebody else's page.

## Integrating

All three serve public data only. No key, no cookies, nothing to configure, and
`Access-Control-Allow-Origin: *`.

```html
<!-- a live banner: a coloured dot and the current summary -->
<script src="https://status.example.org/embed.js" data-tenant="itc" defer></script>

<!-- a badge for a README -->
<img src="https://status.example.org/v1/status/itc/badge.svg" alt="Service status">
```

```
GET /v1/status/itc        the JSON behind both
```

The widget writes through `textContent`, never `innerHTML`, and touches nothing else on the host
page: it is running on somebody else's site, so it behaves like a guest. If the status service
cannot be reached it says "Status unavailable" rather than disappearing.

`GET /embed` serves these snippets with the tenant id already filled in.

## Endpoints

**Public** — no authentication.

| | |
|---|---|
| `GET /` | the page, tenant resolved from `Host` |
| `GET /s/:tenant` | the page for a named tenant |
| `GET /v1/status/:tenant` | the JSON feed |
| `GET /v1/status/:tenant/badge.svg` | the badge. `?label=` renames the left half |
| `GET /embed.js`, `GET /embed` | the widget, and how to use it |
| `GET /health` | this service's own health, which is a different question from what it watches |

`?days=` sets the history window on the page and the feed, between 7 and 90.

**Admin** — `Authorization: Bearer <tenant token>`, rate limited.

| | |
|---|---|
| `POST /v1/admin/tenants` | create a tenant. Needs `SETUP_TOKEN` |
| `GET /v1/admin/me` · `PATCH /v1/admin/tenant` | this tenant and its services |
| `POST` · `PATCH` · `DELETE /v1/admin/services[/:id]` | services |
| `GET` · `POST /v1/admin/incidents` | incidents |
| `POST /v1/admin/incidents/:id/updates` | add an update; `resolved` closes it |
| `POST /v1/admin/run` | probe everything now |

## Incidents

The checks say something is down. Only an incident says what it means for the person reading, and
that is what a status page is actually for. An incident has an impact (`minor`, `major`,
`critical`, `maintenance`) and a timeline of updates, and it **outranks the probes**: a human
saying "this is broken" beats a check that happens to be passing. `maintenance` is the exception —
announced work is not an outage, and the headline stays green.

## History

Every probe is written twice: as a row, and into a daily roll-up per service. The rows are pruned
after `PRUNE_DAYS` (14 by default); the roll-ups are kept, and they are what the 90-day bars are
drawn from. History therefore stays bounded however often you check.

A day with any failure reads as down, a day with only slow checks as degraded, and a day with no
probes at all as unknown rather than as a gap you might mistake for uptime.

## Accessibility

Colour is never the only signal. Each state carries a word, and each history bar a distinct height,
so the page reads in greyscale, with colour-blindness, and through a screen reader. Every bar has
its own label giving the date and the percentage of checks that passed.
