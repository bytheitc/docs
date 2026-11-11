// Builds the option lists for relation fields. Identical in every app.
import { findCollection } from "@/lib/cms/collections";
import { ensureSeeded } from "@/lib/cms/content";
import { requireStorage } from "@/lib/cms/storage";
import type { Field } from "@/lib/cms/types";
import type { RelationOptions } from "@/components/cms/EntryEditor";

function relatedCollections(fields: Field[], out = new Set<string>()): Set<string> {
  for (const f of fields) {
    if (f.type === "relation") out.add(f.collection);
    if (f.type === "object" || f.type === "list") relatedCollections(f.fields, out);
  }
  return out;
}

export async function relationOptions(fields: Field[]): Promise<RelationOptions> {
  const store = requireStorage();
  const out: RelationOptions = {};
  for (const name of relatedCollections(fields)) {
    const def = findCollection(name);
    if (!def) continue;
    await ensureSeeded(def);
    out[name] = (await store.listEntries(name)).map((e) => ({ id: e.id, title: String(e.data[def.titleField] ?? e.id) }));
  }
  return out;
}
