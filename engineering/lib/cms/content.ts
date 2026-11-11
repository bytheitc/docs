// Public read API for site pages. Identical in every app.
// Pages call these instead of importing content arrays, so editors' changes show up on the site.
import { getCollection } from "@/lib/cms/collections";
import { getStorage } from "@/lib/cms/storage";
import type { CollectionDef, Entry } from "@/lib/cms/types";

// Remember recent seed checks briefly; re-checking later means a wiped database is re-seeded.
const seeded = new Map<string, number>();
const SEED_CHECK_MS = 60_000;

function seedEntries(def: CollectionDef): Entry[] {
  const now = new Date();
  return def.seed().map((data, position) => ({
    collection: def.name,
    id: String((data as Record<string, unknown>)[def.idField]),
    status: "published" as const,
    position,
    data: data as Record<string, unknown>,
    createdAt: now,
    updatedAt: now,
    updatedBy: null,
  }));
}

/** Seeds a collection from its built-in content the first time it is read from an empty database. */
export async function ensureSeeded(def: CollectionDef) {
  const store = getStorage();
  if (!store) return;
  const last = seeded.get(def.name);
  if (last && Date.now() - last < SEED_CHECK_MS) return;
  await store.seedIfEmpty(def.name, seedEntries(def));
  seeded.set(def.name, Date.now());
}

/** All published entries of a collection, in editor-chosen order. */
export async function getPublished<T>(name: string): Promise<T[]> {
  const def = getCollection(name);
  const store = getStorage();
  if (!store) return def.seed() as T[];
  await ensureSeeded(def);
  const entries = await store.listEntries(name, { status: ["published"] });
  return entries.map((e) => e.data as T);
}

/** One published entry by id, or undefined. */
export async function getPublishedOne<T>(name: string, id: string): Promise<T | undefined> {
  const def = getCollection(name);
  const store = getStorage();
  if (!store) return (def.seed() as Record<string, unknown>[]).find((d) => String(d[def.idField]) === id) as T | undefined;
  await ensureSeeded(def);
  const e = await store.getEntry(name, id);
  return e && e.status === "published" ? (e.data as T) : undefined;
}

/** For singleton collections (settings-style documents). */
export async function getSingleton<T>(name: string): Promise<T | undefined> {
  return (await getPublished<T>(name))[0];
}
