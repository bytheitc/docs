"use client";
// Schema-driven entry editor. Identical in every app.
// Renders any collection's fields (including nested lists/objects) and posts the whole value as JSON.
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveEntry, type FormState } from "@/app/admin/actions";
import { fieldApplies, type Field } from "@/lib/cms/types";

export type RelationOptions = Record<string, { id: string; title: string }[]>;
type Value = unknown;
type Obj = Record<string, Value>;

interface Props {
  collection: string;
  fields: Field[];
  idField: string;
  titleField: string;
  initial: Obj;
  originalId: string | null;
  relationOptions: RelationOptions;
  canPublish: boolean;
  isLive: boolean;
}

const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Lines and tags are edited as raw text so typing a newline or comma isn't swallowed. */
function toEditable(fields: Field[], data: Obj): Obj {
  const out: Obj = {};
  for (const f of fields) {
    const v = data?.[f.name];
    if (f.type === "lines") out[f.name] = Array.isArray(v) ? v.join("\n") : (v ?? "");
    else if (f.type === "tags") out[f.name] = Array.isArray(v) ? v.join(", ") : (v ?? "");
    else if (f.type === "object") out[f.name] = toEditable(f.fields, (v as Obj) ?? {});
    else if (f.type === "list") out[f.name] = Array.isArray(v) ? v.map((it) => toEditable(f.fields, (it as Obj) ?? {})) : [];
    else if (f.type === "paragraphs") out[f.name] = Array.isArray(v) ? v : [];
    else if (f.type === "relation" && f.multiple) out[f.name] = Array.isArray(v) ? v : [];
    else out[f.name] = v ?? (f.type === "boolean" ? false : "");
  }
  return out;
}

function emptyItem(fields: Field[]): Obj {
  return toEditable(fields, {});
}

function Submit({ intent, children, className }: { intent: string; children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="intent" value={intent} className={className} disabled={pending}>
      {pending ? "Working…" : children}
    </button>
  );
}

export function EntryEditor(p: Props) {
  const [value, setValue] = useState<Obj>(() => toEditable(p.fields, p.initial));
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(saveEntry, {});
  const errors = state.errors ?? {};

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  useEffect(() => { if (state.ok) setDirty(false); }, [state]);

  const set = (name: string, v: Value) => { setValue((cur) => ({ ...cur, [name]: v })); setDirty(true); };
  const payload = useMemo(() => JSON.stringify(value), [value]);

  return (
    <form action={action} className="cms-editor" noValidate>
      <input type="hidden" name="collection" value={p.collection} />
      <input type="hidden" name="originalId" value={p.originalId ?? ""} />
      <input type="hidden" name="payload" value={payload} />

      {state.message && (
        <p className={`cms-flash ${state.ok ? "ok" : "bad"}`} role={state.ok ? "status" : "alert"}>{state.message}</p>
      )}

      <div className="cms-fields">
        {p.fields.filter((f) => fieldApplies(f, value)).map((f) => (
          <FieldInput
            key={f.name}
            field={f}
            path={f.name}
            value={value[f.name]}
            onChange={(v) => set(f.name, v)}
            errors={errors}
            relationOptions={p.relationOptions}
            extra={
              f.name === p.idField && !p.originalId ? (
                <button type="button" className="cms-link" onClick={() => set(p.idField, slugify(String(value[p.titleField] ?? "")))}>
                  Make from {p.titleField}
                </button>
              ) : null
            }
          />
        ))}
      </div>

      <div className="cms-savebar">
        <span className="cms-savebar-note">{dirty ? "Unsaved changes" : p.isLive ? "Live entry: edits are held for review" : " "}</span>
        <Submit intent="save" className="cms-btn">{p.isLive ? "Save as pending" : "Save draft"}</Submit>
        <Submit intent="submit" className="cms-btn">{p.isLive ? "Submit changes" : "Submit for review"}</Submit>
        {p.canPublish && <Submit intent="publish" className="cms-btn primary">Publish</Submit>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

interface FieldProps {
  field: Field;
  path: string;
  value: Value;
  onChange: (v: Value) => void;
  errors: Record<string, string>;
  relationOptions: RelationOptions;
  extra?: React.ReactNode;
}

function FieldInput({ field: f, path, value, onChange, errors, relationOptions, extra }: FieldProps) {
  const id = `f-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const err = errors[path];
  const describedBy = [f.help ? `${id}-help` : null, err ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  const common = { id, "aria-invalid": err ? true : undefined, "aria-describedby": describedBy };

  const label = (
    <label htmlFor={id} className="cms-label">
      {f.label}{f.required && <span className="cms-req" aria-hidden="true"> *</span>}
      {extra && <span className="cms-label-extra">{extra}</span>}
    </label>
  );
  const foot = (
    <>
      {f.help && <p id={`${id}-help`} className="cms-help">{f.help}</p>}
      {err && <p id={`${id}-err`} className="cms-err">{err}</p>}
    </>
  );

  switch (f.type) {
    case "text": case "email": case "url": case "date": case "number":
      return (
        <div className="cms-field">
          {label}
          <input
            {...common}
            type={f.type === "text" ? "text" : f.type}
            value={String(value ?? "")}
            placeholder={"placeholder" in f ? f.placeholder : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
          {foot}
        </div>
      );
    case "textarea":
      return (
        <div className="cms-field">
          {label}
          <textarea {...common} rows={f.rows ?? 4} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
          {foot}
        </div>
      );
    case "lines":
      return (
        <div className="cms-field">
          {label}
          <textarea {...common} rows={5} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
          {foot}
        </div>
      );
    case "tags":
      return (
        <div className="cms-field">
          {label}
          <input {...common} type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
          {foot}
        </div>
      );
    case "boolean":
      return (
        <div className="cms-field cms-check">
          <input {...common} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {label}
          {foot}
        </div>
      );
    case "select":
      return (
        <div className="cms-field">
          {label}
          <select {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
            <option value="">Choose…</option>
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {foot}
        </div>
      );
    case "relation": {
      const opts = relationOptions[f.collection] ?? [];
      if (f.multiple) {
        const sel = new Set(Array.isArray(value) ? (value as string[]) : []);
        return (
          <fieldset className="cms-field cms-multi" aria-describedby={describedBy}>
            <legend className="cms-label">{f.label}</legend>
            <div className="cms-multi-list">
              {opts.map((o) => (
                <label key={o.id} className="cms-multi-item">
                  <input
                    type="checkbox"
                    checked={sel.has(o.id)}
                    onChange={(e) => {
                      const next = new Set(sel);
                      if (e.target.checked) next.add(o.id); else next.delete(o.id);
                      onChange(opts.map((x) => x.id).filter((x) => next.has(x)));
                    }}
                  />
                  <span>{o.title}</span> <code>{o.id}</code>
                </label>
              ))}
              {!opts.length && <p className="cms-help">Nothing to link to yet.</p>}
            </div>
            {foot}
          </fieldset>
        );
      }
      return (
        <div className="cms-field">
          {label}
          <select {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
            <option value="">None</option>
            {opts.map((o) => <option key={o.id} value={o.id}>{o.title} ({o.id})</option>)}
          </select>
          {foot}
        </div>
      );
    }
    case "paragraphs": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const update = (next: string[]) => onChange(next);
      return (
        <fieldset className="cms-field cms-group" aria-describedby={describedBy}>
          <legend className="cms-label">{f.label}{f.required && <span className="cms-req" aria-hidden="true"> *</span>}</legend>
          {list.map((para, i) => (
            <div key={i} className="cms-para">
              <textarea
                aria-label={`${f.label}, paragraph ${i + 1}`}
                rows={4}
                value={para}
                onChange={(e) => update(list.map((x, k) => (k === i ? e.target.value : x)))}
              />
              <RowTools index={i} length={list.length} onMove={(to) => update(move(list, i, to))} onRemove={() => update(list.filter((_, k) => k !== i))} label={`paragraph ${i + 1}`} />
            </div>
          ))}
          <button type="button" className="cms-add" onClick={() => update([...list, ""])}>+ Add paragraph</button>
          {foot}
        </fieldset>
      );
    }
    case "object": {
      const obj = (value as Obj) ?? {};
      return (
        <fieldset className="cms-field cms-group" aria-describedby={describedBy}>
          <legend className="cms-label">{f.label}</legend>
          {f.fields.filter((sub) => fieldApplies(sub, obj)).map((sub) => (
            <FieldInput
              key={sub.name}
              field={sub}
              path={`${path}.${sub.name}`}
              value={obj[sub.name]}
              onChange={(v) => onChange({ ...obj, [sub.name]: v })}
              errors={errors}
              relationOptions={relationOptions}
            />
          ))}
          {foot}
        </fieldset>
      );
    }
    case "list": {
      const list = Array.isArray(value) ? (value as Obj[]) : [];
      const update = (next: Obj[]) => onChange(next);
      const itemLabel = f.itemLabel ?? "item";
      return (
        <fieldset className="cms-field cms-group" aria-describedby={describedBy}>
          <legend className="cms-label">{f.label}{f.required && <span className="cms-req" aria-hidden="true"> *</span>} <span className="cms-count">({list.length})</span></legend>
          {list.map((item, i) => {
            const heading = (f.itemTitle && String(item[f.itemTitle] ?? "").trim()) || `${itemLabel[0].toUpperCase()}${itemLabel.slice(1)} ${i + 1}`;
            const hasErr = Object.keys(errors).some((k) => k.startsWith(`${path}[${i}]`));
            return (
              <details key={i} className={`cms-item${hasErr ? " has-err" : ""}`} open={hasErr || undefined}>
                <summary>
                  <span className="cms-item-n">{i + 1}</span>
                  <span className="cms-item-title">{heading}</span>
                </summary>
                <div className="cms-item-body">
                  {f.fields.filter((sub) => fieldApplies(sub, item)).map((sub) => (
                    <FieldInput
                      key={sub.name}
                      field={sub}
                      path={`${path}[${i}].${sub.name}`}
                      value={item[sub.name]}
                      onChange={(v) => update(list.map((x, k) => (k === i ? { ...x, [sub.name]: v } : x)))}
                      errors={errors}
                      relationOptions={relationOptions}
                    />
                  ))}
                  <RowTools index={i} length={list.length} onMove={(to) => update(move(list, i, to))} onRemove={() => update(list.filter((_, k) => k !== i))} label={`${itemLabel} ${i + 1}`} />
                </div>
              </details>
            );
          })}
          <button type="button" className="cms-add" onClick={() => update([...list, emptyItem(f.fields)])}>+ Add {itemLabel}</button>
          {foot}
        </fieldset>
      );
    }
  }
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

function RowTools({ index, length, onMove, onRemove, label }: { index: number; length: number; onMove: (to: number) => void; onRemove: () => void; label: string }) {
  return (
    <div className="cms-rowtools">
      <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={`Move ${label} up`}>↑</button>
      <button type="button" onClick={() => onMove(index + 1)} disabled={index === length - 1} aria-label={`Move ${label} down`}>↓</button>
      <button type="button" className="danger" onClick={onRemove} aria-label={`Remove ${label}`}>Remove</button>
    </div>
  );
}
