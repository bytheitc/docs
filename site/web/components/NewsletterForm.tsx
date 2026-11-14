"use client";

import { useState, type FormEvent } from "react";
import { subscribe } from "@/app/(site)/form-actions";
import { FormError, Honeypot } from "@/components/FormBits";
import type { NewsletterList } from "@/lib/api";

/**
 * Double opt-in: this never adds anyone. It asks for one confirmation email, and the address only
 * joins a list when the person opens the link in it.
 */
export function NewsletterForm({ lists, defaultList = "site" }: { lists: NewsletterList[]; defaultList?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await subscribe(new FormData(e.currentTarget));
      if (res.ok) setState("sent");
      else {
        setMessage(res.message ?? null);
        setState("failed");
      }
    } catch {
      setMessage(null);
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="form-sent" role="status">
        <p className="fs-title">Check your inbox.</p>
        <p>
          We&rsquo;ve sent one email to that address. Open the link in it within two days and you&rsquo;re on the
          list. If it doesn&rsquo;t arrive, look in your spam folder before trying again.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" placeholder="you@bytheitc.xyz" required />
      </label>
      <fieldset className="checkset">
        <legend>Which lists?</legend>
        <p className="help">One per house. Choose as many as you like; you can change this from any email we send.</p>
        {lists.map((l) => (
          <label key={l.id} className="check">
            <input type="checkbox" name="lists" value={l.id} defaultChecked={l.id === defaultList} />
            <span>{l.label}</span>
          </label>
        ))}
      </fieldset>
      <Honeypot />
      {state === "failed" && (message ? <p className="form-error" role="alert">{message}</p> : <FormError />)}
      <button className="btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Subscribe"}
      </button>
    </form>
  );
}
