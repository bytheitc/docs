"use client";
import { deleteApp } from "@/app/developers/actions";

export function DeleteAppButton({ clientId, name }: { clientId: string; name: string }) {
  return (
    <form
      action={deleteApp}
      onSubmit={(e) => { if (!window.confirm(`Delete “${name}”? This can't be undone.`)) e.preventDefault(); }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <button type="submit" className="btn danger small">Delete app</button>
    </form>
  );
}
