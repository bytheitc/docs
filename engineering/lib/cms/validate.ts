// Turns untrusted editor input into data that matches a collection's fields. Identical in every app.
// The admin form posts its state as JSON; nothing from the client is trusted until it passes here.
import { fieldApplies, type CollectionDef, type Field } from "@/lib/cms/types";

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

/** Validates editor input against a collection. Also checks the id is URL-safe. */
export function validateEntry(def: CollectionDef, raw: unknown): { data: Record<string, unknown>; id: string; errors: Errors } {
  const errors: Errors = {};
  const data = cleanFields(def.fields, raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}, "", errors);
  const id = str(data[def.idField]).trim();
  if (!id) errors[def.idField] = "An id is required.";
  else if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) errors[def.idField] = "Use lowercase letters, digits and hyphens only (max 80).";
  return { data, id, errors };
}

/** Makes a URL-safe id from a title. */
export const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
