// Reads the contributor portal's public, opt-in contributors wall. Never throws: the OSS site works without the portal.
import { PORTAL_URL } from "@/lib/houses";

export interface PortalContributor {
  handle: string;
  name: string;
  avatarUrl: string | null;
  profileUrl: string;
  joined: string;
}

export async function getPortalWall(): Promise<PortalContributor[] | null> {
  try {
    const res = await fetch(`${PORTAL_URL}/api/contributors`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { contributors?: PortalContributor[] };
    return Array.isArray(body.contributors) ? body.contributors : null;
  } catch {
    return null; // portal unreachable: the page shows only the maintainers' wall
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
