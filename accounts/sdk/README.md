# itc-accounts-sdk

A dependency-free client for **"Sign in with ITC"** — the Islamic Tech Collective's OAuth 2.0 /
OpenID Connect provider. One file, built entirely on the Web Crypto API (`crypto.subtle`,
`crypto.getRandomValues`) and `fetch`, so it runs unmodified in a browser or in Node 22+ — both
expose the same globals.

It does not hand-roll anything security-critical of its own: PKCE and id_token verification are
each a direct, well-documented use of a standard primitive (`crypto.subtle.digest`,
`crypto.subtle.verify`), not a reimplementation of one.

## Install

This package lives in the ITC monorepo at `accounts/sdk` and isn't published yet. Until it is,
build it and reference the `dist/` output directly:

```sh
cd accounts/sdk
npm install
npm run build
```

## Quickstart

Register an app first — at `/developers` on your accounts deployment (`id.itc.org` in
production) — and you'll have a `client_id` (and a `client_secret`, if you registered a
confidential client).

```ts
import { AccountsClient } from "itc-accounts-sdk";

const accounts = new AccountsClient({
  issuer: "https://id.itc.org/oauth",
  clientId: "your-app-ab12cd34",
  // clientSecret: "…", // only for a confidential client
});
```

### 1. Send someone to sign in

```ts
const { verifier, challenge } = await accounts.createPkcePair();
// Keep `verifier` for step 2 — in a server session, a signed cookie, wherever this request's
// state already lives. Never put it in the URL.

const state = accounts.randomToken(); // echoed back, so you can tell this redirect apart from a stale one

const url = await accounts.buildAuthorizeUrl({
  redirectUri: "https://your-app.example/callback",
  scope: "profile", // openid is always included automatically
  state,
  codeChallenge: challenge,
});

// redirect the browser to `url`
```

### 2. Handle the callback

Your redirect URI receives `?code=...&state=...`. Check `state` matches what you sent, then:

```ts
const tokens = await accounts.exchangeCode({
  code,
  redirectUri: "https://your-app.example/callback", // exactly what you sent above
  codeVerifier: verifier, // from step 1
});

// tokens.access_token  — call the userinfo endpoint, or your own resource server, with this
// tokens.id_token      — who this is, signed; verify it before trusting any claim in it
// tokens.refresh_token — only present if you asked for the offline_access scope
```

### 3. Know who signed in

Prefer verifying the `id_token` over calling userinfo when you just need to know who it was —
it's already in hand, and it's signed:

```ts
const claims = await accounts.verifyIdToken(tokens.id_token);
console.log(claims.sub, claims.preferred_username, claims.name);
```

`verifyIdToken` checks the RS256 signature against the provider's published JWKS, and that `iss`
and `aud` and `exp` are right — not just that the JSON parses. Use `decodeIdToken` only when the
token came straight from your own server's call to the token endpoint over TLS a moment ago, with
nothing in between; anywhere else (a token a browser handed you, one you stored and are reading
back), verify it.

Need more than `profile` gave you? Call userinfo with the access token:

```ts
const info = await accounts.getUserInfo(tokens.access_token);
```

### 4. Staying signed in

If you asked for `offline_access`, `tokens.refresh_token` can get you a new access token once the
old one expires (an hour), without sending the person through the browser flow again:

```ts
const fresh = await accounts.refresh({ refreshToken: tokens.refresh_token });
```

### 5. A resource server of your own

If another one of your services needs to check whether an access token it was handed is still
good (not just well-formed — actually live, not revoked), introspect it. This needs your client
credentials, so do it from a server, never a browser:

```ts
const result = await accounts.introspect(accessToken);
if (result.active) { /* result.sub, result.scope, result.exp */ }
```

### Signing someone out of your app

```ts
await accounts.revoke(tokens.access_token);
if (tokens.refresh_token) await accounts.revoke(tokens.refresh_token);
```

## Scopes

| Scope | Claims it releases |
|---|---|
| `openid` | `sub` — always included, confirms who signed in |
| `profile` | `preferred_username`, `name`, `picture` |
| `contributions` | `itc_contributions`, `itc_houses` |
| `entitlements` | `itc_tier`, `itc_entitlements` — reviewed before your app can request it |
| `offline_access` | issues a `refresh_token` — reviewed before your app can request it |

Registering for anything past `profile` holds your app for a quick staff review before it can
sign anyone in — see the full integration guide at `/docs` on your accounts deployment for why,
and what review looks like.

## What this package is not

It is not a UI kit, a session-storage layer, or a framework integration — it wraps the HTTP calls
and the two pieces of cryptography (PKCE, JWT verification) that are easy to get wrong by hand.
Where you keep the verifier between steps 1 and 2, how you store the resulting session, and how
you redirect a browser are all yours to decide; the standalone functions in `client.ts`, `pkce.ts`
and `jwt.ts` are exported individually for exactly that reason, if `AccountsClient`'s shape
doesn't fit how your app is built.

## API reference

Everything is exported from the package root:

- **`AccountsClient`** — the class used above. Constructor takes `{ issuer, clientId, clientSecret? }`.
- **`createPkcePair()`**, **`randomToken(byteLength?)`** — PKCE and opaque-value generation.
- **`discover(issuer)`**, **`getJwks(discovery)`** — fetch the provider's own metadata; `AccountsClient` caches both after the first call.
- **`buildAuthorizeUrl(discovery, opts)`**, **`exchangeCode(discovery, auth, opts)`**, **`refreshAccessToken(discovery, auth, opts)`**, **`getUserInfo(discovery, accessToken)`**, **`introspectToken(discovery, auth, token)`**, **`revokeToken(discovery, auth, token)`** — the standalone functions `AccountsClient`'s methods call.
- **`decodeJwt(token)`**, **`verifyJwt(token, jwks, expected)`** — id_token handling without a client instance.
- **`OAuthHttpError`** — thrown by every HTTP call on a non-2xx response; carries the RFC 6749 `code` (e.g. `invalid_grant`) and the `status`.
- **`JwtVerificationError`** — thrown by `verifyJwt` / `verifyIdToken` on a bad signature, issuer, audience, or an expired token.
