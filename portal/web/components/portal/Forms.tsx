"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { claimIssue, deleteAccount, logContribution, updateProfile, type ActionState } from "@/app/(portal)/actions";
import type { PublicProfile } from "@/lib/types";

function Submit({ children, className = "btn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{pending ? "Working…" : children}</button>;
}

function Flash({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`flash ${state.ok ? "ok" : "bad"}`} role={state.ok ? "status" : "alert"}>{state.message}</p>;
}

function Err({ state, name }: { state: ActionState; name: string }) {
  const e = state.errors?.[name];
  return e ? <p id={`${name}-err`} className="err">{e}</p> : null;
}
const inv = (state: ActionState, name: string) =>
  state.errors?.[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-err` } : {};

export function LogForm({ houses, kinds }: { houses: { id: string; name: string }[]; kinds: { id: string; label: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(logContribution, {});
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="form" key={state.ok ? state.message : "log"}>
      <Flash state={state} />
      <div className="field">
        <label htmlFor="title">What did you do?</label>
        <input id="title" name="title" type="text" maxLength={200} required placeholder="e.g. Designed the Institute seminar poster" {...inv(state, "title")} />
        <Err state={state} name="title" />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="kind">Kind of work</label>
          <select id="kind" name="kind" required defaultValue="" {...inv(state, "kind")}>
            <option value="" disabled>Choose…</option>
            {kinds.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <Err state={state} name="kind" />
        </div>
        <div className="field">
          <label htmlFor="house">For which house?</label>
          <select id="house" name="house" required defaultValue="" {...inv(state, "house")}>
            <option value="" disabled>Choose…</option>
            {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <Err state={state} name="house" />
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="url">Link to the work</label>
          <input id="url" name="url" type="url" required placeholder="https://" {...inv(state, "url")} />
          <Err state={state} name="url" />
        </div>
        <div className="field">
          <label htmlFor="date">When</label>
          <input id="date" name="date" type="date" required max={today} defaultValue={today} {...inv(state, "date")} />
          <Err state={state} name="date" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Describe it</label>
        <textarea id="description" name="description" rows={4} maxLength={2000} required {...inv(state, "description")} />
        <p className="help">A steward reads this to confirm the work. Plain text only.</p>
        <Err state={state} name="description" />
      </div>
      <div><Submit>Log this contribution</Submit></div>
    </form>
  );
}

export function ProfileForm({ handle, displayName, profile }: { handle: string; displayName: string; profile: PublicProfile }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, {});
  return (
    <form action={action} className="form">
      <Flash state={state} />
      <label className="check">
        <input type="checkbox" name="public" defaultChecked={profile.public} />
        <span><strong>Make my profile public</strong><small>Off by default. When off, nothing about you is shown anywhere.</small></span>
      </label>
      <div className="grid2">
        <div className="field">
          <label htmlFor="displayName">Name</label>
          <input id="displayName" name="displayName" type="text" maxLength={80} defaultValue={displayName} required {...inv(state, "displayName")} />
          <Err state={state} name="displayName" />
        </div>
        <div className="field">
          <label htmlFor="handle">Handle</label>
          <input id="handle" name="handle" type="text" maxLength={30} defaultValue={handle} required pattern="[a-z0-9][a-z0-9-]{1,29}" {...inv(state, "handle")} />
          <p className="help">Your public address: /u/handle</p>
          <Err state={state} name="handle" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="bio">About you</label>
        <textarea id="bio" name="bio" rows={3} maxLength={400} defaultValue={profile.bio} />
      </div>
      <div className="field">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="url" defaultValue={profile.website} placeholder="https://" {...inv(state, "website")} />
        <Err state={state} name="website" />
      </div>
      <fieldset className="form">
        <legend className="label">When public, show…</legend>
        <label className="check"><input type="checkbox" name="showHouses" defaultChecked={profile.showHouses} /><span>The houses I contribute to</span></label>
        <label className="check"><input type="checkbox" name="showAccounts" defaultChecked={profile.showAccounts} /><span>My linked accounts (usernames and links)</span></label>
        <label className="check"><input type="checkbox" name="showContributions" defaultChecked={profile.showContributions} /><span>My recent contributions</span></label>
        <label className="check"><input type="checkbox" name="onWall" defaultChecked={profile.onWall} /><span><strong>List me on the contributors wall</strong><small>Alphabetical or by joining date. Never ordered by how much anyone has done.</small></span></label>
      </fieldset>
      <div><Submit>Save profile</Submit></div>
    </form>
  );
}

export function DeleteForm({ handle }: { handle: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="form">
      <Flash state={state} />
      <div className="field">
        <label htmlFor="confirm">Type your handle, <code>{handle}</code>, to confirm</label>
        <input id="confirm" name="confirm" type="text" autoComplete="off" required {...inv(state, "confirm")} />
        <Err state={state} name="confirm" />
      </div>
      <div><Submit className="btn danger">Delete my account and data</Submit></div>
    </form>
  );
}

export function ClaimForm({ provider, repo, issue }: { provider: string; repo: string; issue: number }) {
  const [state, action] = useActionState<ActionState, FormData>(claimIssue, {});
  return (
    <form action={action} className="form">
      <Flash state={state} />
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="repo" value={repo} />
      <input type="hidden" name="issue" value={issue} />
      {!state.ok && <div><Submit>Claim this issue</Submit></div>}
    </form>
  );
}
