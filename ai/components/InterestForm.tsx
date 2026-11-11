"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { sendInterest, type InterestFields } from "@/app/(site)/collaborate/actions";

interface Props {
  /** The open calls, offered as "I'd like to help as" choices. */
  calls: { id: string; title: string }[];
  /** "Areas of interest" checkboxes. */
  interests: string[];
}

// Interest form. Submissions are recorded in the admin inbox (form id "interest") by a server action.
// Keep the amānah promise in the consent copy below true: the email is used only to reply.
export function InterestForm({ calls, interests }: Props) {
  const id = useId();
  const [sent, setSent] = useState<InterestFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const role = String(fd.get("role") ?? "");
    if (!name || !email || !role) { setError("Please add your name, email and how you'd like to help."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("That email address doesn't look complete."); return; }
    if (!fd.get("consent")) { setError("Please confirm we may use your email to reply."); return; }
    const data: InterestFields = { name, email, role, interests: fd.getAll("interests").map(String), note: String(fd.get("note") ?? "").trim() };

    setError(null);
    setBusy(true);
    try {
      const res = await sendInterest(data, String(fd.get("website") ?? ""));
      if (res.ok) {
        setSent(data);
        requestAnimationFrame(() => doneRef.current?.focus());
      } else if (res.reason === "no-database") {
        setError("We couldn't send this right now. Please email ai@example.org instead, and we'll reply from there.");
      } else {
        setError("Something went wrong sending this. Please try again, or email ai@example.org.");
      }
    } catch {
      setError("Something went wrong sending this. Please try again, or email ai@example.org.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    const role = calls.find((c) => c.id === sent.role)?.title.toLowerCase();
    return (
      <div className="form-done" ref={doneRef} tabIndex={-1} role="status">
        <p className="eyebrow">received</p>
        <h3>Jazākum Allāhu khayran, {sent.name}.</h3>
        <p>
          Thank you for offering to help{role ? <> as one of our {role}</> : null}. We&apos;ll reply to {sent.email}, and use
          that address for nothing else. If it&apos;s urgent, write to <a href="mailto:ai@example.org">ai@example.org</a>.
        </p>
        <button type="button" className="btn-ghost" onClick={() => setSent(null)}>Send another</button>
      </div>
    );
  }

  return (
    <form className="interest-form" onSubmit={onSubmit} noValidate>
      <div className="hp-field" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>name</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label className="field">
          <span>email</span>
          <input name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.org" />
        </label>
      </div>
      <label className="field">
        <span>I&apos;d like to help as</span>
        <select name="role" required defaultValue="">
          <option value="" disabled>choose one</option>
          {calls.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </label>
      {interests.length > 0 && (
        <fieldset className="field">
          <legend>areas of interest</legend>
          <div className="chips">
            {interests.map((i) => (
              <label key={i} className="chip">
                <input type="checkbox" name="interests" value={i} />
                <span>{i}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="field">
        <span>anything else? <i>(optional)</i></span>
        <textarea name="note" rows={4} />
      </label>
      <label className="consent" htmlFor={`${id}-consent`}>
        <input id={`${id}-consent`} type="checkbox" name="consent" />
        <span>Use my email only to reply about collaborating. Don&apos;t add me to anything else.</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="cta" disabled={busy}>{busy ? "sending…" : <>send interest <span aria-hidden="true">→</span></>}</button>
    </form>
  );
}
