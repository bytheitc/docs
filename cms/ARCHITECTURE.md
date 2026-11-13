# ITC Architecture

Every app has two parts: a **Next.js web** frontend and an **Express + TypeScript api** backend. Each part is its own
package with its own `package.json` and `node_modules`. There is no shared workspace and no shared package.
Content lives in one independent **CMS service**, which has its own backend and UI.

```
browser ──> <house>/web ──> <house>/api ──> cms/api ──> MongoDB (itc_cms)
                                 │
                                 └──> house logic (forms, portal auth, sync, claims…)

editors ──> cms/web ──> cms/api
```

## Folders and ports

| App | Web (Next.js) | API (Express + TS) |
|---|---|---|
| Collective | `site/web` · 3000 | `site/api` · 4000 |
| AI | `ai/web` · 3001 | `ai/api` · 4001 |
| Engineering | `engineering/web` · 3002 | `engineering/api` · 4002 |
| Health | `health/web` · 3007 | `health/api` · 4007 |
| Institute | `institute/web` · 3003 | `institute/api` · 4003 |
| Open Source | `oss/web` · 3004 | `oss/api` · 4004 |
| Research | `research/web` · 3005 | `research/api` · 4005 |
| Contributor portal | `portal/web` · 3006 | `portal/api` · 4006 |
| **CMS** | `cms/web` · 3100 | `cms/api` · 4100 |
| **Status** | — | `status/api` · 4008 |

A space id is the house id: `site`, `ai`, `engineering`, `health`, `institute`, `oss`, `research`, `portal`.

## Rules
1. **A web never touches a database.** It talks only to its own api, server-side, over HTTP.
2. **An api never touches another api's database.** Only `cms/api` holds content, and only `portal/api` holds portal data.
   `status/api` holds its own, and deliberately depends on nothing it watches: see `status/README.md`.
3. **Browsers never hold service credentials.** Space keys and api tokens live on servers. Session cookies are httpOnly, on the web's
   own origin, and hold opaque tokens that the web forwards to its api as `Authorization: Bearer …`.
4. **Content models belong to the houses.** Each house api *registers* its schema (collections, fields, seed content, forms) with the
   CMS on boot. The CMS stays generic and knows nothing about any house.
5. **Degrade gracefully.** If the CMS is unreachable or not configured, a house api serves its built-in seed content read-only
   (header `X-Content-Source: seed`), and forms answer `503` so the web can show "please email us instead".

## CMS API contract (v1)

JSON in and out. Errors look like `{ "error": { "code": "…", "message": "…", "fields": { "path": "message" } } }`.

### Auth
- **Space keys** (service to service). A house api sends `Authorization: Bearer <space key>`. Keys are configured in
  `CMS_SPACE_KEYS="site:<key>,ai:<key>,…"`. In development only (`NODE_ENV !== "production"`), the key `dev-<space>-key` is accepted
  when a space has no configured key. A key is scoped to one space.
- **User sessions** (`cms/web` and staff tools). `POST /v1/auth/login {email, password}` → `{ token, user }`. The token is opaque, and
  the api stores only its hash. Users have a `role` (editor | publisher | admin) and `spaces` (`"*"` or a list of space ids).

### Delivery: space key required, scoped to `:space`
| Method | Path | Purpose |
|---|---|---|
| PUT | `/v1/spaces/:space/schema` | Register or update `{ label, title, collections: CollectionDef[] (with seed as JSON arrays), forms: {id: label}, links?: [{href,label,role?}], webhook?: {url} }`. Seeds empty collections. Idempotent. |
| GET | `/v1/spaces/:space/content/:collection` | `{ entries: [data…] }`, published only, in editor order |
| GET | `/v1/spaces/:space/content/:collection/:id` | `{ entry: data }`, or 404 |
| POST | `/v1/spaces/:space/submissions` | `{ form, fields, honeypot? }` → `202`. Honeypot submissions are accepted and dropped. |
| POST | `/v1/auth/introspect` | `{ token }` → `{ user }` or 401. Lets a house api check a staff member's CMS session for that space. |

### Management: user session required
- **Auth:** `POST /v1/auth/setup` (first admin; needs `CMS_SETUP_TOKEN` in production), `POST /v1/auth/logout`, `GET /v1/auth/me`,
  `POST /v1/auth/password`.
- **Spaces:** `GET /v1/spaces` (the spaces this user may open), `GET /v1/spaces/:space` (schema, forms, links, counts, review queue).
- **Entries:**
  - `GET` and `POST /v1/spaces/:space/collections/:collection/entries`
  - `GET`, `PUT` (body `{ data, intent: "save" | "submit" | "publish" }`) and `DELETE` (body `{ confirm }`) on `…/entries/:id`
  - `POST …/entries/:id/status` `{ to }`, `POST …/entries/:id/move` `{ dir }`
  - `GET …/entries/:id/revisions`, `POST …/entries/:id/restore` `{ at }`
- **Inbox:** `GET /v1/spaces/:space/inbox`, `GET` and `PATCH /v1/spaces/:space/inbox/:id`.
- **Admin only:** `GET` and `POST /v1/users`, `PATCH /v1/users/:id`, `GET /v1/audit`.
- **Workflow:** the same as before. Editors draft and submit; publishers publish, reorder and delete. Edits to a live entry are held as
  *pending* until a publisher publishes them. Every action is written to the audit log.

### Implementation notes (v1, as built in `cms/api`)
- **Additions:** `GET /health` (no auth; `{ ok, database }`, 503 when the database is down) and `GET /v1/auth/status` (no auth;
  `{ setupNeeded, setupTokenRequired }`, so a sign-in page can choose between sign-in and first-admin setup).
- **Auth responses:** `login`, `setup` and `password` return `{ token, expiresAt, user }`; `password` ends every other session.
  `user` is `{ id, email, name, role, spaces, createdAt, disabled? }` and never includes a hash.
- **Admins** always have `spaces: "*"`. `PATCH /v1/users/:id` takes `{ name?, role?, spaces?, disabled?, password? }`; disabling or
  resetting a password ends that user's sessions.
- **Seeding:** each collection is seeded once, while empty. A collection an editor has emptied is not refilled on the next
  registration. `PUT …/schema` answers `{ space, changed, seeded: [collection…] }`; seed arrays are not stored.
- **Space links:** `href` should be absolute (`https://…`); the CMS shows them as external links in the space's sidebar.
- **Error codes:** `bad_request`, `validation_failed` (with `fields`), `unauthorized`, `forbidden`, `not_found`, `conflict`,
  `payload_too_large`, `rate_limited`, `internal`. Bodies are capped at 256 kB (8 MB for `PUT …/schema`).

### Webhooks
When a space registers `webhook.url`, the CMS POSTs `{ space, collection, id, event }` after any change that affects published content,
signed with `X-CMS-Signature: sha256=<HMAC of body, keyed by the space key>`. `event` is one of `publish`, `update`,
`unpublish`, `delete`, `move`. Delivery is fire-and-forget (4 s timeout) and each outcome is written to the audit log. The house api verifies the signature and calls its web's
`POST /api/revalidate` with `REVALIDATE_SECRET`. Web data caches are also short (60 s), so pages stay fresh without webhooks.

## House api (each house)
- `GET /health` reports CMS reachability and the content source.
- `GET /content/:collection` and `GET /content/:collection/:id` proxy CMS delivery, with a short in-memory cache and the seed fallback.
- `POST /forms/:form` checks the honeypot and sizes, then forwards to CMS submissions.
- `POST /cms/webhook` verifies the signature, then triggers web revalidation.
- House-specific endpoints as needed, e.g. `oss/api GET /portal-wall` (from `portal/api`).
- On boot it registers its schema with the CMS, retrying with backoff. Failure is not fatal.

## As built

Phase 2 is done: all seven houses are split. A few details settled during the work.

- **House apis are one template.** `config.ts`, `http.ts`, `cms.ts`, `schema.ts`, `register.ts`,
  `revalidate.ts`, `app.ts`, `server.ts` and `routes/` are identical in every house, like the Khatam mark.
  Only `src/content/` and `src/content/house.ts` (space id, label, ports) differ.
- **Seed content lives with the api.** A house's content modules moved to `<house>/api/src/content/`; the web
  keeps the TypeScript types its pages render. There is one source of truth for the content, and it is the
  side that registers it.
- **Webs reach their api through one file,** `lib/api.ts`: `getPublished`, `getPublishedOne`, `getSingleton`
  and `submitForm`. Reads are cached for `CONTENT_TTL` and tagged `content` / `content:<collection>`, so
  `POST /api/revalidate` can drop exactly what changed.
- **`SpaceLink` hrefs may be paths.** `buildSchema` resolves a leading `/` against `WEB_URL`, so the portal
  registers `/staff` and the CMS shows the absolute address.
- **A form failure reports `unavailable`,** not `no-database`: a web has no database to be missing.

## Portal
- **`portal/api`** owns contributor auth (OAuth code exchange; access tokens are discarded), bearer sessions, the dashboard,
  self-logged work, profiles, export and deletion, claims, providers, sync and the public wall (`GET /public/contributors`). Its data
  lives in MongoDB `itc_portal`. Its CMS-managed content (landing, faq, sources, milestones, settings) is in CMS space `portal`.
- **`portal/web`** has the public pages and dashboard. OAuth start and callback routes run on the web origin and delegate the exchange
  to the api. **`/staff/*`** holds the portal tools (contributors, verification, claims, sync, providers), signed in with a CMS account
  that has access to space `portal` (checked by `portal/api` through CMS introspection). The CMS space `portal` links to `/staff`.

### Portal api surface (as built)
- **Auth:** `GET /auth/providers`, `POST /auth/authorize`, `POST /auth/callback`, `POST /auth/signout`,
  `POST /auth/signout-all`. The web owns the redirect URI and the short-lived state/PKCE cookie; the api holds the
  client id and secret, exchanges the code, reads the profile and discards the access token.
- **Sessions** are opaque bearer tokens. The api stores only a SHA-256 hash; the web keeps the token in an httpOnly
  cookie on its own origin and forwards it as `Authorization: Bearer …`.
- **The contributor:** `GET /me`, `GET /me/dashboard`, `GET /me/export`, `DELETE /me`, `PATCH /me/profile`,
  `POST /me/contributions`, `DELETE /me/accounts/:provider/:providerUserId`, `POST /me/claims`.
- **Public:** `GET /public/contributors` (the opt-in wall, read by `oss/api`) and `GET /public/contributors/:handle`,
  which returns a list only for the switches that person turned on.
- **Staff:** `POST /staff/login` (proxies the CMS's own sign-in, so there is no second password), then
  `/staff/overview`, `/staff/contributors`, `/staff/contributions`, `/staff/claims`, `/staff/sync`,
  `/staff/providers` and `/staff/audit`. Editors read; publishers verify, hide, release and sync; admins disable.
  Staff changes go to the portal's **own** audit log (`portal_audit`), because this api owns the data they change.

## Environment (per package; see each `.env.example`)
- `cms/api`: `MONGODB_URI`, `CMS_DB_NAME` (`itc_cms`), `CMS_SPACE_KEYS`, `CMS_SETUP_TOKEN`, `PORT`; optional `CMS_DB` (`mongodb`),
  `CMS_TRUST_PROXY`, `CMS_LOGIN_LIMIT`, `CMS_LOG=off`.
- `cms/web`: `CMS_API_URL`, `PORT`.
- `<house>/api`: `CMS_API_URL`, `CMS_SPACE_KEY`, `API_PUBLIC_URL` (the address the CMS posts webhooks to), `WEB_URL`,
  `REVALIDATE_SECRET`, `PORT`, `CONTENT_TTL`, plus house-specific settings: `PORTAL_API_URL` for `oss/api`, and
  `MONGODB_URI`, `PORTAL_DB_NAME` and the OAuth provider settings for `portal/api`.
- `<house>/web`: `API_URL`, `REVALIDATE_SECRET`, and the `NEXT_PUBLIC_ITC_*_URL` links. `portal/web` also takes
  `NEXT_PUBLIC_CMS_WEB_URL`, so its staff tools can link into the Studio.

Databases: one MongoDB cluster (Atlas). `cms/api` uses `itc_cms`; `portal/api` uses `itc_portal`. `status/api` uses `itc_status`,
and should be given separate hosting — ideally a separate cluster — since a status page that fails with everything else is useless. Other databases can be supported
behind the storage-adapter interface in `cms/api`.

## Databases and secrets (provisioned)

One MongoDB Atlas cluster, with one database per part:

| Database | Used by | Holds |
|---|---|---|
| `itc_cms` | `cms/api` | content, revisions, inbox, editor accounts, sessions, audit log |
| `itc_portal` | `portal/api` | contributors, linked accounts, contributions, claims, sync runs |
| `itc_site`, `itc_ai`, `itc_engineering`, `itc_institute`, `itc_oss`, `itc_research` | each house api | data the house api owns itself. First use: a **form outbox**, so a submission is stored when the CMS is unreachable and forwarded later. House *content* stays in `itc_cms`. |

Each database has a `_meta` document describing its purpose. Web packages never get database settings.

Secrets live only in git-ignored files (the root `.gitignore` excludes every `.env*` except `.env.example`):
- `itc/.env.cluster`: the cluster `MONGODB_URI` (mode 600). It is the source for every api's `.env.local`.
- `itc/.env.space-keys`: one generated key per space (`CMS_SPACE_KEY_<SPACE>`). `cms/api` gets all of them as `CMS_SPACE_KEYS`; each house api gets only its own as `CMS_SPACE_KEY`.
- `<part>/api/.env.local`: written from those files. Apis load it with Node's `--env-file-if-exists=.env.local` in their `dev` and `start` scripts. Never print or log these values.
