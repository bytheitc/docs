"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { invite, nominate, object, removeRights, type MaintainerState } from "@/app/(portal)/maintainers/actions";

function Submit({ children, className = "btn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{pending ? "Working…" : children}</button>;
}

function Flash({ state }: { state: MaintainerState }) {
  if (!state.message) return null;
  return <p className={`flash ${state.ok ? "ok" : "bad"}`} role={state.ok ? "status" : "alert"}>{state.message}</p>;
}

const err = (state: MaintainerState, name: string) =>
  state.errors?.[name] ? <p className="field-err">{state.errors[name]}</p> : null;

/** Step one of the path: an existing maintainer invites someone to review. */
export function InviteForm({ repos }: { repos: string[] }) {
  const [state, action] = useActionState<MaintainerState, FormData>(invite, {});
  return (
    <form action={action} className="form">
      <Flash state={state} />
      <div className="form-row">
        <label>
          <span>Repository</span>
          <select name="repo" defaultValue={repos[0]}>{repos.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
        <label>
          <span>Their handle</span>
          <input name="handle" type="text" placeholder="amina" required />
          {err(state, "handle")}
        </label>
      </div>
      <label>
        <span>A note <em>(optional)</em></span>
        <textarea name="note" rows={2} maxLength={1000} placeholder="What you'd like them to review, and why you asked." />
      </label>
      <Submit>Invite as reviewer</Submit>
    </form>
  );
}

/**
 * Step two: a nomination for work already done. The governance page requires it to be made in a
 * public issue, so the link is not optional.
 */
export function NominateForm({ repos }: { repos: string[] }) {
  const [state, action] = useActionState<MaintainerState, FormData>(nominate, {});
  return (
    <form action={action} className="form">
      <Flash state={state} />
      <div className="form-row">
        <label>
          <span>Repository</span>
          <select name="repo" defaultValue={repos[0]}>{repos.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
        <label>
          <span>Their handle</span>
          <input name="handle" type="text" placeholder="amina" required />
          {err(state, "handle")}
        </label>
      </div>
      <label>
        <span>The public issue</span>
        <input name="issueUrl" type="url" placeholder="https://github.com/owner/repo/issues/12" required />
        <small>Nominations are made in the open, linking to the work. Paste that issue here.</small>
        {err(state, "issueUrl")}
      </label>
      <label>
        <span>What work is this for?</span>
        <textarea name="reason" rows={4} required maxLength={2000} />
        <small>Specific is kinder than generous: what they did, over what period.</small>
        {err(state, "reason")}
      </label>
      <Submit>Nominate</Submit>
    </form>
  );
}

/** An objection stops the clock. It is answered in the issue, not here. */
export function ObjectForm({ id }: { id: string }) {
  const [state, action] = useActionState<MaintainerState, FormData>(object, {});
  return (
    <form action={action} className="inline-form">
      <Flash state={state} />
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`obj-${id}`}>Why you object</label>
      <input id={`obj-${id}`} name="note" type="text" placeholder="Why, in a line" maxLength={1000} required />
      {err(state, "note")}
      <Submit className="btn ghost small">Object</Submit>
    </form>
  );
}

/** Steering only, and only for conduct. The reason is kept in the audit log. */
export function RemoveRightsForm({ id }: { id: string }) {
  const [state, action] = useActionState<MaintainerState, FormData>(removeRights, {});
  return (
    <form action={action} className="inline-form">
      <Flash state={state} />
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`rm-${id}`}>Reason</label>
      <input id={`rm-${id}`} name="note" type="text" placeholder="Reason (kept in the audit log)" maxLength={1000} required />
      {err(state, "note")}
      <Submit className="btn ghost small">Remove rights</Submit>
    </form>
  );
}
