# AuthOS Documentation

This is the documentation for AuthOS, built with Mintlify.

## Development

To preview the documentation locally, you need the [Mintlify CLI](https://www.npmjs.com/package/mint).

1. Install the CLI:
   ```bash
   npm i -g mint
   ```

2. Run the preview server from this directory (`apps/docs`):
   ```bash
   mint dev
   ```

Or run it via `turbo` from the root of the monorepo:
```bash
npm run dev -- --filter=docs
```

## Deployment

AuthOS documentation is automatically deployed via the Mintlify GitHub app whenever changes are pushed to the main branch of the [bytheitc/docs](https://github.com/bytheitc/docs) repository.

Since this directory is a git submodule or a separate repository integrated into the monorepo, ensure you push changes to the corresponding remote.
