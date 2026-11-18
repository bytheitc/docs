// Adds a site from the command line and prints its script tag: for bootstrapping before anyone can
// sign in, and for scripts.  npm run site -- "ITC Engineering" engineering.bytheitc.xyz [more domains]
import { randomBytes } from "node:crypto";
import { loadConfig } from "../src/config.js";
import { parseDomains } from "../src/routes/ui.js";
import { createMongoStore } from "../src/store/mongo.js";

const [name, ...rest] = process.argv.slice(2);
const domains = parseDomains(rest.join(" "));
if (!name?.trim() || !domains.length) { console.error('usage: npm run site -- "<name>" <domain> [domain...]'); process.exit(2); }
const config = loadConfig();
if (!config.db.uri) { console.error("MONGODB_URI is not set."); process.exit(1); }
const store = createMongoStore(config.db.uri, config.db.name);
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const existing = await store.getSiteBySlug(slug);
const site = existing ?? { id: randomBytes(6).toString("hex"), slug, name: name.trim(), domains, createdAt: new Date(), createdBy: "cli" };
if (!existing) await store.createSite(site);
console.log(`${existing ? "exists" : "created"}: ${site.name} (${site.domains.join(", ")})`);
console.log(`NEXT_PUBLIC_ANALYTICS_URL=${config.publicUrl}`);
console.log(`NEXT_PUBLIC_ANALYTICS_SITE=${site.id}`);
console.log(`<script defer src="${config.publicUrl}/script.js" data-site="${site.id}"></script>`);
await store.close();
