---
title: Analytics
description: The collective's own cookieless web analytics, with no personal data stored.
---

Analytics tells us whether people arrive, where from, and what they do, without cookies, without storing anyone's address, and without a consent banner's worth of tracking.

**Package:** `analytics/api` (no web; dashboards are server-rendered HTML)

## What it counts

- **Page views**, by path only. Query strings and fragments are dropped before anything is stored.
- **Visitors per day.** A visitor is a hash of a daily random salt, the site, the IP address and the browser. The salt deletes itself two days later, after which nobody, us included, can link one day's visitor to the next.
- **Referrer host, `utm_source`, country, device size, browser and OS.**
- **Custom events**, by name only, so nothing personal can be attached to one: `data-itc-event="Signup: started"` on anything clickable.

## What it never counts

Bots and previews, localhost, other people's sites copying the tag, and anyone whose browser sends Do Not Track or Global Privacy Control.

## Adding it to a site

On an ITC web, set `NEXT_PUBLIC_ANALYTICS_URL` and `NEXT_PUBLIC_ANALYTICS_SITE` at build time; the layout loads the script and the content security policy allows that one origin. Anywhere else, paste the tag shown for the site in the analytics staff pages.

The privacy notice can say it in a sentence: anonymous, cookieless page counts; no personal data; IP addresses are never stored.
