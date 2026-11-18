// Creates a project from the command line and prints its DSN: for bootstrapping before anyone can
// sign in, and for scripts.  npx tsx --env-file-if-exists=.env.local scripts/create-project.ts "site-api"
import { randomBytes, randomInt } from "node:crypto";
import { loadConfig } from "../src/config.js";
import { createMongoStore } from "../src/store/mongo.js";

const name = process.argv.slice(2).join(" ").trim();
if (!name) { console.error('usage: tsx scripts/create-project.ts "<name>"'); process.exit(2); }
const config = loadConfig();
if (!config.db.uri) { console.error("MONGODB_URI is not set."); process.exit(1); }
const store = createMongoStore(config.db.uri, config.db.name);
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const existing = await store.getProjectBySlug(slug);
const project = existing ?? { id: String(randomInt(100_000, 999_999_999)), slug, name, publicKey: randomBytes(16).toString("hex"), createdAt: new Date(), createdBy: "cli" };
if (!existing) await store.createProject(project);
const u = new URL(config.publicUrl);
console.log(`${existing ? "exists" : "created"}: ${project.name}`);
console.log(`${u.protocol}//${project.publicKey}@${u.host}${u.pathname.replace(/\/$/, "")}/${project.id}`);
await store.close();
