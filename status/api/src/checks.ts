// Running one probe. Deliberately small: an HTTP request, a clock, and a verdict.
//
// A check has three outcomes rather than two. "Down" and "slow" are different things to the person
// reading the page, and collapsing them is how status pages end up either crying wolf or staying
// green through an outage everyone can feel.
import type { Check, CheckResult, State } from "./types.js";
import { at } from "./util.js";

export interface Probe {
  state: State;
  ms: number;
  status?: number;
  error?: string;
}

/** Bodies are read only far enough to assert on them; a status check is not a scraper. */
const MAX_BODY = 64 * 1024;

export async function runCheck(check: Check, fetchImpl: typeof fetch = fetch): Promise<Probe> {
  const started = Date.now();
  const timeout = AbortSignal.timeout(check.timeoutMs);

  try {
    const res = await fetchImpl(check.url, {
      method: check.method || "GET",
      headers: { accept: "application/json, text/plain;q=0.9, */*;q=0.8", ...(check.headers ?? {}) },
      redirect: "follow",
      signal: timeout,
    });
    const ms = Date.now() - started;

    if (!check.expectStatus.includes(res.status)) {
      // Read and discard, so the socket is released rather than left to the GC.
      await res.text().catch(() => "");
      return { state: "down", ms, status: res.status, error: `expected ${check.expectStatus.join("/")}, got ${res.status}` };
    }

    if (check.assert) {
      const text = (await res.text().catch(() => "")).slice(0, MAX_BODY);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { state: "down", ms, status: res.status, error: "response was not JSON, but an assertion was configured" };
      }
      const actual = at(parsed, check.assert.path);
      if (actual !== check.assert.equals) {
        return {
          state: "down",
          ms,
          status: res.status,
          error: `${check.assert.path} was ${JSON.stringify(actual)}, expected ${JSON.stringify(check.assert.equals)}`,
        };
      }
    } else {
      await res.text().catch(() => "");
    }

    // A pass that took too long is still a pass, but saying so is the point.
    if (check.degradedMs > 0 && ms >= check.degradedMs) {
      return { state: "degraded", ms, status: res.status, error: `responded in ${ms}ms (slow above ${check.degradedMs}ms)` };
    }
    return { state: "up", ms, status: res.status };
  } catch (e) {
    const ms = Date.now() - started;
    const err = e as { name?: string; message?: string; cause?: { code?: string } };
    const reason =
      err?.name === "TimeoutError" || err?.name === "AbortError"
        ? `no response within ${check.timeoutMs}ms`
        : err?.cause?.code || err?.message || "request failed";
    return { state: "down", ms, error: reason };
  }
}

export const toResult = (serviceId: string, tenantId: string, p: Probe, at = new Date()): CheckResult => ({
  serviceId,
  tenantId,
  at,
  state: p.state,
  ms: p.ms,
  ...(p.status !== undefined ? { status: p.status } : {}),
  ...(p.error ? { error: p.error } : {}),
});

/** The defaults a service gets when its check leaves them out. */
export const defaultCheck = (url: string): Check => ({
  kind: "http",
  url,
  method: "GET",
  expectStatus: [200],
  timeoutMs: 10_000,
  degradedMs: 2_000,
});
