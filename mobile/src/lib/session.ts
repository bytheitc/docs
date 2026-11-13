// Where the session token lives.
//
// On a handset that is the keychain / keystore, by way of expo-secure-store. On web — which this
// project uses only to check layouts in a browser — SecureStore has no implementation, so it falls
// back to localStorage. That fallback is deliberately *not* a security claim: it exists so the
// development web target runs, and the web target is not something this app ships.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "itc.portal.session";

const webStore = {
  get(): string | null {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  },
  set(v: string) {
    try {
      globalThis.localStorage?.setItem(KEY, v);
    } catch {
      /* private mode, blocked storage — the app still works, you just sign in again */
    }
  },
  clear() {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      /* as above */
    }
  },
};

export async function readToken(): Promise<string | null> {
  if (Platform.OS === "web") return webStore.get();
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    // A locked keychain or a cancelled biometric prompt. Treat as signed out rather than crashing.
    return null;
  }
}

export async function writeToken(token: string): Promise<void> {
  if (Platform.OS === "web") return webStore.set(token);
  await SecureStore.setItemAsync(KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") return webStore.clear();
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* already gone */
  }
}
