// Picks the newsletter store from this api's configuration. With no database configured the site
// still works: /newsletter/subscribe answers 503 and the web says to email us instead.
import type { Config } from "../config.js";
import { createNewsletterMongoStore } from "./mongo.js";
import type { NewsletterStore } from "./types.js";

let store: NewsletterStore | null = null;

export function initNewsletterStore(config: Config): NewsletterStore | null {
  if (config.db.kind !== "mongodb" || !config.db.uri) return (store = null);
  return (store = createNewsletterMongoStore(config.db.uri, config.db.name));
}

export const getNewsletterStore = () => store;
