// The portal's public, read-only surface. No session, and only what someone has chosen to show.
//
//   GET /public/contributors         the opt-in wall, also read by oss/api
//   GET /public/contributors/:handle one public profile, honouring that person's switches
import { Router } from "express";
import { notFound } from "../http.js";
import { needsDatabase } from "../portal/guard.js";
import { counts } from "../portal/milestones.js";
import { requirePortalStore } from "../portal/store.js";
import type { Ctx } from "../app.js";

export function publicRoutes({ config }: Ctx): Router {
  const r = Router();
  const profileUrl = (handle: string) => `${config.web.url}/u/${encodeURIComponent(handle)}`;

  r.get("/public/contributors", needsDatabase, async (_req, res) => {
    // Deliberately not caught: an empty wall and an unreadable one must not look alike.
    const people = await requirePortalStore().listContributors({ publicWall: true });
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=60");
    res.json({
      contributors: people
        .filter((p) => !p.disabled)
        .map((p) => ({
          handle: p.handle,
          name: p.displayName,
          avatarUrl: p.avatarUrl ?? null,
          profileUrl: profileUrl(p.handle),
          joined: p.createdAt.toISOString().slice(0, 10),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })),
    });
  });

  r.get("/public/contributors/:handle", needsDatabase, async (req, res) => {
    const store = requirePortalStore();
    const person = await store.getContributorByHandle(String(req.params.handle));
    if (!person || person.disabled || !person.profile.public) throw notFound("No public profile with that handle.");

    const [accounts, contributions] = await Promise.all([
      person.profile.showAccounts || person.profile.showHouses || person.profile.showContributions
        ? store.listAccounts(person.id)
        : Promise.resolve([]),
      person.profile.showHouses || person.profile.showContributions
        ? store.listContributions({ contributorId: person.id, includeHidden: false })
        : Promise.resolve([]),
    ]);
    const shown = contributions.filter(counts);

    res.json({
      contributor: {
        handle: person.handle,
        name: person.displayName,
        avatarUrl: person.avatarUrl ?? null,
        bio: person.profile.bio,
        website: person.profile.website,
        joined: person.createdAt.toISOString().slice(0, 10),
      },
      // Each list is present only because this person switched it on.
      houses: person.profile.showHouses ? [...new Set(shown.map((c) => c.house))] : null,
      accounts: person.profile.showAccounts
        ? accounts.map((a) => ({ provider: a.provider, username: a.username, profileUrl: a.profileUrl ?? null }))
        : null,
      contributions: person.profile.showContributions
        ? shown.map((c) => ({
            id: c.id, provider: c.provider, kind: c.kind, title: c.title, url: c.url ?? null,
            repo: c.repo ?? null, state: c.state, house: c.house, occurredAt: c.occurredAt,
            ...(c.provider === "self" ? { review: { status: c.review?.status ?? "verified" } } : {}),
          }))
        : null,
    });
  });

  return r;
}
