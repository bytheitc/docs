---
title: Editing these docs
description: How staff edit, add and reorder these pages, and how anyone can suggest a change.
---

These docs are Markdown files in the [bytheitc/docs](https://github.com/bytheitc/docs) repository, in its `content/` folder. Staff edit them in the browser; every save is a commit to that repository, authored by whoever saved it.

## For staff

1. Sign in at [/admin](/admin) with your CMS account. You need access to the **Docs** space; an administrator can give it to you.
2. Pick a page, or **New page**. Write on the left; the preview on the right is exactly what readers will see.
3. Add a short note saying what you changed, and **Save**. The change is live within a few seconds.

Editors can edit and create pages. Publishers can also move and delete pages and reorder the sidebar.

If someone else saved the same page since you opened it, your save is refused rather than overwriting theirs. Copy your text, reload, and apply it again.

## Writing a page

Each file starts with a small header, then Markdown:

```md
---
title: Contributing
description: How to pick a task, claim it, and get your work merged.
---

The page starts here.
```

- `##` and `###` headings appear in the page's contents list.
- Tables, code blocks with a language (```` ```ts ````), and links to other pages (`[Contributing](/contributing)`) all work.
- Callouts use GitHub's syntax:

> [!NOTE]
> Written as `> [!NOTE]` on its own line, then the text. `TIP`, `IMPORTANT`, `WARNING` and `CAUTION` work too.

Raw HTML isn't rendered: it's shown as text, so a page can never carry a script.

## For everyone else

Open an issue or a pull request on [bytheitc/docs](https://github.com/bytheitc/docs). Pull requests that change files in `content/` go live when they merge.
