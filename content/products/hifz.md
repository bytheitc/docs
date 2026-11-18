---
title: Hifz Trail
description: A Qur'an revision schedule for what you have memorised, in the order of the mushaf, private by default.
---

Memorising is the part people plan. Revision is the part that decides whether any of it lasts, and almost nobody has a system for it. Hifz Trail tells you what to recite today, and keeps an honest count of what you actually hold.

**Repository:** [bytheitc/hifz](https://github.com/bytheitc/hifz) · TypeScript, Next.js

## What it does

- **Track memorised portions**: a whole surah, or a range of ayat within one.
- **A schedule built for hifz.** Three grades (*solid*, *shaky*, *lost*). A lost portion drops back to tomorrow. The day's queue comes back **in the order of the mushaf**, not most-overdue-first, because that's the order the text sits in your memory.
- **An honest progress count** out of all 6,236 ayat, which can't exceed 100% however your portions overlap.
- **The week ahead**, so you see a heavy Thursday before taking on a new surah.
- **A trouble spot**, named: the portion that is actually slipping, not merely one that slipped years ago.
- **Teaching mode** for a halaqah: a register of students, each with their own trail, graded by the teacher whose judgement is the one worth recording.

## Private by default

Everything runs on your device and is saved in your browser. Nothing is sent anywhere unless you choose to:

- **Back up to a file** and restore it on another device.
- **Make an account** to sync your trail between devices (on a copy that has accounts switched on).

## Hosting your own

A family, a workplace or a madrasah can run its own copy, so records stay on its own server. See [Hosting your own](/self-hosting).

## Contributing

Open tasks are labelled [`first-hundred`](https://github.com/bytheitc/hifz/issues?q=is%3Aopen+label%3Afirst-hundred). The repository's `CONTRIBUTING.md` explains the house style. One rule matters more than the rest: `data/quran-meta.json` has a test asserting the ayah counts total 6,236. If you change that file and the test fails, the change is wrong.
