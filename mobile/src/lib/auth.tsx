// Sign-in, and who is signed in.
//
// The portal api splits OAuth in two: it builds the authorize URL and it exchanges the code, but
// whoever owns the redirect URI drives the browser. On the web that is portal/web; here it is this
// app, with a custom scheme (itc://auth) instead of an https redirect. Nothing else differs, which
// is why no new endpoint was needed to put the portal on a phone.
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import * as api from "./api";
import { ApiError } from "./api";
import { clearToken, readToken, writeToken } from "./session";
import type { Contributor, LinkedAccount } from "./types";

// Web only: lets the popup hand control back to the page that opened it.
WebBrowser.maybeCompleteAuthSession();

export type SignInResult = { ok: true } | { ok: false; error: string };

interface AuthValue {
  /** null once we know nobody is signed in; undefined while we are still finding out. */
  contributor: Contributor | null | undefined;
  accounts: LinkedAccount[];
  token: string | null;
  loading: boolean;
  /** True while a browser sheet is open. */
  busy: boolean;
  signIn: (provider: string, devUser?: string) => Promise<SignInResult>;
  /** Adds another provider identity to the account already signed in. */
  linkAccount: (provider: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** `itc://auth` on a device; the dev-server URL under Expo Go; the page origin on web. */
export function redirectUri(): string {
  return AuthSession.makeRedirectUri({ scheme: "itc", path: "auth" });
}

/** Pulls `code` and `state` out of the URL the browser came back to. */
function paramsFrom(url: string): { code?: string; state?: string; error?: string } {
  try {
    const u = new URL(url);
    const q = u.searchParams;
    // Some providers answer in the fragment rather than the query.
    const hash = u.hash.startsWith("#") ? new URLSearchParams(u.hash.slice(1)) : null;
    return {
      code: q.get("code") ?? hash?.get("code") ?? undefined,
      state: q.get("state") ?? hash?.get("state") ?? undefined,
      error: q.get("error") ?? hash?.get("error") ?? undefined,
    };
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [contributor, setContributor] = useState<Contributor | null | undefined>(undefined);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadMe = useCallback(async (t: string) => {
    try {
      const me = await api.getMe(t);
      if (!mounted.current) return;
      setContributor(me.contributor);
      setAccounts(me.accounts);
    } catch (e) {
      if (e instanceof ApiError && e.isAuth) {
        // The token expired or was revoked elsewhere. Drop it rather than retrying forever.
        await clearToken();
        if (!mounted.current) return;
        setToken(null);
        setContributor(null);
        setAccounts([]);
        return;
      }
      // Offline, or the portal is down. Keep the token — being unable to reach the server is not
      // the same as being signed out, and signing the person out would lose their session for good.
      if (!mounted.current) return;
      setContributor((prev) => (prev === undefined ? null : prev));
    }
  }, []);

  // Boot: is there a token in the keychain, and is it still good?
  useEffect(() => {
    (async () => {
      const t = await readToken();
      if (!mounted.current) return;
      if (!t) {
        setContributor(null);
        return;
      }
      setToken(t);
      await loadMe(t);
    })();
  }, [loadMe]);

  /** The shared half of signing in and linking: open the browser, come back with a code. */
  const runOAuth = useCallback(
    async (provider: string, existingToken: string | null, devUser?: string): Promise<SignInResult> => {
      const uri = redirectUri();
      setBusy(true);
      try {
        const start = await api.authorize({ provider, redirectUri: uri, ...(devUser ? { user: devUser } : {}) });

        const result = await WebBrowser.openAuthSessionAsync(start.url, uri, { preferEphemeralSession: true });
        if (result.type !== "success") {
          return { ok: false, error: result.type === "cancel" ? "" : "Sign-in did not finish." };
        }

        const { code, state, error } = paramsFrom(result.url);
        if (error) return { ok: false, error: "The provider refused the sign-in." };
        if (!code) return { ok: false, error: "The provider did not send a code back." };

        // The api does not check `state` — portal/web holds it in a cookie and checks it there, so
        // on this side the check is ours. Without it a crafted redirect could complete someone
        // else's sign-in in this app.
        if (state !== start.state) return { ok: false, error: "That sign-in could not be verified. Try again." };

        const done = await api.callback({
          provider: start.provider,
          code,
          redirectUri: uri,
          verifier: start.verifier,
          token: existingToken,
        });

        if (done.token) {
          await writeToken(done.token);
          if (!mounted.current) return { ok: true };
          setToken(done.token);
          await loadMe(done.token);
        } else if (existingToken) {
          await loadMe(existingToken);
        }
        return { ok: true };
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 409) return { ok: false, error: "That account is already linked to someone else." };
          return { ok: false, error: e.message };
        }
        return { ok: false, error: "Sign-in failed." };
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [loadMe],
  );

  const signIn = useCallback(
    (provider: string, devUser?: string) => runOAuth(provider, null, devUser),
    [runOAuth],
  );

  const linkAccount = useCallback(
    (provider: string) => runOAuth(provider, token),
    [runOAuth, token],
  );

  const doSignOut = useCallback(async () => {
    const t = token;
    setContributor(null);
    setAccounts([]);
    setToken(null);
    await clearToken();
    // Best effort: the local session is already gone either way.
    if (t) await api.signOut(t).catch(() => {});
  }, [token]);

  const doSignOutEverywhere = useCallback(async () => {
    const t = token;
    if (t) await api.signOutEverywhere(t).catch(() => {});
    await doSignOut();
  }, [token, doSignOut]);

  const refresh = useCallback(async () => {
    if (token) await loadMe(token);
  }, [token, loadMe]);

  const value = useMemo<AuthValue>(
    () => ({
      contributor,
      accounts,
      token,
      loading: contributor === undefined,
      busy,
      signIn,
      linkAccount,
      signOut: doSignOut,
      signOutEverywhere: doSignOutEverywhere,
      refresh,
    }),
    [contributor, accounts, token, busy, signIn, linkAccount, doSignOut, doSignOutEverywhere, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

/** The token, for screens that load their own data. Throws if called while signed out. */
export function useToken(): string {
  const { token } = useAuth();
  if (!token) throw new Error("useToken used while signed out");
  return token;
}
