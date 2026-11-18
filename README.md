# ITC Docs

The Islamic Tech Collective's documentation: how to contribute, what we build, and how to build on it.

```
content/   the pages, as Markdown, and nav.json (the sidebar)
api/       Express · 4013   serves the pages; commits staff edits back to this repository
web/       Next.js · 3011   the reading site, and the editor at /admin
```

## Suggesting a change

Edit a file in `content/` and open a pull request, or open an issue. Staff can also edit in the
browser at `/admin`: every save is a commit here, authored by them.

## Running it

```sh
cd api && npm install && npm run dev     # reads ../content when no GitHub token is set
cd web && npm install && npm run dev     # http://localhost:3011
```

The editor signs in with a CMS account that can open the **Docs** space, so it needs `cms/api`
running too. In production `docs/api` reads and writes this repository with `DOCS_GITHUB_TOKEN`, a
fine-grained token with Contents: read and write on `bytheitc/docs` only. See each `.env.example`.

`npm test` in `api/` runs the tests; no network or database needed.
