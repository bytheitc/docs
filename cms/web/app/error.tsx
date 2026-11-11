"use client";
// Shown when cms/api fails unexpectedly (for example while it restarts).
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="cms" data-space="itc">
      <main className="cms-auth">
        <div className="cms-auth-card">
          <h1>Something went wrong</h1>
          <p>The CMS couldn&rsquo;t finish that request. Your last saved work is safe.</p>
          <p><button type="button" className="cms-btn primary" onClick={reset}>Try again</button></p>
        </div>
      </main>
    </div>
  );
}
