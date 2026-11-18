---
title: How the services fit together
description: The api/web split, the rules about data, and how a house is built.
---

Every house is two packages: a **web** (Next.js) that renders pages, and an **api** (Express and TypeScript) that owns data and talks to other services. The rules below hold for all of them.

## The rules

1. **A web never touches a database.** It talks only to its own api, server-side, over HTTP.
2. **An api never touches another api's database.** If a house needs another's data, it calls that house's api. Only the CMS holds content; only the portal holds contributor data.
3. **Browsers never hold service credentials.** Keys and tokens live on servers. Session cookies are httpOnly, on the web's own origin, and hold opaque tokens the web forwards as `Authorization: Bearer …`.
4. **Content models belong to the houses.** Each house api registers its own schema (collections, fields, seed content, forms) with the CMS on boot. The CMS stays generic.
5. **Degrade gracefully.** If the CMS is unreachable, a house api serves its built-in seed content read-only, and forms answer `503` so the web can say "please email us instead".

## A house api

Every house api has the same shape:

| Endpoint | Does |
|---|---|
| `GET /health` | reports CMS reachability and where content is coming from |
| `GET /content/:collection` | published content from the CMS, cached, with the seed as fallback |
| `POST /forms/:form` | checks the honeypot and sizes, then forwards to the CMS inbox |
| `POST /cms/webhook` | verifies the signature, then tells the web to refresh |

## Staff tools

Staff never have a second password. Every staff tool (portal, email, analytics, errors, these docs) signs in with the staff member's **CMS account**, and the tool's api asks the CMS whether that account may open its space. Roles are the CMS's: editors, publishers and admins.

## Running on serverless hosts

Each api's `src/app.ts` default-exports a request handler, so a serverless host can call it directly; `src/server.ts` runs the same app as a long-lived server. Work that would run on a timer runs from `GET /cron/<job>` instead, guarded by `CRON_SECRET`.

## Observability

Every api carries the same `observe.ts`: request ids, structured logs, and unhandled errors reported to [Errors](/platform/errors) (or GlitchTip or Sentry: switching is a change of `ERROR_DSN`).
