// Turns this house's collection definitions into the body of PUT /v1/spaces/:space/schema.
// The CMS stores the definitions, seeds each collection once while it is empty, and knows nothing
// else about this house (ARCHITECTURE.md, rule 4).
import type { Config } from "./config.js";
import { COLLECTIONS, FORMS, LINKS } from "./content/collections.js";
import { HOUSE } from "./content/house.js";
import type { SpaceLink } from "./content/types.js";

export interface SchemaPayload {
  label: string;
  title: string;
  collections: (Record<string, unknown> & { name: string; seed: Record<string, unknown>[] })[];
  forms: Record<string, string>;
  links: SpaceLink[];
  webhook: { url: string } | null;
}

export function buildSchema(config: Config): SchemaPayload {
  return {
    label: HOUSE.label,
    title: HOUSE.title,
    // `seed` is a function here and a JSON array over the wire; everything else travels as written.
    collections: COLLECTIONS.map(({ seed, ...def }) => ({ ...def, seed: seed() as Record<string, unknown>[] })),
    forms: FORMS,
    // The CMS shows these as external links, so a path becomes an address on this house's web.
    links: LINKS.map((l) => (l.href.startsWith("/") ? { ...l, href: `${config.web.url}${l.href}` } : l)),
    webhook: { url: `${config.publicUrl}/cms/webhook` },
  };
}
