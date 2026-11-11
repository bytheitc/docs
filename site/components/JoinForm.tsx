"use client";

import { useState, type FormEvent } from "react";
import { sendInvite } from "@/app/(site)/form-actions";
import { FormError, Honeypot } from "@/components/FormBits";

export function JoinForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await sendInvite(new FormData(e.currentTarget));
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return <p className="sent-msg" role="status">Thank you. We&rsquo;ll be in touch, in shāʾ Allāh.</p>;
  }

  return (
    <form className="join-form" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      <Honeypot />
      <button className="btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Request an invitation"}
      </button>
      {state === "failed" && <FormError />}
    </form>
  );
}
