// Small pieces shared by the public forms.

/** Visually hidden field that people never fill in; bots often do. */
export function Honeypot() {
  return (
    <div className="hp" aria-hidden="true">
      <label>Leave this empty<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>
  );
}

/** Shown when a submission could not be stored (e.g. no database connected). */
export function FormError({ email = "hello@example.org" }: { email?: string }) {
  return (
    <p className="form-error" role="alert">
      We couldn&rsquo;t send this right now. Please email <a href={`mailto:${email}`}>{email}</a> instead, and we&rsquo;ll reply personally.
    </p>
  );
}
