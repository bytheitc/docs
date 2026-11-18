---
title: Hosting your own
description: Run your own copy of Hifz Trail or Zakat Kit for a family, workplace or madrasah.
---

Hifz Trail and Zakat Kit can each run as your own copy, so records stay on a server you control. A family, a workplace or a madrasah can host one.

## Without accounts

Deployed with no settings at all, both apps run **device-only**: everything works, and everything is saved in each person's browser. This is the simplest copy to run and the most private.

## With accounts

Accounts let people keep their data across devices. You need:

- **A host** that runs Node.js 20 or later. A free tier is enough for a family or a class.
- **A database**: MongoDB. Atlas has a free tier; a madrasah may prefer its own server.
- **A secret**: a long random string for signing sign-ins, and the address the app is served from.

Each repository's `.env.example` lists the exact settings, and its `/host` page walks through them.

> [!TIP]
> In Zakat Kit, figures are encrypted in each person's browser before they are saved. Even you, running the server, can't read them.

## Before you share it

- **Children:** if any users are children, get consent from a parent or guardian before their records go on your server.
- **Retention:** decide, and write down, how long records are kept and how someone can have theirs deleted.
- **Backups:** keep the database backed up. What someone has memorised over years is not something to lose to a failed disk.

## Help

Open an issue on [bytheitc/hifz](https://github.com/bytheitc/hifz/issues) or [bytheitc/zakat](https://github.com/bytheitc/zakat/issues) and the maintainers will help.
