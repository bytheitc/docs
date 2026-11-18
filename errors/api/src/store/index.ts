// One store per process, chosen once: MongoDB when MONGODB_URI is set, memory otherwise (development
// only: in production a missing database is reported by /health and ingest answers 503).
import type { Config } from "../config.js";
import { createMemoryStore } from "./memory.js";
import { createMongoStore } from "./mongo.js";
import type { ErrorsStore } from "./types.js";

let store: ErrorsStore | null = null;

export function initStore(config: Config): ErrorsStore | null {
  if (config.db.uri) store = createMongoStore(config.db.uri, config.db.name);
  else if (!config.production) store = createMemoryStore();
  else store = null;
  return store;
}

export const getStore = (): ErrorsStore | null => store;
/** For tests: run against a store they built themselves. */
export const setStore = (s: ErrorsStore | null): void => { store = s; };
