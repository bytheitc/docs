"use client";

import { useState, type FormEvent } from "react";
import { savePreferences } from "@/app/(site)/form-actions";
import type { NewsletterList } from "@/lib/api";

/** Changes lists, or unsubscribes, with no password: the token in the link is the authority. */
export function PreferencesForm({ token, allLists, current }: { token: string; allLists: NewsletterList[]; current: string[] }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "unsubscribed" | "failed">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function save(lists: string[]) {
    setState("saving");
    const res = await savePreferences(token, lists);
    if (!res.ok) {
      setMessage(res.message ?? null);
      return setState("failed");
    }
    setState(res.status === "unsubscribed" ? "unsubscribed" : "saved");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void save(new FormData(e.currentTarget).getAll("lists").map(String));
  }

  if (state === "unsubscribed") {
    return (
      <div className="form-sent" role="status">
        <p className="fs-title">You&rsquo;re unsubscribed.</p>
        <p>We won&rsquo;t write again. If that was a mistake, subscribe from the newsletter page whenever you like.</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <fieldset className="checkset">
        <legend>Your lists</legend>
        {allLists.map((l) => (
          <label key={l.id} className="check">
            <input type="checkbox" name="lists" value={l.id} defaultChecked={current.includes(l.id)} />
            <span>{l.label}</span>
          </label>
        ))}
      </fieldset>
      {state === "saved" && <p className="form-ok" role="status">Saved.</p>}
      {state === "failed" && <p className="form-error" role="alert">{message ?? "That didn't work. Please try again."}</p>}
      <div className="form-actions">
        <button className="btn" type="submit" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save my lists"}
        </button>
        <button className="btn btn-ghost" type="button" disabled={state === "saving"} onClick={() => void save([])}>
          Unsubscribe from everything
        </button>
      </div>
    </form>
  );
}
