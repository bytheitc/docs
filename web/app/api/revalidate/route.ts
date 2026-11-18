// Called by docs/api after every edit, so the change shows at once instead of when the cache runs out.
// REVALIDATE_SECRET must be the same value in docs/api and docs/web.
//
//   POST /api/revalidate   x-revalidate-secret: <REVALIDATE_SECRET>
import { revalidateTag } from "next/cache";
import { DOCS_TAG } from "@/lib/api";

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !same(req.headers.get("x-revalidate-secret") ?? "", expected)) {
    return Response.json({ error: { code: "unauthorized", message: "Bad or missing secret." } }, { status: 401 });
  }
  revalidateTag(DOCS_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
