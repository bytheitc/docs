// Turns untrusted input into data the CMS can store.
//   validateEntry   editor input against a collection's fields (ported unchanged from the per-app kit)
//   validateSchema  a house's schema registration (PUT /v1/spaces/:space/schema)
import {
  FIELD_TYPES, ROLES, fieldApplies,
  type CollectionDef, type CollectionInput, type Field, type Role, type SpaceLink, type SpaceSchemaInput,
} from "./types.js";

export type Errors = Record<string, string>;

const MAX_TEXT = 20_000;
const MAX_LIST = 500;

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v)).slice(0, MAX_TEXT);

function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.slice(0, MAX_LIST).map(str).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split("\n").map((s) => s.trim()).filter(Boolean);
  return [];
}

function cleanField(f: Field, raw: unknown, path: string, errors: Errors): unknown {
  const missing = () => { if (f.required) errors[path] = `${f.label} is required.`; };

  switch (f.type) {
    case "text": case "textarea": case "email": case "url": case "date": {
      const v = str(raw).trim();
      if (!v) { missing(); return f.required ? "" : undefined; }
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[path] = `${f.label} must be an email address.`;
      if (f.type === "url" && !/^(https?:\/\/|\/|#|mailto:)/i.test(v)) errors[path] = `${f.label} must start with https://, / or mailto:.`;
      if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[path] = `${f.label} must be a date (YYYY-MM-DD).`;
      return v;
    }
    case "number": {
      if (raw === "" || raw == null) { missing(); return undefined; }
      const n = Number(raw);
      if (!Number.isFinite(n)) { errors[path] = `${f.label} must be a number.`; return undefined; }
      if (f.min != null && n < f.min) errors[path] = `${f.label} must be at least ${f.min}.`;
      if (f.max != null && n > f.max) errors[path] = `${f.label} must be at most ${f.max}.`;
      return n;
    }
    case "boolean":
      return raw === true || raw === "true" || raw === "on";
    case "select": {
      const v = str(raw);
      if (!v) { missing(); return undefined; }
      if (!f.options.includes(v)) errors[path] = `${f.label} must be one of: ${f.options.join(", ")}.`;
      return v;
    }
    case "paragraphs": case "lines": {
      const list = strList(raw);
      if (!list.length) missing();
      return list;
    }
    case "tags": {
      const list = (Array.isArray(raw) ? raw.map(str) : str(raw).split(",")).map((s) => s.trim()).filter(Boolean).slice(0, MAX_LIST);
      if (!list.length) missing();
      return list;
    }
    case "relation": {
      if (f.multiple) {
        const list = Array.isArray(raw) ? raw.map(str).filter(Boolean) : [];
        if (!list.length) missing();
        return list;
      }
      const v = str(raw).trim();
      if (!v) { missing(); return undefined; }
      return v;
    }
    case "object": {
      const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
      return cleanFields(f.fields, obj, `${path}.`, errors);
    }
    case "list": {
      const arr = Array.isArray(raw) ? raw.slice(0, MAX_LIST) : [];
      if (!arr.length) missing();
      return arr.map((item, i) =>
        cleanFields(f.fields, item && typeof item === "object" ? (item as Record<string, unknown>) : {}, `${path}[${i}].`, errors),
      );
    }
  }
}

function cleanFields(fields: Field[], raw: Record<string, unknown>, prefix: string, errors: Errors) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!fieldApplies(f, raw)) continue; // hidden by showWhen: neither validated nor stored
    const v = cleanField(f, raw[f.name], `${prefix}${f.name}`, errors);
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** Validates editor input against a collection. Also checks the id is URL-safe. */
export function validateEntry(def: CollectionDef, raw: unknown): { data: Record<string, unknown>; id: string; errors: Errors } {
  const errors: Errors = {};
  const data = cleanFields(def.fields, raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}, "", errors);
  const id = str(data[def.idField]).trim();
  if (!id) errors[def.idField] = "An id is required.";
  else if (!ID_PATTERN.test(id)) errors[def.idField] = "Use lowercase letters, digits and hyphens only (max 80).";
  return { data, id, errors };
}

/** Makes a URL-safe id from a title. */
export const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/* ------------------------------------------------------------------ */
/* Schema registration                                                */
/* ------------------------------------------------------------------ */

export const SPACE_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;
const COLLECTION_PATTERN = /^[a-z][a-z0-9_-]{0,47}$/;
const FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const FORM_PATTERN = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const MAX_COLLECTIONS = 100;
const MAX_FIELDS = 200;
const MAX_DEPTH = 6;
const MAX_SEED = 5000;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

/**
 * Checks a schema registration and returns a clean copy (unknown keys dropped), or errors keyed by path,
 * e.g. `collections[1].fields[3].name`.
 */
export function validateSchema(raw: unknown): { schema: SpaceSchemaInput | null; errors: Errors } {
  const errors: Errors = {};
  if (!isObj(raw)) return { schema: null, errors: { "": "The schema must be a JSON object." } };

  const label = text(raw.label, 80);
  if (!label) errors.label = "label is required (a short name, at most 80 characters).";
  const title = raw.title == null ? label : text(raw.title, 120);
  if (!title) errors.title = "title must be a non-empty string of at most 120 characters.";

  // collections
  const collections: CollectionInput[] = [];
  if (!Array.isArray(raw.collections)) errors.collections = "collections must be an array.";
  else if (raw.collections.length > MAX_COLLECTIONS) errors.collections = `At most ${MAX_COLLECTIONS} collections.`;
  else {
    const names = new Set<string>();
    raw.collections.forEach((c, i) => {
      const p = `collections[${i}]`;
      if (!isObj(c)) { errors[p] = "Each collection must be an object."; return; }
      const name = typeof c.name === "string" ? c.name : "";
      if (!COLLECTION_PATTERN.test(name)) errors[`${p}.name`] = "name must be lowercase letters, digits, - or _ (start with a letter, max 48).";
      else if (names.has(name)) errors[`${p}.name`] = `Collection "${name}" is defined twice.`;
      names.add(name);
    });
    raw.collections.forEach((c, i) => {
      if (!isObj(c)) return;
      const def = checkCollection(c, `collections[${i}]`, names, errors);
      if (def) collections.push(def);
    });
  }

  // forms
  const forms: Record<string, string> = {};
  if (raw.forms != null) {
    if (!isObj(raw.forms)) errors.forms = "forms must be an object of { id: label }.";
    else for (const [k, v] of Object.entries(raw.forms)) {
      if (!FORM_PATTERN.test(k)) errors[`forms.${k}`] = "Form ids are lowercase letters, digits, - or _ (max 48).";
      else if (!text(v, 120)) errors[`forms.${k}`] = "Each form needs a label (at most 120 characters).";
      else forms[k] = (v as string).trim();
    }
  }

  // links
  const links: SpaceLink[] = [];
  if (raw.links != null) {
    if (!Array.isArray(raw.links)) errors.links = "links must be an array of { href, label, role? }.";
    else raw.links.slice(0, 20).forEach((l, i) => {
      const p = `links[${i}]`;
      if (!isObj(l)) { errors[p] = "Each link must be an object."; return; }
      const href = text(l.href, 500), lab = text(l.label, 80);
      if (!href || !/^(https?:\/\/|\/)/i.test(href)) errors[`${p}.href`] = "href must start with https://, http:// or /.";
      if (!lab) errors[`${p}.label`] = "label is required.";
      if (l.role != null && !ROLES.includes(l.role as Role)) errors[`${p}.role`] = `role must be one of: ${ROLES.join(", ")}.`;
      if (href && lab) links.push({ href, label: lab, ...(l.role ? { role: l.role as Role } : {}) });
    });
  }

  // webhook
  let webhook: { url: string } | null = null;
  if (raw.webhook != null) {
    const url = isObj(raw.webhook) ? text(raw.webhook.url, 500) : null;
    if (!url || !/^https?:\/\/[^\s]+$/i.test(url)) errors["webhook.url"] = "webhook.url must be an http(s) URL.";
    else webhook = { url };
  }

  if (Object.keys(errors).length) return { schema: null, errors };
  return { schema: { label: label!, title: title!, collections, forms, links, webhook }, errors };
}

function checkCollection(c: Record<string, unknown>, p: string, collectionNames: Set<string>, errors: Errors): CollectionInput | null {
  const name = String(c.name ?? "");
  const label = text(c.label, 80);
  if (!label) errors[`${p}.label`] = "label is required.";
  const singular = c.singular == null ? label : text(c.singular, 80);
  if (!singular) errors[`${p}.singular`] = "singular must be a non-empty string.";
  const description = c.description == null ? undefined : text(c.description, 500) ?? undefined;
  if (c.description != null && description === undefined) errors[`${p}.description`] = "description must be a string of at most 500 characters.";

  let fields: Field[] = [];
  if (!Array.isArray(c.fields) || !c.fields.length) errors[`${p}.fields`] = "fields must be a non-empty array.";
  else fields = checkFields(c.fields, `${p}.fields`, collectionNames, errors, 1);

  const top = new Map(fields.map((f) => [f.name, f]));
  const idField = typeof c.idField === "string" ? c.idField : "";
  const idDef = top.get(idField);
  if (!idField) errors[`${p}.idField`] = "idField is required.";
  else if (!idDef) errors[`${p}.idField`] = `idField "${idField}" is not one of this collection's top-level fields.`;
  else if (!["text", "email", "url", "date", "select", "number"].includes(idDef.type)) errors[`${p}.idField`] = `idField "${idField}" must be a text-like field, not ${idDef.type}.`;
  else if (idDef.showWhen) errors[`${p}.idField`] = `idField "${idField}" can't be conditional (showWhen).`;
  const titleField = c.titleField == null ? idField : typeof c.titleField === "string" ? c.titleField : "";
  if (!top.has(titleField)) errors[`${p}.titleField`] = `titleField "${titleField}" is not one of this collection's top-level fields.`;

  let columns: string[] | undefined;
  if (c.columns != null) {
    if (!Array.isArray(c.columns) || c.columns.some((x) => typeof x !== "string")) errors[`${p}.columns`] = "columns must be an array of field names.";
    else {
      columns = c.columns as string[];
      const bad = columns.filter((x) => !top.has(x));
      if (bad.length) errors[`${p}.columns`] = `Unknown column field(s): ${bad.join(", ")}.`;
    }
  }
  if (c.singleton != null && typeof c.singleton !== "boolean") errors[`${p}.singleton`] = "singleton must be true or false.";

  let seed: Record<string, unknown>[] | undefined;
  if (c.seed != null) {
    if (!Array.isArray(c.seed)) errors[`${p}.seed`] = "seed must be a JSON array of entries.";
    else if (c.seed.length > MAX_SEED) errors[`${p}.seed`] = `At most ${MAX_SEED} seed entries.`;
    else {
      const ids = new Set<string>();
      c.seed.forEach((s, i) => {
        if (!isObj(s)) { errors[`${p}.seed[${i}]`] = "Each seed entry must be an object."; return; }
        const id = s[idField];
        if (idField && (id == null || String(id).trim() === "")) errors[`${p}.seed[${i}]`] = `Seed entry has no "${idField}".`;
        else if (ids.has(String(id))) errors[`${p}.seed[${i}]`] = `Seed id "${String(id)}" appears twice.`;
        ids.add(String(id));
      });
      seed = c.seed as Record<string, unknown>[];
    }
  }

  if (!label || !singular || !fields.length) return null;
  return {
    name, label, singular, ...(description ? { description } : {}), idField, titleField,
    ...(columns ? { columns } : {}), fields, ...(c.singleton ? { singleton: true } : {}), ...(seed ? { seed } : {}),
  };
}

function checkFields(raw: unknown[], p: string, collectionNames: Set<string>, errors: Errors, depth: number): Field[] {
  if (depth > MAX_DEPTH) { errors[p] = `Fields nest too deeply (max ${MAX_DEPTH}).`; return []; }
  if (raw.length > MAX_FIELDS) { errors[p] = `At most ${MAX_FIELDS} fields per level.`; return []; }
  const out: Field[] = [];
  const names = new Set<string>();
  raw.forEach((f, i) => {
    const fp = `${p}[${i}]`;
    if (!isObj(f)) { errors[fp] = "Each field must be an object."; return; }
    const name = typeof f.name === "string" ? f.name : "";
    if (!FIELD_NAME_PATTERN.test(name)) { errors[`${fp}.name`] = "name must be letters, digits or _ (start with a letter or _, max 64)."; return; }
    if (names.has(name)) { errors[`${fp}.name`] = `Field "${name}" is defined twice at this level.`; return; }
    names.add(name);
    const type = f.type as Field["type"];
    if (!FIELD_TYPES.includes(type)) { errors[`${fp}.type`] = `type must be one of: ${FIELD_TYPES.join(", ")}.`; return; }
    const label = text(f.label, 120);
    if (!label) { errors[`${fp}.label`] = "label is required."; return; }
    const base: Record<string, unknown> = { type, name, label };
    if (f.help != null) { const h = text(f.help, 500); if (h) base.help = h; else errors[`${fp}.help`] = "help must be a string of at most 500 characters."; }
    if (f.required != null) { if (typeof f.required !== "boolean") errors[`${fp}.required`] = "required must be true or false."; else if (f.required) base.required = true; }
    if (f.showWhen != null) {
      const sw = f.showWhen;
      const eq = isObj(sw) ? sw.equals : undefined;
      if (!isObj(sw) || typeof sw.field !== "string" || !(typeof eq === "string" || (Array.isArray(eq) && eq.every((x) => typeof x === "string")))) {
        errors[`${fp}.showWhen`] = "showWhen must be { field, equals } where equals is a string or an array of strings.";
      } else base.showWhen = { field: sw.field, equals: eq };
    }

    switch (type) {
      case "text": case "email": case "url": case "date":
        if (typeof f.placeholder === "string") base.placeholder = f.placeholder.slice(0, 200);
        break;
      case "textarea":
        if (f.rows != null) { if (!Number.isInteger(f.rows) || (f.rows as number) < 1 || (f.rows as number) > 40) errors[`${fp}.rows`] = "rows must be a whole number from 1 to 40."; else base.rows = f.rows; }
        break;
      case "number":
        for (const k of ["min", "max"] as const) {
          if (f[k] != null) { if (typeof f[k] !== "number" || !Number.isFinite(f[k])) errors[`${fp}.${k}`] = `${k} must be a number.`; else base[k] = f[k]; }
        }
        break;
      case "select":
        if (!Array.isArray(f.options) || !f.options.length || f.options.some((o) => typeof o !== "string" || !o)) errors[`${fp}.options`] = "A select field needs options: a non-empty array of strings.";
        else base.options = [...(f.options as string[])];
        break;
      case "object": case "list":
        if (!Array.isArray(f.fields) || !f.fields.length) errors[`${fp}.fields`] = `A ${type} field needs fields: a non-empty array.`;
        else base.fields = checkFields(f.fields, `${fp}.fields`, collectionNames, errors, depth + 1);
        if (type === "list") {
          if (f.itemLabel != null) { const l = text(f.itemLabel, 60); if (l) base.itemLabel = l; else errors[`${fp}.itemLabel`] = "itemLabel must be a short string."; }
          if (f.itemTitle != null) {
            const sub = Array.isArray(f.fields) ? (f.fields as unknown[]).filter(isObj).map((x) => x.name) : [];
            if (typeof f.itemTitle !== "string" || !sub.includes(f.itemTitle)) errors[`${fp}.itemTitle`] = "itemTitle must name one of the list's fields.";
            else base.itemTitle = f.itemTitle;
          }
        }
        break;
      case "relation":
        if (typeof f.collection !== "string" || !collectionNames.has(f.collection)) errors[`${fp}.collection`] = `relation must point at a collection in this space${typeof f.collection === "string" ? ` ("${f.collection}" isn't one)` : ""}.`;
        else base.collection = f.collection;
        if (f.multiple != null) { if (typeof f.multiple !== "boolean") errors[`${fp}.multiple`] = "multiple must be true or false."; else if (f.multiple) base.multiple = true; }
        break;
    }
    out.push(base as unknown as Field);
  });
  // showWhen must point at a sibling.
  raw.forEach((f, i) => {
    if (isObj(f) && isObj(f.showWhen) && typeof f.showWhen.field === "string" && !names.has(f.showWhen.field)) {
      errors[`${p}[${i}].showWhen`] = `showWhen.field "${f.showWhen.field}" is not a sibling field.`;
    }
  });
  return out;
}
