"use client";

import { useState, type FormEvent } from "react";
import { sendContact } from "@/app/(site)/form-actions";
import { FormError, Honeypot } from "@/components/FormBits";

export function ContactForm({ topics }: { topics: string[] }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await sendContact(new FormData(e.currentTarget));
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="form-sent" role="status">
        <p className="fs-title">Message received.</p>
        <p>Thank you for writing. The right person will reply as soon as they can.</p>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setState("idle")}>Write another</button>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="form-row">
        <label>
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" placeholder="you@example.org" required />
        </label>
      </div>
      <label>
        <span>Who is this for?</span>
        <select name="topic" defaultValue={topics[0]}>
          {topics.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" rows={6} required />
      </label>
      <Honeypot />
      {state === "failed" && <FormError />}
      <button className="btn" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
    </form>
  );
}
