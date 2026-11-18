---
title: Status pages
description: Uptime checks and public status pages for one or many domains, from one deployment.
---

Status runs the checks, keeps the history, writes the page, and hands out a JSON feed, an SVG badge and an embeddable banner. One deployment serves many domains, choosing the tenant from the `Host` header.

**Package:** `status/api` (no web; the page is server-rendered HTML)

## Why it's shaped like this

A status page is read at exactly the moment other things are failing. So:

1. **It shares fate with nothing it watches.** Its own database, no CMS, no dependency on the services it monitors. Host it separately from everything else.
2. **It has as few moving parts as will do.** Server-rendered HTML with no framework and no client-side fetch; it renders without JavaScript.
3. **It keeps answering when its own database fails**, from the last good view held in memory, and says the readings may be out of date rather than showing a comforting green.

## Embedding

Each tenant has a JSON feed, an SVG badge and a banner other sites can embed, all built field by field from what's safe to show, so a check's private URL or token never leaks into public output.

## Scheduled checks

On a long-running server, checks run on a timer. On a serverless host they run from `GET /cron/checks` with `Authorization: Bearer <CRON_SECRET>`, called by an outside scheduler.
