"use client";

import { useState, type FormEvent } from "react";
import { sendJoin } from "@/app/(site)/form-actions";
import { FormError, Honeypot } from "@/components/FormBits";

const WAYS = [
  { value: "member", label: "Member" },
  { value: "volunteer", label: "Volunteer" },
  { value: "partner", label: "Partner" },
  { value: "donor", label: "Donor" },
] as const;

const HOUSES = ["Not sure yet", "AI", "Engineering", "Institute", "Open Source", "Research"];

export function InvolvementForm({ defaultWay = "member" }: { defaultWay?: (typeof WAYS)[number]["value"] }) {
  const [sent, setSent] = useState<null | { name: string; way: string }>(null);
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setState("sending");
    let ok = false;
    try {
      ok = (await sendJoin(data)).ok;
    } catch {
      ok = false;
    }
    if (!ok) return setState("failed");
    setState("idle");
    const way = WAYS.find((w) => w.value === data.get("way"))?.label ?? "Member";
    setSent({ name: String(data.get("name") ?? "").trim(), way });
  }

  if (sent) {
    return (
      <div className="form-sent" role="status">
        <p className="fs-title">Thank you{sent.name ? `, ${sent.name}` : ""}.</p>
        <p>We&rsquo;ve noted your interest as a <strong>{sent.way.toLowerCase()}</strong>. Someone from the collective will write to you, in shāʾ Allāh.</p>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setSent(null)}>Send another</button>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <fieldset className="form-ways">
        <legend>I&rsquo;d like to join as a</legend>
        {WAYS.map((w) => (
          <label key={w.value} className="chip">
            <input type="radio" name="way" value={w.value} defaultChecked={w.value === defaultWay} />
            <span>{w.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="form-row">
        <label>
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" placeholder="you@bytheitc.xyz" required />
        </label>
      </div>
      <label>
        <span>House you&rsquo;re drawn to</span>
        <select name="house" defaultValue={HOUSES[0]}>
          {HOUSES.map((h) => <option key={h}>{h}</option>)}
        </select>
      </label>
      <label>
        <span>A few words about you <small>(optional)</small></span>
        <textarea name="message" rows={4} placeholder="What you work on, what you hope to build, how you'd like to help." />
      </label>
      <p className="form-note">We only use these details to reply to you. See our <a href="/privacy">privacy draft</a>.</p>
      <Honeypot />
      {state === "failed" && <FormError />}
      <button className="btn" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send"}</button>
    </form>
  );
}
