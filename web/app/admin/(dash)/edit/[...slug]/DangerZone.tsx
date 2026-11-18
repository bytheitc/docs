"use client";
import { useActionState } from "react";
import { deletePage, movePage, type FormState } from "@/app/admin/actions";

export function DangerZone({ slug, sha }: { slug: string; sha: string }) {
  const [moveState, move, moving] = useActionState<FormState, FormData>(movePage, {});
  const [delState, del, deleting] = useActionState<FormState, FormData>(deletePage, {});
  return (
    <div className="card">
      <h3>Move or delete</h3>
      <form action={move}>
        <input type="hidden" name="from" value={slug} /><input type="hidden" name="sha" value={sha} />
        <div className="field">
          <label htmlFor="to">New address</label>
          <input id="to" name="to" defaultValue={slug} required pattern="[a-z0-9\-/]+" />
          {(moveState.fields?.to || moveState.error) && <span className="err">{moveState.fields?.to ?? moveState.error}</span>}
        </div>
        <button className="btn ghost small" disabled={moving}>{moving ? "Moving…" : "Move"}</button>
      </form>
      <hr style={{ border: 0, borderTop: "1px solid var(--rule)", margin: "16px 0" }} />
      <form action={del}>
        <input type="hidden" name="slug" value={slug} /><input type="hidden" name="sha" value={sha} />
        <div className="field">
          <label htmlFor="confirm">Type <code>{slug}</code> to delete</label>
          <input id="confirm" name="confirm" autoComplete="off" />
          {delState.error && <span className="err">{delState.error}</span>}
        </div>
        <button className="btn danger small" disabled={deleting}>{deleting ? "Deleting…" : "Delete page"}</button>
      </form>
    </div>
  );
}
