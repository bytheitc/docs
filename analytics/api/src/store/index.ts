// One store per process, chosen once: MongoDB when MONGODB_URI is set, memory otherwise (development
// only: in production a missing database is reported by /health and collection answers 503).
import type { Config } from "../config.js";
import { createMemoryStore } from "./memory.js";
import { createMongoStore } from "./mongo.js";
import type { AnalyticsStore } from "./types.js";

let store: AnalyticsStore | null = null;

export function initStore(config: Config): AnalyticsStore | null {
  if (config.db.uri) store = createMongoStore(config.db.uri, config.db.name);
  else if (!config.production) store = createMemoryStore();
  else store = null;
  return store;
}

export const getStore = (): AnalyticsStore | null => store;
/** For tests: run against a store they built themselves. */
export const setStore = (s: AnalyticsStore | null): void => { store = s; };
