import type { Config } from "../config.js";
import type { StatusStore } from "../types.js";
import { createMongoStore } from "./mongo.js";

let store: StatusStore | null = null;

export function initStore(config: Config): StatusStore | null {
  if (!config.db.uri) return null;
  store ??= createMongoStore(config.db.uri, config.db.name);
  return store;
}

export const getStore = () => store;

/** Routes that cannot work without the database use this and answer 503 rather than throwing. */
export function requireStore(): StatusStore {
  if (!store) throw new Error("no database configured");
  return store;
}

/** For tests: swap in a fake. */
export function setStore(s: StatusStore | null) { store = s; }
