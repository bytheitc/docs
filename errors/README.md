# Errors

The collective's own error tracker, at `errors.bytheitc.xyz`. It speaks the Sentry ingest protocol,
the same one GlitchTip speaks, so every service can report to GlitchTip, Sentry or this, and
switching is a change of `ERROR_DSN`.

```
errors/api   Express · 4011 · its own MongoDB   ingest, grouping, alerts, staff pages
```

Like `status/`, there is no `errors/web`: the staff pages are server-rendered HTML with no client
JavaScript. A tool opened when things are breaking should have few parts of its own to break.

## What it does

- **Ingest:** `POST /api/:project/envelope/` and `/store/`, authenticated by the project's public
  key. Gzip and deflate bodies work, and CORS is open for browser SDKs.
- **Grouping:** same exception type plus the same in-app frames (function and file, never line
  numbers) is one issue. Messages group by shape, with numbers, ids and quoted values stripped.
  An SDK `fingerprint` wins, and `{{ default }}` stands for ours.
- **Lifecycle:** unresolved, resolved, ignored. A new event on a resolved issue reopens it as a
  regression. An ignored issue stays ignored.
- **Alerts:** new issues and regressions only, to a webhook (Slack and Discord accept the body) and/or
  email through `email/api`. At most one alert per issue per cooldown, claimed in the database.
- **Privacy:** query strings, cookies, authorization and service-key headers are never stored.
  Events expire after `RETENTION_DAYS` (TTL index); issues and daily counts remain.

## Setting it up

1. Deploy `errors/api` with `MONGODB_URI`, `PUBLIC_URL`, `CMS_API_URL`, `CMS_SPACE_KEY`.
2. Give the staff who should see errors access to the **Errors** space in the CMS.
3. Create one project per service, at `/projects` (admins) or from the command line:
   `npm run project -- "site-api"`, which prints the DSN.
4. On each service set `ERROR_REPORTING=glitchtip` and `ERROR_DSN=<that DSN>`. Setting
   `ERROR_REPORTING=logs` switches back to logs only, with no other change.
