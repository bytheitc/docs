"use client";

import { useState, type FormEvent } from "react";
import { sendProductReview } from "@/app/(site)/form-actions";
import { FormError, Honeypot } from "@/components/FormBits";

/** A review on one product. Held in the inbox for a steward to publish, not shown immediately. */
export function ReviewForm({ product }: { product: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await sendProductReview(new FormData(e.currentTarget));
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="form-sent" role="status">
        <p className="fs-title">Thank you.</p>
        <p>A steward reads every review before it&rsquo;s shown here, so yours may take a little while to appear.</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <input type="hidden" name="product" value={product} />
      <label>
        <span>Name</span>
        <input name="name" type="text" autoComplete="name" placeholder="First name or a handle is fine" required />
      </label>
      <label>
        <span>Rating</span>
        <select name="rating" required defaultValue="">
          <option value="" disabled>Choose a rating</option>
          <option value="5">5 — excellent</option>
          <option value="4">4 — good</option>
          <option value="3">3 — okay</option>
          <option value="2">2 — not great</option>
          <option value="1">1 — poor</option>
        </select>
      </label>
      <label>
        <span>Your review</span>
        <textarea name="body" rows={4} required />
      </label>
      <Honeypot />
      {state === "failed" && <FormError email="build@bytheitc.xyz" />}
      <button className="btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
