# ITC — the contributor app

The contributor portal on a phone. Native iOS and Android, built with Expo (SDK 58) and Expo
Router, talking to `portal/api` and nothing else.

It is a client, not a second portal: it holds no database, no service credential and no business
rule that the api does not already enforce. Everything it shows, `portal/web` can show too.

## How it talks to the portal

`portal/api` splits OAuth in two. It builds the authorize URL and it exchanges the code — both
need secrets — but whoever owns the redirect URI drives the browser. On the web that is
`portal/web`, with an https redirect and the state in a cookie. Here it is this app, with the
custom scheme `itc://auth` and the state held in memory for the length of the flow.

That means **no endpoint was added to the api for this app**. The sequence is:

1. `POST /auth/authorize` → `{ url, state, verifier }`
2. `WebBrowser.openAuthSessionAsync(url, "itc://auth")` → returns with `?code=…&state=…`
3. The app checks the returned `state` against the one from step 1. The api does not do this —
   `portal/web` checks it against its cookie, so on this side it is ours to do. Without it a
   crafted redirect could complete someone else's sign-in inside the app.
4. `POST /auth/callback` → `{ token, expiresAt }`

The token goes in the device keychain via `expo-secure-store`, and every later request sends it
as `Authorization: Bearer <token>` — exactly what `portal/web` forwards from its cookie.

## Running it

```bash
cd mobile && npm install
npx expo start
```

Then open it in **Expo Go** on a handset. Every native module it uses — auth-session, secure-store,
web-browser, svg, clipboard — ships inside Expo Go, so no development build is needed to try it.

`portal/api` has to be running (`cd portal/api && npm run dev`, port 4006). The app finds your
machine on the network by itself: it takes the host out of Expo's `hostUri`, which is how the
bundle reached the device, and swaps in port 4006. Override it when you need to:

```bash
EXPO_PUBLIC_PORTAL_API_URL=https://portal-api.example.org npx expo start
```

## The web target is for looking at layouts, not for shipping

`npx expo start --web` renders the screens in a browser, which is useful for checking a layout
without a device. Two things do not work there and are not meant to:

- **Sign-in.** On web, `openAuthSessionAsync` navigates the window instead of opening a sheet, so
  the app loses the in-flight `state` and verifier. On a device it returns into the app.
- **Reaching the api.** `portal/api` sends no CORS headers, because only `portal/web` calls it and
  it does so server-side. A browser refuses the request; a native app is not origin-restricted and
  is unaffected.

`expo-secure-store` also has no web implementation, so `src/lib/session.ts` falls back to
`localStorage` there. That fallback exists so the web target runs. It is not a security claim.

## Building and shipping

No local Xcode or Android Studio is needed — EAS builds in the cloud:

```bash
npx eas-cli@latest build --profile development --platform ios   # a dev client
npx eas-cli@latest build --profile production --platform all    # store builds
npx eas-cli@latest submit --platform ios
```

`ios/` and `android/` are generated (Continuous Native Generation) and are not in the repo. Native
behaviour is configured in `app.json` and through config plugins — never by editing those folders.

Before shipping, set `EXPO_PUBLIC_PORTAL_API_URL` in the EAS build profile to the real portal api.
Without it a release build would look for a development machine on the local network.

## Layout

```
src/app/          every file is a screen; _layout.tsx files are navigators
  _layout.tsx     providers, theme, and the gate that redirects when signed out
  sign-in.tsx
  (tabs)/         Home · Work · Claims · Profile
  profile-edit.tsx, log-work.tsx, claim-issue.tsx   presented as modals
  accounts.tsx, data.tsx
src/lib/          api client, auth, session storage, theme, types, formatting
src/components/   the whole visual vocabulary (ui.tsx) and the ITC mark (Mark.tsx)
```

`src/components/Mark.tsx` holds the nūn traced from the collective's logo at full resolution, so
the app's mark is the same shape as the one on the websites rather than a redrawing of it. The app
icons in `assets/` are generated from the same source.

## What it deliberately does not do

- **Governance.** Responding to an invitation and objecting to a nomination are decided in the
  open with the whole record beside them, which belongs on the web.
- **Release someone else's claim.** That is a maintainer's job
  (`POST /maintainers/claims/:id/release`). Your own you can hand back from the Claims screen —
  `POST /me/claims/:id/release`, which answers 404 rather than 403 for a claim that is not yours,
  so the api never reveals which claim ids exist.
- **Staff tools.** The steward and staff areas stay in `portal/web`.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
