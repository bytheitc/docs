"use client";

import { useState, type FormEvent } from "react";
import { sendSuggestion } from "@/app/(site)/form-actions";
import { FormError, Honeypot } from "@/components/FormBits";

/** The suggestion form. The questions ask for a need, not a feature request. */
export function SuggestionForm({ areas }: { areas: string[] }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await sendSuggestion(new FormData(e.currentTarget));
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="form-sent" role="status">
        <p className="fs-title">Thank you — this is read by a person.</p>
        <p>
          If you left an email address, you will hear what happened to it, including when the answer is no.
          If several people describe the same need, it becomes a public brief on the RFPs page.
        </p>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setState("idle")}>Send another</button>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        <span>What is this about?</span>
        <select name="area" defaultValue={areas[0]}>
          {areas.map((a) => <option key={a}>{a}</option>)}
        </select>
      </label>
      <label>
        <span>Who is struggling, and with what?</span>
        <textarea name="who" rows={4} required />
        <small>Name the people, not the feature.</small>
      </label>
      <label>
        <span>What happens today?</span>
        <textarea name="today" rows={4} required />
        <small>The spreadsheet, the group chat, the paper form, the volunteer who holds it all in their head.</small>
      </label>
      <label>
        <span>What would change if it worked?</span>
        <textarea name="change" rows={3} required />
      </label>
      <label>
        <span>Has something been tried already?</span>
        <input name="existing" type="text" placeholder="A tool you abandoned, and why" />
      </label>
      <div className="form-row">
        <label>
          <span>Your name <em>(optional)</em></span>
          <input name="name" type="text" autoComplete="name" />
        </label>
        <label>
          <span>Email <em>(optional)</em></span>
          <input name="email" type="email" autoComplete="email" placeholder="you@example.org" />
          <small>Only so we can write back.</small>
        </label>
      </div>
      <Honeypot />
      {state === "failed" && <FormError email="build@example.org" />}
      <button className="btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send this to us"}
      </button>
    </form>
  );
}
