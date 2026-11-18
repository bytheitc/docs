"use client";
import { useActionState } from "react";
import { uploadCsvAction, type FormState } from "@/app/staff/actions";

export function UploadCsvForm({ listId }: { listId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadCsvAction, {});
  return (
    <form action={action} className="form" style={{ maxWidth: 420 }}>
      <input type="hidden" name="listId" value={listId} />
      {state.error && <p className="flash bad" role="alert">{state.error}</p>}
      {state.message && <p className="flash ok" role="status">{state.message}</p>}
      <div className="field">
        <label htmlFor="csv">CSV file</label>
        <input id="csv" name="csv" type="file" accept=".csv,text/csv" required />
      </div>
      <button type="submit" className="btn" disabled={pending}>{pending ? "Uploading…" : "Upload"}</button>
    </form>
  );
}
