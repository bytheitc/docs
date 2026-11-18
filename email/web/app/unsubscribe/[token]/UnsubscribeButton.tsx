"use client";
import { useState } from "react";
import { confirmUnsubscribeAction } from "@/app/unsubscribe/actions";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function go() {
    setState("pending");
    const result = await confirmUnsubscribeAction(token);
    if (result.ok) setState("done");
    else { setState("error"); setError(result.error ?? "Something went wrong."); }
  }

  if (state === "done") return <p className="flash ok">You're unsubscribed.</p>;
  return (
    <>
      {state === "error" && <p className="flash bad" style={{ marginBottom: 10 }}>{error}</p>}
      <button type="button" className="btn danger" onClick={go} disabled={state === "pending"}>
        {state === "pending" ? "Unsubscribing…" : "Unsubscribe me"}
      </button>
    </>
  );
}
