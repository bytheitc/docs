// Called by this house's api after the CMS reports a change to published content.
// The api verifies the CMS webhook signature first; this route only checks the shared secret,
// so REVALIDATE_SECRET must be the same value in <house>/api and <house>/web.
//
//   POST /api/revalidate
//   x-revalidate-secret: <REVALIDATE_SECRET>
//   { "collection": "news" }       → drops the cache for that collection
//   {}                             → drops every content cache
import { revalidateTag } from "next/cache";
import { CONTENT_TAG, collectionTag } from "@/lib/api";

const COLLECTION = /^[a-z][a-z0-9_-]{0,47}$/;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  const given = req.headers.get("x-revalidate-secret") ?? "";
  if (!expected || !timingSafeEqual(given, expected)) {
    return Response.json({ error: { code: "unauthorized", message: "Bad or missing secret." } }, { status: 401 });
  }

  let collection: string | undefined;
  try {
    const body = (await req.json()) as { collection?: unknown };
    if (typeof body?.collection === "string" && COLLECTION.test(body.collection)) collection = body.collection;
  } catch {
    // An empty or unreadable body means "drop everything".
  }

  const tag = collection ? collectionTag(collection) : CONTENT_TAG;
  // expire: 0 drops the entry outright, so the next visitor gets the new content rather than the old
  // one while it regenerates. An editor who publishes and reloads should see their change.
  revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, tag });
}
