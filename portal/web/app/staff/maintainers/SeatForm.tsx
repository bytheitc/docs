"use client";
import { useActionState } from "react";
import { seatMaintainer, type StaffFormState } from "../actions";

/** Seating the first maintainer of a repo, or a steering seat. Everything else happens between maintainers. */
export function SeatForm() {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(seatMaintainer, {});
  return (
    <form action={action} className="cms-fields">
      {state.error && <p className="cms-flash bad" role="alert">{state.error}</p>}
      <label className="cms-field">
        <span className="cms-label">Contributor handle</span>
        <input name="handle" type="text" required placeholder="amina" />
      </label>
      <label className="cms-field">
        <span className="cms-label">Role</span>
        <select name="role" defaultValue="maintainer">
          <option value="maintainer">Maintainer of one repository</option>
          <option value="reviewer">Reviewer of one repository</option>
          <option value="steering">Steering group (collective-wide)</option>
        </select>
      </label>
      <label className="cms-field">
        <span className="cms-label">Repository</span>
        <input name="repo" type="text" placeholder="owner/name" />
        <span className="cms-help">Ignored for a steering seat, which is collective-wide.</span>
      </label>
      <button className="cms-btn primary" type="submit" disabled={pending}>{pending ? "Working…" : "Seat"}</button>
    </form>
  );
}
