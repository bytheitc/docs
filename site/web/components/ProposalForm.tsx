"use client";

import { useState, type FormEvent } from "react";
import { sendProposal } from "@/app/(site)/form-actions";
import { FormError, Honeypot } from "@/components/FormBits";

/** Registers interest in a published brief. The proposal itself is sent by email, not pasted here. */
export function ProposalForm({ rfp, title }: { rfp: string; title: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await sendProposal(new FormData(e.currentTarget));
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="form-sent" role="status">
        <p className="fs-title">Received.</p>
        <p>
          Someone from the stewarding house will reply, whether or not we take this further. If the brief
          closes before you hear from us, that is our delay, not your answer.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <input type="hidden" name="rfp" value={`${title} (${rfp})`} />
      <div className="form-row">
        <label>
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" required />
        </label>
        <label>
          <span>Organisation</span>
          <input name="organisation" type="text" placeholder="Or “independent”" autoComplete="organization" />
        </label>
      </div>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" placeholder="you@example.org" required />
      </label>
      <label>
        <span>Work we can look at</span>
        <input name="links" type="text" placeholder="Repositories, shipped projects, references" />
        <small>Links, separated by spaces. Anything that shows how you work.</small>
      </label>
      <label>
        <span>How you would approach this</span>
        <textarea name="approach" rows={6} required />
        <small>A few paragraphs is plenty at this stage. We ask for the full proposal only after we have replied.</small>
      </label>
      <label>
        <span>When you could start</span>
        <input name="availability" type="text" placeholder="e.g. from March, two days a week" />
      </label>
      <Honeypot />
      {state === "failed" && <FormError email="build@example.org" />}
      <button className="btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Register interest"}
      </button>
    </form>
  );
}
