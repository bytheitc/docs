// The contributor portal, from this site's point of view.
//
// The wall is read through oss/api (which asks portal/api), so the portal's address stays on the
// server. `claimUrl` is different: it builds a link for the visitor's browser to follow, so it uses
// the portal's public URL. Neither ever throws: the OSS site works without the portal.
import { PORTAL_URL } from "@/lib/houses";

const API_URL = (process.env.API_URL ?? "http://localhost:4004").replace(/\/+$/, "");

export interface PortalContributor {
  handle: string;
  name: string;
  avatarUrl: string | null;
  profileUrl: string;
  joined: string;
}

/** The opt-in wall, or null when it could not be read. */
export async function getPortalWall(): Promise<PortalContributor[] | null> {
  try {
    const res = await fetch(`${API_URL}/portal-wall`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60, tags: ["portal-wall"] },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { contributors?: PortalContributor[] | null };
    return Array.isArray(body.contributors) ? body.contributors : null;
  } catch {
    return null; // the api or the portal is unreachable: the page shows only the maintainers' wall
  }
}

/** Link to claim a GitHub issue on the portal. Needs the repo URL (https://github.com/owner/name) and an issue number. */
export function claimUrl(repoUrl: string, issue: number): string | null {
  try {
    const [owner, name] = new URL(repoUrl).pathname.split("/").filter(Boolean);
    if (!owner || !name) return null;
    const q = new URLSearchParams({ provider: "github", repo: `${owner}/${name}`, issue: String(issue) });
    return `${PORTAL_URL}/claim?${q}`;
  } catch {
    return null;
  }
}
