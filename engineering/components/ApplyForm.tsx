"use client";

import { useActionState } from "react";
import { submitApplication, type ApplyState } from "@/app/(site)/careers/actions";

// Careers application form. Submissions go to the admin inbox; email stays available as an alternative.
export function ApplyForm({ roles, email }: { roles: { id: string; label: string }[]; email: string }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(submitApplication, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="form-done" role="status">
        <p className="kicker mono">Received</p>
        <h3>Thank you. Your application is with the team.</h3>
        <p>Someone will reply by email. If you do not hear back within two weeks, write to <a href={`mailto:${email}`} className="u">{email}</a>.</p>
      </div>
    );
  }

  const v = state.values ?? {};
  const err = state.errors ?? {};
  const field = (name: "name" | "email" | "message") => ({
    id: `apply-${name}`,
    name,
    defaultValue: v[name],
    "aria-invalid": err[name] ? true : undefined,
    "aria-describedby": err[name] ? `apply-${name}-err` : undefined,
  });

  return (
    <form action={action} className="apply-form" noValidate>
      {state.status === "unavailable" && (
        <p className="form-alert" role="alert">
          We couldn&rsquo;t send this right now. Please email <a href={`mailto:${email}`} className="u">{email}</a> instead; your text is still below.
        </p>
      )}
      <div className="hp" aria-hidden="true">
        <label htmlFor="apply-website">Website</label>
        <input id="apply-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="f-row">
        <div className="f-field">
          <label htmlFor="apply-name">Name <span className="mono req">required</span></label>
          <input type="text" autoComplete="name" required {...field("name")} />
          {err.name && <p id="apply-name-err" className="f-err mono">{err.name}</p>}
        </div>
        <div className="f-field">
          <label htmlFor="apply-email">Email <span className="mono req">required</span></label>
          <input type="email" autoComplete="email" required {...field("email")} />
          {err.email && <p id="apply-email-err" className="f-err mono">{err.email}</p>}
        </div>
      </div>
      <div className="f-row">
        <div className="f-field">
          <label htmlFor="apply-role">Role</label>
          <select id="apply-role" name="role" defaultValue={v.role ?? ""}>
            <option value="">Nothing listed fits / general</option>
            {roles.map((r) => <option key={r.id} value={r.label}>{r.label}</option>)}
          </select>
        </div>
        <div className="f-field">
          <label htmlFor="apply-links">Links</label>
          <input id="apply-links" name="links" type="text" defaultValue={v.links} placeholder="Code, writing, portfolio" aria-describedby="apply-links-help" />
          <p id="apply-links-help" className="f-help">Something you have built or written. Separate links with spaces.</p>
        </div>
      </div>
      <div className="f-field">
        <label htmlFor="apply-message">Why this work <span className="mono req">required</span></label>
        <textarea rows={6} required {...field("message")} />
        {err.message && <p id="apply-message-err" className="f-err mono">{err.message}</p>}
      </div>
      <div className="f-actions">
        <button type="submit" className="btn" disabled={pending}>{pending ? "Sending…" : "Send application →"}</button>
        <p className="f-help">Or email <a href={`mailto:${email}`} className="u">{email}</a> with the role ID in the subject line.</p>
      </div>
    </form>
  );
}
