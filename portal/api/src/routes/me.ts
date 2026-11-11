// Everything a signed-in contributor can see or change about themselves. Every route needs the
// bearer session token portal/web forwards from its own cookie.
//
//   GET    /me                      the contributor and their linked accounts
//   GET    /me/dashboard            accounts, contributions, claims and milestones in one read
//   GET    /me/export               everything held about them, as JSON (amānah)
//   DELETE /me                      { confirm: "<handle>" } deletes the account and all of its data
//   PATCH  /me/profile              handle, display name and what is public
//   POST   /me/contributions        self-logged work, held as pending until a steward verifies it
//   DELETE /me/accounts/:provider/:providerUserId
//   POST   /me/claims               claim an issue
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { badRequest, body, invalid, notFound, str } from "../http.js";
import { getSettings } from "../portal/content.js";
import { needsContributor, needsDatabase } from "../portal/guard.js";
import { counts, evaluateMilestones } from "../portal/milestones.js";
import { requirePortalStore } from "../portal/store.js";
import { ClaimTakenError, DEFAULT_PROFILE, type Claim, type PublicProfile } from "../portal/types.js";
import { HANDLE, SELF_KINDS, httpUrl, isHouse } from "../portal/util.js";
import { getMilestones } from "../portal/content.js";
import { knownProvider } from "../providers/index.js";
import { assignGithubIssue } from "../providers/github.js";
import type { Ctx } from "../app.js";

const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const CLAIMABLE = ["github", "gitlab", "codeberg", "dev"];
const MAX_ISSUE = 10_000_000;

export function meRoutes({ cms }: Ctx): Router {
  const r = Router();
  r.use("/me", needsDatabase, needsContributor());

  r.get("/me", async (req, res) => {
    const me = req.contributor!;
    res.json({ contributor: me, accounts: await requirePortalStore().listAccounts(me.id) });
  });

  r.get("/me/dashboard", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const [accounts, contributions, claims, defs] = await Promise.all([
      store.listAccounts(me.id),
      store.listContributions({ contributorId: me.id, includeHidden: false }),
      store.listClaims({ contributorId: me.id }),
      getMilestones(cms),
    ]);
    const { reached, next } = evaluateMilestones(defs, contributions);
    res.json({
      contributor: me,
      accounts,
      contributions,
      claims,
      milestones: { reached: reached.map((x) => ({ ...x.def, at: x.at })), next },
      counted: contributions.filter(counts).length,
    });
  });

  r.get("/me/export", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const [accounts, contributions, claims] = await Promise.all([
      store.listAccounts(me.id),
      store.listContributions({ contributorId: me.id, includeHidden: true }),
      store.listClaims({ contributorId: me.id }),
    ]);
    res.json({ exportedAt: new Date().toISOString(), contributor: me, accounts, contributions, claims });
  });

  r.delete("/me", async (req, res) => {
    const me = req.contributor!;
    if (str(body(req), "confirm", { max: 60 }) !== me.handle) {
      throw invalid({ confirm: `Type your handle, ${me.handle}, to confirm.` });
    }
    await requirePortalStore().deleteContributor(me.id);
    res.json({ ok: true });
  });

  r.patch("/me/profile", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const b = body(req);
    const handle = str(b, "handle", { max: 40 }).toLowerCase();
    const displayName = str(b, "displayName", { max: 80 });
    const bio = str(b, "bio", { max: 400 });
    const websiteRaw = str(b, "website", { max: 300 });
    const flag = (k: string) => b[k] === true || b[k] === "on" || b[k] === "true";

    const errors: Record<string, string> = {};
    if (!HANDLE.test(handle)) errors.handle = "2–30 lowercase letters, digits or hyphens.";
    else if (handle !== me.handle && (await store.getContributorByHandle(handle))) errors.handle = "That handle is taken.";
    if (!displayName) errors.displayName = "Your name is required.";
    const website = websiteRaw ? httpUrl(websiteRaw) : "";
    if (website === null) errors.website = "Use a full link starting with https://";
    if (Object.keys(errors).length) throw invalid(errors);

    const isPublic = flag("public");
    const profile: PublicProfile = {
      ...DEFAULT_PROFILE,
      public: isPublic,
      bio,
      website: website ?? "",
      showHouses: flag("showHouses"),
      showAccounts: flag("showAccounts"),
      showContributions: flag("showContributions"),
      onWall: isPublic && flag("onWall"),
    };
    try {
      await store.updateContributor(me.id, { handle, displayName, profile });
    } catch {
      throw invalid({ handle: "That handle is taken." });
    }
    res.json({ ok: true, handle, public: isPublic });
  });

  r.post("/me/contributions", async (req, res) => {
    const me = req.contributor!;
    const b = body(req);
    const title = str(b, "title", { max: 200 });
    const description = str(b, "description", { max: 2000 });
    const kind = str(b, "kind", { max: 40 });
    const house = str(b, "house", { max: 40 });
    const link = str(b, "url", { max: 500 });
    const date = str(b, "date", { max: 10 });

    const errors: Record<string, string> = {};
    if (title.length < 3) errors.title = "Give it a short title.";
    if (!(SELF_KINDS as readonly string[]).includes(kind)) errors.kind = "Choose what kind of work this was.";
    if (!isHouse(house)) errors.house = "Choose the house it was for.";
    const url = link ? httpUrl(link) : null;
    if (!link) errors.url = "Add a link where a steward can see the work.";
    else if (!url) errors.url = "Use a full link starting with https://";
    if (description.length < 10) errors.description = "Describe what you did in a sentence or two.";
    const when = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`) : null;
    if (!when || isNaN(+when) || when > new Date(Date.now() + 864e5)) errors.date = "Enter the date (not in the future).";
    if (Object.keys(errors).length) throw invalid(errors);

    const id = randomUUID();
    const now = new Date();
    await requirePortalStore().addContribution({
      id, provider: "self", providerContributionId: id, kind: kind as (typeof SELF_KINDS)[number], title, url: url!,
      state: "published", house: house as never, occurredAt: when!, contributorId: me.id, description,
      review: { status: "pending" }, createdAt: now, updatedAt: now,
    });
    res.status(201).json({ ok: true, id });
  });

  r.delete("/me/accounts/:provider/:providerUserId", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const { provider, providerUserId } = req.params as { provider: string; providerUserId: string };
    const accounts = await store.listAccounts(me.id);
    const target = accounts.find((a) => a.provider === provider && a.providerUserId === providerUserId);
    if (!target) throw notFound("That account isn't linked to you.");
    // One identity must remain, or nobody could sign in again.
    if (accounts.length <= 1) throw badRequest("That's your only way to sign in. Link another account first.", { account: "last" });
    await store.unlinkAccount(me.id, provider, providerUserId);
    await store.detachContributions(provider, { id: target.providerUserId, username: target.username }, me.id);
    res.json({ ok: true });
  });

  r.post("/me/claims", async (req, res) => {
    const me = req.contributor!;
    const b = body(req);
    const provider = str(b, "provider", { max: 40 });
    const repo = str(b, "repo", { max: 201 });
    const issue = Number(str(b, "issue", { max: 12 }));

    if (!CLAIMABLE.includes(provider) || !knownProvider(provider)) throw badRequest("Issues on that platform can't be claimed here.");
    if (!REPO.test(repo) || !Number.isInteger(issue) || issue < 1 || issue > MAX_ISSUE) throw badRequest("That issue reference isn't valid.");

    const store = requirePortalStore();
    const account = (await store.listAccounts(me.id)).find((a) => a.provider === provider);
    if (!account) throw badRequest(`Link your ${knownProvider(provider)!.name} account first.`, { provider: "not linked" });

    const { claimDays } = await getSettings(cms);
    const now = new Date();
    const claim: Claim = {
      id: randomUUID(), provider, repo, issue, contributorId: me.id, username: account.username, status: "active",
      createdAt: now, expiresAt: new Date(now.getTime() + claimDays * 864e5), assigned: false,
    };
    try {
      await store.createClaim(claim);
    } catch (e) {
      if (e instanceof ClaimTakenError) {
        throw badRequest("Someone is already working on this issue. Try another, or check back after their claim expires.");
      }
      throw e;
    }

    let assigned = false;
    if (provider === "github") {
      try {
        assigned = await assignGithubIssue(fetch, process.env as Record<string, string | undefined>, repo, issue, account.username);
      } catch {
        assigned = false;
      }
    }
    if (assigned) {
      await store.markClaimAssigned(claim.id);
    } else {
      // No write access configured: a steward assigns it by hand, prompted from the CMS inbox.
      await cms.submit("issue-claim", {
        provider, repo, issue: String(issue), username: account.username, contributor: me.handle,
        expires: claim.expiresAt.toISOString().slice(0, 10),
      });
    }
    res.status(201).json({ ok: true, assigned, expiresAt: claim.expiresAt.toISOString(), username: account.username });
  });

  return r;
}
