// Builds the option lists for relation fields (entries of other collections in the same space).
import type { RelationOptions } from "@/components/EntryEditor";
import { authed, enc } from "@/lib/session";
import type { CollectionDef, Entry, Field } from "@/lib/types";

function relatedCollections(fields: Field[], out = new Set<string>()): Set<string> {
  for (const f of fields) {
    if (f.type === "relation") out.add(f.collection);
    if (f.type === "object" || f.type === "list") relatedCollections(f.fields, out);
  }
  return out;
}

export async function relationOptions(space: string, collections: CollectionDef[], fields: Field[]): Promise<RelationOptions> {
  const out: RelationOptions = {};
  await Promise.all([...relatedCollections(fields)].map(async (name) => {
    const def = collections.find((c) => c.name === name);
    if (!def) return;
    const { entries } = await authed<{ entries: Entry[] }>(`/v1/spaces/${enc(space)}/collections/${enc(name)}/entries`);
    out[name] = entries.map((e) => ({ id: e.id, title: String(e.data[def.titleField] ?? e.id) }));
  }));
  return out;
}
