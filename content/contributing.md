---
title: Contributing
description: How to pick a task, claim it, and get your work merged.
---

Everything the collective builds is open source, on GitHub under [bytheitc](https://github.com/bytheitc). You don't need permission to start: pick a task, claim it, open a pull request.

## 1. Pick a task

Every open task is a GitHub issue. The easiest place to start is [The First Hundred](/first-hundred), a hundred tasks across four projects, each written to be done by one person. Issues labelled `good first issue` on any repository are fair game too.

A good issue tells you **why** it matters, **what** to do, **which files** to look at, and **what counts as done**. If one doesn't, ask on the issue before you start.

## 2. Claim it

Sign in to the contributor portal with GitHub and claim the issue. Claiming tells everyone it's yours, so two people don't do the same work:

- A claim lasts **7 days**. If you need longer, say so on the issue.
- Where it can, the portal also assigns the GitHub issue to you.
- If you can't finish, release the claim from your dashboard so someone else can pick it up. No one minds.

## 3. Do the work

Each repository's README explains how to run it, and most need nothing more than:

```sh
git clone https://github.com/bytheitc/<repo>
cd <repo>
# then the install and test commands in its README, e.g.
pnpm install && pnpm test
```

You should never need an API key, a `.env` file or a database just to run the tests. If you do, that's a bug worth its own issue.

A few things every project cares about:

- **Comments explain why, not what.** `// merge the arrays` is noise; a comment that explains why the obvious approach is wrong is gold.
- **Tests for logic.** Anything that computes something (a schedule, a zakat figure, a verification) needs a test, named as a sentence about behaviour.
- **Religious content is reviewed.** Where a task touches fiqh, Qur'an text or anything scholars differ on, the issue says so, and a maintainer checks the wording before it merges. Code never quietly takes a side.

## 4. Open a pull request

Push to a branch on your fork and open a pull request against `main`. Put `Closes #<issue>` in the description so the issue closes when it merges. A maintainer reviews it; expect questions, not just approval.

Once it merges, the task counts as done on The First Hundred and on your portal profile.

## Not code?

Design, documentation, accessibility reviews and testing on real devices are all contributions. Issues carry a `track:` label (`code`, `tests`, `docs`, `design`, `accessibility`) so you can find the kind of work you do.
