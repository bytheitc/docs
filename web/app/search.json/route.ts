// The search index, for the search box. Served from this origin (the CSP allows no other) and cached
// with the rest of the docs, so an edit shows up in search as soon as it shows on the page.
import { getSearchIndex } from "@/lib/api";

export async function GET() {
  return Response.json({ entries: await getSearchIndex() }, { headers: { "Cache-Control": "public, max-age=60" } });
}
