// Public, read-only list of contributors who opted into the wall. Used by other ITC sites (e.g. ITC Open Source).
// Only people with a public profile AND "on the wall" switched on appear; only display fields are returned.
import { getPortalStore } from "@/lib/portal/store";
import { origin as portalOrigin } from "@/lib/portal/util";

// Short caches: someone who opts out should disappear within about a minute.
export const revalidate = 60;

export async function GET(req: Request) {
  const store = getPortalStore();
  const people = store ? await store.listContributors({ publicWall: true }).catch(() => []) : [];
  const origin = portalOrigin(req.url);
  const body = {
    contributors: people
      .filter((p) => !p.disabled)
      .map((p) => ({
        handle: p.handle,
        name: p.displayName,
        avatarUrl: p.avatarUrl ?? null,
        profileUrl: `${origin}/u/${encodeURIComponent(p.handle)}`,
        joined: p.createdAt.toISOString().slice(0, 10),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })),
  };
  return Response.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=60",
    },
  });
}
