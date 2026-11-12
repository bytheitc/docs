// Server-side client for cms/api. The browser never talks to cms/api; it never sees the session token either.
//
//   CMS_API_URL   where cms/api listens (default http://localhost:4100)
const BASE = (process.env.CMS_API_URL ?? "http://localhost:4100").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(503, "unavailable", "The CMS service can't be reached right now. Try again in a moment.");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? `The CMS service answered ${res.status}.`, err?.fields);
  }
  return json as T;
}

/** Whether the api can actually deliver email. Used to warn before an editor writes a reply nobody gets. */
export async function mailDelivers(): Promise<boolean> {
  try {
    const health = await api<{ mail?: { delivers?: boolean } }>("/health");
    return health.mail?.delivers === true;
  } catch {
    return false;
  }
}
