"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { submitProposal } from "@/app/(site)/propose/actions";
import { AREAS } from "@/lib/centers";
import { INSTITUTE_EMAIL } from "@/lib/nav";

interface Proposal {
  name: string;
  centerName: string;
  question: string;
}

type Failure = "no-database" | "invalid" | "error";

/** The proposal form. Proposals go to the Institute Studio inbox through a server action. */
export function ProposalForm() {
  const [sent, setSent] = useState<Proposal | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sent) confirmRef.current?.focus();
  }, [sent]);

  useEffect(() => {
    if (failure) errorRef.current?.focus();
  }, [failure]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const proposal = {
      name: String(data.get("name") ?? ""),
      centerName: String(data.get("centerName") ?? ""),
      question: String(data.get("question") ?? ""),
    };
    setFailure(null);
    startTransition(async () => {
      try {
        const res = await submitProposal(data);
        if (res.ok) setSent(proposal);
        else setFailure(res.reason);
      } catch {
        setFailure("error");
      }
    });
  }

  const mailto = (centerName: string) =>
    `mailto:${INSTITUTE_EMAIL}?subject=${encodeURIComponent(`Proposal: ${centerName || "a new center"}`)}`;

  if (sent) {
    return (
      <div className="confirm" role="status">
        <p className="sec-kicker">Received with thanks</p>
        <h3 ref={confirmRef} tabIndex={-1}>
          Jazāk Allāhu khayran, {sent.name || "friend"}.
        </h3>
        <p>
          Your proposal for the <em>{sent.centerName}</em> has been noted. Its question:
        </p>
        <blockquote>{sent.question}</blockquote>
        <p className="confirm-note">
          It has reached the officers of the Institute, and one of them will write back within the term. If you think of
          more to add, write to <a href={mailto(sent.centerName)}>{INSTITUTE_EMAIL}</a>.
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => setSent(null)}>
          Write another proposal
        </button>
      </div>
    );
  }

  return (
    <form className="proposal" onSubmit={onSubmit} aria-busy={pending}>
      {failure && (
        <div className="form-error" role="alert" ref={errorRef} tabIndex={-1}>
          {failure === "invalid" ? (
            <p>Please fill in your name, email, the proposed name and both parts of the question, then try again.</p>
          ) : (
            <p>
              We couldn&rsquo;t send this right now. Your answers are still here; please try again later, or email the
              proposal to <a href={mailto("")}>{INSTITUTE_EMAIL}</a>.
            </p>
          )}
        </div>
      )}
      <div className="hp" aria-hidden="true">
        <label>
          <span>Website</span>
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <fieldset>
        <legend>I · The proposer</legend>
        <div className="field-row">
          <label>
            <span>Your name</span>
            <input name="name" required autoComplete="name" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" placeholder="you@example.org" />
          </label>
        </div>
        <label>
          <span>Your place in the collective</span>
          <select name="role" defaultValue="Member of the collective">
            <option>Member of the collective</option>
            <option>Fellow of the Institute</option>
            <option>Builder in another house</option>
            <option>Scholar of the Islamic sciences</option>
            <option>Other</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>II · The center</legend>
        <label>
          <span>Proposed name</span>
          <input name="centerName" required placeholder="Center for …" />
        </label>
        <div className="field-row">
          <label>
            <span>Arabic word-sign <small>(optional)</small></span>
            <input name="arabic" lang="ar" dir="rtl" className="input-ar" />
          </label>
          <label>
            <span>Transliteration &amp; sense <small>(optional)</small></span>
            <input name="translit" placeholder="e.g. ḥikma · wisdom" />
          </label>
        </div>
        <div className="radios" role="radiogroup" aria-label="Area">
          <span className="radios-label">Area</span>
          {[...AREAS, "Not sure"].map((a, i) => (
            <label key={a} className="radio">
              <input type="radio" name="area" value={a} defaultChecked={i === 0} /> {a}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>III · The question</legend>
        <label>
          <span>The enduring question the center would hold</span>
          <textarea name="question" required rows={3} />
        </label>
        <label>
          <span>Why it deserves a room of its own</span>
          <textarea name="summary" required rows={5} />
        </label>
        <label>
          <span>A first year of work <small>(optional)</small></span>
          <textarea name="firstYear" rows={4} placeholder="Seminars, programs, a first output…" />
        </label>
        <label>
          <span>Who might keep it <small>(optional; roles, not names, are fine)</small></span>
          <textarea name="people" rows={3} />
        </label>
      </fieldset>

      <label className="check">
        <input type="checkbox" name="consent" required />
        <span>I understand the proposal will be read by the officers of the Institute and the directors of the existing centers.</span>
      </label>

      <p className="form-actions">
        <button type="submit" className="btn" disabled={pending}>{pending ? "Sending…" : "Submit proposal"}</button>
      </p>
    </form>
  );
}
