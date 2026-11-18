---
title: Errors
description: The collective's own error tracker, compatible with Sentry and GlitchTip.
---

Errors collects unhandled exceptions from every ITC service, groups them into issues, and alerts on new ones and regressions. It speaks the Sentry ingest protocol, so a service can report to it, to GlitchTip or to Sentry, and switching is a change of DSN.

**Package:** `errors/api` (no web; staff pages are server-rendered HTML)

## What it does

- **Ingest** at `POST /api/:project/envelope/`, authenticated by the project's public key.
- **Grouping**: the same exception type and the same in-app frames (function and file, never line numbers) is one issue.
- **Lifecycle**: unresolved, resolved, ignored. A new event on a resolved issue reopens it as a regression.
- **Alerts** for new issues and regressions only, to a webhook (Slack and Discord accept it) or by email, at most once per issue per cooldown.
- **Privacy**: query strings, cookies and authorization headers are never stored, and events expire.

## Reporting from a service

Every ITC api already carries `observe.ts`. Set:

```sh
ERROR_REPORTING=glitchtip
ERROR_DSN=https://<public key>@<errors host>/<project id>
```

`ERROR_REPORTING=logs` switches back to logs only, with no other change.
