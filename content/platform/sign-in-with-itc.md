---
title: Sign in with ITC
description: Let people sign in to your app with their ITC account, over OAuth 2.0 and OpenID Connect.
---

Sign in with ITC is the collective's identity provider. Your app sends people to it, they sign in with their ITC account, and you get back who they are, signed, without ever handling their password.

It is standard **OAuth 2.0 with OpenID Connect**, so any OIDC library works. The collective also has a small dependency-free client, `itc-accounts-sdk`.

## What you get

| | |
|---|---|
| Discovery | `GET /oauth/.well-known/openid-configuration`, `GET /oauth/jwks` |
| Flow | Authorization code with PKCE (S256), always. No implicit flow, no password grant. |
| Tokens | Opaque access and refresh tokens; an RS256-signed `id_token` |
| Scopes | `openid`, `profile`, `contributions`, `entitlements`, `offline_access` |

Replaying an authorization code, or reusing a rotated refresh token, revokes every token your app holds for that person. That's deliberate: it means a stolen code is noticed.

## Register your app

Register at `/developers` on the accounts site. An app that asks only for `openid` and `profile` gets its `client_id` at once. Asking for `contributions`, `entitlements` or `offline_access`, or registering a confidential client (one with a secret), is reviewed by staff first. Redirect URIs must match exactly.

## Sign someone in

```ts
import { AccountsClient } from "itc-accounts-sdk";

const accounts = new AccountsClient({ issuer: "https://<accounts host>/oauth", clientId: "your-app-ab12cd34" });

// 1. Send them to sign in. Keep `verifier` server-side for step 2.
const { verifier, challenge } = await accounts.createPkcePair();
const state = accounts.randomToken();
const url = await accounts.buildAuthorizeUrl({ redirectUri: "https://your-app.example/callback", scope: "profile", state, codeChallenge: challenge });

// 2. On the callback, check `state`, then exchange the code.
const tokens = await accounts.exchangeCode({ code, redirectUri: "https://your-app.example/callback", codeVerifier: verifier });

// 3. Know who it is. Verify the id_token rather than trusting its claims unchecked.
const claims = await accounts.verifyIdToken(tokens.id_token);
```

## Scopes

- **`profile`**: name, handle and avatar.
- **`contributions`**: how many contributions someone has and in which houses.
- **`entitlements`**: a `tier` and `entitlements` set by staff. Not billing: your app decides what a tier means.
- **`offline_access`**: a refresh token, so you can act when they aren't present.

> [!NOTE]
> An ITC account is created through the contributor portal's sign-in (GitHub and the other providers it offers). Sign in with ITC never creates accounts of its own.
