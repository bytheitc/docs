import { getReadiness, listTransactional } from "@/lib/email";
import { requireStaff } from "@/lib/staff-session";
import { fmtDateTime } from "@/lib/util";

export const metadata = { title: "Sending" };

const CHIP = { ok: "ok", warn: "warn", fail: "bad" } as const;
const LABEL = { ok: "Done", warn: "Check", fail: "To do" } as const;
const MSG_CHIP = { sent: "ok", failed: "bad", suppressed: "warn" } as const;

export default async function SendingPage() {
  const { token } = await requireStaff();
  const [readiness, transactional] = await Promise.all([getReadiness(token), listTransactional(token)]);

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>Sending</h1>
          <p>Whether this deployment can send real mail yet, and what the other houses have sent through it.</p>
        </div>
      </div>

      <section className="panel">
        <h2>
          Readiness{" "}
          {readiness && (
            <span className={`chip ${readiness.ready ? "ok" : "bad"}`} style={{ marginLeft: 8 }}>
              {readiness.ready ? "ready to send" : "not ready"}
            </span>
          )}
        </h2>
        {!readiness ? (
          <p className="flash bad">The email service could not be reached.</p>
        ) : (
          <>
            <p className="help" style={{ marginBottom: 12 }}>
              Checked live against this api&apos;s settings and real DNS lookups{readiness.fromDomain ? ` for ${readiness.fromDomain}` : ""}. Fixing these
              happens outside the code: the provider&apos;s dashboard, your DNS host, and the api&apos;s environment. Reload after each change.
            </p>
            <table className="simple">
              <thead>
                <tr><th>Check</th><th>Status</th><th>Detail</th></tr>
              </thead>
              <tbody>
                {readiness.checks.map((c) => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{c.label}</td>
                    <td><span className={`chip ${CHIP[c.status]}`}>{LABEL[c.status]}</span></td>
                    <td>{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Transactional mail</h2>
        <p className="help" style={{ marginBottom: 12 }}>
          Magic links, confirmations and updates other houses sent through <code>POST /transactional</code>. The last 100; message bodies are never stored.
        </p>
        {!transactional ? (
          <p className="flash bad">Couldn&apos;t load the log.</p>
        ) : transactional.messages.length === 0 ? (
          <p className="empty">Nothing sent yet.</p>
        ) : (
          <table className="simple">
            <thead>
              <tr><th>When</th><th>House</th><th>Kind</th><th>To</th><th>Subject</th><th>Status</th></tr>
            </thead>
            <tbody>
              {transactional.messages.map((m) => (
                <tr key={m.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(m.at)}</td>
                  <td>{m.service}</td>
                  <td>{m.category}</td>
                  <td>{m.to}</td>
                  <td>{m.subject}</td>
                  <td>
                    <span className={`chip ${MSG_CHIP[m.status]}`} title={m.error}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
